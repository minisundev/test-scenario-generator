FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV VITE_USE_PROXY=false
ENV VITE_AZURE_OPENAI_API_KEY=placeholder
ENV VITE_AZURE_SEARCH_API_KEY=placeholder

RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]