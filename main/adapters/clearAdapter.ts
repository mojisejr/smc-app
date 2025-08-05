import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { User } from "../../db/model/user.model";
import { unifiedLoggingService } from "../services/unified-logging.service";

/**
 * Universal Clear Slot Adapter
 *
 * Routes 'clear-slot' IPC calls for complete slot clearing after dispensing.
 * This handler manages the "Clear" option in the Clear/Continue modal,
 * indicating that all medication has been dispensed and the slot should be reset.
 *
 * No hardware operations are performed - this is pure database/audit logging.
 */

export const registerUniversalClearSlotHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow,
  ku16StateManager?: any // Added for compatibility with new architecture
) => {
  // ipcMain.handle('clear-slot', async (event, payload) => {
  ipcMain.handle("clear-slot", async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] clear-slot routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      if (hardwareInfo.type === "CU12" && cu12StateManager) {
        // Route to CU12 clear slot operation (no hardware, just database + audit)
        console.log(
          `[CU12-CLEAR-SLOT] Processing clear for slot ${payload.slotId} - complete dispense`
        );

        try {
          // Step 1: Authenticate user with passkey (matching KU16 pattern)
          const user = await User.findOne({
            where: { passkey: payload.passkey },
          });
          if (!user) {
            await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
            throw new Error("ไม่พบผู้ใช้งาน");
          }
          const userId = user.dataValues.id;

          // Step 2: Update database - completely clear the slot
          const { Slot } = require("../../db/model/slot.model");
          await Slot.update(
            {
              hn: null, // Clear HN - no patient data
              occupied: false, // Slot is now empty
              opening: false, // Slot is closed
            },
            { where: { slotId: payload.slotId } }
          );

          // Step 3: Log complete dispense in audit trail with authenticated user
          await unifiedLoggingService.logDispensing({
            userId: userId,
            slotId: payload.slotId,
            hn: payload.hn,
            operation: "dispense-end",
            message: `ไม่มียาเหลืออยู่แล้ว ล้างข้อมูลคนไข้ HN. ${payload.hn}`,
          });

          // Step 4: Close Clear/Continue modal - dispense flow complete
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: false, // Close modal
            reset: false, // No more modal needed
            continue: false,
          });

          // Step 5: Update frontend to show empty slot status
          await cu12StateManager.triggerFrontendSync();

          await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

          console.log(
            `[CU12-CLEAR-SLOT] Slot ${payload.slotId} cleared completely - frontend sync triggered`
          );

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: "Slot cleared successfully - complete dispense logged",
            action: "clear",
          };
        } catch (error) {
          console.error(`[CU12-CLEAR-SLOT] Clear slot failed:`, error.message);
          throw error;
        }
      } else if (hardwareInfo.type === "KU16" && ku16Instance) {
        // Route to KU16 clear slot operation (use existing reset logic)
        console.log(
          `[KU16-CLEAR-SLOT] Processing clear for slot ${payload.slotId}`
        );

        // Authenticate user with passkey
        const user = await User.findOne({
          where: { passkey: payload.passkey },
        });
        if (!user) {
          await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
          throw new Error("ไม่พบผู้ใช้งาน");
        }
        const userId = user.dataValues.id;

        // Use existing KU16 reset logic for clear operation
        const result = await ku16Instance.resetSlot(payload.slotId);

        // Log complete dispense in audit trail with authenticated user
        await unifiedLoggingService.logDispensing({
          userId: userId,
          slotId: payload.slotId,
          hn: payload.hn,
          operation: "dispense-end",
          message: `ไม่มียาเหลืออยู่แล้ว ล้างข้อมูลคนไข้ HN. ${payload.hn}`,
        });

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          slotId: payload.slotId,
          message: "KU16 slot cleared successfully",
          action: "clear",
        };
      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for clear-slot operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        throw new Error(errorMsg);
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      // Send error event to frontend
      mainWindow.webContents.send("clear-slot-error", {
        slotId: payload.slotId,
        hn: payload.hn,
        message: "เกิดข้อผิดพลาดในการเคลียร์ช่อง",
        error: error.message,
      });

      throw error;
    }
  });
};
