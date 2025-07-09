import type { EmbeddingResponse, ChatCompletionResponse, CodeAnalysisResult, Template, SecurityRule, TestScenario } from '../types/index.ts';
import { azureAISearchService } from './azureAISearch.ts';

class AzureOpenAIService {
  public gptModel: string;
  public embeddingModel: string;

  constructor() {
    // 클라이언트에서는 모델명만 저장 (API 키는 서버에서 처리)
    this.gptModel = import.meta.env.VITE_CHAT_MODEL_NAME || import.meta.env.VITE_GPT_MODEL_NAME || 'gpt-4o-mini';
    this.embeddingModel = import.meta.env.VITE_EMBEDDING_MODEL_NAME || 'text-embedding-ada-002';
  }

  // 환경별 프록시 URL 결정
  private getProxyUrl(): string {
    if (import.meta.env.DEV) {
      return 'http://localhost:3001';
    } else {
      return '';
    }
  }

  // API URL 생성
  private createApiUrl(endpoint: string): string {
    const proxyUrl = this.getProxyUrl();
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    if (proxyUrl) {
      return `${proxyUrl}${normalizedEndpoint}`;
    } else {
      return normalizedEndpoint;
    }
  }

  // 설정 검증 (프록시 연결 테스트)
  public async validateConfig(): Promise<boolean> {
    try {
      const url = this.createApiUrl('/api/health');
      const response = await fetch(url);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.environment?.openaiConfigured && data.environment?.searchConfigured;
    } catch (error) {
      console.error('설정 검증 오류:', error);
      return false;
    }
  }

  // 텍스트 임베딩 생성 (프록시 통해서)
  public async generateEmbedding(text: string): Promise<number[]> {
    const url = this.createApiUrl(`/api/openai/deployments/${this.embeddingModel}/embeddings`);
    
    console.log('프록시를 통한 임베딩 생성:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        encoding_format: "float"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('임베딩 생성 오류:', response.status, errorText);
      throw new Error(`임베딩 생성 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.data[0].embedding;
  }

  // JSON 응답 정리 함수
  public cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    cleaned = cleaned.trim();
    
    const jsonStart = Math.min(
      cleaned.indexOf('{') !== -1 ? cleaned.indexOf('{') : Infinity,
      cleaned.indexOf('[') !== -1 ? cleaned.indexOf('[') : Infinity
    );
    
    if (jsonStart === Infinity) {
      throw new Error('JSON 시작 문자를 찾을 수 없습니다');
    }
    
    const jsonEnd = Math.max(
      cleaned.lastIndexOf('}'),
      cleaned.lastIndexOf(']')
    );
    
    if (jsonEnd === -1) {
      throw new Error('JSON 종료 문자를 찾을 수 없습니다');
    }
    
    return cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // 코드 분석
  public async analyzeCode(codeFiles: File[]): Promise<CodeAnalysisResult> {
    const codeContents = await Promise.all(
      codeFiles.map(async (file) => {
        const content = await this.readFileAsText(file);
        return `// File: ${file.name}\n${content}`;
      })
    );

    const combinedCode = codeContents.join('\n\n');
    const maxChunkSize = 6000;
    const chunks = this.splitIntoChunks(combinedCode, maxChunkSize);
    
    const allResults: Partial<CodeAnalysisResult>[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`코드 분석 청크 ${i + 1}/${chunks.length} 처리 중...`);
      
      const prompt = `
다음 코드 조각을 분석하여 테스트 시나리오 생성에 필요한 정보를 추출해주세요.
(이것은 전체 코드의 ${i + 1}/${chunks.length} 부분입니다)

코드:
\`\`\`
${chunks[i]}
\`\`\`

반드시 다음 형태의 유효한 JSON으로만 응답해주세요. 다른 설명이나 텍스트는 포함하지 마세요:

{
  "keywords": ["보안 관련 키워드 배열"],
  "uiElements": ["UI 컴포넌트나 폼 요소 배열"],
  "backendApis": ["API 엔드포인트 배열"],
  "securityConcerns": ["보안 관련 우려사항 배열"],
  "functions": ["주요 함수명 배열"],
  "components": ["React 컴포넌트명 배열"]
}
`;

