import type { SearchResult, SecurityRule } from '../types/index.ts';

class AzureAISearchService {
  private indexName: string;

  constructor() {
    this.indexName = 'security-docs-index';
  }

  // 환경별 프록시 URL 결정
  private getProxyUrl(): string {
    // 개발 환경: localhost:3001 프록시 서버
    // 배포 환경: 같은 도메인 (상대 경로)
    if (import.meta.env.DEV) {
      return 'http://localhost:3001';
    } else {
      return ''; // 상대 경로 사용
    }
  }

  // API URL 생성
  private createApiUrl(endpoint: string): string {
    const proxyUrl = this.getProxyUrl();
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (proxyUrl) {
      return `${proxyUrl}${normalizedEndpoint}`;
    } else {
      return normalizedEndpoint; // 상대 경로
    }
  }

  // 설정 검증
  public validateConfig(): boolean {
    return !!(this.indexName);
  }

  // 검색 인덱스 생성
  public async createIndex(): Promise<void> {
    const url = this.createApiUrl('/api/search/create-index');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexName: this.indexName
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('인덱스 생성 오류:', response.status, errorText);
      throw new Error(`인덱스 생성 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    console.log('인덱스가 생성되었습니다!');
  }

  // 문서 인덱싱
  public async indexDocument(
    id: string,
    title: string,
    content: string,
    filename: string,
    category: string,
    contentVector: number[]
  ): Promise<void> {
    const url = this.createApiUrl('/api/search/index-document');
    
    const document = {
      id: id,
      title: title,
      content: content,
      filename: filename,
      category: category,
      contentVector: contentVector
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`문서 인덱싱 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }
  }

  // 배치 문서 인덱싱
  public async indexDocuments(documents: Array<{
    id: string;
    title: string;
    content: string;
    filename: string;
    category: string;
    contentVector: number[];
  }>): Promise<void> {
    const url = this.createApiUrl('/api/search/index-documents');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`배치 인덱싱 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }
  }

  // 텍스트 요약 함수
  private summarizeContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content;
    }
    
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
    
    return content.substring(0, maxLength) + '...';
  }

  // 관련성 점수 정규화
  private normalizeRelevanceScore(score: number): number {
    return Math.min(score / 4.0, 1.0);
  }

  // 하이브리드 검색
  public async searchSecurityRules(
    query: string,
    queryVector?: number[],
    top: number = 5
  ): Promise<SecurityRule[]> {
    const url = this.createApiUrl('/api/search/hybrid-search');
    
    const searchBody = {
      query: query,
      queryVector: queryVector,
      top: top,
      select: 'id,title,filename,category',
      highlight: 'content',
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      searchMode: 'any'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`검색 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data = await response.json();
    
    const processedResults = (data.results || []).map((result: any) => {
      let processedContent = '';
      
      if (result['@search.highlights'] && result['@search.highlights'].content) {
        processedContent = result['@search.highlights'].content
          .slice(0, 3)
          .join('... ')
          .substring(0, 800) + '...';
      } else if (result.content) {
        processedContent = this.summarizeContent(result.content, 800);
      }
      
      return {
        id: result.id || '',
        title: result.title || '',
        content: processedContent,
        filename: result.filename || '',
        category: result.category || 'security-policy',
        relevance: this.normalizeRelevanceScore(result['@search.score'] || 0)
      };
    });

    console.log('검색 결과 후처리 완료:', processedResults.length);
    return processedResults;
  }

  // 키워드 기반 검색
  public async searchByKeywords(keywords: string[]): Promise<SecurityRule[]> {
    const query = keywords.map(k => `"${k}"~2`).join(' OR ');
    return this.searchSecurityRules(query);
  }

  // 벡터 기반 검색
  public async searchByVector(queryVector: number[]): Promise<SecurityRule[]> {
    return this.searchSecurityRules('*', queryVector);
  }

  // 카테고리별 검색
  public async searchByCategory(category: string, query?: string): Promise<SecurityRule[]> {
    const url = this.createApiUrl('/api/search/category-search');
    
    const searchBody = {
      category: category,
      query: query || '*',
      select: 'id,title,filename,category',
      highlight: 'content',
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`카테고리 검색 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data = await response.json();
    
    const processedResults = (data.results || []).map((result: any) => {
      let processedContent = '';
      
      if (result['@search.highlights'] && result['@search.highlights'].content) {
        processedContent = result['@search.highlights'].content
          .slice(0, 3)
          .join('... ')
          .substring(0, 800) + '...';
      } else if (result.content) {
        processedContent = this.summarizeContent(result.content, 800);
      }
      
      return {
        id: result.id || '',
        title: result.title || '',
        content: processedContent,
        filename: result.filename || '',
        category: result.category || 'security-policy',
        relevance: this.normalizeRelevanceScore(result['@search.score'] || 0)
      };
    });

    return processedResults;
  }

  // 인덱스 상태 확인
  public async getIndexStats(): Promise<{
    documentCount: number;
    storageSize: number;
  }> {
    const url = this.createApiUrl('/api/search/index-stats');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`인덱스 상태 조회 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data = await response.json();
    return {
      documentCount: data.documentCount || 0,
      storageSize: data.storageSize || 0
    };
  }

  // 인덱스 삭제
  public async deleteIndex(): Promise<void> {
    const url = this.createApiUrl('/api/search/delete-index');
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexName: this.indexName
      }),
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`인덱스 삭제 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    console.log('인덱스가 삭제되었습니다.');
  }

  // 인덱스 존재 여부 확인
  public async indexExists(): Promise<boolean> {
    const url = this.createApiUrl('/api/search/index-exists');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          indexName: this.indexName
        }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('인덱스 존재 여부 확인 오류:', error);
      return false;
    }
  }

  // 인덱스 재생성
  public async recreateIndexWithCORS(): Promise<void> {
    try {
      console.log('기존 인덱스 확인 중...');
      const exists = await this.indexExists();
      
      if (exists) {
        console.log('기존 인덱스 삭제 중...');
        await this.deleteIndex();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('새 인덱스 생성 중...');
      await this.createIndex();
      
    } catch (error) {
      console.error('인덱스 재생성 오류:', error);
      throw error;
    }
  }

  // 스마트 검색 (코드 분석 결과 기반)
  public async searchForCodeAnalysis(keywords: string[], queryVector?: number[]): Promise<SecurityRule[]> {
    console.log('코드 분석 기반 스마트 검색 시작:', keywords);
    
    try {
      let results: SecurityRule[] = [];
      
      if (queryVector && queryVector.length > 0) {
        console.log('벡터 검색 수행 중...');
        results = await this.searchByVector(queryVector);
      }
      
      if (keywords.length > 0) {
        console.log('키워드 검색 수행 중:', keywords);
        const keywordResults = await this.searchByKeywords(keywords);
        
        const existingIds = new Set(results.map(r => r.id));
        keywordResults.forEach(result => {
          if (!existingIds.has(result.id)) {
            results.push(result);
          }
        });
      }
      
      results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
      
      console.log(`검색 완료: ${results.length}개 결과 반환`);
      return results.slice(0, 5);
      
    } catch (error) {
      console.error('스마트 검색 오류:', error);
      return [];
    }
  }
}

export const azureAISearchService = new AzureAISearchService();