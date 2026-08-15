/**
 * qBittorrent Priority Manager main entrypoint
 */
import { appConfig } from './config.js';
import { TIME_CONSTANTS } from './constants.js';
import { QbitApiClient } from './services/qbitApi.js';
import { TorrentManager } from './services/torrentManager.js';

/**
 * Print application configuration summary
 */
const printConfigurationSummary = () => {
  console.log('==============================================');
  console.log('       qBittorrent Priority Manager           ');
  console.log('==============================================');
  console.log(`- Server URL: ${appConfig.qbitUrl}`);
  console.log(`- Username: ${appConfig.qbitUsername}`);
  console.log(`- Check Interval: Every ${appConfig.checkIntervalMinutes} minute(s)`);
  console.log(`- Stalled Threshold: ${appConfig.stalledThresholdMinutes} minute(s)`);
  console.log(`- Stalled Speed Limit: ${appConfig.stalledSpeedLimitBytes} Bytes/s (1 KB/s)`);
  console.log(`- Delete Downloaded Files on Removal: ${appConfig.deleteTorrentFiles ? 'YES' : 'NO (Torrent entry only)'}`);
  console.log(`- Dry-Run Mode: ${appConfig.enableDryRun ? 'ON (No changes applied)' : 'OFF (Live execution)'}`);
  console.log('---------------- [Feature Toggles] ------------');
  console.log(`- [Feature 1] Delete Completed ForceStart: ${appConfig.enableDeleteCompletedForceStart ? 'ON' : 'OFF'}`);
  console.log(`- [Feature 2] Delete Completed Normal:     ${appConfig.enableDeleteCompletedNormal ? 'ON' : 'OFF'}`);
  console.log(`- [Feature 3] Demote Stalled Downloads:    ${appConfig.enableDemoteStalled ? 'ON' : 'OFF'}`);
  console.log('==============================================\n');
};

/**
 * Main application execution
 */
const startApplication = async () => {
  try {
    printConfigurationSummary();

    const qbitApiClient = new QbitApiClient(appConfig);
    const torrentManager = new TorrentManager(qbitApiClient, appConfig);

    // 1. Initial Login
    await qbitApiClient.login();

    // 2. Execute 1 cycle immediately upon start
    await torrentManager.processCycle();

    // 3. Register periodic interval loop
    const intervalMs = appConfig.checkIntervalMinutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
    const intervalTimer = setInterval(async () => {
      try {
        await torrentManager.processCycle();
      } catch (cycleError) {
        console.error(`[Cycle Error] Error occurred during cycle execution: ${cycleError.message}`);
      }
    }, intervalMs);

    // Graceful process termination
    const handleShutdown = () => {
      console.log('\nShutdown signal received. Exiting gracefully...');
      clearInterval(intervalTimer);
      process.exit(0);
    };

    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);

    console.log(`Daemon is running in the background (Interval: ${appConfig.checkIntervalMinutes}m).`);
  } catch (error) {
    console.error(`[Startup Error] ${error.message}`);
    process.exit(1);
  }
};

startApplication();
