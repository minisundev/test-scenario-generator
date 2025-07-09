FROM node:18 AS build

WORKDIR /app

COPY . .

# 루트 디렉토리 의존성 설치
RUN npm install

# 권한 부여
RUN chmod +x ./start.sh

# Vite preview 기본 포트
EXPOSE 4173   

CMD ["bash", "./start.sh"]