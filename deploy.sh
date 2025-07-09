set -e

echo "🚀 Docker 컨테이너 배포 시작..."

# 환경변수 파일 로드
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# 기존 컨테이너 정리
echo "🧹 기존 컨테이너 정리..."
docker-compose down

# 이미지 빌드
echo "🔨 이미지 빌드..."
docker-compose build

# 컨테이너 시작
echo "🚀 컨테이너 시작..."
docker-compose up -d

# 상태 확인
echo "🔍 컨테이너 상태 확인..."
docker-compose ps

# 헬스체크
echo "❤️ 헬스체크..."
sleep 5

echo "프록시 서버 헬스체크:"
curl -f http://localhost:3001/api/health || echo "❌ 프록시 서버 실패"

echo "프론트엔드 헬스체크:"
curl -f http://localhost:3000 || echo "❌ 프론트엔드 실패"

echo "✅ 배포 완료!"
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔧 프록시 서버: http://localhost:3001"