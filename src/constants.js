/**
 * Constants definition module for qBittorrent Priority Manager
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
  ENABLE_DRY_RUN: false,
  // Feature toggle defaults
  ENABLE_DELETE_COMPLETED_FORCE_START: true, // Delete completed ForceStart torrents
  ENABLE_DELETE_COMPLETED_NORMAL: false,      // Delete completed normal torrents (default false for safety)
  ENABLE_DEMOTE_STALLED: true                // Demote stalled downloads to bottom priority
};

/**
 * qBittorrent torrent state definitions
 */
export const TORRENT_STATES = {
  // Download states
  DOWNLOADING: 'downloading',
  STALLED_DOWNLOAD: 'stalledDL',
  FORCED_DOWNLOAD: 'forcedDL',
  QUEUED_DOWNLOAD: 'queuedDL',
  CHECKING_DOWNLOAD: 'checkingDL',
  PAUSED_DOWNLOAD: 'pausedDL',

  // Upload/Seeding states
  UPLOADING: 'uploading',
  STALLED_UPLOAD: 'stalledUP',
  FORCED_UPLOAD: 'forcedUP',
  QUEUED_UPLOAD: 'queuedUP',
  CHECKING_UPLOAD: 'checkingUP',
  PAUSED_UPLOAD: 'pausedUP',

  // Other states
  ERROR: 'error',
  MISSING_FILES: 'missingFiles',
  MOVING: 'moving',
  UNKNOWN: 'unknown'
};

/**
 * Active download states
 */
export const ACTIVE_DOWNLOAD_STATES = [
  TORRENT_STATES.DOWNLOADING,
  TORRENT_STATES.STALLED_DOWNLOAD
];

/**
 * Completed/Seeding states
 */
export const SEEDING_STATES = [
  TORRENT_STATES.UPLOADING,
  TORRENT_STATES.STALLED_UPLOAD,
  TORRENT_STATES.FORCED_UPLOAD,
  TORRENT_STATES.QUEUED_UPLOAD,
  TORRENT_STATES.PAUSED_UPLOAD
];
