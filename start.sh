#!/bin/bash

echo "=== 디버깅 시작 ==="
echo "PORT: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "현재 디렉토리: $(pwd)"

# 빌드
echo "=== 빌드 시작 ==="
npm run build
echo "=== 빌드 완료 ==="

echo "=== 프록시 서버 시작 준비 ==="
cd proxy-server || { echo "proxy-server 디렉토리를 찾을 수 없습니다"; exit 1; }

echo "현재 위치: $(pwd)"
echo "파일 목록:"
ls -la

echo "=== package.json 확인 ==="
cat package.json

echo "=== 프록시 서버 시작 시도 ==="
node proxy-server.js