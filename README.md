# qBittorrent 토렌트 자동 관리 도구 (Torrent Priority Manager)

qBittorrent Web API를 연동하여 완료된 토렌트를 자동으로 삭제하고, 장시간 다운로드가 정체된 토렌트의 대기열 우선순위를 최하위로 자동 조정하는 Node.js 데몬 서비스입니다.

---

## 🎯 주요 기능 및 설정

모든 기능은 `.env` 파일을 통해 개별적으로 **ON / OFF**가 가능합니다.

1. **[기능 1] 완료된 강제시작(ForceStart) 토렌트 자동 삭제** (`ENABLE_DELETE_COMPLETED_FORCE_START`)
   - 강제시작(`force_start=true`) 상태이면서 진행률 100% 완료된 토렌트를 자동으로 삭제합니다.
   - 기본적으로 실제 다운로드된 파일은 보존되며, 토렌트 등록만 삭제됩니다 (`DELETE_TORRENT_FILES` 설정 가능).

2. **[기능 2] 완료된 일반(Non-ForceStart) 토렌트 자동 삭제** (`ENABLE_DELETE_COMPLETED_NORMAL`)
   - 일반 상태의 토렌트 중 진행률 100% 완료(시딩 중)된 토렌트를 자동으로 삭제합니다.

3. **[기능 3] 정체된 다운로드 토렌트 대기열 최하위 강등** (`ENABLE_DEMOTE_STALLED`)
   - 다운로드 중인 일반 토렌트 중 다운로드 속도가 1KB/s 미만이고 진행률 변화가 없는 상태가 5분 이상 지속되면 대기열 맨 뒤(최하위 우선순위)로 이동시킵니다.
   - ⚠️ **강제 다운로드 중인 토렌트(`force_start=true`)는 제외됩니다.**

4. **상세 동작 로깅**
   - 각 작업 사이클마다 어떤 토렌트가 삭제되었는지, 어떤 토렌트의 우선순위가 변경되었는지 이름과 상태를 명확히 기록합니다.

---

## ⚙️ 환경 설정 (`.env`)

`.env.example`을 복사하여 `.env`를 생성하고 설정값을 입력합니다.

```env
# ==============================================
# qBittorrent 서버 접속 정보 (필수)
# ==============================================
QBIT_URL=http://localhost:8080
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

# 삭제 시 실제 다운로드 파일(데이터)도 함께 삭제할지 여부 (기본값: false)
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

---

## 🚀 로컬 실행 방법 (테스트)

```bash
# 의존성 설치 및 실행
npm install
npm start
```

---

## 🐳 Docker 컨테이너 배포 (리눅스 서버)

### Docker Compose로 빌드 후 실행 (권장)

```bash
# 1. 이미지 빌드
docker compose build

# 2. 백그라운드 실행
docker compose up -d

# 3. 상세 로그 확인
docker compose logs -f
```
