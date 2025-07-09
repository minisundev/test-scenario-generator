// 기존 코드 (38-46줄)
useEffect(() => {
  // OpenAI만 검증 (AI Search는 일단 제외)
  const openAIValid = azureOpenAIService.validateConfig();
  setApiConfigValid(openAIValid);

  if (!openAIValid) {
    console.warn('Azure OpenAI API 설정이 필요합니다. .env 파일을 확인하세요.');
  }
}, []);

// 수정된 코드
useEffect(() => {
  // 프록시 사용 시 API 설정이 유효하다고 간주
  const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
  const openAIValid = azureOpenAIService.validateConfig();
  
  // 프록시를 사용하거나 OpenAI 설정이 유효한 경우
  setApiConfigValid(useProxy || openAIValid);

  if (!useProxy && !openAIValid) {
    console.warn('Azure OpenAI API 설정이 필요합니다. .env 파일을 확인하세요.');
  }
}, []);