/**
 * 환경 설정 로드 및 유효성 검증 모듈
 */
import dotenv from 'dotenv';
import { DEFAULT_CONFIG_VALUES } from './constants.js';

// .env 파일 로드
dotenv.config();

/**
 * 문자열을 불리언 값으로 안전하게 변환
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
 * 문자열을 양의 정수로 안전하게 변환
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
    throw new Error(`[설정 오류] ${fieldName} 값은 0보다 큰 숫자여야 합니다. 현재 입력값: ${value}`);
  }
  return parsedValue;
};

/**
 * URL 형식 검증 및 정규화
 * @param {string|undefined} url
 * @returns {string}
 */
const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    throw new Error('[설정 오류] QBIT_URL 환경변수가 설정되지 않았습니다.');
  }

  const trimmedUrl = url.trim();
  try {
    const parsedUrl = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('[설정 오류] QBIT_URL은 http:// 또는 https:// 로 시작해야 합니다.');
    }
    // 마지막 슬래시 제거
    return trimmedUrl.replace(/\/+$/, '');
  } catch (error) {
    throw new Error(`[설정 오류] 올바른 URL 형식이 아닙니다: ${trimmedUrl} (${error.message})`);
  }
};

/**
 * 환경 설정 객체 생성 및 검증
 */
export const loadConfiguration = () => {
  const qbitUrl = validateAndFormatUrl(process.env.QBIT_URL);
  const qbitUsername = process.env.QBIT_USERNAME?.trim();
  const qbitPassword = process.env.QBIT_PASSWORD;

  if (!qbitUsername) {
    throw new Error('[설정 오류] QBIT_USERNAME 환경변수가 설정되지 않았습니다.');
  }

  if (qbitPassword === undefined || qbitPassword === null) {
    throw new Error('[설정 오류] QBIT_PASSWORD 환경변수가 설정되지 않았습니다.');
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
