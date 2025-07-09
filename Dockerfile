FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 올바른 환경변수 설정
ENV VITE_USE_PROXY=true
ENV VITE_AZURE_OPENAI_API_KEY=placeholder
ENV VITE_AZURE_SEARCH_API_KEY=placeholder

RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["./start.sh"]