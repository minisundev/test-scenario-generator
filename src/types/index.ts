// 템플릿 관련 타입
export interface TemplateColumn {
  name: string;
  description: string;
  example: string;
}

export interface Template {
  id: number;
  name: string;
  columns: TemplateColumn[];
  createdAt: string;
  updatedAt?: string;
}

// 파일 관련 타입
export interface UploadedFile extends File {
  id?: string;
}

// 코드 분석 결과 타입
export interface CodeAnalysisResult {
  keywords: string[];
  uiElements: string[];
  backendApis: string[];
  securityConcerns: string[];
  functions: string[];
  components: string[];
}

// 보안 규칙 타입
export interface SecurityRule {
  id: string;
  title: string;
  content: string;
  relevance: number;
  category: string;
}

// 테스트 시나리오 타입
export interface TestScenario {
  [key: string]: string;
}

// Azure OpenAI 관련 타입
export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Azure AI Search 관련 타입
export interface SearchResult {
  '@odata.context': string;
  '@odata.count'?: number;
  value: Array<{
    '@search.score': number;
    '@search.highlights'?: any;
    id: string;
    content: string;
    title: string;
    category?: string;
    filename?: string;
  }>;
}

export interface SearchDocument {
  id: string;
  title: string;
  content: string;
  filename: string;
  category: string;
  contentVector: number[];
}

export interface IndexSchema {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    key?: boolean;
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    facetable?: boolean;
    dimensions?: number;
    vectorSearchProfile?: string;
  }>;
  vectorSearch?: {
    profiles: Array<{
      name: string;
      algorithm: string;
    }>;
    algorithms: Array<{
      name: string;
      kind: string;
      hnswParameters?: {
        metric: string;
        m: number;
        efConstruction: number;
        efSearch: number;
      };
    }>;
  };
}

// 앱 상태 타입
export interface AppState {
  currentStep: number;
  isProcessing: boolean;
  progress: number;
  securityDocs: UploadedFile[];
  templates: Template[];
  selectedTemplate: Template | null;
  uploadedCodeFiles: UploadedFile[];
  analysisResult: CodeAnalysisResult | null;
  generatedScenarios: TestScenario[];
  markdownResult: string;
}

// API 설정 타입
export interface AzureConfig {
  openaiApiKey: string;
  openaiEndpoint: string;
  openaiApiVersion: string;
  searchApiKey: string;
  searchEndpoint: string;
  searchIndexName: string;
  gptModelName: string;
  embeddingModelName: string;
}

// 프로그레스 단계 타입
export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

// 파일 검증 결과 타입
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

// 마크다운 생성 메타데이터 타입
export interface MarkdownMetadata {
  projectName?: string;
  version?: string;
  author?: string;
  codeAnalysis?: CodeAnalysisResult;
  securityRules?: SecurityRule[];
}

// 템플릿 통계 타입
export interface TemplateStats {
  totalTemplates: number;
  averageColumns: number;
  mostUsedColumnNames: string[];
  oldestTemplate?: Template;
  newestTemplate?: Template;
}

// 로컬 스토리지 백업 타입
export interface LocalStorageBackup {
  timestamp: string;
  data: { [key: string]: string };
}

// API 에러 타입
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

// 검색 쿼리 옵션 타입
export interface SearchOptions {
  query: string;
  queryVector?: number[];
  top?: number;
  skip?: number;
  filter?: string;
  orderBy?: string;
  searchFields?: string[];
  select?: string[];
  highlight?: string[];
  facets?: string[];
}

// 인덱싱 옵션 타입
export interface IndexingOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// 파일 처리 결과 타입
export interface FileProcessingResult {
  filename: string;
  content: string;
  extension: string;
  size: number;
  success: boolean;
  error?: string;
}