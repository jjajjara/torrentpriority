/**
 * TorrentManager 비즈니스 로직 및 기능별 토글 단위 테스트
 */
import { TorrentManager } from '../src/services/torrentManager.js';
import { TIME_CONSTANTS } from '../src/constants.js';

const createBaseConfig = (overrides = {}) => ({
  qbitUrl: 'http://localhost:8080',
  qbitUsername: 'admin',
  qbitPassword: 'password',
  checkIntervalMinutes: 1,
  stalledThresholdMinutes: 5,
  stalledSpeedLimitBytes: 1024,
  deleteTorrentFiles: false,
  enableDryRun: false,
  enableDeleteCompletedForceStart: true,
  enableDeleteCompletedNormal: true,
  enableDemoteStalled: true,
  ...overrides
});

const runTests = async () => {
  console.log('=== TorrentManager 종합 단위 테스트 시작 ===\n');

  let deletedHashes = [];
  let demotedHashes = [];

  const mockApiClient = {
    deleteTorrents: async (hashes) => {
      deletedHashes.push(...hashes);
      return true;
    },
    moveTorrentsToBottomPriority: async (hashes) => {
      demotedHashes.push(...hashes);
      return true;
    },
    fetchTorrentList: async () => []
  };

  // 1. 강제시작 완료 토렌트 삭제 및 일반 완료 토렌트 삭제 검증
  console.log('[테스트 1] 강제시작 완료 토렌트 삭제 vs 일반 완료 토렌트 삭제');
  const testTorrents = [
    { hash: 'force_done', name: '강제완료_토렌트', force_start: true, progress: 1.0, state: 'forcedUP', dlspeed: 0 },
    { hash: 'normal_done', name: '일반완료_토렌트', force_start: false, progress: 1.0, state: 'uploading', dlspeed: 0 },
    { hash: 'downloading', name: '다운로드중_토렌트', force_start: false, progress: 0.5, state: 'downloading', dlspeed: 2048 }
  ];

  const manager = new TorrentManager(mockApiClient, createBaseConfig());

  deletedHashes = [];
  await manager.cleanupCompletedForceStartTorrents(testTorrents);
  if (deletedHashes.length === 1 && deletedHashes[0] === 'force_done') {
    console.log('  -> PASS: cleanupCompletedForceStartTorrents는 force_done만 삭제');
  } else {
    console.error('  -> FAIL: 예상치 못한 강제완료 삭제 결과', deletedHashes);
    process.exit(1);
  }

  deletedHashes = [];
  await manager.cleanupCompletedNormalTorrents(testTorrents);
  if (deletedHashes.length === 1 && deletedHashes[0] === 'normal_done') {
    console.log('  -> PASS: cleanupCompletedNormalTorrents는 normal_done만 삭제\n');
  } else {
    console.error('  -> FAIL: 예상치 못한 일반완료 삭제 결과', deletedHashes);
    process.exit(1);
  }

  // 2. 기능별 On/Off 토글 테스트
  console.log('[테스트 2] 기능별 On/Off 토글 동작 검증');
  const disabledConfig = createBaseConfig({
    enableDeleteCompletedForceStart: false,
    enableDeleteCompletedNormal: false,
    enableDemoteStalled: false
  });

  const disabledManager = new TorrentManager(mockApiClient, disabledConfig);
  deletedHashes = [];
  demotedHashes = [];

  mockApiClient.fetchTorrentList = async () => testTorrents;
  await disabledManager.processCycle();

  if (deletedHashes.length === 0 && demotedHashes.length === 0) {
    console.log('  -> PASS: 모든 기능 OFF 시 아무런 삭제/우선순위 변경도 일어나지 않음\n');
  } else {
    console.error('  -> FAIL: 기능이 OFF인데 작업이 수행됨');
    process.exit(1);
  }

  // 3. 정체 토렌트 우선순위 최하위 이동 및 상세 로그 검증
  console.log('[테스트 3] 정체된 일반 토렌트 5분 지속 시 우선순위 최하위 이동 (강제다운로드 제외)');
  const testTorrentsStalled = [
    { hash: 'stalled_normal', name: '정체_일반', force_start: false, progress: 0.1, state: 'downloading', dlspeed: 200 },
    { hash: 'stalled_forced', name: '정체_강제', force_start: true, progress: 0.1, state: 'forcedDL', dlspeed: 200 }
  ];

  const activeManager = new TorrentManager(mockApiClient, createBaseConfig());
  demotedHashes = [];

  // 1차 점검 (등록)
  await activeManager.handleStalledDownloadTorrents(testTorrentsStalled);
  if (demotedHashes.length === 0) {
    console.log('  -> PASS: 1차 점검 시 즉시 강등되지 않고 추적 시작');
  }

  // 5분 경과
  const entry = activeManager.stalledTracker.get('stalled_normal');
  if (entry) {
    entry.stalledSince -= (6 * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE);
  }

  // 2차 점검
  await activeManager.handleStalledDownloadTorrents(testTorrentsStalled);
  if (demotedHashes.length === 1 && demotedHashes[0] === 'stalled_normal') {
    console.log('  -> PASS: 5분 이상 정체된 일반 토렌트만 최하위로 이동됨 (강제다운로드는 제외)\n');
  } else {
    console.error('  -> FAIL: 우선순위 변경 실패', demotedHashes);
    process.exit(1);
  }

  console.log('=== 모든 종합 단위 테스트 완벽 통과! ===');
};

runTests().catch((err) => {
  console.error('테스트 실행 에러:', err);
  process.exit(1);
});
