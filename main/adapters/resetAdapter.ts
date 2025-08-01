import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { unifiedLoggingService } from "../services/unified-logging.service";
import { User } from "../../db/model/user.model";

/**
 * Universal Reset Adapters
 *
 * Routes 'reset' and 'force-reset' IPC calls to appropriate hardware
 * implementation based on current system configuration (KU16 or CU12).
 */

export const registerUniversalResetHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("reset", async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] reset routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      await unifiedLoggingService.logInfo({
        message: `Universal reset request: slot ${payload.slotId}, HN: ${payload.hn}, hardware: ${hardwareInfo.type}`,
        component: "ResetAdapter",
        details: { slotId: payload.slotId, hn: payload.hn, hardwareType: hardwareInfo.type },
      });

      if (hardwareInfo.type === "CU12" && cu12StateManager) {
        // Route to CU12 reset operation
        console.log(`[CU12-RESET] Processing reset for slot ${payload.slotId}`);

        await cu12StateManager.enterOperationMode(
          `reset_slot_${payload.slotId}`
        );

        try {
          // CU12 reset implementation - unlock the slot and clear status
          const unlockSuccess = await cu12StateManager.performUnlockOperation(
            payload.slotId
          );

          if (unlockSuccess) {
            await unifiedLoggingService.logInfo({
              message: `CU12 reset successful: slot ${payload.slotId}, HN: ${payload.hn}`,
              component: "ResetAdapter",
              details: { slotId: payload.slotId, hn: payload.hn, hardwareType: "CU12", operation: "reset" },
            });

            // Send reset success event (same as KU16)
            mainWindow.webContents.send("reset-success", {
              slotId: payload.slotId,
              hn: payload.hn,
              message: "รีเซ็ตสำเร็จ",
            });

            // Trigger frontend sync to update slot status
            await cu12StateManager.triggerFrontendSync();

            return {
              success: true,
              slotId: payload.slotId,
              message: "Slot reset successfully",
            };
          } else {
            throw new Error("CU12 reset operation failed");
          }
        } finally {
          await cu12StateManager.exitOperationMode();
        }
      } else if (hardwareInfo.type === "KU16" && ku16Instance) {
        // Route to KU16 reset operation
        console.log(`[KU16-RESET] Processing reset for slot ${payload.slotId}`);

        if (!ku16Instance.connected) {
          await unifiedLoggingService.logError({
            message: `KU16 reset failed: connection error for slot ${payload.slotId}`,
            component: "ResetAdapter",
            details: { slotId: payload.slotId, hardwareType: "KU16", reason: "connection_error" },
          });

          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
            message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
            suggestion:
              "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });

          throw new Error("KU16 connection error");
        }

        // Use existing KU16 reset logic
        const result = await ku16Instance.reset(payload);

        await unifiedLoggingService.logInfo({
          message: `KU16 reset completed: slot ${payload.slotId}, HN: ${payload.hn}, success: ${result.success}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, hn: payload.hn, hardwareType: "KU16", success: result.success },
        });

        return result;
      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for reset operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);

        await unifiedLoggingService.logError({
          message: `Universal reset error: ${errorMsg}`,
          component: "ResetAdapter",
          details: { hardwareType: hardwareInfo.type, reason: "hardware_not_supported" },
        });

        throw new Error(errorMsg);
      }
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Universal reset error: slot ${payload.slotId}, error: ${error.message}`,
        component: "ResetAdapter",
        details: { slotId: payload.slotId, error: error.message },
      });

      // Send error event to frontend
      mainWindow.webContents.send("reset-error", {
        slotId: payload.slotId,
        hn: payload.hn,
        message: "เกิดข้อผิดพลาดในการรีเซ็ต",
        error: error.message,
      });

      // Don't re-throw the error - let the operation complete so frontend gets the error event
      return {
        success: false,
        slotId: payload.slotId,
        hn: payload.hn,
        message: "เกิดข้อผิดพลาดในการรีเซ็ต",
        error: error.message,
      };
    }
  });
};

