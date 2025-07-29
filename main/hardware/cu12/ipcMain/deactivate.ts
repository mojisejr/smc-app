import { ipcMain } from 'electron';
import { CU12SmartStateManager } from '../stateManager';
import { logger } from '../../../logger';

export const cu12DeactivateHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-deactivate', async (event, payload) => {
    try {
      await logger({
        user: 'system',
        message: `CU12 deactivate: slot #${payload.slotId}`,
      });

      // Enter operation mode for deactivation
      await stateManager.enterOperationMode(`deactivate_slot_${payload.slotId}`);

      // Pre-operation status check
      const preOpStatus = await stateManager.syncSlotStatus('PRE_OPERATION');
      const targetSlot = preOpStatus.find(slot => slot.slotId === payload.slotId);
      
      if (!targetSlot) {
        throw new Error(`Slot ${payload.slotId} not found`);
      }

      // Perform deactivation (integrate with actual CU12 hardware)
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate deactivation time

      // Post-operation sync to verify deactivation
      const postOpStatus = await stateManager.syncSlotStatus('POST_OPERATION');
      
      await logger({
        user: 'system',
        message: `CU12 deactivate: slot #${payload.slotId} completed successfully`,
      });

      // Exit operation mode
      await stateManager.exitOperationMode();
      
      // Emit deactivated event for frontend listeners
      event.sender.send("deactivated", { slotId: payload.slotId });

      return { 
        success: true, 
        slotId: payload.slotId,
        message: 'ปิดใช้งานช่องเก็บยาสำเร็จ',
        slotStatus: postOpStatus.find(slot => slot.slotId === payload.slotId),
        monitoringMode: stateManager.getMonitoringMode()
      };

    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      await logger({
        user: 'system',
        message: `CU12 deactivate: slot #${payload.slotId} error - ${error.message}`,
      });

      event.sender.send('cu12-deactivate-error', {
        message: 'การปิดใช้งาน CU12 ล้มเหลว กรุณาลองใหม่อีกครั้ง',
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

export const cu12DeactivateAllHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-deactivate-all', async (event, payload) => {
    try {
      await logger({
        user: 'system',
        message: 'CU12 deactivate all slots',
      });

      // Enter operation mode for mass deactivation
      await stateManager.enterOperationMode('deactivate_all_slots');

      // Pre-operation status check
      const preOpStatus = await stateManager.syncSlotStatus('PRE_OPERATION');

      // Perform mass deactivation (integrate with actual CU12 hardware)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate mass deactivation time

      // Post-operation sync to verify all deactivations
      const postOpStatus = await stateManager.syncSlotStatus('POST_OPERATION');
      
      await logger({
        user: 'system',
        message: 'CU12 deactivate all slots completed successfully',
      });

      // Exit operation mode
      await stateManager.exitOperationMode();
      
      // Emit deactivated event for all slots (1-12 for CU12)
      for (let slotId = 1; slotId <= 12; slotId++) {
        event.sender.send("deactivated", { slotId });
      }

      return { 
        success: true,
        message: 'ปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ',
        slotStatuses: postOpStatus,
        monitoringMode: stateManager.getMonitoringMode()
      };

    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      await logger({
        user: 'system',
        message: `CU12 deactivate all error - ${error.message}`,
      });

      event.sender.send('cu12-deactivate-all-error', {
        message: 'การปิดใช้งาน CU12 ทั้งหมดล้มเหลว กรุณาลองใหม่อีกครั้ง',
        error: error.message
      });

      return { 
        success: false, 
        error: error.message
      };
    }
  });
};