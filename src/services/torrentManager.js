/**
 * Torrent management business logic module
 */
import {
  TIME_CONSTANTS,
  ACTIVE_DOWNLOAD_STATES,
  SEEDING_STATES
} from '../constants.js';

export class TorrentManager {
  /**
   * @param {import('./qbitApi.js').QbitApiClient} qbitApiClient
   * @param {Object} config
   */
  constructor(qbitApiClient, config) {
    this.qbitApiClient = qbitApiClient;
    this.config = config;

    // Tracker map for stalled torrents (hash -> { stalledSince: number, lastProgress: number, hasDemoted: boolean })
    this.stalledTracker = new Map();
  }

  /**
   * Run a single processing cycle
   */
  async processCycle() {
    const cycleStartTime = new Date().toISOString();
    console.log(`\n================ [${cycleStartTime}] Processing Cycle Start ================`);

    const torrentList = await this.qbitApiClient.fetchTorrentList();
    console.log(`[Torrent Status] Total registered torrents: ${torrentList.length}`);

    let performedActionsCount = 0;

    // 1. Cleanup completed ForceStart torrents
    if (this.config.enableDeleteCompletedForceStart) {
      const deletedCount = await this.cleanupCompletedForceStartTorrents(torrentList);
      performedActionsCount += deletedCount;
    } else {
      console.log('[Feature Disabled] Auto-deletion of completed ForceStart torrents is OFF.');
    }

    // 2. Cleanup completed normal torrents
    if (this.config.enableDeleteCompletedNormal) {
      const deletedCount = await this.cleanupCompletedNormalTorrents(torrentList);
      performedActionsCount += deletedCount;
    } else {
      console.log('[Feature Disabled] Auto-deletion of completed normal torrents is OFF.');
    }

    // 3. Detect and demote stalled normal download torrents
    if (this.config.enableDemoteStalled) {
      const demotedCount = await this.handleStalledDownloadTorrents(torrentList);
      performedActionsCount += demotedCount;
    } else {
      console.log('[Feature Disabled] Demoting stalled download torrents is OFF.');
    }

    // 4. Garbage collect removed torrents from tracker
    this.cleanupStaleTrackerEntries(torrentList);

    const cycleEndTime = new Date().toISOString();
    if (performedActionsCount > 0) {
      console.log(`[Cycle Summary] Performed ${performedActionsCount} action(s).`);
    } else {
      console.log('[Cycle Summary] No actions required (no torrents matched deletion or demotion criteria).');
    }
    console.log(`================ [${cycleEndTime}] Processing Cycle Finished ================\n`);
  }

  /**
   * 1. Delete ForceStart torrents that reached 100% completion
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} Number of processed torrents
   */
  async cleanupCompletedForceStartTorrents(torrentList) {
    const targetTorrents = torrentList.filter((torrent) => {
      const isForceStart = Boolean(torrent.force_start);
      const isCompleted = torrent.progress >= 1.0 || SEEDING_STATES.includes(torrent.state);
      return isForceStart && isCompleted;
    });

    if (targetTorrents.length === 0) {
      return 0;
    }

    console.log(`\n[Action: Delete ForceStart Completed] Found ${targetTorrents.length} target(s):`);
    for (const torrent of targetTorrents) {
      console.log(`  - [Target] "${torrent.name}" (State: ${torrent.state}, Progress: ${(torrent.progress * 100).toFixed(1)}%, Hash: ${torrent.hash.substring(0, 8)}...)`);
    }

    const hashes = targetTorrents.map((t) => t.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [Dry Run] Skipped actual deletion (${hashes.length} target(s)).`);
      return targetTorrents.length;
    }

    const success = await this.qbitApiClient.deleteTorrents(hashes, this.config.deleteTorrentFiles);
    if (success) {
      for (const torrent of targetTorrents) {
        console.log(`  -> [Deleted] "${torrent.name}" (Delete Files: ${this.config.deleteTorrentFiles ? 'YES' : 'NO (Torrent only)'})`);
      }
      return targetTorrents.length;
    }

    return 0;
  }

  /**
   * 2. Delete normal (Non-ForceStart) torrents that reached 100% completion
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} Number of processed torrents
   */
  async cleanupCompletedNormalTorrents(torrentList) {
    const targetTorrents = torrentList.filter((torrent) => {
      const isForceStart = Boolean(torrent.force_start);
      const isCompleted = torrent.progress >= 1.0 || SEEDING_STATES.includes(torrent.state);
      return !isForceStart && isCompleted;
    });

    if (targetTorrents.length === 0) {
      return 0;
    }

    console.log(`\n[Action: Delete Normal Completed] Found ${targetTorrents.length} target(s):`);
    for (const torrent of targetTorrents) {
      console.log(`  - [Target] "${torrent.name}" (State: ${torrent.state}, Progress: ${(torrent.progress * 100).toFixed(1)}%, Hash: ${torrent.hash.substring(0, 8)}...)`);
    }

    const hashes = targetTorrents.map((t) => t.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [Dry Run] Skipped actual deletion (${hashes.length} target(s)).`);
      return targetTorrents.length;
    }

