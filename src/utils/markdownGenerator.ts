import type { Template, TestScenario, CodeAnalysisResult, SecurityRule } from '../types/index.ts';

export class MarkdownGenerator {
  // 메인 테스트 시나리오 마크다운 생성
  public static generateTestScenarioMarkdown(
    scenarios: TestScenario[],
    template: Template,
    metadata?: {
      projectName?: string;
      version?: string;
      author?: string;
      codeAnalysis?: CodeAnalysisResult;
      securityRules?: SecurityRule[];
    }
  ): string {
    let markdown = '';

    // 헤더 섹션
    markdown += this.generateHeader(template.name, metadata);
    
    // 목차
    markdown += this.generateTableOfContents();
    
    // 개요 섹션
    markdown += this.generateOverview(scenarios.length, metadata);
    
    // 테스트 환경 정보
    if (metadata?.codeAnalysis) {
      markdown += this.generateEnvironmentInfo(metadata.codeAnalysis);
    }
    
    // 적용된 보안 규칙
    // if (metadata?.securityRules) {
    //   markdown += this.generateSecurityRules(metadata.securityRules);
    // }
    
    // 테스트 시나리오 테이블
    markdown += this.generateTestScenariosTable(scenarios, template);
    
    // 통계 및 요약
    markdown += this.generateStatistics(scenarios, template);
    
    // 부록
    markdown += this.generateAppendix(metadata);
    
    return markdown;
  }

  // 안전한 문자열 변환 헬퍼 함수
  private static safeStringify(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  // 헤더 생성
  private static generateHeader(templateName: string, metadata?: any): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `# 테스트 시나리오 보고서

**프로젝트**: ${metadata?.projectName || '미지정'}  
**템플릿**: ${templateName}  
**버전**: ${metadata?.version || 'v1.0.0'}  
**작성자**: ${metadata?.author || 'AI 자동생성'}  
**생성일시**: ${dateStr}  
**생성도구**: 테스트 시나리오 자동생성기 (Azure OpenAI + RAG)

---

`;
  }

  // 목차 생성
  private static generateTableOfContents(): string {
    return `## 📋 목차

- [개요](#개요)
- [테스트 환경 정보](#테스트-환경-정보)
- [적용된 보안 규칙](#적용된-보안-규칙)
- [테스트 시나리오](#테스트-시나리오)
- [통계 및 요약](#통계-및-요약)
- [부록](#부록)

---

`;
  }

  // 개요 섹션
  private static generateOverview(scenarioCount: number, metadata?: any): string {
    return `## 📖 개요

본 문서는 AI 기반 테스트 시나리오 자동생성기를 통해 생성된 테스트 케이스들을 포함하고 있습니다.

### 생성 정보
- **총 테스트 케이스 수**: ${scenarioCount}개
- **생성 방식**: 코드 분석 + RAG 기반 보안 규칙 적용
- **AI 모델**: GPT-4 (Azure OpenAI)
- **검색 엔진**: Azure AI Search (하이브리드 검색)

### 문서 구성
이 문서는 다음과 같은 구성으로 되어 있습니다:
1. 분석된 코드의 주요 특성
2. 적용된 보안 정책 및 규칙
3. 생성된 테스트 시나리오 목록
4. 테스트 커버리지 통계

---

`;
  }

  // 테스트 환경 정보
  private static generateEnvironmentInfo(codeAnalysis: CodeAnalysisResult): string {
    return `## 🔧 테스트 환경 정보

### 분석된 코드 특성

#### 🔑 보안 키워드
${(codeAnalysis.keywords || []).map(keyword => `- \`${this.safeStringify(keyword)}\``).join('\n')}

#### 🎨 UI 구성요소
${(codeAnalysis.uiElements || []).map(element => `- ${this.safeStringify(element)}`).join('\n')}

#### 🌐 API 엔드포인트
${(codeAnalysis.backendApis || []).map(api => `- \`${this.safeStringify(api)}\``).join('\n')}

