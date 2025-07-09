
#!/bin/bash


echo "🛠️ 로컬 개발 환경 시작..."

# 프록시 서버 시작 (백그라운드)
echo "🔧 프록시 서버 시작..."
cd proxy-server
npm install
npm start &
PROXY_PID=$!

cd ..

# 프론트엔드 개발 서버 시작
echo "🌐 프론트엔드 개발 서버 시작..."
npm install
npm run dev &
FRONTEND_PID=$!

# 종료 시 프로세스 정리
trap "kill $PROXY_PID $FRONTEND_PID" EXIT

echo "✅ 개발 환경 실행 중..."
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔧 프록시 서버: http://localhost:3001"
echo "종료하려면 Ctrl+C를 누르세요."

wait