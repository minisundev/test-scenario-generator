#!/bin/bash
npm run build

# 빌드된 파일을 nginx로 서빙
nginx -g "daemon off;"