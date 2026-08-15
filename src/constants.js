/**
 * qBittorrent 자동 관리 도구 상수 정의 모듈
 */

export const TIME_CONSTANTS = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  get MILLISECONDS_PER_MINUTE() {
    return this.MILLISECONDS_PER_SECOND * this.SECONDS_PER_MINUTE;
  }
};

export const DEFAULT_CONFIG_VALUES = {
  CHECK_INTERVAL_MINUTES: 1,
  STALLED_THRESHOLD_MINUTES: 5,
  STALLED_SPEED_LIMIT_BYTES: 1024, // 1 KB/s
  DELETE_TORRENT_FILES: false,
  ENABLE_DRY_RUN: false
};

/**
 * qBittorrent 토렌트 상태값 정의
 */
export const TORRENT_STATES = {
  // 다운로드 관련 상태
  DOWNLOADING: 'downloading',
  STALLED_DOWNLOAD: 'stalledDL',
  FORCED_DOWNLOAD: 'forcedDL',
  QUEUED_DOWNLOAD: 'queuedDL',
  CHECKING_DOWNLOAD: 'checkingDL',
  PAUSED_DOWNLOAD: 'pausedDL',

  // 업로드/시딩 관련 상태
  UPLOADING: 'uploading',
  STALLED_UPLOAD: 'stalledUP',
  FORCED_UPLOAD: 'forcedUP',
  QUEUED_UPLOAD: 'queuedUP',
  CHECKING_UPLOAD: 'checkingUP',
  PAUSED_UPLOAD: 'pausedUP',

  // 기타 상태
  ERROR: 'error',
  MISSING_FILES: 'missingFiles',
  MOVING: 'moving',
  UNKNOWN: 'unknown'
};

/**
 * 다운로드 진행 상태 목록
 */
export const ACTIVE_DOWNLOAD_STATES = [
  TORRENT_STATES.DOWNLOADING,
  TORRENT_STATES.STALLED_DOWNLOAD
];

/**
 * 시딩/완료 상태 목록
 */
export const SEEDING_STATES = [
  TORRENT_STATES.UPLOADING,
  TORRENT_STATES.STALLED_UPLOAD,
  TORRENT_STATES.FORCED_UPLOAD,
  TORRENT_STATES.QUEUED_UPLOAD,
  TORRENT_STATES.PAUSED_UPLOAD
];
