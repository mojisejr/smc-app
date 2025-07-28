import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { logger } from '../logger';

/**
 * Universal Unlock Adapter
 * 
 * Routes 'unlock' IPC calls to appropriate hardware implementation
 * based on current system configuration (KU16 or CU12).
 * 
 * Frontend usage: ipcRenderer.invoke('unlock', { slotId, hn, passkey })
 * Routes to: ku16.unlock() or cu12StateManager.performUnlockOperation()
 */

export const registerUniversalUnlockHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('unlock', async (event, payload) => {
    try {
      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] unlock routing to ${hardwareInfo.type} for slot ${payload.slotId}`);
      
      await logger({
        user: 'system',
        message: `Universal unlock request: slot ${payload.slotId}, HN: ${payload.hn}, hardware: ${hardwareInfo.type}`,
      });

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 unlock operation
        console.log(`[CU12-UNLOCK] Processing unlock for slot ${payload.slotId}`);
        
        // Enter operation mode for focused monitoring
        await cu12StateManager.enterOperationMode(`unlock_slot_${payload.slotId}`);
        
        try {
          // Perform unlock operation using CU12 state manager
          const success = await cu12StateManager.performUnlockOperation(payload.slotId);
          
          if (success) {
            await logger({
              user: 'system',
              message: `CU12 unlock successful: slot ${payload.slotId}, HN: ${payload.hn}`,
            });

            // Send success event to frontend (same as KU16)
            mainWindow.webContents.send("unlocking-success", {
              slotId: payload.slotId,
              hn: payload.hn,
              message: 'ปลดล็อคสำเร็จ'
            });

            return {
              success: true,
              slotId: payload.slotId,
              message: 'Slot unlocked successfully'
            };
          } else {
            throw new Error('CU12 unlock operation failed');
          }
        } finally {
          // Always exit operation mode
          await cu12StateManager.exitOperationMode();
        }

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 unlock operation
        console.log(`[KU16-UNLOCK] Processing unlock for slot ${payload.slotId}`);
        
        if (!ku16Instance.connected) {
          await logger({
            user: 'system',
            message: `KU16 unlock failed: connection error for slot ${payload.slotId}`,
          });
          
          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
            message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
            suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });
          
          throw new Error('KU16 connection error');
        }

        // Use existing KU16 unlock logic
        const result = await ku16Instance.unlock(payload);
        
        await logger({
          user: 'system',
          message: `KU16 unlock completed: slot ${payload.slotId}, HN: ${payload.hn}, success: ${result.success}`,
        });

        return result;

      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for unlock operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);
        
        await logger({
          user: 'system',
          message: `Universal unlock error: ${errorMsg}`,
        });
        
        throw new Error(errorMsg);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `Universal unlock error: slot ${payload.slotId}, error: ${error.message}`,
      });

      // Send error event to frontend
      mainWindow.webContents.send('unlocking-error', {
        slotId: payload.slotId,
        hn: payload.hn,
        message: 'เกิดข้อผิดพลาดในการปลดล็อค',
        error: error.message
      });

      throw error;
    }
  });
};