#!/bin/bash
# start.sh

# 프론트엔드 빌드 및 실행 (Vite preview)
npm run build
npm run preview &

# 백엔드 프록시 서버 실행
node proxy-server/proxy-server.js
