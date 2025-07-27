import { ipcMain } from 'electron';
import { CU12SmartStateManager } from '../stateManager';
import { logger } from '../../../logger';

export const cu12ReactivateAllHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-reactivate-all', async (event, payload) => {
    try {
      await logger({
        user: 'system',
        message: 'CU12 reactivate all slots',
      });

      // Enter operation mode for mass reactivation
      await stateManager.enterOperationMode('reactivate_all_slots');

      // Pre-operation status check
      const preOpStatus = await stateManager.syncSlotStatus('PRE_OPERATION');

      // Perform mass reactivation (integrate with actual CU12 hardware)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate mass reactivation time

      // Clear any failure tracking for all slots
      const failureDetector = (stateManager as any).failureDetector;
      if (failureDetector) {
        for (let i = 1; i <= 12; i++) {
          failureDetector.resetFailureTracking(`slot_${i}`);
        }
      }

      // Post-operation sync to verify all reactivations
      const postOpStatus = await stateManager.syncSlotStatus('POST_OPERATION');
      
      await logger({
        user: 'system',
        message: 'CU12 reactivate all slots completed successfully',
      });

      // Exit operation mode
      await stateManager.exitOperationMode();

      return { 
        success: true,
        message: 'เปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ',
        slotStatuses: postOpStatus,
        monitoringMode: stateManager.getMonitoringMode()
      };

    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      await logger({
        user: 'system',
        message: `CU12 reactivate all error - ${error.message}`,
      });

      event.sender.send('cu12-reactivate-all-error', {
        message: 'การเปิดใช้งาน CU12 ทั้งหมดล้มเหลว กรุณาลองใหม่อีกครั้ง',
        error: error.message
      });

      return { 
        success: false, 
        error: error.message
      };
    }
  });
};

export const cu12ReactivateAdminHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-reactivate-admin', async (event, payload) => {
    try {
      await logger({
        user: 'admin',
        message: `CU12 admin reactivate: slot #${payload.slotId}`,
      });

      // Enter operation mode for admin reactivation
      await stateManager.enterOperationMode(`admin_reactivate_slot_${payload.slotId}`);

      // Admin reactivation bypasses normal checks
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate admin reactivation

      // Clear failure tracking for this slot
      const failureDetector = (stateManager as any).failureDetector;
      if (failureDetector) {
        failureDetector.resetFailureTracking(`slot_${payload.slotId}`);
      }

      // Post-operation sync
      const postOpStatus = await stateManager.syncSlotStatus('POST_OPERATION');
      
      await logger({
        user: 'admin',
        message: `CU12 admin reactivate: slot #${payload.slotId} completed successfully`,
      });

      // Exit operation mode
      await stateManager.exitOperationMode();

      return { 
        success: true, 
        slotId: payload.slotId,
        message: 'เปิดใช้งานช่องเก็บยาโดย Admin สำเร็จ',
        slotStatus: postOpStatus.find(slot => slot.slotId === payload.slotId),
        monitoringMode: stateManager.getMonitoringMode()
      };

    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      await logger({
        user: 'admin',
        message: `CU12 admin reactivate: slot #${payload.slotId} error - ${error.message}`,
      });

      event.sender.send('cu12-reactivate-admin-error', {
        message: 'การเปิดใช้งาน CU12 โดย Admin ล้มเหลว',
        slotId: payload.slotId,
        error: error.message
      });

      return { 
        success: false, 
        error: error.message,
        slotId: payload.slotId
      };
    }
  });
};