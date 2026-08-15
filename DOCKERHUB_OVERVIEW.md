# qBittorrent Torrent Priority & Auto Cleaner Manager

qBittorrent Web API를 연동하여 완료된 토렌트를 자동으로 삭제하고, 장시간 다운로드가 멈춰 있는(정체된) 토렌트의 대기열 우선순위를 자동으로 최하위로 강등하는 경량 백엔드 데몬 서비스입니다.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/jjajjara/torrentpriority)

- 🔗 **GitHub Repository:** [https://github.com/jjajjara/torrentpriority](https://github.com/jjajjara/torrentpriority)

---

## 🎯 주요 기능

모든 기능은 환경 변수를 통해 개별적으로 **ON / OFF** 및 임계값 설정이 가능합니다.

1. **[기능 1] 완료된 강제시작(ForceStart) 토렌트 자동 삭제**
   - 강제시작(`force_start=true`) 상태이면서 다운로드 100% 완료된 토렌트를 자동으로 삭제합니다.
   - 기본적으로 실제 다운로드 파일은 유지되고 토렌트 등록만 삭제됩니다.

2. **[기능 2] 완료된 일반(Non-ForceStart) 토렌트 자동 삭제**
   - 일반 상태의 토렌트 중 진행률 100% 완료(시딩)된 토렌트를 자동 삭제합니다.

3. **[기능 3] 정체된 다운로드 토렌트 대기열 최하위 강등**
   - 다운로드 중인 일반 토렌트 중 속도가 1KB/s 미만이고 진행률 변화가 없는 상태가 5분 이상 지속되면 대기열 맨 뒤(최하위 우선순위)로 이동합니다.
   - ⚠️ **강제 다운로드(`force_start=true`)는 제외됩니다.**

4. **상세 동작 로깅**
   - 매 주기마다 삭제된 토렌트 이름, 우선순위 변경 토렌트 및 정체 지속 시간/속도 등을 명확하게 기록합니다.

---

## 🚀 빠른 시작 (Docker Compose)

### 1. `docker-compose.yml` 작성

```yaml
services:
  torrent-priority-manager:
    image: jjajjara/torrent-priority-manager:latest
    container_name: torrent-priority-manager
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - TZ=Asia/Seoul
```

### 2. `.env` 파일 작성

```env
# ==============================================
# qBittorrent 서버 접속 정보 (필수)
# ==============================================
QBIT_URL=http://192.168.1.100:8080
QBIT_USERNAME=admin
QBIT_PASSWORD=your_password

# ==============================================
# 기본 주기 및 임계값 설정
# ==============================================
# 스케줄러 실행 주기 (분 단위, 기본값: 1)
CHECK_INTERVAL_MINUTES=1

# 다운로드 정체(Stalled) 판단 기준 시간 (분 단위, 기본값: 5)
STALLED_THRESHOLD_MINUTES=5

# 다운로드 정체 판단 기준 속도 (Bytes/s 단위, 기본값: 1024 = 1KB/s)
STALLED_SPEED_LIMIT_BYTES=1024

# 삭제 시 실제 다운로드 파일(데이터)도 함께 삭제할지 여부 (기본값: false - 토렌트만 삭제)
DELETE_TORRENT_FILES=false

# 드라이 런 모드 (true일 경우 실제 삭제/변경 없이 로그만 출력)
ENABLE_DRY_RUN=false

# ==============================================
# 기능별 ON / OFF 토글 설정 (true / false)
# ==============================================
# [기능 1] 완료(100%)된 강제시작(ForceStart) 토렌트 자동 삭제
ENABLE_DELETE_COMPLETED_FORCE_START=true

# [기능 2] 완료(100%)된 일반(Non-ForceStart) 토렌트 자동 삭제
ENABLE_DELETE_COMPLETED_NORMAL=true

# [기능 3] 장시간 정체된(Stalled) 일반 다운로드 토렌트 대기열 최하위 강등
ENABLE_DEMOTE_STALLED=true
```

### 3. 실행 및 로그 확인

```bash
# 컨테이너 실행
docker compose up -d

# 실시간 로그 확인
docker compose logs -f
```

---

## 🐳 Docker CLI 직접 실행

```bash
docker run -d \
  --name torrent-priority-manager \
  --restart unless-stopped \
  --env-file .env \
  -e TZ=Asia/Seoul \
  jjajjara/torrent-priority-manager:latest
```

---

## 📜 소스코드 및 문의

- 소스코드 및 이슈 제보는 GitHub 저장소를 참고해주세요:
  [https://github.com/jjajjara/torrentpriority](https://github.com/jjajjara/torrentpriority)
