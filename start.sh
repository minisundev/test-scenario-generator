#!/bin/bash

echo "=== 디버깅 시작 ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"

# 빌드
echo "=== 빌드 시작 ==="
npm run build
echo "=== 빌드 완료 ==="

# 환경변수 출력해서 확인
echo "=== 환경변수 확인 ==="
echo "VITE_AZURE_OPENAI_API_KEY: ${VITE_AZURE_OPENAI_API_KEY:0:10}..."
echo "VITE_AZURE_SEARCH_API_KEY: ${VITE_AZURE_SEARCH_API_KEY:0:10}..."

# serve 설치
npm install -g serve

# 정적 파일 서빙 시작
exec serve -s dist -l $PORT -n