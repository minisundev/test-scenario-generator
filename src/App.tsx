import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header.tsx';
import StepIndicator from './components/layout/StepIndicator.tsx';
import FileUploader from './components/common/FileUploader.tsx';
import ProgressBar from './components/common/ProgressBar.tsx';
import LoadingSpinner from './components/common/LoadingSpinner.tsx';
import type { Template, TemplateColumn, CodeAnalysisResult, SecurityRule, TestScenario } from './types/index.ts';
import { templateService } from './services/templateService.ts';
import { azureOpenAIService } from './services/azureOpenAI.ts';
import { azureAISearchService } from './services/azureAISearch.ts';
import { MarkdownGenerator } from './utils/markdownGenerator.ts';
import { SUPPORTED_CODE_EXTENSIONS, SUPPORTED_DOC_EXTENSIONS, downloadFile } from './utils/fileUtils.ts';
import { useLocalStorage } from './hooks/useLocalStorage.ts';
import { AlertCircle, Plus, Trash2, Download, Upload, Settings, FileText, Zap, ArrowRight, RefreshCw, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  // 기본 상태
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // 1단계: 보안 문서
  const [securityDocs, setSecurityDocs] = useState<File[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState(0);
  
  // 2단계: 템플릿
  const [templates] = useLocalStorage<Template[]>('testTemplates', []);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateColumns, setTemplateColumns] = useState<TemplateColumn[]>([
    { name: '테스트 케이스 ID', description: '고유 식별자', example: 'TC001' },
    { name: '테스트 시나리오', description: '테스트 내용', example: '로그인 기능 테스트' },
    { name: '보안 규칙', description: '적용된 보안 규칙', example: '패스워드 정책' },
    { name: '예상 결과', description: '기대하는 결과', example: '로그인 성공' }
  ]);
  const [isNewTemplateSaved, setIsNewTemplateSaved] = useState(false);
  
  // 3단계: 코드 분석
  const [codeFiles, setCodeFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<CodeAnalysisResult | null>(null);
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([]);
  
  // 4단계: 결과
  const [generatedScenarios, setGeneratedScenarios] = useState<TestScenario[]>([]);
  const [markdownResult, setMarkdownResult] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // API 설정 확인
  const [apiConfigValid, setApiConfigValid] = useState(false);

  useEffect(() => {
    // OpenAI만 검증 (AI Search는 일단 제외)
    const openAIValid = azureOpenAIService.validateConfig();
    setApiConfigValid(openAIValid);

    if (!openAIValid) {
      console.warn('Azure OpenAI API 설정이 필요합니다. .env 파일을 확인하세요.');
    }
  }, []);

  // 1단계: 보안 문서 처리
  const handleSecurityDocsUpload = (files: File[]) => {
    setSecurityDocs(files);
  };

  const processSecurityDocs = async () => {
    if (securityDocs.length === 0) return;
    
    setIsIndexing(true);
    setIndexingProgress(0);

    try {
      // 먼저 CORS 설정이 포함된 인덱스 생성
      console.log('CORS 설정이 포함된 인덱스 생성 중...');
      setIndexingProgress(10);
      await azureAISearchService.recreateIndexWithCORS();
      
      for (let i = 0; i < securityDocs.length; i++) {
        const file = securityDocs[i];
        setIndexingProgress(10 + ((i + 1) / securityDocs.length) * 90);
        
        // 파일 내용 읽기
        const content = await readFileContent(file);
        
        // 임베딩 생성
        console.log(`${file.name} 임베딩 생성 중...`);
        const embedding = await azureOpenAIService.generateEmbedding(content);
        
        // 인덱싱
        console.log(`${file.name} 인덱싱 중...`);
        await azureAISearchService.indexDocument(
          `doc_${Date.now()}_${i}`,
          file.name,
          content,
          file.name,
          'security-policy',
          embedding
        );
        
        console.log(`${file.name} 처리 완료!`);
      }
      
      alert('보안 문서 인덱싱이 완료되었습니다!');
      setCurrentStep(2);
    } catch (error) {
      console.error('인덱싱 오류:', error);
      alert('인덱싱 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsIndexing(false);
    }
  };

  // 파일 내용 읽기 헬퍼
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // 2단계: 템플릿 관리
  const addTemplateColumn = () => {
    setTemplateColumns([...templateColumns, { name: '', description: '', example: '' }]);
  };

  const removeTemplateColumn = (index: number) => {
    if (templateColumns.length > 1) {
      setTemplateColumns(templateColumns.filter((_, i) => i !== index));
    }
  };

  const updateTemplateColumn = (index: number, field: keyof TemplateColumn, value: string) => {
    const updated = [...templateColumns];
    updated[index][field] = value;
    setTemplateColumns(updated);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }

    const validation = templateService.validateTemplate({ name: templateName, columns: templateColumns });
    if (!validation.isValid) {
      alert('템플릿 검증 실패:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const newTemplate = templateService.saveTemplate(templateName, templateColumns);
      setSelectedTemplate(newTemplate); // 저장한 템플릿을 자동으로 선택
      setIsNewTemplateSaved(true); // 저장 완료 상태 설정
      alert('템플릿이 저장되었습니다!');
    } catch (error) {
      alert('템플릿 저장 실패: ' + (error as Error).message);
    }
  };

  const useCurrentTemplate = () => {
    if (!templateName.trim()) {
      alert('템플릿 이름을 입력해주세요.');
      return;
    }

    const validation = templateService.validateTemplate({ name: templateName, columns: templateColumns });
    if (!validation.isValid) {
      alert('템플릿 검증 실패:\n' + validation.errors.join('\n'));
      return;
    }

    // 임시 템플릿 객체 생성 (저장하지 않고 바로 사용)
    const tempTemplate: Template = {
      id: Date.now(), // number로 변경
      name: templateName,
      columns: templateColumns,
      createdAt: new Date().toISOString(), // string으로 변경
      updatedAt: new Date().toISOString() // string으로 변경
    };

    setSelectedTemplate(tempTemplate);
    setCurrentStep(3);
  };

  const exportTemplate = () => {
    if (!templateName.trim()) {
      alert('먼저 템플릿 이름을 입력해주세요.');
      return;
    }

    const exportData = {
      name: templateName,
      columns: templateColumns,
      exportedAt: new Date().toISOString()
    };

    downloadFile(
      JSON.stringify(exportData, null, 2),
      `template_${templateName}.json`,
      'application/json'
    );
  };

  // 3단계: 코드 분석 및 시나리오 생성
  const handleCodeFilesUpload = (files: File[]) => {
    setCodeFiles(files);
  };

  const generateTestScenarios = async () => {
    if (!selectedTemplate) {
      alert('템플릿을 선택해주세요.');
      return;
    }

    if (codeFiles.length === 0) {
      alert('분석할 코드 파일을 업로드해주세요.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // 1. 코드 분석
      setProgress(20);
      const codeAnalysis = await azureOpenAIService.analyzeCode(codeFiles);
      setAnalysisResult(codeAnalysis);

      // 2. 보안 규칙 검색
      setProgress(40);
      const rules = await azureAISearchService.searchByKeywords(codeAnalysis.keywords);
      setSecurityRules(rules);

      // 3. 테스트 시나리오 생성
      setProgress(60);
      const scenarios = await azureOpenAIService.generateTestScenarios(
        selectedTemplate,
        codeAnalysis,
        rules
      );
      setGeneratedScenarios(scenarios);

      // 4. 마크다운 생성
      setProgress(80);
      const markdown = MarkdownGenerator.generateTestScenarioMarkdown(
        scenarios,
        selectedTemplate,
        {
          codeAnalysis,
          securityRules: rules,
          projectName: '테스트 프로젝트',
          version: '1.0.0'
        }
      );
      setMarkdownResult(markdown);

      setProgress(100);
      setCurrentStep(4);
    } catch (error) {
      console.error('시나리오 생성 오류:', error);
      alert('시나리오 생성 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 커스텀 프롬프트로 재생성
  const regenerateWithCustomPrompt = async () => {
    if (!selectedTemplate || !analysisResult) {
      alert('필요한 데이터가 없습니다. 다시 생성해주세요.');
      return;
    }

    if (!customPrompt.trim()) {
      alert('커스텀 프롬프트를 입력해주세요.');
      return;
    }

    setIsRegenerating(true);

    try {
      // 기존 프롬프트에 사용자 커스텀 요구사항 추가
      const enhancedPrompt = `
다음 정보를 바탕으로 테스트 시나리오를 생성해주세요.

## 템플릿 구조:
${selectedTemplate.columns.map(col => `- ${col.name}: ${col.description} (예: ${col.example})`).join('\n')}

## 코드 분석 결과:
- 보안 키워드: ${analysisResult.keywords.join(', ')}
- UI 요소: ${analysisResult.uiElements.join(', ')}
- API 엔드포인트: ${analysisResult.backendApis.join(', ')}
- 보안 우려사항: ${analysisResult.securityConcerns.join(', ')}
- 주요 함수: ${analysisResult.functions.join(', ')}
- 컴포넌트: ${analysisResult.components.join(', ')}

## 적용할 보안 규칙:
${securityRules.map(rule => `- ${rule.title}: ${rule.content}`).join('\n')}

위 요구사항을 반영하여 최소 5개 이상의 테스트 시나리오를 생성하고, 반드시 다음과 같은 유효한 JSON 배열 형태로만 응답해주세요:

[
  {
    "${selectedTemplate.columns[0]?.name || 'ID'}": "TC001",
    "${selectedTemplate.columns[1]?.name || 'Scenario'}": "테스트 시나리오 내용",
    "${selectedTemplate.columns[2]?.name || 'Security'}": "적용된 보안 규칙",
    "${selectedTemplate.columns[3]?.name || 'Expected'}": "예상 결과"
  }
]
`;

      const messages = [
        {
          role: 'system',
          content: '당신은 소프트웨어 테스트 전문가입니다. 보안 규칙을 반영한 정확하고 실용적인 테스트 시나리오를 생성하는 것이 전문입니다. 항상 유효한 JSON 형태로만 응답하세요.'
        },
        {
          role: 'user',
          content: enhancedPrompt
        }
      ];

      // 사용자 커스텀 요구사항이 있으면 별도 메시지로 강력하게 추가
      if (customPrompt.trim()) {
        messages.push({
          role: 'user',
          content: `🔥 중요한 추가 요구사항 🔥\n\n${customPrompt}\n\n위 요구사항을 반드시 반영해서 테스트 시나리오를 다시 생성해주세요. 이는 매우 중요한 요구사항입니다.`
        });
      }

      const response = await fetch(`${azureOpenAIService.endpoint.replace(/\/$/, '')}/openai/deployments/${azureOpenAIService.gptModel}/chat/completions?api-version=${azureOpenAIService.apiVersion}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureOpenAIService.apiKey,
        },
        body: JSON.stringify({
          messages: messages,
          max_tokens: 3000, // 더 많은 토큰 할당
          temperature: 0.1, // 더 집중적으로
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 호출 실패: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
      }

      const data = await response.json();
      const responseContent = data.choices[0].message.content;
      console.log('커스텀 재생성 원본 응답:', responseContent);
      
      const cleanedResponse = azureOpenAIService.cleanJsonResponse(responseContent);
      console.log('커스텀 재생성 정리된 응답:', cleanedResponse);
      
      const newScenarios = JSON.parse(cleanedResponse);
      
      if (!Array.isArray(newScenarios)) {
        throw new Error('응답이 배열이 아닙니다');
      }
      
      setGeneratedScenarios(newScenarios);

      // 마크다운 재생성
      const newMarkdown = MarkdownGenerator.generateTestScenarioMarkdown(
        newScenarios,
        selectedTemplate,
        {
          codeAnalysis: analysisResult,
          securityRules: securityRules,
          projectName: '테스트 프로젝트',
          version: '1.0.0'
        }
      );
      setMarkdownResult(newMarkdown);

      alert('커스텀 프롬프트로 재생성이 완료되었습니다!');
    } catch (error) {
      console.error('커스텀 재생성 오류:', error);
      alert('재생성 중 오류가 발생했습니다: ' + (error as Error).message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // 커스텀 프롬프트 초기화
  const resetCustomPrompt = () => {
    setCustomPrompt('');
  };
  const downloadMarkdown = () => {
    if (!markdownResult) return;
    
    downloadFile(
      markdownResult,
      `test_scenarios_${new Date().toISOString().split('T')[0]}.md`,
      'text/markdown'
    );
  };

  const downloadCSV = () => {
    if (!selectedTemplate || generatedScenarios.length === 0) return;
    
    const csv = MarkdownGenerator.generateCSV(generatedScenarios, selectedTemplate);
    downloadFile(
      csv,
      `test_scenarios_${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv'
    );
  };

  const downloadJSON = () => {
    if (!selectedTemplate || generatedScenarios.length === 0) return;
    
    const json = MarkdownGenerator.generateJSON(
      generatedScenarios,
      selectedTemplate,
      { analysisResult, securityRules }
    );
    downloadFile(
      json,
      `test_scenarios_${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );
  };

  // 단계 이동
  const goToStep = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const resetApp = () => {
    setCurrentStep(1);
    setSecurityDocs([]);
    setCodeFiles([]);
    setSelectedTemplate(null);
    setAnalysisResult(null);
    setSecurityRules([]);
    setGeneratedScenarios([]);
    setMarkdownResult('');
    setProgress(0);
    setIsNewTemplateSaved(false);
    setTemplateName('');
    setCustomPrompt('');
    setTemplateColumns([
      { name: '테스트 케이스 ID', description: '고유 식별자', example: 'TC001' },
      { name: '테스트 시나리오', description: '테스트 내용', example: '로그인 기능 테스트' },
      { name: '보안 규칙', description: '적용된 보안 규칙', example: '패스워드 정책' },
      { name: '예상 결과', description: '기대하는 결과', example: '로그인 성공' }
    ]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentStep={currentStep} />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API 설정 경고 */}
        {!apiConfigValid && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">API 설정 필요</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Azure OpenAI와 Azure AI Search API 키를 .env 파일에 설정해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 단계 표시기 */}
        <StepIndicator 
          currentStep={currentStep} 
          onStepClick={goToStep}
          allowStepNavigation={true}
        />

        {/* 메인 컨텐츠 */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
          {/* 1단계: 보안 문서 업로드 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">보안 문서 업로드</h2>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800">
                  회사의 보안 정책 문서를 업로드하여 RAG 검색 인덱스를 구축합니다. 
                  이 작업은 최초 1회만 수행하면 됩니다.
                </p>
              </div>

              <FileUploader
                acceptedExtensions={SUPPORTED_DOC_EXTENSIONS}
                onFilesChange={handleSecurityDocsUpload}
                title="보안 문서를 업로드하세요"
                description="PDF, Word 문서를 지원합니다"
                maxFiles={20}
              />

              {securityDocs.length > 0 && (
                <div className="space-y-4">
                  {isIndexing && (
                    <ProgressBar
                      progress={indexingProgress}
                      steps={[
                        {
                          id: 'reading',
                          label: '파일 읽기',
                          status: indexingProgress > 0 ? 'completed' : 'pending'
                        },
                        {
                          id: 'embedding',
                          label: '임베딩 생성',
                          status: indexingProgress > 50 ? 'completed' : indexingProgress > 0 ? 'active' : 'pending'
                        },
                        {
                          id: 'indexing',
                          label: '인덱스 구축',
                          status: indexingProgress === 100 ? 'completed' : indexingProgress > 50 ? 'active' : 'pending'
                        }
                      ]}
                    />
                  )}

                  <div className="flex justify-center">
                    <button
                      onClick={processSecurityDocs}
                      disabled={isIndexing || !apiConfigValid}
                      className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center space-x-2"
                    >
                      {isIndexing ? (
                        <>
                          <LoadingSpinner size="sm" color="gray" />
                          <span>처리 중...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>임베딩 생성 및 인덱싱 시작</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2단계: 템플릿 설정 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Settings className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">템플릿 설정</h2>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  테스트 시나리오의 구조를 정의하는 템플릿을 생성하거나 기존 템플릿을 선택합니다.
                </p>
              </div>

              {/* 기존 템플릿 선택 */}
              {templates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">저장된 템플릿</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {template.columns.length}개 컬럼
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.columns.slice(0, 3).map((col, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {col.name}
                            </span>
                          ))}
                          {template.columns.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{template.columns.length - 3}개
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTemplate && !isNewTemplateSaved && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 flex items-center space-x-2"
                      >
                        <span>선택한 템플릿으로 계속하기</span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 새 템플릿 생성 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">새 템플릿 생성</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      템플릿 이름
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: 웹 어플리케이션 테스트 템플릿"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        컬럼 설정
                      </label>
                      <button
                        onClick={addTemplateColumn}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center space-x-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>컬럼 추가</span>
                      </button>
                    </div>

                    {templateColumns.map((column, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">컬럼 {index + 1}</span>
                          {templateColumns.length > 1 && (
                            <button
                              onClick={() => removeTemplateColumn(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              컬럼명
                            </label>
                            <input
                              type="text"
                              value={column.name}
                              onChange={(e) => updateTemplateColumn(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              placeholder="예: 테스트 케이스 ID"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              설명
                            </label>
                            <input
                              type="text"
                              value={column.description}
                              onChange={(e) => updateTemplateColumn(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              placeholder="예: 고유 식별자"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              예시
                            </label>
                            <input
                              type="text"
                              value={column.example}
                              onChange={(e) => updateTemplateColumn(index, 'example', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              placeholder="예: TC001"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={saveTemplate}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                    >
                      <span>템플릿 저장</span>
                    </button>
                    <button
                      onClick={useCurrentTemplate}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
                    >
                      <span>저장하지 않고 사용</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={exportTemplate}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>JSON 내보내기</span>
                    </button>
                  </div>

                  {/* 저장된 템플릿으로 계속하기 버튼 */}
                  {isNewTemplateSaved && selectedTemplate && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-800 font-medium">템플릿이 저장되었습니다!</p>
                          <p className="text-green-700 text-sm">"{selectedTemplate.name}" 템플릿으로 계속 진행하시겠습니까?</p>
                        </div>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
                        >
                          <span>계속하기</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3단계: 코드 분석 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Zap className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">코드 분석 및 시나리오 생성</h2>
              </div>

              {selectedTemplate && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    <strong>선택된 템플릿:</strong> {selectedTemplate.name} ({selectedTemplate.columns.length}개 컬럼)
                  </p>
                </div>
              )}

              <FileUploader
                acceptedExtensions={SUPPORTED_CODE_EXTENSIONS}
                onFilesChange={handleCodeFilesUpload}
                title="분석할 코드 파일을 업로드하세요"
                description="JavaScript, TypeScript, Python, Java 등 다양한 언어를 지원합니다"
                maxFiles={15}
              />

              {isProcessing && (
                <ProgressBar
                  progress={progress}
                  steps={[
                    {
                      id: 'analyze',
                      label: '코드 분석',
                      status: progress >= 20 ? 'completed' : progress > 0 ? 'active' : 'pending',
                      description: 'GPT-4로 코드 구조 및 보안 키워드 추출'
                    },
                    {
                      id: 'search',
                      label: '보안 규칙 검색',
                      status: progress >= 40 ? 'completed' : progress > 20 ? 'active' : 'pending',
                      description: 'RAG 기반 관련 보안 정책 검색'
                    },
                    {
                      id: 'generate',
                      label: '시나리오 생성',
                      status: progress >= 60 ? 'completed' : progress > 40 ? 'active' : 'pending',
                      description: '템플릿 기반 테스트 케이스 생성'
                    },
                    {
                      id: 'format',
                      label: '문서 생성',
                      status: progress >= 80 ? 'completed' : progress > 60 ? 'active' : 'pending',
                      description: '마크다운 형태로 최종 문서 생성'
                    }
                  ]}
                />
              )}

              {codeFiles.length > 0 && !isProcessing && (
                <div className="flex justify-center">
                  <button
                    onClick={generateTestScenarios}
                    disabled={!selectedTemplate || !apiConfigValid}
                    className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 flex items-center space-x-2"
                  >
                    <Zap className="w-5 h-5" />
                    <span>테스트 시나리오 생성</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4단계: 결과 */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Download className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">테스트 시나리오 완성</h2>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800">
                  총 {generatedScenarios.length}개의 테스트 시나리오가 생성되었습니다. 
                  다양한 형식으로 다운로드할 수 있습니다.
                </p>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{generatedScenarios.length}</div>
                  <div className="text-sm text-blue-800">생성된 테스트 케이스</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{securityRules.length}</div>
                  <div className="text-sm text-green-800">적용된 보안 규칙</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">{selectedTemplate?.columns.length || 0}</div>
                  <div className="text-sm text-purple-800">테스트 항목</div>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">미리보기</h3>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">
                    {markdownResult.slice(0, 1000)}
                    {markdownResult.length > 1000 && '\n\n... (더 보려면 다운로드하세요)'}
                  </pre>
                </div>
              </div>

              {/* 커스텀 재생성 섹션 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  <span>결과 커스터마이징</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  생성된 테스트 시나리오가 마음에 들지 않다면, 아래에 추가 요구사항을 입력하고 <strong>빠르게</strong> 재생성하세요. 
                  기존 코드 분석 결과를 활용하므로 빠릅니다.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      추가 요구사항 (선택사항)
                    </label>
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="예: 
- 더 구체적인 테스트 케이스를 원합니다
- API 응답 검증에 더 집중해주세요  
- 보안 취약점을 더 세밀하게 다뤄주세요
- 사용자 권한별로 테스트 케이스를 나눠주세요"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={regenerateWithCustomPrompt}
                      disabled={isRegenerating || !apiConfigValid}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center space-x-2"
                    >
                      {isRegenerating ? (
                        <>
                          <LoadingSpinner size="sm" color="gray" />
                          <span>재생성 중...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>커스텀 재생성</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={resetCustomPrompt}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>프롬프트 초기화</span>
                    </button>
                  </div>

                  {customPrompt && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>현재 추가 요구사항:</strong> {customPrompt}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 다운로드 버튼들 */}
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={downloadMarkdown}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Markdown 다운로드</span>
                </button>
                <button
                  onClick={downloadCSV}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>CSV 다운로드</span>
                </button>
                <button
                  onClick={downloadJSON}
                  className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>JSON 다운로드</span>
                </button>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex justify-center space-x-4 pt-6 border-t">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>3단계로 돌아가기</span>
                </button>
                <button
                  onClick={resetApp}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>처음부터 다시 시작</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;