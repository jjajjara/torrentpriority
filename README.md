# qBittorrent 토렌트 자동 관리 도구 (Torrent Priority Manager)

qBittorrent Web API를 연동하여 완료된 강제시작(ForceStart) 토렌트를 자동으로 삭제하고, 장시간 다운로드가 정체된 토렌트의 대기열 우선순위를 최하위로 자동 조정하는 Node.js 데몬 서비스입니다.

---

## 🎯 주요 기능

1. **완료된 ForceStart 토렌트 자동 삭제**
   - 강제시작(`force_start`) 상태이면서 진행률이 100%에 도달한 토렌트를 자동으로 삭제합니다.
   - 기본적으로 실제 다운로드된 데이터 파일은 보존되며, 토렌트 등록만 삭제됩니다 (`DELETE_TORRENT_FILES` 설정 가능).

2. **정체된 다운로드 토렌트 대기열 최하위 강등**
   - 다운로드 중인 일반 토렌트 중 다운로드 속도가 1KB/s 미만이고 진행률 변화가 없는 상태가 5분 이상 지속되면 대기열 맨 뒤(최하위 우선순위)로 이동시킵니다.
   - ⚠️ **강제 다운로드 중인 토렌트(`force_start=true`)는 사용자의 의도된 동작이므로 우선순위 변경 대상에서 제외됩니다.**

3. **데몬 방식 주기적 자동 실행**
   - 설정된 주기(기본 1분)마다 상태를 점검하며, 리눅스 서버에 Docker 컨테이너로 상시 실행할 수 있습니다.

---

## ⚙️ 환경 설정 (`.env`)

`.env.example`을 복사하여 `.env`를 생성하고 qBittorrent 접속 정보를 설정합니다.

```env
# qBittorrent 서버 접속 정보 (필수)
QBIT_URL=http://localhost:8080
QBIT_USERNAME=admin
QBIT_PASSWORD=your_password

# 스케줄러 실행 주기 (분 단위, 기본값: 1)
CHECK_INTERVAL_MINUTES=1

# 다운로드 정체(Stalled) 판단 기준 시간 (분 단위, 기본값: 5)
STALLED_THRESHOLD_MINUTES=5

# 다운로드 정체 판단 기준 속도 (Bytes/s 단위, 기본값: 1024 = 1KB/s)
STALLED_SPEED_LIMIT_BYTES=1024

# 완료된 ForceStart 토렌트 삭제 시 실제 파일도 함께 삭제할지 여부 (기본값: false)
DELETE_TORRENT_FILES=false

# 드라이 런 모드 (true일 경우 실제 삭제/변경 없이 로그만 출력)
ENABLE_DRY_RUN=false
```

---

## 🚀 로컬 실행 방법 (테스트)

```bash
# 1. 의존성 설치
npm install

# 2. .env 파일 설정 확인 및 수정
# (.env 파일에 실제 qBittorrent WebUI 주소 및 계정 입력)

# 3. 실행
npm start
```

---

## 🐳 Docker 컨테이너 배포 (리눅스 서버)

### Docker Compose 사용 (권장)

```bash
# 1. 백그라운드 빌드 및 실행
docker compose up -d --build

# 2. 실행 로그 확인
docker compose logs -f

# 3. 컨테이너 중지
docker compose down
```

### Docker 직접 빌드 및 실행

```bash
docker build -t torrent-priority-manager .
docker run -d --name torrent-priority-manager --env-file .env --restart unless-stopped torrent-priority-manager
```
