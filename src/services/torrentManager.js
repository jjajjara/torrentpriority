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

    // 정체 토렌트 추적용 Map (hash -> { stalledSince: number, lastProgress: number, hasDemoted: boolean })
    this.stalledTracker = new Map();
  }

  /**
   * 토렌트 상태 점검 및 처리 주기 실행
   */
  async processCycle() {
    const cycleStartTime = new Date().toLocaleString('ko-KR');
    console.log(`\n================ [${cycleStartTime}] 작업 사이클 시작 ================`);

    const torrentList = await this.qbitApiClient.fetchTorrentList();
    console.log(`[토렌트 상태] 현재 등록된 토렌트: 총 ${torrentList.length}개`);

    let performedActionsCount = 0;

    // 1. 강제시작(ForceStart) 완료 토렌트 정리
    if (this.config.enableDeleteCompletedForceStart) {
      const deletedCount = await this.cleanupCompletedForceStartTorrents(torrentList);
      performedActionsCount += deletedCount;
    } else {
      console.log('[기능 비활성] 강제시작 완료 토렌트 자동 삭제 기능이 꺼져 있습니다.');
    }

    // 2. 일반(Non-ForceStart) 완료 토렌트 정리
    if (this.config.enableDeleteCompletedNormal) {
      const deletedCount = await this.cleanupCompletedNormalTorrents(torrentList);
      performedActionsCount += deletedCount;
    } else {
      console.log('[기능 비활성] 일반 완료 토렌트 자동 삭제 기능이 꺼져 있습니다.');
    }

    // 3. 멈춤(Stalled) 일반 다운로드 토렌트 감지 및 우선순위 조정
    if (this.config.enableDemoteStalled) {
      const demotedCount = await this.handleStalledDownloadTorrents(torrentList);
      performedActionsCount += demotedCount;
    } else {
      console.log('[기능 비활성] 정체 다운로드 토렌트 우선순위 최하위 조정 기능이 꺼져 있습니다.');
    }

    // 4. 삭제되거나 목록에서 사라진 토렌트 추적 정보 정리 (GC)
    this.cleanupStaleTrackerEntries(torrentList);

    const cycleEndTime = new Date().toLocaleString('ko-KR');
    if (performedActionsCount > 0) {
      console.log(`[작업 결과] 총 ${performedActionsCount}건의 변경 작업이 수행되었습니다.`);
    } else {
      console.log('[작업 결과] 수행할 변경 작업(삭제/우선순위 조정)이 없습니다.');
    }
    console.log(`================ [${cycleEndTime}] 작업 사이클 완료 ================\n`);
  }

  /**
   * 1. 강제시작(ForceStart)이고 100% 완료된 토렌트 삭제
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} 처리된 토렌트 개수
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

    console.log(`\n[강제시작 완료 삭제] 대상 토렌트 ${targetTorrents.length}개 감지:`);
    for (const torrent of targetTorrents) {
      console.log(`  - [대상] "${torrent.name}" (상태: ${torrent.state}, 진행률: ${(torrent.progress * 100).toFixed(1)}%, 해시: ${torrent.hash.substring(0, 8)}...)`);
    }

    const hashes = targetTorrents.map((t) => t.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [드라이런] 실제 삭제는 수행하지 않았습니다. (대상: ${hashes.length}개)`);
      return targetTorrents.length;
    }

    const success = await this.qbitApiClient.deleteTorrents(hashes, this.config.deleteTorrentFiles);
    if (success) {
      for (const torrent of targetTorrents) {
        console.log(`  -> [삭제 완료] "${torrent.name}" (파일 삭제 여부: ${this.config.deleteTorrentFiles ? '파일 포함 삭제' : '토렌트만 삭제'})`);
      }
      return targetTorrents.length;
    }

    return 0;
  }

  /**
   * 2. 일반(Non-ForceStart)이고 100% 완료된 토렌트 삭제
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} 처리된 토렌트 개수
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

    console.log(`\n[일반 완료 삭제] 대상 토렌트 ${targetTorrents.length}개 감지:`);
    for (const torrent of targetTorrents) {
      console.log(`  - [대상] "${torrent.name}" (상태: ${torrent.state}, 진행률: ${(torrent.progress * 100).toFixed(1)}%, 해시: ${torrent.hash.substring(0, 8)}...)`);
    }

    const hashes = targetTorrents.map((t) => t.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [드라이런] 실제 삭제는 수행하지 않았습니다. (대상: ${hashes.length}개)`);
      return targetTorrents.length;
    }

    const success = await this.qbitApiClient.deleteTorrents(hashes, this.config.deleteTorrentFiles);
    if (success) {
      for (const torrent of targetTorrents) {
        console.log(`  -> [삭제 완료] "${torrent.name}" (파일 삭제 여부: ${this.config.deleteTorrentFiles ? '파일 포함 삭제' : '토렌트만 삭제'})`);
      }
      return targetTorrents.length;
    }

    return 0;
  }

  /**
   * 3. 장시간 다운로드가 정체된 일반 토렌트 우선순위 최하위 이동
   * (주의: 강제 다운로드(force_start=true)는 대상에서 제외)
   * @param {Array<Object>} torrentList
   * @returns {Promise<number>} 처리된 토렌트 개수
   */
  async handleStalledDownloadTorrents(torrentList) {
    const now = Date.now();
    const thresholdMs = this.config.stalledThresholdMinutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
    const demoteTargets = [];

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
          console.log(`  [정체 감지 시작] "${torrent.name}" (현재 속도: ${currentDlSpeed} B/s, 진행률: ${(currentProgress * 100).toFixed(1)}%)`);
        } else {
          // 진행률이 증가했으면 정체 시간 리셋
          if (currentProgress > trackInfo.lastProgress) {
            trackInfo.stalledSince = now;
            trackInfo.lastProgress = currentProgress;
            trackInfo.hasDemoted = false;
            console.log(`  [정체 해제/진행됨] "${torrent.name}" (진행률 상승: ${(currentProgress * 100).toFixed(1)}%)`);
          } else {
            const stalledDurationMinutes = (now - trackInfo.stalledSince) / TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;

            // 임계 시간 초과 및 아직 이번 정체 건에 대해 우선순위 조정을 안 한 경우
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
        // 속도가 정상으로 회복된 경우 추적 리셋
        if (trackInfo) {
          this.stalledTracker.delete(torrent.hash);
          console.log(`  [속도 회복] "${torrent.name}" (현재 속도: ${(currentDlSpeed / 1024).toFixed(1)} KB/s)`);
        }
      }
    }

    if (demoteTargets.length === 0) {
      return 0;
    }

    console.log(`\n[정체 토렌트 우선순위 최하위 이동] 대상 ${demoteTargets.length}개 감지:`);
    for (const target of demoteTargets) {
      console.log(
        `  - [대상] "${target.torrent.name}" (정체 지속: ${target.stalledDurationMinutes.toFixed(1)}분, 속도: ${target.speed} B/s, 진행률: ${(target.progress * 100).toFixed(1)}%)`
      );
    }

    const hashes = demoteTargets.map((t) => t.torrent.hash);

    if (this.config.enableDryRun) {
      console.log(`  -> [드라이런] 실제 우선순위 변경은 수행하지 않았습니다. (대상: ${hashes.length}개)`);
      return demoteTargets.length;
    }

    const success = await this.qbitApiClient.moveTorrentsToBottomPriority(hashes);
    if (success) {
      for (const target of demoteTargets) {
        console.log(`  -> [우선순위 변경 완료] "${target.torrent.name}" -> 대기열 최하위(Bottom Priority)로 이동 완료`);
      }
      return demoteTargets.length;
    }

    return 0;
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
