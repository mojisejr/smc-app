import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { logger } from '../logger';

/**
 * Universal Dispense Adapters
 * 
 * Routes 'dispense' and 'dispense-continue' IPC calls to appropriate hardware
 * implementation based on current system configuration (KU16 or CU12).
 */

export const registerUniversalDispenseHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('dispense', async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] dispense routing to ${hardwareInfo.type} for slot ${payload.slotId}`);
      
      await logger({
        user: 'system',
        message: `Universal dispense request: slot ${payload.slotId}, HN: ${payload.hn}, hardware: ${hardwareInfo.type}`,
      });

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 dispense operation
        console.log(`[CU12-DISPENSE] Processing dispense for slot ${payload.slotId}`);
        
        await cu12StateManager.enterOperationMode(`dispense_slot_${payload.slotId}`);
        
        try {
          // First unlock the slot
          const unlockSuccess = await cu12StateManager.performUnlockOperation(payload.slotId);
          
          if (!unlockSuccess) {
            throw new Error('Failed to unlock slot for dispensing');
          }

          await logger({
            user: 'system',
            message: `CU12 dispense successful: slot ${payload.slotId}, HN: ${payload.hn}`,
          });

          // Send dispensing success event (same as KU16)
          mainWindow.webContents.send("dispensing-success", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            message: 'จ่ายยาสำเร็จ'
          });

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: 'Medication dispensed successfully'
          };
        } finally {
          await cu12StateManager.exitOperationMode();
        }

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 dispense operation
        console.log(`[KU16-DISPENSE] Processing dispense for slot ${payload.slotId}`);
        
        if (!ku16Instance.connected) {
          await logger({
            user: 'system',
            message: `KU16 dispense failed: connection error for slot ${payload.slotId}`,
          });
          
          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
            message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
            suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });
          
          throw new Error('KU16 connection error');
        }

        // Use existing KU16 dispense logic
        const result = await ku16Instance.dispense(payload);
        
        await logger({
          user: 'system',
          message: `KU16 dispense completed: slot ${payload.slotId}, HN: ${payload.hn}, success: ${result.success}`,
        });

        return result;

      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for dispense operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);
        
        await logger({
          user: 'system',
          message: `Universal dispense error: ${errorMsg}`,
        });
        
        throw new Error(errorMsg);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `Universal dispense error: slot ${payload.slotId}, error: ${error.message}`,
      });

      // Send error event to frontend
      mainWindow.webContents.send('dispensing-error', {
        slotId: payload.slotId,
        hn: payload.hn,
        message: 'เกิดข้อผิดพลาดในการจ่ายยา',
        error: error.message
      });

      throw error;
    }
  });
};

export const registerUniversalDispenseContinueHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('dispense-continue', async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();
      
      console.log(`[UNIVERSAL-ADAPTER] dispense-continue routing to ${hardwareInfo.type} for slot ${payload.slotId}`);

      if (hardwareInfo.type === 'CU12' && cu12StateManager) {
        // Route to CU12 dispense continue operation
        console.log(`[CU12-DISPENSE-CONTINUE] Processing continue for slot ${payload.slotId}`);
        
        // CU12 doesn't need explicit continue operation - just log the action
        await logger({
          user: 'system',
          message: `CU12 dispense continue: slot ${payload.slotId}, HN: ${payload.hn}`,
        });

        // Send continue success event
        mainWindow.webContents.send("dispense-continue-success", {
          slotId: payload.slotId,
          hn: payload.hn,
          message: 'ดำเนินการต่อสำเร็จ'
        });

        return {
          success: true,
          slotId: payload.slotId,
          message: 'Continue operation completed'
        };

      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // Route to KU16 dispense continue operation
        console.log(`[KU16-DISPENSE-CONTINUE] Processing continue for slot ${payload.slotId}`);
        
        if (!ku16Instance.connected) {
          throw new Error('KU16 connection error');
        }

        // Use existing KU16 dispense continue logic
        const result = await ku16Instance.dispenseContinue(payload);
        
        await logger({
          user: 'system',
          message: `KU16 dispense continue completed: slot ${payload.slotId}, success: ${result.success}`,
        });

        return result;

      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);
        throw new Error(errorMsg);
      }

    } catch (error) {
      await logger({
        user: 'system',
        message: `Universal dispense-continue error: slot ${payload.slotId}, error: ${error.message}`,
      });

      mainWindow.webContents.send('dispense-continue-error', {
        slotId: payload.slotId,
        message: 'เกิดข้อผิดพลาดในการดำเนินการต่อ',
        error: error.message
      });

      throw error;
    }
  });
};