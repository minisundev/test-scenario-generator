# 🧠 테스트 시나리오 자동 생성기 (w/ GPT + RAG)

## 📌 **기획 의도**

반복·수작업이던 **배포 전 테스트 시나리오 작성**을 **생성형 AI + RAG**로 자동화하여 업무 효율성을 높임

**생성형 AI와 RAG 기술**을 활용해, **사내 보안 규칙을 반영한 테스트 시나리오 자동 생성 도우미**를 구축

### 핵심 기능 요약

1. **RAG 기반 보안 규칙 검색 및 적용**
2. **프론트 코드 분석 → UI 요소별 동작 파싱**
3. **백엔드 DTO 분석 → 유효성 시나리오 생성**
4. **테스트 템플릿 맞춤 적용**

## 🎯 기대 효과

**업무 효율성 향상**

- 테스트 시나리오 작성 시간 70%↓ (수동 3시간 → 자동 30분)
- 배포 전 테스트 커버리지 30%↑ (누락 케이스 자동 발견)

**품질 표준화**

- 회사 보안 정책 100% 반영된 일관성 있는 테스트 케이스
- 신규 개발자도 베테랑 수준의 테스트 시나리오 생성 가능
- 프로젝트별 테스트 품질 편차 해소

**비용 절감 효과**

- 배포 후 버그 발견 비용 대비 사전 예방 효과 (1:10 비율)
- 반복 작업 최소화로 번아웃 감소

## 🔧 **활용 기술 및 Azure 서비스**

### **Azure OpenAI**

- **GPT-4.1**: 코드 분석 및 테스트 시나리오 생성
- **text-embedding-ada-002**: 보안 규칙 문서 임베딩 생성

### **Azure AI Search**

- **벡터 검색 엔진**: 보안 규칙 문서 RAG 검색
- **하이브리드 검색**: 키워드 + 벡터 검색

### **Azure App Service**

- 프론트: React 기반 UI
- 프록시 서버: Node, Express로 프록시 서버 구현

### **전체 흐름**

```
보안 문서 업로드 → 브라우저에서 임베딩 생성 → AI Search 인덱싱 →
코드 업로드 → 브라우저에서 OpenAI 호출 → 관련 보안 규칙 검색 →
컨텍스트 생성 → GPT-4 테스트 시나리오 생성 → 파일 다운로드
```

## 🔁 Workflow

### **1단계: 초기 설정 (1회)**

1. **보안 문서 업로드**: PDF/Word/MD 파일 드래그 앤 드롭
2. **임베딩**: Azure OpenAI API 호출(text-embedding-ada-002)
3. **인덱스 구축**: Azure AI Search API 호출로 인덱싱

### **2단계: 템플릿 설정 (팀별 1회)**

1. **템플릿 편집기**: 컬럼명, 설명, 예시 입력
2. **빈 컬럼 추가**: 회사 양식에 맞춘 빈 컬럼 포함
3. **localStorage 저장**: 브라우저에 템플릿 저장
4. **JSON 내보내기**: 팀원들과 템플릿 공유

### 3단계: 실제 사용 (매번)

1. 템플릿 선택: 저장된 템플릿 중 선택
2. 코드 업로드: 분석할 코드 업로드
3. GPT-4 코드 분석: Azure OpenAI API 호출로 보안 키워드 추출
4. 보안 규칙 검색: GPT 응답 + Azure AI Search 하이브리드 검색 결과 활용
5. 템플릿 기반 시나리오 생성: 선택한 템플릿 구조에 맞춰 테스트 케이스 생성
6. 커스텀 재생성: 응답 결과를 커스터마이징하는 프롬프트를 붙여서 재생성
7. 다운로드: Markdown / CSV / JSON으로 추출

---

## 🏗️ 서비스 아키텍처

![image.png](attachment:66bad163-fdf9-49b7-9904-ee94fc017005:image.png)

- **비용을 최소화하기 위해 Blob storage를 붙이지 않고 사용**
- **DB를 사용하지 않고 Azure AI Search 인덱스를 직접 사용**함으로써 운영 비용을 절감하고 구성 간결화
    
    ```tsx
    app.get('/api/search/index/status', async (req, res) => {
      try {
        const indexName = 'security-docs-index';
        
        console.log('📊 인덱스 상태 확인 요청');
    
        // 1. 인덱스 존재 여부 확인
        const indexUrl = `${process.env.AZURE_SEARCH_ENDPOINT}/indexes/${indexName}?api-version=2023-11-01`;
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
    ```
    
