import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { logger } from '../logger';

/**
 * Universal Status Adapter
 * 
 * Routes 'check-locked-back' IPC calls to appropriate hardware
 * implementation based on current system configuration (KU16 or CU12).
 * 
 * This handler is used by frontend to check if a slot has been locked back
 * after dispensing or unlocking operations.
 */

export const registerUniversalCheckLockedBackHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('check-locked-back', async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] check-locked-back routing to ${hardwareInfo.type} for slot ${payload.slotId}`);
      
      await logger({
        user: 'system',
        message: `Universal check-locked-back request: slot ${payload.slotId}, hardware: ${hardwareInfo.type}`,
      });

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 status check
        console.log(`[CU12-STATUS] Checking lock status for slot ${payload.slotId}`);
        
        try {
          // Trigger user interaction for active monitoring
          await cu12StateManager.onUserInteraction();
          
          // Sync slot status to get current lock state
          const slotStatus = await cu12StateManager.syncSlotStatus('ON_DEMAND');
          
          // Find the specific slot status
          const targetSlot = slotStatus.find(slot => slot.slotId === payload.slotId);
          
          if (targetSlot) {
            const isLocked = targetSlot.isLocked || false;
            
            await logger({
              user: 'system',
              message: `CU12 check-locked-back result: slot ${payload.slotId}, locked: ${isLocked}`,
            });

            // Send status update to frontend (same format as KU16)
            mainWindow.webContents.send("slot-status-update", {
              slotId: payload.slotId,
              isLocked: isLocked,
              timestamp: Date.now()
            });

            return {
              success: true,
              slotId: payload.slotId,
              isLocked: isLocked,
              message: 'Status check completed'
            };
          } else {
            throw new Error(`Slot ${payload.slotId} not found in status response`);
          }
        } catch (error) {
          console.error(`[CU12-STATUS] Check locked back failed:`, error.message);
          throw error;
        }

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 status check
        console.log(`[KU16-STATUS] Checking lock status for slot ${payload.slotId}`);
        
        if (!ku16Instance.connected) {
          await logger({
            user: 'system',
            message: `KU16 check-locked-back failed: connection error for slot ${payload.slotId}`,
          });
          
          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
            message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
            suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });
          
          throw new Error('KU16 connection error');
        }

        // Use existing KU16 check locked back logic
        const result = await ku16Instance.checkLockedBack(payload);
        
        await logger({
          user: 'system',
          message: `KU16 check-locked-back completed: slot ${payload.slotId}, result: ${JSON.stringify(result)}`,
        });

        return result;

      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for status check`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);
        
        await logger({
          user: 'system',
          message: `Universal check-locked-back error: ${errorMsg}`,
        });
        
        throw new Error(errorMsg);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `Universal check-locked-back error: slot ${payload.slotId}, error: ${error.message}`,
      });

      // Send error event to frontend
      mainWindow.webContents.send('status-check-error', {
        slotId: payload.slotId,
        message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ',
        error: error.message
      });

      throw error;
    }
  });
};