      try {
        const response = await this.chatCompletion(prompt);
        console.log(`청크 ${i + 1} 원본 응답:`, response);
        
        const cleanedResponse = this.cleanJsonResponse(response);
        console.log(`청크 ${i + 1} 정리된 응답:`, cleanedResponse);
        
        const chunkResult = JSON.parse(cleanedResponse);
        allResults.push(chunkResult);
      } catch (error) {
        console.error(`청크 ${i + 1} 분석 오류:`, error);
        
        allResults.push({
          keywords: [],
          uiElements: [],
          backendApis: [],
          securityConcerns: [],
          functions: [],
          components: []
        });
      }
    }
    
    return this.mergeAnalysisResults(allResults);
  }

  // 코드 분석 기반 보안 규칙 검색
  public async searchSecurityRules(codeAnalysis: CodeAnalysisResult): Promise<SecurityRule[]> {
    console.log('🔍 코드 분석 결과 기반 보안 규칙 검색 시작...');
    
    try {
      const searchKeywords = [
        ...codeAnalysis.keywords,
        ...codeAnalysis.securityConcerns,
        ...codeAnalysis.backendApis.map(api => api.replace(/[{}]/g, '')),
        '인증', '권한', '보안', '검증', '접근제어'
      ].filter(keyword => keyword.length > 1);

      console.log('검색 키워드:', searchKeywords);

      const queryText = [
        '보안 테스트 시나리오 생성을 위한 규칙',
        ...codeAnalysis.securityConcerns,
        ...searchKeywords.slice(0, 10)
      ].join(' ');

      console.log('임베딩 생성을 위한 쿼리 텍스트:', queryText);

      const queryVector = await this.generateEmbedding(queryText);
      console.log('임베딩 생성 완료, 차원:', queryVector.length);

      const searchResults = await azureAISearchService.searchForCodeAnalysis(
        searchKeywords,
        queryVector
      );

      console.log(`🎯 검색 완료: ${searchResults.length}개의 보안 규칙 발견`);
      
      return searchResults;

    } catch (error) {
      console.error('보안 규칙 검색 오류:', error);
      return [];
    }
  }

  // 새로운 통합 테스트 시나리오 생성 메서드
  public async generateTestScenariosWithRAG(
    template: Template,
    codeAnalysis: CodeAnalysisResult
  ): Promise<{ scenarios: TestScenario[], securityRules: SecurityRule[] }> {
    console.log('🚀 RAG 기반 테스트 시나리오 생성 시작...');

    const securityRules = await this.searchSecurityRules(codeAnalysis);
    
    if (securityRules.length === 0) {
      console.warn('⚠️ 관련 보안 규칙을 찾지 못했습니다. 기본 시나리오를 생성합니다.');
      return {
        scenarios: this.generateDefaultScenarios(template),
        securityRules: []
      };
    }

    const scenarios = await this.generateTestScenarios(template, codeAnalysis, securityRules);

    return {
      scenarios,
      securityRules
    };
  }

  // 기존 테스트 시나리오 생성 메서드 (보안 규칙 적용)
  public async generateTestScenarios(
    template: Template,
    codeAnalysis: CodeAnalysisResult,
    securityRules: SecurityRule[]
  ): Promise<TestScenario[]> {
    console.log('📝 테스트 시나리오 생성 중...');
    
    const prompt = `
다음 정보를 바탕으로 실무에서 사용 가능한 테스트 시나리오를 생성해주세요.

## 템플릿 구조:
${template.columns.map(col => `- ${col.name}: ${col.description} (예: ${col.example})`).join('\n')}

## 코드 분석 결과:
- 보안 키워드: ${codeAnalysis.keywords.join(', ')}
- UI 요소: ${codeAnalysis.uiElements.join(', ')}
- API 엔드포인트: ${codeAnalysis.backendApis.join(', ')}
- 보안 우려사항: ${codeAnalysis.securityConcerns.join(', ')}
- 주요 함수: ${codeAnalysis.functions.join(', ')}
- 컴포넌트: ${codeAnalysis.components.join(', ')}

## 적용할 보안 규칙 (RAG 검색 결과):
${securityRules.map(rule => `### ${rule.title}
카테고리: ${rule.category}
내용: ${rule.content.substring(0, 500)}...
`).join('\n')}

다음 요구사항을 만족하는 최소 5-7개의 테스트 시나리오를 생성하세요:
1. 위에서 검색된 보안 규칙들을 실제로 적용한 시나리오
2. 코드 분석에서 발견된 API와 함수들을 활용한 시나리오
3. 실무에서 실제로 테스트할 수 있는 구체적인 내용

반드시 다음과 같은 유효한 JSON 배열 형태로만 응답해주세요:

[
  {
    "${template.columns[0]?.name || 'ID'}": "TC001",
    "${template.columns[1]?.name || 'Scenario'}": "구체적인 테스트 시나리오 내용",
    "${template.columns[2]?.name || 'Security'}": "적용된 보안 규칙명",
    "${template.columns[3]?.name || 'Expected'}": "예상 결과",
    "${template.columns[4]?.name || 'Precondition'}": "테스트 사전 조건",
    "${template.columns[5]?.name || 'Steps'}": "테스트 단계"
  }
]
`;

    try {
      const response = await this.chatCompletion(prompt);
      console.log('시나리오 생성 원본 응답:', response);
      
      const cleanedResponse = this.cleanJsonResponse(response);
      console.log('시나리오 생성 정리된 응답:', cleanedResponse);
      
      const scenarios = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(scenarios)) {
        throw new Error('응답이 배열이 아닙니다');
      }
      
      console.log(`✅ ${scenarios.length}개의 테스트 시나리오 생성 완료`);
      return scenarios;
      
    } catch (error) {
      console.error('시나리오 생성 결과 파싱 오류:', error);
      return this.generateDefaultScenarios(template);
    }
  }

  // GPT-4 채팅 완성 호출 (프록시 통해서)
  public async chatCompletion(prompt: string): Promise<string> {
    const url = this.createApiUrl(`/api/openai/deployments/${this.gptModel}/chat/completions`);
    
    console.log('프록시를 통한 채팅 완성:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: '당신은 소프트웨어 테스트 전문가입니다. 보안 규칙을 반영한 정확하고 실용적인 테스트 시나리오를 생성하는 것이 전문입니다. 항상 유효한 JSON 형태로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('채팅 완성 오류:', response.status, errorText);
      throw new Error(`GPT-4 호출 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    console.log('채팅 완성 응답:', data);
    
    return data.choices[0].message.content;
  }

  // 텍스트를 청크로 나누기
  private splitIntoChunks(text: string, maxSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
      }
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  // 분석 결과 병합
  private mergeAnalysisResults(results: Partial<CodeAnalysisResult>[]): CodeAnalysisResult {
    const merged: CodeAnalysisResult = {
      keywords: [],
      uiElements: [],
      backendApis: [],
      securityConcerns: [],
      functions: [],
      components: []
    };
    
    for (const result of results) {
      if (result.keywords) merged.keywords.push(...result.keywords);
      if (result.uiElements) merged.uiElements.push(...result.uiElements);
      if (result.backendApis) merged.backendApis.push(...result.backendApis);
      if (result.securityConcerns) merged.securityConcerns.push(...result.securityConcerns);
      if (result.functions) merged.functions.push(...result.functions);
      if (result.components) merged.components.push(...result.components);
    }
    
    // 중복 제거
    merged.keywords = [...new Set(merged.keywords)];
    merged.uiElements = [...new Set(merged.uiElements)];
    merged.backendApis = [...new Set(merged.backendApis)];
    merged.securityConcerns = [...new Set(merged.securityConcerns)];
    merged.functions = [...new Set(merged.functions)];
    merged.components = [...new Set(merged.components)];
    
    return merged;
  }

  // 파일을 텍스트로 읽기
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('파일 읽기 실패'));
      reader.readAsText(file);
    });
  }

  // 기본 시나리오 생성 (fallback)
  private generateDefaultScenarios(template: Template): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const baseScenarios = [
      {
        id: 'TC001',
        scenario: '정상적인 사용자 로그인 테스트',
        security: '사용자 인증 보안 규칙',
        expected: '로그인 성공 후 대시보드 이동',
        precondition: '유효한 사용자 계정 준비',
        steps: '["1. 로그인 페이지 접근", "2. 유효한 계정 정보 입력", "3. 로그인 버튼 클릭"]'
      },
      {
        id: 'TC002',
        scenario: '잘못된 비밀번호 입력 테스트',
        security: '로그인 실패 처리 규칙',
        expected: '오류 메시지 표시 및 재시도 허용',
        precondition: '유효한 사용자 ID, 잘못된 비밀번호 준비',
        steps: '["1. 로그인 페이지 접근", "2. 잘못된 비밀번호 입력", "3. 오류 메시지 확인"]'
      },
      {
        id: 'TC003',
        scenario: 'SQL 인젝션 공격 시도 테스트',
        security: '입력 검증 보안 규칙',
        expected: '악의적 입력 차단 및 로그 기록',
        precondition: 'SQL 인젝션 페이로드 준비',
        steps: '["1. 입력 폼에 SQL 인젝션 시도", "2. 서버 응답 확인", "3. 로그 기록 확인"]'
      },
      {
        id: 'TC004',
        scenario: '개인정보 마스킹 처리 확인',
        security: '개인정보 보호 규칙',
        expected: '민감한 정보가 마스킹되어 표시됨',
        precondition: '개인정보가 포함된 데이터 준비',
        steps: '["1. 개인정보 조회", "2. 마스킹 처리 확인", "3. 원본 데이터 비교"]'
      },
      {
        id: 'TC005',
        scenario: '권한 없는 접근 시도 테스트',
        security: '접근 제어 보안 규칙',
        expected: '접근 거부 및 로그 기록',
        precondition: '권한이 없는 사용자 계정 준비',
        steps: '["1. 권한 없는 계정으로 로그인", "2. 보호된 리소스 접근 시도", "3. 접근 거부 확인"]'
      }
    ];

    baseScenarios.forEach((base) => {
      const scenario: TestScenario = {};
      template.columns.forEach((column, colIndex) => {
        switch (colIndex) {
          case 0: scenario[column.name] = base.id; break;
          case 1: scenario[column.name] = base.scenario; break;
          case 2: scenario[column.name] = base.security; break;
          case 3: scenario[column.name] = base.expected; break;
          case 4: scenario[column.name] = base.precondition; break;
          case 5: scenario[column.name] = base.steps; break;
          default: scenario[column.name] = `기본값 ${colIndex + 1}`;
        }
      });
      scenarios.push(scenario);
    });

    return scenarios;
  }
}

export const azureOpenAIService = new AzureOpenAIService();