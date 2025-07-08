import React from 'react';
import { Check, FileText, Settings, Zap, Download } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface StepIndicatorProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowStepNavigation?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  onStepClick,
  allowStepNavigation = false 
}) => {
  const steps: Step[] = [
    {
      id: 1,
      title: '보안 문서 업로드',
      description: 'PDF/Word 문서 업로드 및 임베딩 생성',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 2,
      title: '템플릿 설정',
      description: '테스트 시나리오 템플릿 구성',
      icon: <Settings className="w-5 h-5" />
    },
    {
      id: 3,
      title: '코드 분석',
      description: '코드 업로드 및 AI 분석 실행',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 4,
      title: '결과 확인',
      description: '생성된 테스트 시나리오 검토 및 다운로드',
      icon: <Download className="w-5 h-5" />
    }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepStyles = (stepId: number) => {
    const status = getStepStatus(stepId);
    
    switch (status) {
      case 'completed':
        return {
          circle: 'bg-green-500 border-green-500 text-white',
          line: 'bg-green-500',
          title: 'text-green-700 font-medium',
          description: 'text-green-600'
        };
      case 'current':
        return {
          circle: 'bg-blue-500 border-blue-500 text-white ring-4 ring-blue-100',
          line: 'bg-gray-200',
          title: 'text-blue-700 font-semibold',
          description: 'text-blue-600'
        };
      default:
        return {
          circle: 'bg-white border-gray-300 text-gray-400',
          line: 'bg-gray-200',
          title: 'text-gray-500',
          description: 'text-gray-400'
        };
    }
  };

  const handleStepClick = (stepId: number) => {
    if (allowStepNavigation && onStepClick && stepId <= currentStep) {
      onStepClick(stepId);
    }
  };

  return (
    <div className="py-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => {
            const styles = getStepStyles(step.id);
            const isClickable = allowStepNavigation && step.id <= currentStep;
            
            return (
              <li 
                key={step.id} 
                className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className="flex flex-col items-center group">
                  {/* 단계 원형 아이콘 */}
                  <div
                    className={`
                      relative flex items-center justify-center w-12 h-12 border-2 rounded-full transition-all duration-300
                      ${styles.circle}
                      ${isClickable ? 'cursor-pointer hover:scale-105' : ''}
                    `}
                    onClick={() => handleStepClick(step.id)}
                  >
                    {getStepStatus(step.id) === 'completed' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                    
                    {/* 현재 단계 펄스 효과 */}
                    {getStepStatus(step.id) === 'current' && (
                      <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" />
                    )}
                  </div>

                  {/* 단계 정보 */}
                  <div className="mt-3 text-center max-w-32">
                    <h3 className={`text-sm ${styles.title} transition-colors duration-300`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs mt-1 ${styles.description} transition-colors duration-300 hidden sm:block`}>
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* 연결선 */}
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute top-6 left-full w-full hidden sm:block">
                    <div 
                      className={`h-0.5 ${styles.line} transition-colors duration-500`}
                      style={{ width: 'calc(100% - 3rem)' }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* 모바일용 현재 단계 정보 */}
      <div className="sm:hidden mt-6 bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStepStyles(currentStep).circle}`}>
            {getStepStatus(currentStep) === 'completed' ? (
              <Check className="w-4 h-4" />
            ) : (
              steps[currentStep - 1].icon
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>
        </div>
        
        {/* 모바일용 진행률 바 */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>진행률</span>
            <span>{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 단계 네비게이션 힌트 */}
      {allowStepNavigation && currentStep > 1 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            💡 완료된 단계를 클릭하면 해당 단계로 이동할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
};

export default StepIndicator;