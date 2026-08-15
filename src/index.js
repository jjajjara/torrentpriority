/**
 * qBittorrent 자동 관리 도구 메인 엔트리포인트
 */
import { appConfig } from './config.js';
import { TIME_CONSTANTS } from './constants.js';
import { QbitApiClient } from './services/qbitApi.js';
import { TorrentManager } from './services/torrentManager.js';

/**
 * 환경 설정 요약 정보 출력
 */
const printConfigurationSummary = () => {
  console.log('==============================================');
  console.log('       qBittorrent 자동 관리 도구 시작         ');
  console.log('==============================================');
  console.log(`- 서버 URL: ${appConfig.qbitUrl}`);
  console.log(`- 계정: ${appConfig.qbitUsername}`);
  console.log(`- 점검 주기: ${appConfig.checkIntervalMinutes}분마다`);
  console.log(`- 정체 기준 시간: ${appConfig.stalledThresholdMinutes}분`);
  console.log(`- 정체 기준 속도: ${appConfig.stalledSpeedLimitBytes} Bytes/s (1 KB/s)`);
  console.log(`- 삭제 시 실제 파일 포함 삭제: ${appConfig.deleteTorrentFiles ? '예' : '아니오 (토렌트만 삭제)'}`);
  console.log(`- 드라이 런(Dry Run) 모드: ${appConfig.enableDryRun ? 'ON (실제 수정 없음)' : 'OFF (실제 적용)'}`);
  console.log('---------------- [기능별 활성화] -------------');
  console.log(`- [기능 1] 완료된 강제시작 토렌트 삭제: ${appConfig.enableDeleteCompletedForceStart ? 'ON' : 'OFF'}`);
  console.log(`- [기능 2] 완료된 일반 토렌트 삭제: ${appConfig.enableDeleteCompletedNormal ? 'ON' : 'OFF'}`);
  console.log(`- [기능 3] 정체된 토렌트 최하위 강등: ${appConfig.enableDemoteStalled ? 'ON' : 'OFF'}`);
  console.log('==============================================\n');
};

/**
 * 메인 실행 함수
 */
const startApplication = async () => {
  try {
    printConfigurationSummary();

    const qbitApiClient = new QbitApiClient(appConfig);
    const torrentManager = new TorrentManager(qbitApiClient, appConfig);

    // 1. 초기 로그인
    await qbitApiClient.login();

    // 2. 시작 시 1회 즉시 실행
    await torrentManager.processCycle();

    // 3. 주기적 실행 타이머 등록
    const intervalMs = appConfig.checkIntervalMinutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
    const intervalTimer = setInterval(async () => {
      try {
        await torrentManager.processCycle();
      } catch (cycleError) {
        console.error(`[작업 오류] 주기 실행 중 에러 발생: ${cycleError.message}`);
      }
    }, intervalMs);

    // 프로세스 종료 시그널 처리
    const handleShutdown = () => {
      console.log('\n프로세스 종료 신호 수신. 안전하게 종료합니다...');
      clearInterval(intervalTimer);
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    console.log(`\n데몬이 백그라운드에서 동작 중입니다. (${appConfig.checkIntervalMinutes}분 간격)`);
  } catch (error) {
    console.error(`[초기화 실패] ${error.message}`);
    process.exit(1);
  }
};

startApplication();
