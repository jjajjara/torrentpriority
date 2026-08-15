# qBittorrent Priority Manager & Auto Cleaner

A lightweight Node.js daemon service that automatically cleans up completed torrents and demotes stalled downloads to the bottom priority using the qBittorrent Web API.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/jjajjara/torrentpriority)
[![Tested on: qBittorrent v5.2.3](https://img.shields.io/badge/Tested%20on-qBittorrent%20v5.2.3-green.svg)](https://www.qbittorrent.org/)
[![Docker Image](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Compatibility**: Tested and fully verified with **qBittorrent v5.2.3** Web API (and compatible with qBittorrent 4.x / 5.x WebUI).

---

## 🎯 Key Features

All features can be individually **toggled ON / OFF** and customized via environment variables (`.env`).

1. **[Feature 1] Auto-delete Completed ForceStart Torrents** (`ENABLE_DELETE_COMPLETED_FORCE_START`)
   - Automatically removes torrents that have `force_start=true` and reached 100% completion.
   - By default, downloaded data files are kept safely; only the torrent entry is removed from qBittorrent (`DELETE_TORRENT_FILES=false`).

2. **[Feature 2] Auto-delete Completed Normal Torrents** (`ENABLE_DELETE_COMPLETED_NORMAL`)
   - Automatically removes normal (non-force start) torrents that have finished downloading (100% / seeding).

3. **[Feature 3] Demote Stalled Downloads to Bottom Priority** (`ENABLE_DEMOTE_STALLED`)
   - Automatically moves active download torrents with speeds below 1 KB/s and no progress change for 5+ minutes to the bottom of the queue (`bottomPrio`).
   - ⚠️ **Force-download torrents (`force_start=true`) are intentionally excluded.**

4. **Detailed Action Logging**
   - Logs specific actions taken during each cycle, including torrent names, states, stalled durations, and speeds.

---

## ⚙️ Environment Configuration (`.env`)

Copy `.env.example` to `.env` and fill in your qBittorrent WebUI credentials:

```env
# ==============================================
# qBittorrent Server Connection (Required)
# ==============================================
QBIT_URL=http://localhost:8080
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

---

## 🚀 Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
cp .env.example .env
nano .env

# 3. Start the daemon
npm start
```

---

## 🐳 Docker Deployment Guide (Linux Server)

### Step 1: Build Docker Image
Build the image directly using `docker build`:

```bash
docker build -t torrent-priority-manager:latest .
```

### Step 2: Run with Docker Compose
Start the container in the background using Docker Compose:

```bash
# Start container
docker compose up -d

# View real-time logs
docker compose logs -f

# Stop container
docker compose down
```

---

## 🔄 Updating & Restarting

```bash
# 1. Pull latest changes
git pull

# 2. Rebuild the image
docker build -t torrent-priority-manager:latest .

# 3. Restart container
docker compose up -d

# 4. Check logs
docker compose logs -f
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
