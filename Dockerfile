FROM node:18 AS build

WORKDIR /app

COPY . .

RUN npm install

# 권한 부여
RUN chmod +x ./start.sh

EXPOSE 4173   # Vite preview 기본 포트
EXPOSE 3000   # proxy-server가 3000포트 쓰는 경우

CMD ["./start.sh"]