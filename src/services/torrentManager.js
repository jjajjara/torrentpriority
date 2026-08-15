/**
 * 토렌트 비즈니스 로직 관리 모듈
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

    // 정체 토렌트 추적용 Map (hash -> { stalledSince: number, lastProgress: number })
    this.stalledTracker = new Map();
  }

  /**
   * 토렌트 상태 점검 및 처리 주기 실행
   */
  async processCycle() {
    console.log(`\n[${new Date().toLocaleString('ko-KR')}] 토렌트 관리 작업 시작...`);

    const torrentList = await this.qbitApiClient.fetchTorrentList();
    console.log(`[토렌트 상태] 전체 ${torrentList.length}개의 토렌트 감지`);

    // 1. 완료된 강제시작(ForceStart) 토렌트 정리
    await this.cleanupCompletedForceStartTorrents(torrentList);

    // 2. 멈춤(Stalled) 일반 다운로드 토렌트 감지 및 우선순위 조정
    await this.handleStalledDownloadTorrents(torrentList);

    // 3. 존재하지 않는 토렌트 추적 정보 정리 (GC)
    this.cleanupStaleTrackerEntries(torrentList);

    console.log(`[${new Date().toLocaleString('ko-KR')}] 토렌트 관리 작업 완료`);
  }

  /**
   * 1. 강제시작(ForceStart)이고 100% 완료된 토렌트 삭제
   * @param {Array<Object>} torrentList
   */
  async cleanupCompletedForceStartTorrents(torrentList) {
    const targetTorrents = torrentList.filter((torrent) => {
      const isForceStart = Boolean(torrent.force_start);
      const isCompleted = torrent.progress >= 1.0 || SEEDING_STATES.includes(torrent.state);
      return isForceStart && isCompleted;
    });

    if (targetTorrents.length === 0) {
      return;
    }

    console.log(`[강제시작 완료 삭제] 대상 ${targetTorrents.length}개 발견`);
    for (const torrent of targetTorrents) {
      console.log(`  - [삭제 대상] 이름: "${torrent.name}", 상태: ${torrent.state}, 진행률: ${(torrent.progress * 100).toFixed(1)}%`);
    }

    const hashes = targetTorrents.map((t) => t.hash);

    if (this.config.enableDryRun) {
      console.log(`[드라이런] 실제 삭제는 수행하지 않았습니다. (대상 수: ${hashes.length})`);
      return;
    }

    const success = await this.qbitApiClient.deleteTorrents(hashes, this.config.deleteTorrentFiles);
    if (success) {
      console.log(`[강제시작 완료 삭제] ${hashes.length}개의 토렌트를 성공적으로 삭제했습니다.`);
    }
  }

  /**
   * 2. 장시간 다운로드가 정체된 일반 토렌트 우선순위 최하위 이동
   * (주의: 강제 다운로드(force_start=true)는 대상에서 제외)
   * @param {Array<Object>} torrentList
   */
  async handleStalledDownloadTorrents(torrentList) {
    const now = Date.now();
    const thresholdMs = this.config.stalledThresholdMinutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
    const hashesToDemote = [];

    for (const torrent of torrentList) {
      // 강제 다운로드(force_start=true) 또는 이미 완료된 토렌트는 제외
      if (torrent.force_start || torrent.progress >= 1.0) {
        this.stalledTracker.delete(torrent.hash);
        continue;
      }

      // 다운로드 진행 중이거나 정체 상태인 토렌트 대상
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
          // 정체 감지 시작
          this.stalledTracker.set(torrent.hash, {
            stalledSince: now,
            lastProgress: currentProgress,
            hasDemoted: false
          });
        } else {
          // 진행률이 증가했으면 정체 시간 리셋
          if (currentProgress > trackInfo.lastProgress) {
            trackInfo.stalledSince = now;
            trackInfo.lastProgress = currentProgress;
            trackInfo.hasDemoted = false;
          } else {
            const stalledDurationMinutes = (now - trackInfo.stalledSince) / TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;

            // 임계 시간 초과 및 아직 이번 정체 건에 대해 우선순위 조정을 안 한 경우
            if ((now - trackInfo.stalledSince) >= thresholdMs && !trackInfo.hasDemoted) {
              console.log(
                `  - [우선순위 강등 대상] 이름: "${torrent.name}", 정체 지속: ${stalledDurationMinutes.toFixed(1)}분 (속도: ${currentDlSpeed} B/s, 진행률: ${(currentProgress * 100).toFixed(1)}%)`
              );
              hashesToDemote.push(torrent.hash);
              trackInfo.hasDemoted = true;
            }
          }
        }
      } else {
        // 속도가 정상인 경우 추적 리셋
        if (trackInfo) {
          this.stalledTracker.delete(torrent.hash);
        }
      }
    }

    if (hashesToDemote.length === 0) {
      return;
    }

    console.log(`[우선순위 조정] ${hashesToDemote.length}개의 정체된 토렌트를 대기열 최하위로 이동합니다.`);

    if (this.config.enableDryRun) {
      console.log(`[드라이런] 실제 우선순위 변경은 수행하지 않았습니다. (대상 수: ${hashesToDemote.length})`);
      return;
    }

    const success = await this.qbitApiClient.moveTorrentsToBottomPriority(hashesToDemote);
    if (success) {
      console.log(`[우선순위 조정] ${hashesToDemote.length}개의 토렌트 우선순위를 최하위로 변경 완료했습니다.`);
    }
  }

  /**
   * 삭제되거나 완료되어 목록에 없는 토렌트의 추적 정보 정리
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
