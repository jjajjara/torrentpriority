/**
 * TorrentManager business logic unit tests
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
  console.log('=== Starting TorrentManager Unit Tests ===\n');

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

  // 1. ForceStart vs Normal Completed deletion
  console.log('[Test 1] Verify ForceStart vs Normal completed torrent deletion');
  const testTorrents = [
    { hash: 'force_done', name: 'Force_Completed_Torrent', force_start: true, progress: 1.0, state: 'forcedUP', dlspeed: 0 },
    { hash: 'normal_done', name: 'Normal_Completed_Torrent', force_start: false, progress: 1.0, state: 'uploading', dlspeed: 0 },
    { hash: 'downloading', name: 'Downloading_Torrent', force_start: false, progress: 0.5, state: 'downloading', dlspeed: 2048 }
  ];

  const manager = new TorrentManager(mockApiClient, createBaseConfig());

  deletedHashes = [];
  await manager.cleanupCompletedForceStartTorrents(testTorrents);
  if (deletedHashes.length === 1 && deletedHashes[0] === 'force_done') {
    console.log('  -> PASS: cleanupCompletedForceStartTorrents deletes only force_done');
  } else {
    console.error('  -> FAIL: Unexpected force deletion result', deletedHashes);
    process.exit(1);
  }

  deletedHashes = [];
  await manager.cleanupCompletedNormalTorrents(testTorrents);
  if (deletedHashes.length === 1 && deletedHashes[0] === 'normal_done') {
    console.log('  -> PASS: cleanupCompletedNormalTorrents deletes only normal_done\n');
  } else {
    console.error('  -> FAIL: Unexpected normal deletion result', deletedHashes);
    process.exit(1);
  }

  // 2. Feature toggles test
  console.log('[Test 2] Verify feature toggle behavior');
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
    console.log('  -> PASS: All actions skipped when toggles are OFF\n');
  } else {
    console.error('  -> FAIL: Actions were performed while toggles were OFF');
    process.exit(1);
  }

  // 3. Stalled download demotion test
  console.log('[Test 3] Verify stalled download demotion (excluding force-downloads)');
  const testTorrentsStalled = [
    { hash: 'stalled_normal', name: 'Stalled_Normal', force_start: false, progress: 0.1, state: 'downloading', dlspeed: 200 },
    { hash: 'stalled_forced', name: 'Stalled_Forced', force_start: true, progress: 0.1, state: 'forcedDL', dlspeed: 200 }
  ];

  const activeManager = new TorrentManager(mockApiClient, createBaseConfig());
  demotedHashes = [];

  // Cycle 1: Track start
  await activeManager.handleStalledDownloadTorrents(testTorrentsStalled);
  if (demotedHashes.length === 0) {
    console.log('  -> PASS: Tracking started on first check without immediate demotion');
  }

  // Simulate 6 minutes passed
  const entry = activeManager.stalledTracker.get('stalled_normal');
  if (entry) {
    entry.stalledSince -= (6 * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE);
  }

  // Cycle 2: Demotion
  await activeManager.handleStalledDownloadTorrents(testTorrentsStalled);
  if (demotedHashes.length === 1 && demotedHashes[0] === 'stalled_normal') {
    console.log('  -> PASS: Only stalled normal download was demoted to bottom priority\n');
  } else {
    console.error('  -> FAIL: Demotion test failed', demotedHashes);
    process.exit(1);
  }

  console.log('=== All Unit Tests Passed Successfully! ===');
};

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
