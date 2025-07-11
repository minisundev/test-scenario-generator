require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://dopaminesun-web-app-hxd2dab2d2hwa0d0.eastus2-01.azurewebsites.net'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// 텍스트 요약 함수
function summarizeContent(content, maxLength = 500) {
  if (!content || content.length <= maxLength) {
    return content || '';
  }
  
  // 중요한 섹션들을 우선적으로 추출 (#### 헤더 기준)
  const importantSections = content.match(/(#### .+?\n[\s\S]*?)(?=####|$)/g) || [];
  
  if (importantSections.length > 0) {
    let summary = '';
    for (const section of importantSections) {
      if (summary.length + section.length > maxLength) break;
      summary += section + '\n\n';
    }
    if (summary.length > 0) {
      return summary.trim();
    }
  }
  
  // fallback: 첫 부분만 자르기
  return content.substring(0, maxLength) + '...';
}

// 관련성 점수 정규화
function normalizeRelevanceScore(score) {
  // Azure Search 점수는 보통 0-4 범위, 이를 0-1로 정규화
  return Math.min((score || 0) / 4.0, 1.0);
}

// === 방법 1: 구체적인 OpenAI 엔드포인트들 ===

// Embeddings API
app.post('/api/openai/deployments/:deploymentName/embeddings', async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const fullOpenAIUrl = `${endpoint}/openai/deployments/${deploymentName}/embeddings?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
    
    console.log('🔁 OpenAI Embeddings 프록시 요청:', fullOpenAIUrl);
    console.log('요청 본문:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullOpenAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenAI Embeddings API 오류:', {
        status: response.status,
        statusText: response.statusText,
        url: fullOpenAIUrl,
        error: data
      });
      return res.status(response.status).json(data);
    }

    console.log('✅ OpenAI Embeddings API 성공:', {
      status: response.status,
      embeddingLength: data.data?.[0]?.embedding?.length
    });

    res.json(data);
  } catch (error) {
    console.error('🔥 OpenAI Embeddings 프록시 오류:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Chat Completions API  
app.post('/api/openai/deployments/:deploymentName/chat/completions', async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const fullOpenAIUrl = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
    
    console.log('🔁 OpenAI Chat Completions 프록시 요청:', fullOpenAIUrl);
    console.log('요청 본문:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullOpenAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenAI Chat Completions API 오류:', {
        status: response.status,
        statusText: response.statusText,
        url: fullOpenAIUrl,
        error: data
      });
      return res.status(response.status).json(data);
    }

    console.log('✅ OpenAI Chat Completions API 성공:', {
      status: response.status,
      responseLength: data.choices?.[0]?.message?.content?.length
    });

    res.json(data);
  } catch (error) {
    console.error('🔥 OpenAI Chat Completions 프록시 오류:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// Completions API (레거시)
app.post('/api/openai/deployments/:deploymentName/completions', async (req, res) => {
  try {
    const { deploymentName } = req.params;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const fullOpenAIUrl = `${endpoint}/openai/deployments/${deploymentName}/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
    
    console.log('🔁 OpenAI Completions 프록시 요청:', fullOpenAIUrl);
    console.log('요청 본문:', JSON.stringify(req.body, null, 2));
    
    const response = await fetch(fullOpenAIUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenAI Completions API 오류:', {
        status: response.status,
        statusText: response.statusText,
        url: fullOpenAIUrl,
        error: data
      });
      return res.status(response.status).json(data);
    }

    console.log('✅ OpenAI Completions API 성공:', {
      status: response.status,
      responseLength: data.choices?.[0]?.text?.length
    });

    res.json(data);
  } catch (error) {
    console.error('🔥 OpenAI Completions 프록시 오류:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

// === 방법 2: 만능 라우팅 (fallback) ===
// 위의 구체적인 라우팅으로 처리되지 않은 다른 OpenAI API 경로들을 처리
app.use('/api/openai', async (req, res) => {
  try {
    const relativePath = req.originalUrl.replace('/api/openai', '');
    
    // '/openai'를 강제로 붙임 (env 수정 없이)
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT.replace(/\/$/, '');
    const fullOpenAIUrl = `${endpoint}/openai${relativePath}?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
    
    console.log('🔁 OpenAI 일반 프록시 요청:', {
      method: req.method,
      originalUrl: req.originalUrl,
      relativePath: relativePath,
      fullUrl: fullOpenAIUrl
    });
    
    const response = await fetch(fullOpenAIUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY,
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ OpenAI 일반 API 오류:', {
        status: response.status,
        statusText: response.statusText,
        url: fullOpenAIUrl,
        error: data
      });
      return res.status(response.status).json(data);
    }

    console.log('✅ OpenAI 일반 API 성공:', {
      status: response.status,
      url: fullOpenAIUrl
    });

    res.json(data);
  } catch (error) {
    console.error('🔥 OpenAI 일반 프록시 오류:', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl
    });
    res.status(500).json({ error: error.message });
  }
});

// === Azure AI Search 엔드포인트 ===

// 인덱스 생성
app.post('/api/search/create-index', async (req, res) => {
  try {
    const { indexName } = req.body;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    const indexSchema = {
      name: indexName,
      fields: [
        {
          name: 'id',
          type: 'Edm.String',
          key: true,
          searchable: false,
          filterable: false,
          sortable: false,
          facetable: false
        },
        {
          name: 'title',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: 'content',
          type: 'Edm.String',
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false
        },
        {
          name: 'category',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: true
        },
        {
          name: 'filename',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: 'contentVector',
          type: 'Collection(Edm.Single)',
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
          dimensions: 1536,
          vectorSearchProfile: 'defaultProfile'
        }
      ],
      vectorSearch: {
        profiles: [
          {
            name: 'defaultProfile',
            algorithm: 'defaultAlgorithm'
          }
        ],
        algorithms: [
          {
            name: 'defaultAlgorithm',
            kind: 'hnsw',
            hnswParameters: {
              metric: 'cosine',
              m: 4,
              efConstruction: 400,
              efSearch: 500
            }
          }
        ]
      }
    };
    
    console.log('인덱스 생성 요청:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(indexSchema),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('인덱스 생성 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('인덱스 생성 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 단일 문서 인덱싱
app.post('/api/search/index-document', async (req, res) => {
  try {
    const { id, title, content, filename, category, contentVector } = req.body;
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/index?api-version=2024-03-01-preview`;
    
    const document = {
      value: [
        {
          '@search.action': 'upload',
          id: id,
          title: title,
          content: content,
          filename: filename,
          category: category,
          contentVector: contentVector
        }
      ]
    };
    
    console.log('문서 인덱싱 요청:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('문서 인덱싱 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('문서 인덱싱 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 배치 문서 인덱싱
app.post('/api/search/index-documents', async (req, res) => {
  try {
    const { documents } = req.body;
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/index?api-version=2024-03-01-preview`;
    
    const batch = {
      value: documents.map(doc => ({
        '@search.action': 'upload',
        ...doc
      }))
    };
    
    console.log('배치 문서 인덱싱 요청:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('배치 문서 인덱싱 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('배치 문서 인덱싱 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 인덱스 상태 확인 (새로 추가)
app.get('/api/search/index/status', async (req, res) => {
  try {
    const indexName = 'security-docs-index';
    
    console.log('📊 인덱스 상태 확인 요청');

    // 1. 인덱스 존재 여부 확인
    const indexUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    const indexResponse = await fetch(indexUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!indexResponse.ok) {
      // 인덱스가 없으면 404
      if (indexResponse.status === 404) {
        console.log('ℹ️ 인덱스가 존재하지 않음');
        return res.json({
          exists: false,
          documentCount: 0,
          embeddingCount: 0,
          indexSize: 0,
          lastUpdate: null
        });
      }
      
      const errorText = await indexResponse.text();
      console.error('인덱스 확인 오류:', indexResponse.status, errorText);
      return res.status(indexResponse.status).json({ error: errorText });
    }

    // 2. 인덱스 통계 확인
    const statsUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/stats?api-version=2024-03-01-preview`;
    const statsResponse = await fetch(statsUrl, {
      method: 'GET',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('인덱스 통계 확인 오류:', statsResponse.status, errorText);
      return res.status(statsResponse.status).json({ error: errorText });
    }

    const statsData = await statsResponse.json();
    console.log('✅ 인덱스 통계:', statsData);

    // 3. 최근 문서 확인 (마지막 업데이트 시간 추출)
    let lastUpdate = null;
    if (statsData.documentCount > 0) {
      try {
        const searchUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/search?api-version=2024-03-01-preview`;
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.AZURE_SEARCH_API_KEY,
          },
          body: JSON.stringify({
            search: '*',
            top: 1,
            orderby: 'search.score() desc',
            select: 'id,title'
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          // 실제로는 문서에 timestamp 필드가 있어야 하지만, 일단 현재 시간으로 설정
          lastUpdate = new Date().toISOString();
        }
      } catch (searchError) {
        console.warn('최근 문서 검색 실패:', searchError);
        lastUpdate = new Date().toISOString();
      }
    }

    // 4. 응답 데이터 구성
    const indexInfo = {
      exists: true,
      documentCount: statsData.documentCount || 0,
      embeddingCount: statsData.documentCount || 0, // 문서 1개당 임베딩 1개로 가정
      indexSize: estimateIndexSize(statsData.documentCount || 0),
      lastUpdate: lastUpdate
    };

    console.log('✅ 인덱스 상태 응답:', indexInfo);
    res.json(indexInfo);

  } catch (error) {
    console.error('❌ 인덱스 상태 확인 오류:', error);
    res.status(500).json({
      error: '인덱스 상태 확인 실패',
      message: error.message
    });
  }
});

// 인덱스 크기 추정 함수 (새로 추가)
function estimateIndexSize(documentCount) {
  // 문서당 평균 크기를 기반으로 대략적인 인덱스 크기 계산
  // 임베딩 벡터 (1536 dimensions * 4 bytes) + 메타데이터 등
  const avgDocSize = 10 * 1024; // 10KB per document (대략적)
  const embeddingSize = 1536 * 4; // 6KB per embedding
  const metadataSize = 2 * 1024; // 2KB for metadata
  
  const totalSize = documentCount * (avgDocSize + embeddingSize + metadataSize);
  return totalSize;
}

// 인덱스 완전 초기화 (새로 추가) - replace 모드용
app.delete('/api/search/index/clear', async (req, res) => {
  try {
    const indexName = 'security-docs-index';
    console.log('🗑️ 인덱스 완전 초기화 요청');

    // 1. 기존 인덱스 삭제
    const deleteUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorText = await deleteResponse.text();
      console.error('인덱스 삭제 오류:', deleteResponse.status, errorText);
      return res.status(deleteResponse.status).json({ error: errorText });
    }

    console.log('✅ 기존 인덱스 삭제 완료 (또는 존재하지 않음)');

    // 2. 잠시 대기 (Azure Search 내부 처리 시간)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. 새 인덱스 생성
    const createUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    const indexSchema = {
      name: indexName,
      fields: [
        {
          name: 'id',
          type: 'Edm.String',
          key: true,
          searchable: false,
          filterable: false,
          sortable: false,
          facetable: false
        },
        {
          name: 'title',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: 'content',
          type: 'Edm.String',
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false
        },
        {
          name: 'category',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: true
        },
        {
          name: 'filename',
          type: 'Edm.String',
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: 'timestamp',
          type: 'Edm.DateTimeOffset',
          searchable: false,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: 'contentVector',
          type: 'Collection(Edm.Single)',
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
          dimensions: 1536,
          vectorSearchProfile: 'defaultProfile'
        }
      ],
      vectorSearch: {
        profiles: [
          {
            name: 'defaultProfile',
            algorithm: 'defaultAlgorithm'
          }
        ],
        algorithms: [
          {
            name: 'defaultAlgorithm',
            kind: 'hnsw',
            hnswParameters: {
              metric: 'cosine',
              m: 4,
              efConstruction: 400,
              efSearch: 500
            }
          }
        ]
      }
    };

    const createResponse = await fetch(createUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(indexSchema),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('새 인덱스 생성 오류:', createResponse.status, errorText);
      return res.status(createResponse.status).json({ error: errorText });
    }

    console.log('✅ 새 인덱스 생성 완료');

    res.json({
      success: true,
      message: '인덱스가 완전히 초기화되었습니다'
    });

  } catch (error) {
    console.error('❌ 인덱스 초기화 오류:', error);
    res.status(500).json({
      error: '인덱스 초기화 실패',
      message: error.message
    });
  }
});

// 문서 업로드 시 타임스탬프 포함하도록 기존 함수 수정
// 기존 '/api/search/index-document' 엔드포인트를 다음과 같이 수정:

app.post('/api/search/index-document', async (req, res) => {
  try {
    const { id, title, content, filename, category, contentVector } = req.body;
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/index?api-version=2024-03-01-preview`;
    
    const document = {
      value: [
        {
          '@search.action': 'upload',
          id: id,
          title: title,
          content: content,
          filename: filename,
          category: category,
          timestamp: new Date().toISOString(), // 타임스탬프 추가
          contentVector: contentVector
        }
      ]
    };
    
    console.log('문서 인덱싱 요청 (타임스탬프 포함):', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('문서 인덱싱 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log('✅ 문서 업로드 완료 (타임스탬프 포함):', id);
    res.json(data);
  } catch (error) {
    console.error('문서 인덱싱 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 하이브리드 검색
app.post('/api/search/hybrid-search', async (req, res) => {
  try {
    const { 
      query, 
      queryVector, 
      top = 5, 
      select,
      highlight,
      highlightPreTag = '<mark>',
      highlightPostTag = '</mark>',
      searchMode = 'any'
    } = req.body;
    
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/search?api-version=2024-03-01-preview`;
    
    const searchBody = {
      search: query || '*',
      top: top,
      select: select || 'id,title,filename,category',
      searchMode: searchMode,
      queryType: 'full',
      searchFields: 'title,content,category'
    };

    // 하이라이트 설정 추가
    if (highlight) {
      searchBody.highlight = highlight;
      searchBody.highlightPreTag = highlightPreTag;
      searchBody.highlightPostTag = highlightPostTag;
    }

    // 벡터 검색 추가 (하이브리드 검색)
    if (queryVector && queryVector.length > 0) {
      searchBody.vectors = [
        {
          value: queryVector,
          fields: 'contentVector',
          k: top
        }
      ];
    }
    
    console.log('하이브리드 검색 요청:', url);
    console.log('검색 본문:', JSON.stringify(searchBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('하이브리드 검색 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log('Azure Search 응답:', JSON.stringify(data, null, 2));
    
    // 결과 후처리 - content 요약 및 하이라이트 처리
    const results = data.value.map((item, index) => {
      let processedContent = '';
      
      // 하이라이트된 content가 있으면 그것을 사용
      if (item['@search.highlights'] && item['@search.highlights'].content) {
        processedContent = item['@search.highlights'].content
          .slice(0, 3) // 상위 3개 하이라이트만
          .join('... ')
          .substring(0, 800) + '...';
      } else if (item.content) {
        // 하이라이트가 없으면 원본 content 요약
        processedContent = summarizeContent(item.content, 800);
      }
      
      return {
        id: item.id || `result_${index}`,
        title: item.title || '제목 없음',
        content: processedContent,
        filename: item.filename || '',
        category: item.category || '일반',
        relevance: normalizeRelevanceScore(item['@search.score']),
        '@search.score': item['@search.score'],
        '@search.highlights': item['@search.highlights']
      };
    });

    console.log(`검색 결과 후처리 완료: ${results.length}개`);
    res.json({ results });
  } catch (error) {
    console.error('하이브리드 검색 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 키워드 검색
app.post('/api/search/keyword-search', async (req, res) => {
  try {
    const {
      query,
      top = 5,
      select,
      highlight,
      highlightPreTag = '<mark>',
      highlightPostTag = '</mark>',
      searchMode = 'any'
    } = req.body;

    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/search?api-version=2023-11-01`;

    const searchBody = {
      search: query || '*',
      top,
      select: select || 'id,title,filename,category',
      searchMode,
      queryType: 'full',
      searchFields: 'title,content,category'
    };

    if (highlight) {
      searchBody.highlight = highlight;
      searchBody.highlightPreTag = highlightPreTag;
      searchBody.highlightPostTag = highlightPostTag;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(searchBody),
    });

    const data = await response.json();
    const results = (data.value || []).map((item, index) => {
      let processedContent = '';
      if (item['@search.highlights']?.content) {
        processedContent = item['@search.highlights'].content
          .slice(0, 3)
          .join('... ')
          .substring(0, 800) + '...';
      } else {
        processedContent = item.content || '';
      }

      return {
        id: item.id || `keyword_result_${index}`,
        title: item.title || '',
        content: processedContent,
        filename: item.filename || '',
        category: item.category || '',
        relevance: item['@search.score'] || 0
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('❌ 키워드 검색 실패:', error);
    res.status(500).json({ error: error.message });
  }
});

// 카테고리별 검색
app.post('/api/search/category-search', async (req, res) => {
  try {
    const { 
      category, 
      query = '*',
      select,
      highlight,
      highlightPreTag = '<mark>',
      highlightPostTag = '</mark>'
    } = req.body;
    
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/search?api-version=2024-03-01-preview`;
    
    const searchBody = {
      search: query,
      filter: `category eq '${category}'`,
      top: 10,
      select: select || 'id,title,filename,category'
    };
    
    // 하이라이트 설정 추가
    if (highlight) {
      searchBody.highlight = highlight;
      searchBody.highlightPreTag = highlightPreTag;
      searchBody.highlightPostTag = highlightPostTag;
    }
    
    console.log('카테고리별 검색 요청:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('카테고리별 검색 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    
    // 결과 후처리 - 동일한 로직 적용
    const results = data.value.map((item, index) => {
      let processedContent = '';
      
      if (item['@search.highlights'] && item['@search.highlights'].content) {
        processedContent = item['@search.highlights'].content
          .slice(0, 3)
          .join('... ')
          .substring(0, 800) + '...';
      } else if (item.content) {
        processedContent = summarizeContent(item.content, 800);
      }
      
      return {
        id: item.id || `category_result_${index}`,
        title: item.title || '제목 없음',
        content: processedContent,
        filename: item.filename || '',
        category: item.category || '일반',
        relevance: normalizeRelevanceScore(item['@search.score']),
        '@search.score': item['@search.score'],
        '@search.highlights': item['@search.highlights']
      };
    });

    res.json({ results });
  } catch (error) {
    console.error('카테고리별 검색 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 인덱스 상태 확인
app.get('/api/search/index-stats', async (req, res) => {
  try {
    const indexName = 'security-docs-index';
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/stats?api-version=2024-03-01-preview`;
    
    console.log('인덱스 상태 확인 요청:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('인덱스 상태 확인 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json({
      documentCount: data.documentCount || 0,
      storageSize: data.storageSize || 0
    });
  } catch (error) {
    console.error('인덱스 상태 확인 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 인덱스 삭제
app.delete('/api/search/delete-index', async (req, res) => {
  try {
    const { indexName } = req.body;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    console.log('인덱스 삭제 요청:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error('인덱스 삭제 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('인덱스 삭제 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 인덱스 존재 여부 확인
app.post('/api/search/index-exists', async (req, res) => {
  try {
    const { indexName } = req.body;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    console.log('인덱스 존재 여부 확인 요청:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    res.json({ exists: response.ok });
  } catch (error) {
    console.error('인덱스 존재 여부 확인 프록시 오류:', error);
    res.json({ exists: false });
  }
});

// === 기존 엔드포인트 유지 ===

// Azure AI Search 프록시 - 인덱스 관리
app.put('/api/search/indexes/:indexName', async (req, res) => {
  try {
    const { indexName } = req.params;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    console.log('인덱스 생성 요청:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('인덱스 생성 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('인덱스 생성 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Azure AI Search 프록시 - 인덱스 삭제
app.delete('/api/search/indexes/:indexName', async (req, res) => {
  try {
    const { indexName } = req.params;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2024-03-01-preview`;
    
    console.log('인덱스 삭제 요청:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      console.error('인덱스 삭제 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('인덱스 삭제 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Azure AI Search 프록시 - 문서 인덱싱
app.post('/api/search/indexes/:indexName/docs/index', async (req, res) => {
  try {
    const { indexName } = req.params;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/index?api-version=2024-03-01-preview`;
    
    console.log('문서 인덱싱 요청:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('문서 인덱싱 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('문서 인덱싱 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// Azure AI Search 프록시 - 문서 검색
app.post('/api/search/indexes/:indexName/docs/search', async (req, res) => {
  try {
    const { indexName } = req.params;
    const url = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}/docs/search?api-version=2024-03-01-preview`;
    
    console.log('문서 검색 요청:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_SEARCH_API_KEY,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('문서 검색 오류:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('문서 검색 프록시 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      openaiConfigured: !!process.env.AZURE_OPENAI_API_KEY,
      searchConfigured: !!process.env.AZURE_SEARCH_API_KEY
    }
  });
});

// 404 처리
app.use('*', (req, res) => {
  console.log('❌ 404 Not Found:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers
  });
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 프록시 서버가 http://0.0.0.0:${PORT} 에서 실행 중입니다.`);
  console.log(`🔧 환경변수 상태:`);
  console.log(`   - OpenAI API: ${process.env.AZURE_OPENAI_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`   - Search API: ${process.env.AZURE_SEARCH_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`🎯 지원하는 OpenAI 엔드포인트:`);
  console.log(`   - POST /api/openai/deployments/:deploymentName/embeddings`);
  console.log(`   - POST /api/openai/deployments/:deploymentName/chat/completions`);
  console.log(`   - POST /api/openai/deployments/:deploymentName/completions`);
  console.log(`   - 기타 OpenAI API (fallback 라우팅)`);
});