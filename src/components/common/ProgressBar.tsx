import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

interface ProgressBarProps {
  progress: number; // 0-100
  steps?: ProgressStep[];
  showPercentage?: boolean;
  showSteps?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  animated?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  steps = [],
  showPercentage = true,
  showSteps = true,
  size = 'md',
  color = 'blue',
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  };

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepTextColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'active':
        return 'text-blue-700 font-medium';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 메인 진행률 바 */}
      <div className="space-y-2">
        {showPercentage && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">진행률</span>
            <span className={`font-medium ${getStepTextColor(progress === 100 ? 'completed' : 'active')}`}>
              {Math.round(progress)}%
            </span>
          </div>
        )}
        
        <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
          <div
            className={`
              ${sizeClasses[size]} 
              ${colorClasses[color]} 
              rounded-full transition-all duration-500 ease-out
              ${animated ? 'transition-all duration-500' : ''}
            `}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            {animated && (
              <div className="h-full bg-white bg-opacity-30 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* 단계별 진행 상황 */}
      {showSteps && steps.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">처리 단계</h4>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${getStepTextColor(step.status)}`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </p>
                  )}
                </div>
                
                {/* 활성 단계 로딩 인디케이터 */}
                {step.status === 'active' && animated && (
                  <div className="flex-shrink-0">
                    <div className="w-4 h-4">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추가 정보 또는 액션 */}
      {progress === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-800">
              처리가 완료되었습니다!
            </span>
          </div>
        </div>
      )}

      {steps.some(step => step.status === 'error') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-800">
              처리 중 오류가 발생했습니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// 간단한 라인 진행률 바 컴포넌트
export const SimpleProgressBar: React.FC<{
  progress: number;
  className?: string;
  color?: string;
}> = ({ progress, className = '', color = 'bg-blue-500' }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className={`h-2 ${color} rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

// 원형 진행률 컴포넌트
export const CircularProgress: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}> = ({ 
  progress, 
  size = 40, 
  strokeWidth = 4, 
  color = '#3B82F6',
  className = '' 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 진행률 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      
      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-gray-700">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;