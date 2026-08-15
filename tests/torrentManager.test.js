/**
 * TorrentManager 비즈니스 로직 단위 테스트
 */
import { TorrentManager } from '../src/services/torrentManager.js';
import { TIME_CONSTANTS } from '../src/constants.js';

const mockConfig = {
  qbitUrl: 'http://localhost:8080',
  qbitUsername: 'admin',
  qbitPassword: 'password',
  checkIntervalMinutes: 1,
  stalledThresholdMinutes: 5,
  stalledSpeedLimitBytes: 1024,
  deleteTorrentFiles: false,
  enableDryRun: false
};

const runTests = async () => {
  console.log('=== TorrentManager 단위 테스트 시작 ===\n');

  let deletedHashes = [];
  let demotedHashes = [];

  const mockApiClient = {
    deleteTorrents: async (hashes, deleteFiles) => {
      deletedHashes.push(...hashes);
      return true;
    },
    moveTorrentsToBottomPriority: async (hashes) => {
      demotedHashes.push(...hashes);
      return true;
    },
    fetchTorrentList: async () => []
  };

  const manager = new TorrentManager(mockApiClient, mockConfig);

  // 테스트 1: 강제시작 + 완료된 토렌트 삭제 검증
  console.log('[테스트 1] 강제시작 + 100% 완료 토렌트 삭제');
  const testTorrents1 = [
    { hash: 'hash1', name: '강제완료_토렌트', force_start: true, progress: 1.0, state: 'forcedUP', dlspeed: 0 },
    { hash: 'hash2', name: '일반완료_토렌트', force_start: false, progress: 1.0, state: 'uploading', dlspeed: 0 },
    { hash: 'hash3', name: '강제진행중_토렌트', force_start: true, progress: 0.5, state: 'forcedDL', dlspeed: 2048 }
  ];

  await manager.cleanupCompletedForceStartTorrents(testTorrents1);
  if (deletedHashes.length === 1 && deletedHashes[0] === 'hash1') {
    console.log('  -> PASS: hash1만 정확하게 삭제 목록에 포함됨\n');
  } else {
    console.error('  -> FAIL: 예상치 못한 삭제 결과', deletedHashes);
    process.exit(1);
  }

  // 테스트 2: 정체된 일반 토렌트 우선순위 최하위 이동 (강제 다운로드는 제외)
  console.log('[테스트 2] 정체된 일반 토렌트 우선순위 최하위 이동 및 강제 다운로드 제외');
  const testTorrents2 = [
    { hash: 'stalled_normal', name: '정체_일반다운', force_start: false, progress: 0.2, state: 'downloading', dlspeed: 500 },
    { hash: 'stalled_forced', name: '정체_강제다운', force_start: true, progress: 0.2, state: 'forcedDL', dlspeed: 500 },
    { hash: 'active_normal', name: '정상_일반다운', force_start: false, progress: 0.3, state: 'downloading', dlspeed: 50000 }
  ];

  // 1차 점검 (시간 등록)
  await manager.handleStalledDownloadTorrents(testTorrents2);
  if (demotedHashes.length === 0) {
    console.log('  -> PASS: 1차 점검 시 즉시 강등되지 않고 추적 시작됨');
  } else {
    console.error('  -> FAIL: 1차 점검에서 즉시 강등됨');
    process.exit(1);
  }

  // 5분 경과 시뮬레이션
  const trackerEntry = manager.stalledTracker.get('stalled_normal');
  if (trackerEntry) {
    trackerEntry.stalledSince -= (6 * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE); // 6분 전으로 조작
  }

  // 2차 점검
  await manager.handleStalledDownloadTorrents(testTorrents2);
  if (demotedHashes.length === 1 && demotedHashes[0] === 'stalled_normal') {
    console.log('  -> PASS: 5분 이상 정체된 일반 토렌트만 최하위로 이동됨 (강제다운로드는 제외)\n');
  } else {
    console.error('  -> FAIL: 예상치 못한 우선순위 변경 결과', demotedHashes);
    process.exit(1);
  }

  console.log('=== 모든 단위 테스트 통과! ===');
};

runTests().catch((err) => {
  console.error('테스트 실행 실패:', err);
  process.exit(1);
});
