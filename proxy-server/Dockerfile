# proxy-server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# 환경변수 설정
ENV NODE_ENV=production
ENV PORT=3001

# 포트 노출
EXPOSE 3001

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 서버 시작
CMD ["node", "proxy-server.js"]