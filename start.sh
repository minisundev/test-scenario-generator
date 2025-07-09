#!/bin/bash

# 프론트엔드 빌드 및 실행
npm run build
npm run preview &

# 프록시 서버 실행 (디렉토리 변경)
cd proxy-server
node proxy-server.js