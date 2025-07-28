import { ipcMain, BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';
import { getHardwareType } from '../setting/getHardwareType';
import { logger, logDispensing } from '../logger';
import { User } from '../../db/model/user.model';

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
        // Route to CU12 dispense operation with user-controlled modal flow
        console.log(`[CU12-DISPENSE] Processing dispense for slot ${payload.slotId} with user-controlled modal flow`);
        
        await cu12StateManager.enterOperationMode(`dispense_slot_${payload.slotId}`);
        
        try {
          // Step 1: Send hardware unlock command for dispensing (non-blocking)
          const unlockSuccess = await cu12StateManager.performUnlockOperation(payload.slotId);
          
          if (!unlockSuccess) {
            throw new Error('Failed to unlock slot for dispensing');
          }

          // Step 2: Update database slot state (opening: true to indicate dispense in progress)
          const { Slot } = require('../../db/model/slot.model');
          await Slot.update(
            { 
              opening: true   // Slot is currently opening for dispensing
              // Keep existing hn and occupied status during dispensing
            },
            { where: { slotId: payload.slotId } }
          );

          // Step 3: Show wait modal and let user control the flow (dispensing: true)
          // Modal will stay open until user clicks "ตกลง" button
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: true,  // Keep modal open for user interaction
            reset: false
          });

          await logger({
            user: 'system',
            message: `CU12 dispense initiated: slot ${payload.slotId}, HN: ${payload.hn}, waiting for user confirmation`,
          });

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: 'Dispense initiated - waiting for user confirmation',
            userControlled: true
          };
        } catch (error) {
          // On error: Close wait modal immediately
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: false,
            reset: false
          });
          throw error;
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
        // Route to CU12 dispense continue operation (partial dispense)
        console.log(`[CU12-DISPENSE-CONTINUE] Processing continue for slot ${payload.slotId} - partial dispense`);
        
        try {
          // Step 1: Authenticate user with passkey (matching KU16 pattern)
          const user = await User.findOne({ where: { passkey: payload.passkey } });
          if (!user) {
            await logger({
              user: 'system',
              message: `CU12 dispense-continue: user not found for slot ${payload.slotId}`,
            });
            throw new Error("ไม่พบผู้ใช้งาน");
          }
          const userId = user.dataValues.id;
          
          // Step 2: Keep slot data (HN and occupied status remain unchanged)
          // No database update needed - slot stays occupied with current HN
          
          // Step 3: Log partial dispense in audit trail
          await logger({
            user: 'system',
            message: `CU12 dispense continue: slot ${payload.slotId}, HN: ${payload.hn} - partial dispense, medication still remaining`,
          });

          // Log partial dispense with authenticated user ID
          await logDispensing({
            userId: userId,
            hn: payload.hn,
            slotId: payload.slotId,
            process: 'dispense-continue',
            message: 'จ่ายยาสำเร็จยังมียาอยู่ในช่อง - ดำเนินการต่อ',
          });

          // Step 4: Close Clear/Continue modal - return to normal state
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: false, // Close modal
            reset: false,      // No more modal needed
            continue: false
          });

          // Step 5: Update frontend to show slot still occupied
          await cu12StateManager.triggerFrontendSync();

          console.log(`[CU12-DISPENSE-CONTINUE] Continue completed for slot ${payload.slotId} - slot remains occupied`);

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: 'Continue operation completed - slot remains occupied',
            action: 'continue'
          };
        } catch (error) {
          console.error(`[CU12-DISPENSE-CONTINUE] Continue operation failed:`, error.message);
          throw error;
        }

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