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
        // Route to CU12 status check with user-controlled modal management
        console.log(`[CU12-STATUS] User-controlled status check for slot ${payload.slotId}`);
        
        try {
          // Use instant status check method (no auto-wait, no auto-close)
          const isLocked = await cu12StateManager.checkSlotLockStatus(payload.slotId);
          
          await logger({
            user: 'system',
            message: `CU12 user-controlled status check: slot ${payload.slotId}, locked: ${isLocked}`,
          });

          // Get current slot data from database for proper event data
          const { Slot } = require('../../db/model/slot.model');
          const slotData = await Slot.findOne({ where: { slotId: payload.slotId } });
          
          if (isLocked) {
            // Slot is closed - update database and close modal
            if (slotData) {
              const isUnlockOperation = slotData.dataValues.opening && !slotData.dataValues.occupied;
              const isDispenseOperation = slotData.dataValues.opening && slotData.dataValues.occupied;
              
              if (isUnlockOperation) {
                // Unlock complete - set occupied: true, opening: false
                await Slot.update(
                  { 
                    occupied: true,    // Medication placed in slot
                    opening: false     // Slot closed
                  },
                  { where: { slotId: payload.slotId } }
                );
                
                // Close unlock modal
                mainWindow.webContents.send("unlocking", {
                  slotId: payload.slotId,
                  hn: slotData.dataValues.hn,
                  timestamp: slotData.dataValues.timestamp,
                  unlocking: false  // Close modal
                });
                
                // Send unlock success event
                mainWindow.webContents.send("unlocking-success", {
                  slotId: payload.slotId,
                  timestamp: new Date().toISOString()
                });

                // ✅ CRITICAL: Update slot status on home page after unlock complete
                await cu12StateManager.triggerFrontendSync();
                
                console.log(`[CU12-STATUS] Unlock completed for slot ${payload.slotId} - frontend sync triggered`);
              } else if (isDispenseOperation) {
                // Dispense complete - close dispensing modal and show Clear/Continue modal
                // DO NOT reset slot data yet - let user choose Clear or Continue
                await Slot.update(
                  { 
                    opening: false     // Slot is now closed, but keep HN and occupied status
                  },
                  { where: { slotId: payload.slotId } }
                );
                
                // Close dispense modal and show Clear/Continue modal (not reset)
                mainWindow.webContents.send("dispensing", {
                  slotId: payload.slotId,
                  hn: slotData.dataValues.hn,
                  timestamp: slotData.dataValues.timestamp,
                  dispensing: false, // Close dispensing modal
                  reset: true,       // Show Clear/Continue modal asking if drugs are left
                  continue: true     // Enable continue option
                });
                
                // Send dispensing success events
                mainWindow.webContents.send("dispensing-success", {
                  slotId: payload.slotId,
                  timestamp: new Date().toISOString()
                });
                mainWindow.webContents.send("dispensing-locked-back", {
                  slotId: payload.slotId,
                  timestamp: new Date().toISOString()
                });

                // ✅ CRITICAL: Update slot status on home page after dispense complete
                await cu12StateManager.triggerFrontendSync();
                
                console.log(`[CU12-STATUS] Dispense completed for slot ${payload.slotId} - showing Clear/Continue modal`);
              }
            }
          } else {
            // Slot is still open - keep modal open
            if (slotData) {
              const isUnlockOperation = slotData.dataValues.opening && !slotData.dataValues.occupied;
              const isDispenseOperation = slotData.dataValues.opening && slotData.dataValues.occupied;
              
              if (isUnlockOperation) {
                // Keep unlock modal open
                mainWindow.webContents.send("unlocking", {
                  slotId: payload.slotId,
                  hn: slotData.dataValues.hn,
                  timestamp: slotData.dataValues.timestamp,
                  unlocking: true   // Keep modal open
                });
                
                console.log(`[CU12-STATUS] Slot ${payload.slotId} still open - keeping unlock modal open`);
              } else if (isDispenseOperation) {
                // Keep dispense modal open
                mainWindow.webContents.send("dispensing", {
                  slotId: payload.slotId,
                  hn: slotData.dataValues.hn,
                  timestamp: slotData.dataValues.timestamp,
                  dispensing: true,  // Keep modal open
                  reset: false
                });
                
                console.log(`[CU12-STATUS] Slot ${payload.slotId} still open - keeping dispense modal open`);
              }
            }
          }

          return {
            success: true,
            slotId: payload.slotId,
            isLocked: isLocked,
            message: isLocked ? 'Slot is closed - operation complete' : 'Slot is still open - please close slot',
            userControlled: true
          };
        } catch (error) {
          console.error(`[CU12-STATUS] User-controlled status check failed:`, error.message);
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

        // Use existing KU16 check locked back logic (just trigger state check)
        ku16Instance.sendCheckState();
        const result = { success: true, message: 'KU16 status check triggered' };
        
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