export const registerUniversalForceResetHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("force-reset", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      // Validate user by passkey (same as original KU16 force-reset handler)
      const { User } = require("../../db/model/user.model");
      const user = await User.findOne({
        where: { passkey: payload.passkey },
      });

      if (!user) {
        await unifiedLoggingService.logWarning({
          message: `Force-reset failed: user not found for slot ${payload.slotId}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, operation: "force-reset", reason: "user_not_found" },
        });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] force-reset routing to ${hardwareInfo.type} for slot ${payload.slotId} by ${userName}`
      );

      await unifiedLoggingService.logInfo({
        message: `Universal force-reset request: slot ${payload.slotId}, HN: ${payload.hn}, hardware: ${hardwareInfo.type}, user: ${userName}`,
        component: "ResetAdapter",
        details: { slotId: payload.slotId, hn: payload.hn, hardwareType: hardwareInfo.type, userId, userName, operation: "force-reset" },
      });

      if (hardwareInfo.type === "CU12" && cu12StateManager) {
        // Route to CU12 force reset operation - DATABASE RESET (not hardware unlock)
        console.log(
          `[CU12-FORCE-RESET] Processing database reset for slot ${payload.slotId}`
        );

        // Database reset operation (same as KU16 resetSlot)
        const { Slot } = require("../../db/model/slot.model");
        await Slot.update(
          { hn: null, occupied: false, opening: false },
          { where: { slotId: payload.slotId } }
        );

        await unifiedLoggingService.logInfo({
          message: `CU12 force-reset: slot #${payload.slotId} by ${userName}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, userName, hardwareType: "CU12", operation: "force-reset" },
        });

        // Log the force reset action
        await unifiedLoggingService.logForceReset({
          userId: userId,
          slotId: payload.slotId,
          reason: payload.reason,
          message: `รีเซ็ตช่องยาแบบบังคับ: slot ${payload.slotId}, HN: ${payload.hn}`,
        });

        // Trigger frontend sync to update slot status
        await cu12StateManager.triggerFrontendSync();

        await unifiedLoggingService.logInfo({
          message: `CU12 force-reset completed: slot ${payload.slotId}, HN: ${payload.hn}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, hn: payload.hn, hardwareType: "CU12", operation: "force-reset-completed" },
        });

        return {
          success: true,
          slotId: payload.slotId,
          message: "Slot force reset successfully",
        };
      } else if (hardwareInfo.type === "KU16" && ku16Instance) {
        // Route to KU16 force reset operation - replicate original handler flow
        console.log(
          `[KU16-FORCE-RESET] Processing database reset for slot ${payload.slotId}`
        );

        // Use KU16 resetSlot method (database operation only)
        await ku16Instance.resetSlot(payload.slotId);

        await unifiedLoggingService.logInfo({
          message: `KU16 force-reset: slot #${payload.slotId} by ${userName}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, userName, hardwareType: "KU16", operation: "force-reset" },
        });

        // Log the force reset action
        await unifiedLoggingService.logForceReset({
          userId: userId,
          slotId: payload.slotId,
          reason: payload.reason,
          message: `รีเซ็ตช่องยาแบบบังคับ: slot ${payload.slotId}, HN: ${payload.hn}`,
        });

        // Sleep and sendCheckState (same as original)
        await ku16Instance.sleep(1000);
        ku16Instance.sendCheckState();

        await unifiedLoggingService.logInfo({
          message: `KU16 force-reset completed: slot ${payload.slotId}, HN: ${payload.hn}`,
          component: "ResetAdapter",
          details: { slotId: payload.slotId, hn: payload.hn, hardwareType: "KU16", operation: "force-reset-completed" },
        });

        return {
          success: true,
          slotId: payload.slotId,
          message: "Slot force reset successfully",
        };
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `force-reset: slot #${payload.slotId} by ${userName} error - ${error.message}`,
        component: "ResetAdapter",
        details: { slotId: payload.slotId, userName, error: error.message, operation: "force-reset-error" },
      });

      // Log the dispensing error (same as original)
      // const { logDispensing } = require("../logger");
      // await logDispensing({
      //   userId: userId,
      //   hn: payload.hn,
      //   slotId: payload.slotId,
      //   process: "force-reset-error",
      //   message: "ล้างช่องไม่สำเร็จ",
      // });

      // Send error event to frontend (same as original)
      mainWindow.webContents.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
        slotId: payload.slotId,
        error: error.message,
      });

      // Don't re-throw the error - let the operation complete so frontend gets the error event
      return {
        success: false,
        slotId: payload.slotId,
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
        error: error.message,
      };
    }
  });
};
