/**
 * Configuration loader and validation module
 */
import dotenv from 'dotenv';
import { DEFAULT_CONFIG_VALUES } from './constants.js';

// Load .env file
dotenv.config();

/**
 * Safely parse string to boolean
 * @param {string|undefined} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return value.trim().toLowerCase() === 'true';
};

/**
 * Safely parse string to positive number
 * @param {string|undefined} value
 * @param {number} defaultValue
 * @param {string} fieldName
 * @returns {number}
 */
const parsePositiveNumber = (value, defaultValue, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  const parsedValue = Number(value);
  if (isNaN(parsedValue) || parsedValue <= 0) {
    throw new Error(`[Config Error] ${fieldName} must be a positive number. Received: ${value}`);
  }
  return parsedValue;
};

/**
 * Validate and normalize URL
 * @param {string|undefined} url
 * @returns {string}
 */
const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('[Config Error] QBIT_URL environment variable is required.');
  }

  const trimmedUrl = url.trim();
  try {
    const parsedUrl = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('[Config Error] QBIT_URL must start with http:// or https://');
    }
    // Remove trailing slash
    return trimmedUrl.replace(/\/+$/, '');
  } catch (error) {
    throw new Error(`[Config Error] Invalid URL format: ${trimmedUrl} (${error.message})`);
  }
};

/**
 * Load and validate application configuration
 */
export const loadConfiguration = () => {
  const qbitUrl = validateAndFormatUrl(process.env.QBIT_URL);
  const qbitUsername = process.env.QBIT_USERNAME?.trim();
  const qbitPassword = process.env.QBIT_PASSWORD;

  if (!qbitUsername) {
    throw new Error('[Config Error] QBIT_USERNAME environment variable is required.');
  }

  if (qbitPassword === undefined || qbitPassword === null) {
    throw new Error('[Config Error] QBIT_PASSWORD environment variable is required.');
  }

  const checkIntervalMinutes = parsePositiveNumber(
    process.env.CHECK_INTERVAL_MINUTES,
    DEFAULT_CONFIG_VALUES.CHECK_INTERVAL_MINUTES,
    'CHECK_INTERVAL_MINUTES'
  );

  const stalledThresholdMinutes = parsePositiveNumber(
    process.env.STALLED_THRESHOLD_MINUTES,
    DEFAULT_CONFIG_VALUES.STALLED_THRESHOLD_MINUTES,
    'STALLED_THRESHOLD_MINUTES'
  );

  const stalledSpeedLimitBytes = parsePositiveNumber(
    process.env.STALLED_SPEED_LIMIT_BYTES,
    DEFAULT_CONFIG_VALUES.STALLED_SPEED_LIMIT_BYTES,
    'STALLED_SPEED_LIMIT_BYTES'
  );

  const deleteTorrentFiles = parseBoolean(
    process.env.DELETE_TORRENT_FILES,
    DEFAULT_CONFIG_VALUES.DELETE_TORRENT_FILES
  );

  const enableDryRun = parseBoolean(
    process.env.ENABLE_DRY_RUN,
    DEFAULT_CONFIG_VALUES.ENABLE_DRY_RUN
  );

  const enableDeleteCompletedForceStart = parseBoolean(
    process.env.ENABLE_DELETE_COMPLETED_FORCE_START,
    DEFAULT_CONFIG_VALUES.ENABLE_DELETE_COMPLETED_FORCE_START
  );

  const enableDeleteCompletedNormal = parseBoolean(
    process.env.ENABLE_DELETE_COMPLETED_NORMAL,
    DEFAULT_CONFIG_VALUES.ENABLE_DELETE_COMPLETED_NORMAL
  );

  const enableDemoteStalled = parseBoolean(
    process.env.ENABLE_DEMOTE_STALLED,
    DEFAULT_CONFIG_VALUES.ENABLE_DEMOTE_STALLED
  );

  return {
    qbitUrl,
    qbitUsername,
    qbitPassword,
    checkIntervalMinutes,
    stalledThresholdMinutes,
    stalledSpeedLimitBytes,
    deleteTorrentFiles,
    enableDryRun,
    enableDeleteCompletedForceStart,
    enableDeleteCompletedNormal,
    enableDemoteStalled
  };
};

export const appConfig = loadConfiguration();
