# qBittorrent Torrent Priority Manager & Auto Cleaner

A lightweight Node.js daemon service that automatically cleans up completed torrents and demotes stalled downloads to the bottom priority using the qBittorrent Web API.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/jjajjara/torrentpriority)
[![Tested on: qBittorrent v5.2.3](https://img.shields.io/badge/Tested%20on-qBittorrent%20v5.2.3-green.svg)](https://www.qbittorrent.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

- 🔗 **GitHub Repository:** [https://github.com/jjajjara/torrentpriority](https://github.com/jjajjara/torrentpriority)
- ✅ **Tested Version:** Fully verified on **qBittorrent v5.2.3** Web API

---

## 🎯 Key Features

All features can be individually **toggled ON / OFF** and customized via environment variables:

1. **[Feature 1] Auto-delete Completed ForceStart Torrents**
   - Automatically removes torrents that have `force_start=true` and reached 100% completion.
   - Preserves downloaded data files by default (only removes the torrent from qBittorrent).

2. **[Feature 2] Auto-delete Completed Normal Torrents**
   - Automatically removes finished downloads (100% / seeding) for non-force start torrents.

3. **[Feature 3] Demote Stalled Downloads to Bottom Priority**
   - Automatically moves active download torrents with speeds below 1 KB/s and no progress change for 5+ minutes to the bottom of the queue (`bottomPrio`).
   - ⚠️ **Force-download torrents (`force_start=true`) are intentionally excluded.**

4. **Detailed Action Logging**
   - Logs specific actions taken during each cycle, including torrent names, states, stalled durations, and speeds.

---

## 🚀 Quick Start (Docker Compose)

### 1. `docker-compose.yml`

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

### 2. `.env` Configuration

```env
# ==============================================
# qBittorrent Server Connection (Required)
# ==============================================
QBIT_URL=http://192.168.1.100:8080
QBIT_USERNAME=admin
QBIT_PASSWORD=your_password

# ==============================================
# General Schedules & Thresholds
# ==============================================
# Check interval in minutes (default: 1)
CHECK_INTERVAL_MINUTES=1

# Stalled duration threshold in minutes (default: 5)
STALLED_THRESHOLD_MINUTES=5

# Stalled download speed threshold in Bytes/s (default: 1024 = 1 KB/s)
STALLED_SPEED_LIMIT_BYTES=1024

# Whether to delete downloaded files when deleting torrents (default: false - keep files)
DELETE_TORRENT_FILES=false

# Dry-run mode: logs actions without making actual changes (default: false)
ENABLE_DRY_RUN=false

# ==============================================
# Feature Toggles (true / false)
# ==============================================
# [Feature 1] Auto-delete completed (100%) ForceStart torrents
ENABLE_DELETE_COMPLETED_FORCE_START=true

# [Feature 2] Auto-delete completed (100%) Normal torrents
ENABLE_DELETE_COMPLETED_NORMAL=true

# [Feature 3] Demote stalled active downloads to bottom priority
ENABLE_DEMOTE_STALLED=true
```

### 3. Run & View Logs

```bash
# Start the container
docker compose up -d

# View real-time logs
docker compose logs -f
```

---

## 🐳 Docker CLI Usage

```bash
docker run -d \
  --name torrent-priority-manager \
  --restart unless-stopped \
  --env-file .env \
  -e TZ=Asia/Seoul \
  jjajjara/torrent-priority-manager:latest
```

---

## 📜 Source Code & Issues

- Source code, issue tracking, and contributions:
  [https://github.com/jjajjara/torrentpriority](https://github.com/jjajjara/torrentpriority)
