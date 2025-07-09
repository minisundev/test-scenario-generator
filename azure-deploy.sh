

set -e

echo "☁️ Azure 배포 시작..."

# 환경변수 확인
if [ -z "$AZURE_RESOURCE_GROUP" ] || [ -z "$AZURE_WEBAPP_NAME" ]; then
    echo "❌ Azure 환경변수가 설정되지 않았습니다."
    echo "AZURE_RESOURCE_GROUP와 AZURE_WEBAPP_NAME을 설정하세요."
    exit 1
fi

# Docker 이미지 빌드 및 푸시
echo "🔨 Docker 이미지 빌드..."
docker-compose build

echo "📤 Azure Container Registry에 푸시..."
docker tag your-app_frontend:latest $AZURE_REGISTRY/frontend:latest
docker tag your-app_proxy-server:latest $AZURE_REGISTRY/proxy-server:latest

docker push $AZURE_REGISTRY/frontend:latest
docker push $AZURE_REGISTRY/proxy-server:latest

echo "🚀 Azure App Service에 배포..."
az webapp config container set \
    --resource-group $AZURE_RESOURCE_GROUP \
    --name $AZURE_WEBAPP_NAME \
    --docker-custom-image-name $AZURE_REGISTRY/frontend:latest

echo "✅ Azure 배포 완료!"