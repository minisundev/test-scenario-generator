import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  text?: string;
  className?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  text,
  className = '',
  overlay = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
    gray: 'border-gray-500'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const spinner = (
    <div className={`inline-flex flex-col items-center space-y-2 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          border-2 
          ${colorClasses[color]} 
          border-t-transparent 
          rounded-full 
          animate-spin
        `}
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
};

// 점 애니메이션 로딩
export const DotsLoading: React.FC<{
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ color = 'bg-blue-500', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${sizeClasses[size]} ${color} rounded-full animate-pulse`}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// 바 애니메이션 로딩
export const BarsLoading: React.FC<{
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ color = 'bg-blue-500', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-1 h-4',
    md: 'w-1.5 h-6',
    lg: 'w-2 h-8'
  };

  return (
    <div className={`flex items-end space-x-1 ${className}`}>
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className={`${sizeClasses[size]} ${color} animate-pulse`}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '1.2s',
            animationDirection: 'alternate',
            animationIterationCount: 'infinite'
          }}
        />
      ))}
    </div>
  );
};

// 펄스 로딩
export const PulseLoading: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}> = ({ size = 'md', color = 'bg-blue-500', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} ${color} rounded-full animate-ping opacity-75`} />
      <div className={`absolute inset-0 ${sizeClasses[size]} ${color} rounded-full animate-pulse`} />
    </div>
  );
};

// 리플 효과 로딩
export const RippleLoading: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}> = ({ size = 'md', color = 'border-blue-500', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {[0, 1].map((index) => (
        <div
          key={index}
          className={`absolute inset-0 border-2 ${color} rounded-full animate-ping`}
          style={{
            animationDelay: `${index * 0.5}s`,
            animationDuration: '2s'
          }}
        />
      ))}
    </div>
  );
};

// 스켈레톤 로딩 (텍스트용)
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`
          }}
        />
      ))}
    </div>
  );
};

// 스켈레톤 로딩 (카드용)
export const SkeletonCard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`border border-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-4/6" />
      </div>
    </div>
  );
};

export default LoadingSpinner;