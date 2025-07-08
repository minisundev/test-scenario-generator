import type { Template, TemplateColumn } from '../types/index.ts';

class TemplateService {
  private readonly STORAGE_KEY = 'testTemplates';

  // 모든 템플릿 조회
  public getAllTemplates(): Template[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('템플릿 조회 오류:', error);
      return [];
    }
  }

  // 템플릿 저장
  public saveTemplate(name: string, columns: TemplateColumn[]): Template {
    const templates = this.getAllTemplates();
    
    const newTemplate: Template = {
      id: Date.now(),
      name: name.trim(),
      columns: columns.filter(col => col.name.trim() !== ''), // 빈 컬럼 제거
      createdAt: new Date().toISOString()
    };

    templates.push(newTemplate);
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      return newTemplate;
    } catch (error) {
      console.error('템플릿 저장 오류:', error);
      throw new Error('템플릿 저장에 실패했습니다.');
    }
  }

  // 템플릿 업데이트
  public updateTemplate(id: number, name: string, columns: TemplateColumn[]): Template {
    const templates = this.getAllTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error('템플릿을 찾을 수 없습니다.');
    }

    const updatedTemplate: Template = {
      ...templates[index],
      name: name.trim(),
      columns: columns.filter(col => col.name.trim() !== ''),
      updatedAt: new Date().toISOString()
    };

    templates[index] = updatedTemplate;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      return updatedTemplate;
    } catch (error) {
      console.error('템플릿 업데이트 오류:', error);
      throw new Error('템플릿 업데이트에 실패했습니다.');
    }
  }

  // 템플릿 삭제
  public deleteTemplate(id: number): boolean {
    const templates = this.getAllTemplates();
    const filteredTemplates = templates.filter(t => t.id !== id);
    
    if (templates.length === filteredTemplates.length) {
      return false; // 삭제할 템플릿이 없음
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTemplates));
      return true;
    } catch (error) {
      console.error('템플릿 삭제 오류:', error);
      throw new Error('템플릿 삭제에 실패했습니다.');
    }
  }

  // 특정 템플릿 조회
  public getTemplate(id: number): Template | null {
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  // 템플릿 이름으로 조회
  public getTemplateByName(name: string): Template | null {
    const templates = this.getAllTemplates();
    return templates.find(t => t.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // 템플릿 복제
  public duplicateTemplate(id: number, newName?: string): Template {
    const original = this.getTemplate(id);
    if (!original) {
      throw new Error('복제할 템플릿을 찾을 수 없습니다.');
    }

    const duplicatedTemplate: Template = {
      id: Date.now(),
      name: newName || `${original.name} (복사본)`,
      columns: [...original.columns], // 깊은 복사
      createdAt: new Date().toISOString()
    };

    const templates = this.getAllTemplates();
    templates.push(duplicatedTemplate);

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
      return duplicatedTemplate;
    } catch (error) {
      console.error('템플릿 복제 오류:', error);
      throw new Error('템플릿 복제에 실패했습니다.');
    }
  }

  // 템플릿 JSON 내보내기
  public exportTemplate(id: number): string {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error('내보낼 템플릿을 찾을 수 없습니다.');
    }

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      template: {
        name: template.name,
        columns: template.columns
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  // 템플릿 JSON 가져오기
  public importTemplate(jsonString: string): Template {
    try {
      const importData = JSON.parse(jsonString);
      
      // 데이터 검증
      if (!importData.template || !importData.template.name || !Array.isArray(importData.template.columns)) {
        throw new Error('올바르지 않은 템플릿 형식입니다.');
      }

      const { name, columns } = importData.template;
      
      // 컬럼 데이터 검증
      const validColumns = columns.filter((col: any) => 
        col && typeof col.name === 'string' && col.name.trim() !== ''
      ).map((col: any) => ({
        name: col.name || '',
        description: col.description || '',
        example: col.example || ''
      }));

      if (validColumns.length === 0) {
        throw new Error('유효한 컬럼이 없습니다.');
      }

      // 중복 이름 처리
      let finalName = name;
      const existingTemplate = this.getTemplateByName(name);
      if (existingTemplate) {
        finalName = `${name} (가져옴)`;
      }

      return this.saveTemplate(finalName, validColumns);
    } catch (error) {
      console.error('템플릿 가져오기 오류:', error);
      throw new Error('템플릿 가져오기에 실패했습니다: ' + (error as Error).message);
    }
  }

  // 기본 템플릿 생성
  public createDefaultTemplate(): Template {
    const defaultColumns: TemplateColumn[] = [
      {
        name: '테스트 케이스 ID',
        description: '테스트 케이스의 고유 식별자',
        example: 'TC001'
      },
      {
        name: '테스트 시나리오',
        description: '수행할 테스트의 상세 내용',
        example: '사용자 로그인 기능 테스트'
      },
      {
        name: '적용 보안 규칙',
        description: '해당 테스트에 적용되는 보안 정책',
        example: '사용자 인증 보안 규칙'
      },
      {
        name: '예상 결과',
        description: '테스트 수행 후 기대되는 결과',
        example: '로그인 성공 후 대시보드 페이지 이동'
      },
      {
        name: '테스트 데이터',
        description: '테스트에 사용할 입력 데이터',
        example: 'valid_user@example.com / password123'
      }
    ];

    return this.saveTemplate('기본 테스트 템플릿', defaultColumns);
  }

  // 웹 앱 테스트용 템플릿 생성
  public createWebAppTemplate(): Template {
    const webAppColumns: TemplateColumn[] = [
      {
        name: 'Test ID',
        description: 'Unique identifier for test case',
        example: 'WEB-001'
      },
      {
        name: 'Feature',
        description: 'Feature being tested',
        example: 'User Authentication'
      },
      {
        name: 'Test Scenario',
        description: 'Detailed test scenario description',
        example: 'User login with valid credentials'
      },
      {
        name: 'Security Rule',
        description: 'Applied security policy',
        example: 'Password complexity validation'
      },
      {
        name: 'Test Steps',
        description: 'Step-by-step test execution',
        example: '1. Navigate to login page 2. Enter credentials 3. Click login'
      },
      {
        name: 'Expected Result',
        description: 'Expected outcome',
        example: 'User successfully logged in and redirected to dashboard'
      },
      {
        name: 'Priority',
        description: 'Test case priority',
        example: 'High'
      }
    ];

    return this.saveTemplate('웹 애플리케이션 테스트 템플릿', webAppColumns);
  }

  // API 테스트용 템플릿 생성
  public createAPITemplate(): Template {
    const apiColumns: TemplateColumn[] = [
      {
        name: 'API Test ID',
        description: 'API test case identifier',
        example: 'API-001'
      },
      {
        name: 'Endpoint',
        description: 'API endpoint being tested',
        example: 'POST /api/v1/auth/login'
      },
      {
        name: 'Test Scenario',
        description: 'API test scenario',
        example: 'Login with valid credentials'
      },
      {
        name: 'Security Check',
        description: 'Security validation performed',
        example: 'Input validation, SQL injection prevention'
      },
      {
        name: 'Request Body',
        description: 'API request payload',
        example: '{"email": "user@test.com", "password": "test123"}'
      },
      {
        name: 'Expected Status',
        description: 'Expected HTTP status code',
        example: '200 OK'
      },
      {
        name: 'Expected Response',
        description: 'Expected response structure',
        example: '{"token": "jwt_token", "user": {...}}'
      }
    ];

    return this.saveTemplate('API 테스트 템플릿', apiColumns);
  }

  // 저장소 정리
  public clearAllTemplates(): boolean {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('템플릿 전체 삭제 오류:', error);
      return false;
    }
  }

  // 템플릿 검증
  public validateTemplate(template: Partial<Template>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('템플릿 이름이 필요합니다.');
    }

    if (!template.columns || !Array.isArray(template.columns)) {
      errors.push('컬럼 정보가 필요합니다.');
    } else {
      if (template.columns.length === 0) {
        errors.push('최소 1개 이상의 컬럼이 필요합니다.');
      }

      template.columns.forEach((column, index) => {
        if (!column.name || column.name.trim() === '') {
          errors.push(`${index + 1}번째 컬럼의 이름이 필요합니다.`);
        }
      });

      // 중복 컬럼명 검사
      const columnNames = template.columns.map(col => col.name.trim().toLowerCase());
      const duplicates = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        errors.push('중복된 컬럼명이 있습니다: ' + [...new Set(duplicates)].join(', '));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 템플릿 통계
  public getTemplateStats(): {
    totalTemplates: number;
    averageColumns: number;
    mostUsedColumnNames: string[];
    oldestTemplate?: Template;
    newestTemplate?: Template;
  } {
    const templates = this.getAllTemplates();
    
    if (templates.length === 0) {
      return {
        totalTemplates: 0,
        averageColumns: 0,
        mostUsedColumnNames: []
      };
    }

    const totalColumns = templates.reduce((sum, template) => sum + template.columns.length, 0);
    const averageColumns = Math.round(totalColumns / templates.length);

    // 가장 많이 사용된 컬럼명 찾기
    const columnNameCount: { [key: string]: number } = {};
    templates.forEach(template => {
      template.columns.forEach(column => {
        const name = column.name.toLowerCase();
        columnNameCount[name] = (columnNameCount[name] || 0) + 1;
      });
    });

    const mostUsedColumnNames = Object.entries(columnNameCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // 가장 오래된/최신 템플릿
    const sortedByDate = [...templates].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalTemplates: templates.length,
      averageColumns,
      mostUsedColumnNames,
      oldestTemplate: sortedByDate[0],
      newestTemplate: sortedByDate[sortedByDate.length - 1]
    };
  }
}

export const templateService = new TemplateService();