    const success = await this.qbitApiClient.deleteTorrents(hashes, this.config.deleteTorrentFiles);
    if (success) {
      for (const torrent of targetTorrents) {
        console.log(`  -> [Deleted] "${torrent.name}" (Delete Files: ${this.config.deleteTorrentFiles ? 'YES' : 'NO (Torrent only)'})`);
      }
      return targetTorrents.length;
    }

    return 0;
  }

  /**
   * 3. Demote stalled normal download torrents to the bottom priority
   * (Note: Force-download torrents with force_start=true are excluded)
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} Number of processed torrents
   */
  async handleStalledDownloadTorrents(torrentList) {
    const now = Date.now();
    const thresholdMs = this.config.stalledThresholdMinutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
    const demoteTargets = [];

    for (const torrent of torrentList) {
      // Exclude force-downloads (force_start=true) or completed torrents
      if (torrent.force_start || torrent.progress >= 1.0) {
        this.stalledTracker.delete(torrent.hash);
        continue;
      }

      // Target active download states only
      const isDownloadingState = ACTIVE_DOWNLOAD_STATES.includes(torrent.state);
      if (!isDownloadingState) {
        this.stalledTracker.delete(torrent.hash);
        continue;
      }

      const currentDlSpeed = torrent.dlspeed || 0;
      const currentProgress = torrent.progress || 0;
      const isSpeedStalled = currentDlSpeed < this.config.stalledSpeedLimitBytes;

      const trackInfo = this.stalledTracker.get(torrent.hash);

      if (isSpeedStalled) {
        if (!trackInfo) {
          // Start tracking stall
          this.stalledTracker.set(torrent.hash, {
            stalledSince: now,
            lastProgress: currentProgress,
            hasDemoted: false
          });
          console.log(`  [Stall Track Started] "${torrent.name}" (Speed: ${currentDlSpeed} B/s, Progress: ${(currentProgress * 100).toFixed(1)}%)`);
        } else {
          // Reset stall if progress increased
          if (currentProgress > trackInfo.lastProgress) {
            trackInfo.stalledSince = now;
            trackInfo.lastProgress = currentProgress;
            trackInfo.hasDemoted = false;
            console.log(`  [Stall Reset / Progressed] "${torrent.name}" (Progress: ${(currentProgress * 100).toFixed(1)}%)`);
          } else {
            const stalledDurationMinutes = (now - trackInfo.stalledSince) / TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;

            // Check if threshold exceeded and not yet demoted in this stalled session
            if ((now - trackInfo.stalledSince) >= thresholdMs && !trackInfo.hasDemoted) {
              demoteTargets.push({
                torrent,
                stalledDurationMinutes,
                speed: currentDlSpeed,
                progress: currentProgress
              });
              trackInfo.hasDemoted = true;
            }
          }
        }
      } else {
        // Speed recovered: clear tracker
        if (trackInfo) {
          this.stalledTracker.delete(torrent.hash);
          console.log(`  [Speed Recovered] "${torrent.name}" (Current Speed: ${(currentDlSpeed / 1024).toFixed(1)} KB/s)`);
        }
      }
    }

    if (demoteTargets.length === 0) {
      return 0;
    }

    console.log(`\n[Action: Demote Stalled Downloads] Found ${demoteTargets.length} target(s):`);
    for (const target of demoteTargets) {
      console.log(
        `  - [Target] "${target.torrent.name}" (Stalled: ${target.stalledDurationMinutes.toFixed(1)}m, Speed: ${target.speed} B/s, Progress: ${(target.progress * 100).toFixed(1)}%)`
      );
    }

    const hashes = demoteTargets.map((t) => t.torrent.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [Dry Run] Skipped actual demotion (${hashes.length} target(s)).`);
      return demoteTargets.length;
    }

    const success = await this.qbitApiClient.moveTorrentsToBottomPriority(hashes);
    if (success) {
      for (const target of demoteTargets) {
        console.log(`  -> [Demoted] "${target.torrent.name}" -> Moved to Bottom Priority (Queue End)`);
      }
      return demoteTargets.length;
    }

    return 0;
  }

  /**
   * Clean up tracker entries for torrents no longer in list
   * @param {Array<Object>} torrentList
   */
  cleanupStaleTrackerEntries(torrentList) {
    const activeHashes = new Set(torrentList.map((t) => t.hash));
    for (const trackedHash of this.stalledTracker.keys()) {
      if (!activeHashes.has(trackedHash)) {
        this.stalledTracker.delete(trackedHash);
      }
    }
  }
}
