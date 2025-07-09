#!/bin/bash

echo "=== 디버깅 시작 ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"

# 빌드
echo "=== 빌드 시작 ==="
npm run build
echo "=== 빌드 완료 ==="

# 정적 파일 서빙을 위한 설정
echo "=== 프록시 서버 시작 ==="
cd proxy-server

# 환경변수 출력해서 확인
echo "=== 환경변수 확인 ==="
echo "VITE_AZURE_OPENAI_API_KEY: ${VITE_AZURE_OPENAI_API_KEY:0:10}..."
echo "VITE_AZURE_SEARCH_API_KEY: ${VITE_AZURE_SEARCH_API_KEY:0:10}..."

node proxy-server.js