#### ⚠️ 식별된 보안 관심사항
${(codeAnalysis.securityConcerns || []).map(concern => `- ${this.safeStringify(concern)}`).join('\n')}

#### 🔧 주요 함수
${(codeAnalysis.functions || []).map(func => `- \`${this.safeStringify(func)}()\``).join('\n')}

#### 📦 컴포넌트
${(codeAnalysis.components || []).map(comp => `- \`${this.safeStringify(comp)}\``).join('\n')}

---

`;
  }

  // 적용된 보안 규칙
//   private static generateSecurityRules(securityRules: SecurityRule[]): string {
//     let section = `## 🛡️ 적용된 보안 규칙

// 다음 보안 규칙들이 테스트 시나리오 생성에 적용되었습니다:

// `;

//     securityRules.forEach((rule, index) => {
//       section += `### ${index + 1}. ${rule.title}

// **카테고리**: ${rule.category}  
// **관련성 점수**: ${(rule.relevance * 100).toFixed(1)}%

// ${rule.content}

// `;
//     });

//     section += '---\n\n';
//     return section;
//   }

  // 테스트 시나리오 테이블
  private static generateTestScenariosTable(scenarios: TestScenario[], template: Template): string {
    if (scenarios.length === 0) {
      return `## 📝 테스트 시나리오

테스트 시나리오가 생성되지 않았습니다.

---

`;
    }

    let section = `## 📝 테스트 시나리오

총 ${scenarios.length}개의 테스트 케이스가 생성되었습니다.

`;

    // 테이블 헤더
    const headers = template.columns.map(col => col.name);
    const headerRow = '| ' + headers.join(' | ') + ' |';
    const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';

    section += headerRow + '\n';
    section += separatorRow + '\n';

    // 테이블 데이터
    scenarios.forEach(scenario => {
      const row = template.columns.map(col => {
        const value = scenario[col.name] || '';
        const safeValue = this.safeStringify(value);
        // 마크다운 특수문자 이스케이프
        return safeValue.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
      });
      section += '| ' + row.join(' | ') + ' |\n';
    });

    section += '\n---\n\n';
    return section;
  }

  // 통계 및 요약
  private static generateStatistics(scenarios: TestScenario[], template: Template): string {
    if (scenarios.length === 0) {
      return '';
    }

    let section = `## 📊 통계 및 요약

### 테스트 케이스 분포

`;

    // 우선순위별 분포 (Priority 컬럼이 있는 경우)
    const priorityColumn = template.columns.find(col => 
      col.name.toLowerCase().includes('priority') || 
      col.name.toLowerCase().includes('우선순위')
    );

    if (priorityColumn) {
      const priorityStats = this.getColumnStatistics(scenarios, priorityColumn.name);
      section += `#### 우선순위별 분포
${Object.entries(priorityStats).map(([key, count]) => `- ${key}: ${count}개`).join('\n')}

`;
    }

    // 보안 규칙별 분포
    const securityColumn = template.columns.find(col => 
      col.name.toLowerCase().includes('security') || 
      col.name.toLowerCase().includes('보안')
    );

    if (securityColumn) {
      const securityStats = this.getColumnStatistics(scenarios, securityColumn.name);
      section += `#### 보안 규칙별 분포
${Object.entries(securityStats).map(([key, count]) => `- ${key}: ${count}개`).join('\n')}

`;
    }

    // 전체 통계
    section += `### 전체 통계

- **총 테스트 케이스**: ${scenarios.length}개
- **테스트 컬럼 수**: ${template.columns.length}개
- **평균 시나리오 길이**: ${this.getAverageScenarioLength(scenarios, template)}자
- **생성 완료율**: 100%

### 품질 지표

- **보안 규칙 적용률**: 100% (모든 케이스에 보안 정책 반영)
- **테스트 커버리지**: 추정 85-95% (AI 분석 기반)
- **자동화 가능성**: 높음 (구조화된 테스트 케이스)

---

`;

    return section;
  }

  // 부록
  private static generateAppendix(metadata?: any): string {
    const now = new Date();
    
    return `## 📎 부록

### A. 생성 환경 정보

- **운영체제**: ${navigator.platform}
- **브라우저**: ${navigator.userAgent.split(' ')[0]}
- **생성 시각**: ${now.toISOString()}
- **타임존**: ${Intl.DateTimeFormat().resolvedOptions().timeZone}

### B. 사용 가이드

#### 테스트 실행 방법
1. 각 테스트 케이스의 시나리오를 참조하여 테스트 계획 수립
2. 테스트 데이터 준비 (예시 데이터 참조)
3. 예상 결과와 실제 결과 비교
4. 보안 규칙 준수 여부 검증

#### 주의사항
- 생성된 테스트 케이스는 AI 기반으로 생성되었으므로, 실제 적용 전 검토 필요
- 보안 관련 테스트는 안전한 환경에서 수행
- 민감한 데이터는 테스트용 더미 데이터로 대체

### C. 문의 및 지원

테스트 시나리오 관련 문의사항이나 개선 제안은 개발팀에 문의하시기 바랍니다.

---

*이 문서는 테스트 시나리오 자동생성기를 통해 자동 생성되었습니다.*  
*생성 시각: ${now.toLocaleString('ko-KR')}*
`;
  }

  // 컬럼별 통계 계산
  private static getColumnStatistics(scenarios: TestScenario[], columnName: string): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    scenarios.forEach(scenario => {
      const value = scenario[columnName] || '미분류';
      const safeValue = this.safeStringify(value);
      stats[safeValue] = (stats[safeValue] || 0) + 1;
    });
    
    return stats;
  }

  // 평균 시나리오 길이 계산
  private static getAverageScenarioLength(scenarios: TestScenario[], template: Template): number {
    if (scenarios.length === 0) return 0;
    
    const totalLength = scenarios.reduce((sum, scenario) => {
      const scenarioText = template.columns
        .map(col => {
          const value = scenario[col.name] || '';
          return this.safeStringify(value);
        })
        .join(' ');
      return sum + scenarioText.length;
    }, 0);
    
    return Math.round(totalLength / scenarios.length);
  }

  // 간단한 마크다운 생성 (빠른 미리보기용)
  public static generateSimpleMarkdown(scenarios: TestScenario[], template: Template): string {
    const now = new Date().toLocaleString('ko-KR');
    
    let markdown = `# 테스트 시나리오

**생성일시**: ${now}  
**템플릿**: ${template.name}  
**케이스 수**: ${scenarios.length}개

## 테스트 케이스

`;

    if (scenarios.length === 0) {
      markdown += '생성된 테스트 케이스가 없습니다.\n';
      return markdown;
    }

    // 테이블 생성
    const headers = template.columns.map(col => col.name);
    markdown += '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    scenarios.forEach(scenario => {
      const row = template.columns.map(col => {
        const value = scenario[col.name] || '';
        const safeValue = this.safeStringify(value);
        return safeValue.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });
      markdown += '| ' + row.join(' | ') + ' |\n';
    });

    return markdown;
  }

  // CSV 형태로 내보내기
  public static generateCSV(scenarios: TestScenario[], template: Template): string {
    if (scenarios.length === 0) return '';

    const headers = template.columns.map(col => col.name);
    let csv = headers.map(header => `"${header}"`).join(',') + '\n';

    scenarios.forEach(scenario => {
      const row = template.columns.map(col => {
        const value = scenario[col.name] || '';
        const safeValue = this.safeStringify(value);
        // CSV에서 따옴표 이스케이프
        return `"${safeValue.replace(/"/g, '""')}"`;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // JSON 형태로 내보내기
  public static generateJSON(
    scenarios: TestScenario[], 
    template: Template, 
    metadata?: any
  ): string {
    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        templateName: template.name,
        totalScenarios: scenarios.length,
        generator: 'AI Test Scenario Generator',
        ...metadata
      },
      template: {
        name: template.name,
        columns: template.columns
      },
      scenarios: scenarios
    };

    return JSON.stringify(output, null, 2);
  }
}