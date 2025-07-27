import { ipcMain } from 'electron';
import { CU12SmartStateManager } from '../stateManager';
import { logger } from '../../../logger';

export const cu12StatusHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-get-status', async (event, payload) => {
    try {
      // Trigger user interaction for active monitoring
      await stateManager.onUserInteraction();
      
      // Get current slot status
      const slotStatus = await stateManager.syncSlotStatus('ON_DEMAND');
      
      // Get system health
      const healthStatus = await stateManager.getHealthStatus();
      
      return {
        success: true,
        connected: stateManager.isConnected(),
        monitoringMode: stateManager.getMonitoringMode(),
        slotStatus,
        healthStatus,
        timestamp: Date.now()
      };
    } catch (error) {
      await logger({
        user: 'system',
        message: `CU12 get status error - ${error.message}`,
      });

      return {
        success: false,
        error: error.message,
        connected: false,
        monitoringMode: 'error'
      };
    }
  });
};

export const cu12CheckLockedBackHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-check-locked-back', async (event, payload) => {
    try {
      // Enter operation mode for status check
      await stateManager.enterOperationMode(`check_locked_back_${payload.slotId}`);
      
      // Get current slot status
      const slotStatus = await stateManager.syncSlotStatus('PRE_OPERATION');
      const targetSlot = slotStatus.find(slot => slot.slotId === payload.slotId);
      
      if (!targetSlot) {
        throw new Error(`Slot ${payload.slotId} not found`);
      }

      const isLockedBack = targetSlot.isLocked;
      
      await logger({
        user: 'system',
        message: `CU12 check locked back: slot #${payload.slotId} - ${isLockedBack ? 'locked' : 'unlocked'}`,
      });

      // Exit operation mode
      await stateManager.exitOperationMode();

      return {
        success: true,
        slotId: payload.slotId,
        isLockedBack,
        slotStatus: targetSlot,
        monitoringMode: stateManager.getMonitoringMode()
      };

    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      await logger({
        user: 'system',
        message: `CU12 check locked back: slot #${payload.slotId} error - ${error.message}`,
      });

      return {
        success: false,
        error: error.message,
        slotId: payload.slotId
      };
    }
  });
};

export const cu12HealthCheckHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-health-check', async (event, payload) => {
    try {
      const healthStatus = await stateManager.getHealthStatus();
      const failureDetector = (stateManager as any).failureDetector;
      
      let monitoringReport = null;
      if (failureDetector) {
        monitoringReport = await failureDetector.generateMonitoringReport();
      }

      await logger({
        user: 'system',
        message: `CU12 health check - System: ${monitoringReport?.systemHealth || 'unknown'}`,
      });

      return {
        success: true,
        healthStatus,
        monitoringReport,
        connected: stateManager.isConnected(),
        monitoringMode: stateManager.getMonitoringMode(),
        timestamp: Date.now()
      };

    } catch (error) {
      await logger({
        user: 'system',
        message: `CU12 health check error - ${error.message}`,
      });

      return {
        success: false,
        error: error.message,
        connected: false,
        systemHealth: 'error'
      };
    }
  });
};