- **브라우저 기반 임베딩 생성** → Azure AI Search에 직접 인덱싱
- 기존 인덱스 상태를 체크하고 **재사용 여부를 사용자에게 선택하게 하여 비용 최소화**

- 템플릿도 JSON 내보내기 등을 이용하여 DB를 사용하지 않음

---

## 💻 배포 정보

- 프론트엔드:
    
    👉 https://dopaminesun-web-app-hxd2dab2d2hwa0d0.eastus2-01.azurewebsites.net
    
- 프록시 서버:
    
    👉 [https://dopaminesun-server-dycxgacfcmbcc2ec.eastus2-01.azurewebsites.net](https://dopaminesun-server-dycxgacfcmbcc2ec.eastus2-01.azurewebsites.net/)
    

---

## 🧠 프롬프트 정리

### 1️⃣ 코드 분석 프롬프트 (GPT에게 코드 의미 파악 시 요청)

> 🔍 용도: analyzeCode() 내에서 코드 파일들을 청크로 나눠서 분석할 때 사용
> 

```
다음 코드 조각을 분석하여 테스트 시나리오 생성에 필요한 정보를 추출해주세요.
(이것은 전체 코드의 {i + 1}/{chunks.length} 부분입니다)

코드:
```

[여기에 코드 청크 삽입]

```
반드시 다음 형태의 유효한 JSON으로만 응답해주세요. 다른 설명이나 텍스트는 포함하지 마세요:

{
  "keywords": ["보안 관련 키워드 배열"],
  "uiElements": ["UI 컴포넌트나 폼 요소 배열"],
  "backendApis": ["API 엔드포인트 배열"],
  "securityConcerns": ["보안 관련 우려사항 배열"],
  "functions": ["주요 함수명 배열"],
  "components": ["React 컴포넌트명 배열"]
}
```

---

### 2️⃣ 테스트 시나리오 생성 프롬프트 (코드 분석 + RAG 결과 기반 시나리오 생성)

> 🚀 용도: generateTestScenarios() 내에서 GPT로 시나리오 생성 요청할 때 사용
> 

```
다음 정보를 바탕으로 실무에서 사용 가능한 테스트 시나리오를 생성해주세요.

## 템플릿 구조:
- 테스트 케이스 ID: 고유 식별자 (예: TC001)
- 테스트 시나리오: 테스트 내용 (예: 로그인 기능 테스트)
- 보안 규칙: 적용된 보안 규칙 (예: 패스워드 정책)
- 예상 결과: 기대하는 결과 (예: 로그인 성공)
- 사전 조건: 테스트 전 준비 상태 (예: 사용자 계정 존재)
- 테스트 단계: 단계별 절차 (예: ["로그인 페이지 이동", "비밀번호 입력", "로그인 버튼 클릭"])

## 코드 분석 결과:
- 보안 키워드: login, password
- UI 요소: LoginButton, PasswordField
- API 엔드포인트: POST /auth/login
- 보안 우려사항: 인증 미흡, 비밀번호 노출 가능성
- 주요 함수: handleLogin, validatePassword
- 컴포넌트: LoginForm

## 적용할 보안 규칙 (RAG 검색 결과):
### 패스워드 입력 검증
카테고리: 인증
내용: 사용자로부터 입력받은 패스워드는 최소 8자 이상이어야 하며, 대소문자, 숫자, 특수문자를 포함해야 한다...

### 로그인 시도 횟수 제한
카테고리: 접근 제어
내용: 동일한 IP 또는 사용자 ID로 5회 이상 로그인 실패 시 일시적으로 차단되어야 한다...

다음 요구사항을 만족하는 최소 5~7개의 테스트 시나리오를 생성하세요:
1. 위에서 검색된 보안 규칙들을 실제로 적용한 시나리오
2. 코드 분석에서 발견된 API와 함수들을 활용한 시나리오
3. 실무에서 실제로 테스트할 수 있는 구체적인 내용

반드시 다음과 같은 **유효한 JSON 배열 형태로만** 응답해주세요:

[
  {
    "테스트 케이스 ID": "TC001",
    "테스트 시나리오": "비밀번호 정책 검증",
    "보안 규칙": "패스워드 입력 검증",
    "예상 결과": "8자 미만 비밀번호는 거부됨",
    "사전 조건": "비밀번호 입력 폼 존재",
    "테스트 단계": ["페이지 진입", "비밀번호 5자리 입력", "에러 메시지 확인"]
  }
]

```

---

### 3️⃣ 커스텀 프롬프트 기반 재생성 프롬프트

> 🔁 용도: 사용자가 직접 추가 요구사항 입력 후 재생성할 때 사용
> 
> 
> 📥 커스텀 입력 포함
> 

```
다음 정보를 바탕으로 실무에서 사용 가능한 테스트 시나리오를 생성해주세요.

## 템플릿 구조:
- 테스트 케이스 ID: 고유 식별자 (예: TC001)
- 테스트 시나리오: 테스트 내용 (예: 로그인 기능 테스트)
- 보안 규칙: 적용된 보안 규칙 (예: 패스워드 정책)
- 예상 결과: 기대하는 결과 (예: 로그인 성공)

## 코드 분석 결과:
- 보안 키워드: ${codeAnalysis.keywords.join(', ')}
- UI 요소: ${codeAnalysis.uiElements.join(', ')}
- API 엔드포인트: ${codeAnalysis.backendApis.join(', ')}
- 보안 우려사항: ${codeAnalysis.securityConcerns.join(', ')}
- 주요 함수: ${codeAnalysis.functions.join(', ')}
- 컴포넌트: ${codeAnalysis.components.join(', ')}

## 적용할 보안 규칙 (RAG 검색 결과):
${securityRules.map(rule => `### ${rule.title}\n카테고리: ${rule.category}\n내용: ${rule.content.substring(0, 500)}...`).join('\n')}

## 🔥 사용자 추가 요구사항 🔥
${customPrompt}

위의 모든 정보와 특히 사용자의 추가 요구사항을 반드시 반영하여 최소 5-7개의 테스트 시나리오를 생성하세요.

반드시 다음과 같은 유효한 JSON 배열 형태로만 응답해주세요:

[
  {
    "테스트 케이스 ID": "TC001",
    "테스트 시나리오": "구체적인 테스트 시나리오 내용",
    "보안 규칙": "적용된 보안 규칙명",
    "예상 결과": "예상되는 결과"
  }
]

```

---

모든 GPT 요청은 다음과 같은 시스템 메시지와 함께 전송

```json
{
  "role": "system",
  "content": "당신은 소프트웨어 테스트 전문가입니다. 보안 규칙을 반영한 정확하고 실용적인 테스트 시나리오를 생성하는 것이 전문입니다. 항상 유효한 JSON 형태로만 응답하세요."
}

```

재생성 요청은 다음과 같이 전송

```tsx
{
              role: 'system',
              content: '당신은 소프트웨어 테스트 전문가입니다. 보안 규칙을 반영한 정확하고 실용적인 테스트 시나리오를 생성하는 것이 전문입니다. 항상 유효한 JSON 형태로만 응답하세요.'
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
```

## 🐳 Docker 구성 요약

```yaml
version: '3.8'

services:
  proxy-server:
    build:
      context: ./proxy-server
    ports:
      - "3001:3001"
    environment:
      AZURE_OPENAI_API_KEY: ${AZURE_OPENAI_API_KEY}
      AZURE_SEARCH_API_KEY: ${AZURE_SEARCH_API_KEY}
    networks:
      - app-network

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        VITE_API_BASE_URL: https://dopaminesun-server-dycxgacfcmbcc2ec.eastus2-01.azurewebsites.net
    ports:
      - "80:80"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

```

---

## 📚 기술 스택

| 구분 | 기술 |
| --- | --- |
| 프론트엔드 | React, TypeScript, Tailwind, Vite |
| 백엔드 | Node.js, Express, Azure App Service |
| AI | Azure OpenAI (GPT-4, text-embedding-ada-002) |
| 검색 | Azure AI Search (Vector + Hybrid Search) |
| 배포 | Docker, Docker Compose, Azure Web App |

## ⚠️ 향후 개선 방안 + 확장성

- 코드 업로드시 암호화
- 코드 유형 분류 학습
- 회사 코드의 외부 AI 서비스 전송에 대한 정책 수립(Azure private, EntraID 인증 등)
- 사내 서비스로 활용 가능성
    - 보안팀에서 rag 인덱스 생성
    - 기술혁신단에서 코드 유형 분류 학습