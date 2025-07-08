import type { SearchResult, SecurityRule } from '../types/index.ts';

class AzureAISearchService {
  private proxyUrl: string;
  private indexName: string;

  constructor() {
    // 프록시 서버 URL 사용
    this.proxyUrl = 'http://localhost:3001';
    this.indexName = 'security-docs-index';
  }

  // 설정 검증
  public validateConfig(): boolean {
    return !!(this.proxyUrl && this.indexName);
  }

  // 검색 인덱스 생성
  public async createIndex(): Promise<void> {
    const url = `${this.proxyUrl}/api/search/create-index`;
    
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
    const url = `${this.proxyUrl}/api/search/index-document`;
    
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
    const url = `${this.proxyUrl}/api/search/index-documents`;
    
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

  // 하이브리드 검색 (키워드 + 벡터)
  public async searchSecurityRules(
    query: string,
    queryVector?: number[],
    top: number = 5
  ): Promise<SecurityRule[]> {
    const url = `${this.proxyUrl}/api/search/hybrid-search`;
    
    const searchBody = {
      query: query,
      queryVector: queryVector,
      top: top
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
    
    return data.results || [];
  }

  // 키워드 기반 검색
  public async searchByKeywords(keywords: string[]): Promise<SecurityRule[]> {
    const query = keywords.join(' OR ');
    return this.searchSecurityRules(query);
  }

  // 벡터 기반 검색
  public async searchByVector(queryVector: number[]): Promise<SecurityRule[]> {
    return this.searchSecurityRules('*', queryVector);
  }

  // 카테고리별 검색
  public async searchByCategory(category: string, query?: string): Promise<SecurityRule[]> {
    const url = `${this.proxyUrl}/api/search/category-search`;
    
    const searchBody = {
      category: category,
      query: query || '*'
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
    
    return data.results || [];
  }

  // 인덱스 상태 확인
  public async getIndexStats(): Promise<{
    documentCount: number;
    storageSize: number;
  }> {
    const url = `${this.proxyUrl}/api/search/index-stats`;
    
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
    const url = `${this.proxyUrl}/api/search/delete-index`;
    
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
    const url = `${this.proxyUrl}/api/search/index-exists`;
    
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
        // 삭제 후 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('새 인덱스 생성 중...');
      await this.createIndex();
      
    } catch (error) {
      console.error('인덱스 재생성 오류:', error);
      throw error;
    }
  }
}

export const azureAISearchService = new AzureAISearchService();