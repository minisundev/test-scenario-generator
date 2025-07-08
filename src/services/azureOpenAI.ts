import type { EmbeddingResponse, ChatCompletionResponse, CodeAnalysisResult, Template, SecurityRule, TestScenario } from '../types/index.ts';

class AzureOpenAIService {
  public apiKey: string;
  public endpoint: string;
  public apiVersion: string;
  public gptModel: string;
  public embeddingModel: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY || '';
    this.endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
    this.apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    // 실제로는 chat completion 모델이 필요합니다. text-embedding은 embedding 전용입니다.
    this.gptModel = import.meta.env.VITE_CHAT_MODEL_NAME || import.meta.env.VITE_GPT_MODEL_NAME || 'gpt-4o-mini';
    this.embeddingModel = import.meta.env.VITE_EMBEDDING_MODEL_NAME || 'text-embedding-ada-002';
  }

  // 설정 검증
  public validateConfig(): boolean {
    return !!(this.apiKey && this.endpoint);
  }

  // 텍스트 임베딩 생성
  public async generateEmbedding(text: string): Promise<number[]> {
    // endpoint 끝의 슬래시 제거
    const cleanEndpoint = this.endpoint.replace(/\/$/, '');
    const url = `${cleanEndpoint}/openai/deployments/${this.embeddingModel}/embeddings?api-version=${this.apiVersion}`;
    
    console.log('Embedding URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        input: text,
        encoding_format: "float"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Embedding API Error:', response.status, errorText);
      throw new Error(`임베딩 생성 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.data[0].embedding;
  }

  // JSON 응답 정리 함수 (public으로 변경)
  public cleanJsonResponse(response: string): string {
    // 이스케이프된 개행 문자 등을 실제 문자로 변환
    let cleaned = response.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\t/g, '\t');
    
    // 마크다운 코드 블록 제거
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 앞뒤 공백 제거
    cleaned = cleaned.trim();
    
    // 가끔 응답에 추가 텍스트가 있을 수 있으므로 첫 번째 { 또는 [부터 마지막 } 또는 ]까지만 추출
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
    
    // 토큰 제한을 위해 청크로 나누기 (대략 6000자 = 1500토큰)
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
        
        // 오류 시 기본값 추가
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
    
    // 모든 청크 결과를 병합
    return this.mergeAnalysisResults(allResults);
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

  // 테스트 시나리오 생성
  public async generateTestScenarios(
    template: Template,
    codeAnalysis: CodeAnalysisResult,
    securityRules: SecurityRule[]
  ): Promise<TestScenario[]> {
    const prompt = `
다음 정보를 바탕으로 테스트 시나리오를 생성해주세요.

## 템플릿 구조:
${template.columns.map(col => `- ${col.name}: ${col.description} (예: ${col.example})`).join('\n')}

## 코드 분석 결과:
- 보안 키워드: ${codeAnalysis.keywords.join(', ')}
- UI 요소: ${codeAnalysis.uiElements.join(', ')}
- API 엔드포인트: ${codeAnalysis.backendApis.join(', ')}
- 보안 우려사항: ${codeAnalysis.securityConcerns.join(', ')}
- 주요 함수: ${codeAnalysis.functions.join(', ')}
- 컴포넌트: ${codeAnalysis.components.join(', ')}

## 적용할 보안 규칙:
${securityRules.map(rule => `- ${rule.title}: ${rule.content}`).join('\n')}

최소 5개 이상의 테스트 시나리오를 생성하고, 반드시 다음과 같은 유효한 JSON 배열 형태로만 응답해주세요. 다른 설명이나 텍스트는 포함하지 마세요:

[
  {
    "${template.columns[0]?.name || 'ID'}": "TC001",
    "${template.columns[1]?.name || 'Scenario'}": "테스트 시나리오 내용",
    "${template.columns[2]?.name || 'Security'}": "적용된 보안 규칙",
    "${template.columns[3]?.name || 'Expected'}": "예상 결과"
  }
]
`;

    const response = await this.chatCompletion(prompt);
    console.log('시나리오 생성 원본 응답:', response);
    
    try {
      const cleanedResponse = this.cleanJsonResponse(response);
      console.log('시나리오 생성 정리된 응답:', cleanedResponse);
      
      const scenarios = JSON.parse(cleanedResponse);
      
      // 배열인지 확인
      if (!Array.isArray(scenarios)) {
        throw new Error('응답이 배열이 아닙니다');
      }
      
      return scenarios;
    } catch (error) {
      console.error('시나리오 생성 결과 파싱 오류:', error);
      console.error('원본 응답:', response);
      
      // 기본 시나리오 반환
      return this.generateDefaultScenarios(template);
    }
  }

  // GPT-4 채팅 완성 호출 (public으로 변경)
  public async chatCompletion(prompt: string): Promise<string> {
    // endpoint 끝의 슬래시 제거
    const cleanEndpoint = this.endpoint.replace(/\/$/, '');
    const url = `${cleanEndpoint}/openai/deployments/${this.gptModel}/chat/completions?api-version=${this.apiVersion}`;
    
    console.log('Chat Completion URL:', url);
    console.log('Chat Completion Model:', this.gptModel);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
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
      console.error('Chat Completion API Error:', response.status, errorText);
      throw new Error(`GPT-4 호출 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
    }

    const data: ChatCompletionResponse = await response.json();
    console.log('Chat Completion Response:', data);
    
    return data.choices[0].message.content;
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
        expected: '로그인 성공 후 대시보드 이동'
      },
      {
        id: 'TC002',
        scenario: '잘못된 비밀번호 입력 테스트',
        security: '로그인 실패 처리 규칙',
        expected: '오류 메시지 표시 및 재시도 허용'
      },
      {
        id: 'TC003',
        scenario: 'SQL 인젝션 공격 시도 테스트',
        security: '입력 검증 보안 규칙',
        expected: '악의적 입력 차단 및 로그 기록'
      },
      {
        id: 'TC004',
        scenario: '개인정보 마스킹 처리 확인',
        security: '개인정보 보호 규칙',
        expected: '민감한 정보가 마스킹되어 표시됨'
      },
      {
        id: 'TC005',
        scenario: '권한 없는 접근 시도 테스트',
        security: '접근 제어 보안 규칙',
        expected: '접근 거부 및 로그 기록'
      }
    ];

    baseScenarios.forEach((base, index) => {
      const scenario: TestScenario = {};
      template.columns.forEach((column, colIndex) => {
        if (colIndex === 0) scenario[column.name] = base.id;
        else if (colIndex === 1) scenario[column.name] = base.scenario;
        else if (colIndex === 2) scenario[column.name] = base.security;
        else if (colIndex === 3) scenario[column.name] = base.expected;
        else scenario[column.name] = `기본값 ${colIndex + 1}`;
      });
      scenarios.push(scenario);
    });

    return scenarios;
  }
}

export const azureOpenAIService = new AzureOpenAIService();