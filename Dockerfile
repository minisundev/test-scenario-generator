FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 빌드 시 환경변수 설정 (Azure에서는 프록시 사용 안 함)
ENV VITE_USE_PROXY=false
ENV VITE_AZURE_OPENAI_API_KEY=placeholder
ENV VITE_AZURE_SEARCH_API_KEY=placeholder

RUN npm run build

# Nginx로 정적 파일 서빙
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]