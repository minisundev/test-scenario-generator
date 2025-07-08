import React from 'react';
import { Zap, Shield, Brain, Settings } from 'lucide-react';

interface HeaderProps {
  currentStep?: number;
  onConfigClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentStep = 1, onConfigClick }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 및 제목 */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  테스트 시나리오 자동생성기
                </h1>
                <p className="text-xs text-gray-500">
                  AI + RAG 기반 보안 테스트 케이스 생성
                </p>
              </div>
            </div>
          </div>

          {/* 기능 아이콘들 */}
          <div className="flex items-center space-x-6">
            {/* AI 모델 정보 */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Brain className="w-4 h-4 text-blue-500" />
                <span>GPT-4</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span>RAG 검색</span>
              </div>
            </div>

            {/* 현재 단계 표시 */}
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm text-gray-500">단계</span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-2 h-2 rounded-full ${
                      step === currentStep
                        ? 'bg-blue-500'
                        : step < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {currentStep}/4
              </span>
            </div>

            {/* 설정 버튼 */}
            <button
              onClick={onConfigClick}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="설정"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 진행 상태 바 */}
      <div className="w-full bg-gray-100 h-1">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>
    </header>
  );
};

export default Header;