FROM node:20-alpine

# 타임존 설정 (한국 표준시 KST)
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul

# 작업 디렉토리 생성
WORKDIR /app

# 의존성 정의 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production

# 애플리케이션 소스코드 복사
COPY src/ ./src/

# 비루트(node) 사용자로 실행하여 보안 강화
USER node

# 애플리케이션 실행
CMD ["node", "src/index.js"]
