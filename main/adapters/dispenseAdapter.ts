import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { unifiedLoggingService } from "../services/unified-logging.service";
import { connectionStatusService } from "../services/connection-status.service";
import { User } from "../../db/model/user.model";

// Import missing User for KU16 handler fix

/**
 * Universal Dispense Adapters
 *
 * Routes 'dispense' and 'dispense-continue' IPC calls to appropriate hardware
 * implementation based on current system configuration (KU16 or CU12).
 */

export const registerUniversalDispenseHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow,
  ku16StateManager?: any // Added for compatibility - to be typed properly later
) => {
  ipcMain.handle("dispense", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      // Pre-operation connection validation
      const connectionValidation = await connectionStatusService.validateBeforeOperation('จ่ายยา');
      if (!connectionValidation.isValid) {
        mainWindow.webContents.send("dispense-error", {
          slotId: payload.slotId,
          hn: payload.hn,
          message: connectionValidation.errorMessage,
          error: connectionValidation.status.error
        });
        return {
          success: false,
          slotId: payload.slotId,
          hn: payload.hn,
          message: connectionValidation.errorMessage,
          error: connectionValidation.status.error
        };
      }

      // Input validation and user authentication (same as KU16 original)
      if (!payload.passkey) {
        await unifiedLoggingService.logWarning({
          message: `Dispense failed: empty passkey provided for slot ${payload.slotId}`,
          component: "DispenseAdapter",
          details: { slotId: payload.slotId, reason: "empty_passkey" },
        });
        throw new Error("กรุณากรอกรหัสผ่าน");
      }

      // Sanitize input
      const sanitizedPasskey = payload.passkey.toString().trim();

      // Validate user by passkey (matching KU16 original dispense handler)
      const user = await User.findOne({ where: { passkey: sanitizedPasskey } });

      if (!user) {
        await unifiedLoggingService.logWarning({
          message: `Dispense failed: user not found for slot ${payload.slotId}`,
          component: "DispenseAdapter",
          details: { slotId: payload.slotId, reason: "user_not_found" },
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] dispense routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      await unifiedLoggingService.logInfo({
        message: `Universal dispense request: slot ${payload.slotId}, HN: ${payload.hn}, user: ${userName}, hardware: ${hardwareInfo.type}`,
        component: "DispenseAdapter",
        details: { slotId: payload.slotId, hn: payload.hn, userId, hardwareType: hardwareInfo.type },
      });

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 dispense operation with user-controlled modal flow
        console.log(
          `[CU12-DISPENSE] Processing dispense for slot ${payload.slotId} with user-controlled modal flow`
        );

        await cu12StateManager.enterOperationMode(
          `dispense_slot_${payload.slotId}`
        );

        try {
          // Step 1: Send hardware unlock command for dispensing (non-blocking)
          const unlockSuccess = await cu12StateManager.performUnlockOperation(
            payload.slotId
          );

          if (!unlockSuccess) {
            throw new Error("Failed to unlock slot for dispensing");
          }

          // Step 2: Update database slot state (opening: true to indicate dispense in progress)
          const { Slot } = require("../../db/model/slot.model");
          await Slot.update(
            {
              opening: true, // Slot is currently opening for dispensing
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
            dispensing: true, // Keep modal open for user interaction
            reset: false,
          });

          // Remove initial waiting message - will log actual outcome after dispense completion

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: "Dispense initiated - waiting for user confirmation",
            userControlled: true,
          };
        } catch (error) {
          // On error: Close wait modal immediately
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: false,
            reset: false,
          });
          throw error;
        } finally {
          await cu12StateManager.exitOperationMode();
        }
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 dispense operation
        console.log(
          `[KU16-DISPENSE] Processing dispense for slot ${payload.slotId}`
        );

        if (!ku16Instance.connected) {
          await unifiedLoggingService.logError({
            message: `DS16 dispense failed: connection error for slot ${payload.slotId}`,
            component: "DispenseAdapter",
            details: { slotId: payload.slotId, hardwareType: "KU16", reason: "connection_error" },
          });

          mainWindow.webContents.send("init-failed-on-connection-error", {
            title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
            message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
            suggestion:
              "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
            path: "/error/connection-error",
          });

          throw new Error("DS16 connection error");
        }

        // Use existing KU16 dispense logic (void method - no return value)
        await ku16Instance.dispense(payload);

        // KU16 dispense success - log the successful outcome
        await unifiedLoggingService.logDispensing({
          userId: userId,
          slotId: payload.slotId,
          hn: payload.hn,
          operation: "dispense",
          message: `จ่ายยาสำเร็จ: slot ${payload.slotId} - ยังมียาเหลืออยู่`,
        });

        return {
          success: true,
          slotId: payload.slotId,
          hn: payload.hn,
          message: "DS16 dispense operation initiated successfully",
        };
      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for dispense operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);

        await unifiedLoggingService.logError({
          message: `Universal dispense error: ${errorMsg}`,
          component: "DispenseAdapter",
          details: { hardwareType: hardwareInfo.type, reason: "hardware_not_supported" },
        });

        throw new Error(errorMsg);
      }
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Universal dispense error: slot ${payload.slotId}, user: ${
          userName || "unknown"
        }, error: ${error.message}`,
        component: "DispenseAdapter",
        details: { slotId: payload.slotId, userId, userName, error: error.message },
      });

      // Log the dispense error with authenticated user if available
      if (userId) {
        await unifiedLoggingService.logDispensing({
          userId: userId,
          slotId: payload.slotId,
          hn: payload.hn,
          operation: "dispense",
          message: "จ่ายยาล้มเหลว: " + error.message,
        });
      }

      // Send error event to frontend with appropriate message
      let errorMessage = "เกิดข้อผิดพลาดในการจ่ายยา";

      if (
        error.message.includes("กรุณากรอกรหัสผ่าน") ||
        error.message.includes("ไม่พบผู้ใช้งาน")
      ) {
        errorMessage = error.message;
      }

      mainWindow.webContents.send("dispense-error", {
        slotId: payload.slotId,
        hn: payload.hn,
        message: errorMessage,
        error: error.message,
      });

      // Don't re-throw the error - let the operation complete so frontend gets the error event
      return {
        success: false,
        slotId: payload.slotId,
        hn: payload.hn,
        message: errorMessage,
        error: error.message,
      };
    }
  });
};

export const registerUniversalDispenseContinueHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow,
  ku16StateManager?: any // Added for compatibility with new architecture
) => {
  ipcMain.handle("dispense-continue", async (event, payload) => {
    try {
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] dispense-continue routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 dispense continue operation (partial dispense)
        console.log(
          `[CU12-DISPENSE-CONTINUE] Processing continue for slot ${payload.slotId} - partial dispense`
        );

        try {
          // Step 1: Authenticate user with passkey (matching KU16 pattern)
          const user = await User.findOne({
            where: { passkey: payload.passkey },
          });
          if (!user) {
            await unifiedLoggingService.logWarning({
              message: `DS12 dispense-continue: user not found for slot ${payload.slotId}`,
              component: "DispenseAdapter",
              details: { slotId: payload.slotId, operation: "dispense-continue", reason: "user_not_found" },
            });
            throw new Error("ไม่พบผู้ใช้งาน");
          }
          const userId = user.dataValues.id;

          // Step 2: Keep slot data (HN and occupied status remain unchanged)
          // No database update needed - slot stays occupied with current HN

          // Step 3: Log partial dispense in audit trail
          await unifiedLoggingService.logDispensing({
            userId: userId,
            slotId: payload.slotId,
            hn: payload.hn,
            operation: "dispense-continue",
            message: `จ่ายยาต่อเนื่อง: slot ${payload.slotId}, HN: ${payload.hn} - ยังมียาเหลืออยู่`,
          });

          // Step 4: Close Clear/Continue modal - return to normal state
          mainWindow.webContents.send("dispensing", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            dispensing: false, // Close modal
            reset: false, // No more modal needed
            continue: false,
          });

          // Step 5: Update frontend to show slot still occupied
          await cu12StateManager.triggerFrontendSync();

          console.log(
            `[CU12-DISPENSE-CONTINUE] Continue completed for slot ${payload.slotId} - slot remains occupied`
          );

          return {
            success: true,
            slotId: payload.slotId,
            hn: payload.hn,
            message: "Continue operation completed - slot remains occupied",
            action: "continue",
          };
        } catch (error) {
          console.error(
            `[CU12-DISPENSE-CONTINUE] Continue operation failed:`,
            error.message
          );
          throw error;
        }
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 dispense continue operation
        console.log(
          `[KU16-DISPENSE-CONTINUE] Processing continue for slot ${payload.slotId}`
        );

        if (!ku16Instance.connected) {
          throw new Error("DS16 connection error");
        }

        // KU16 dispense-continue: Keep slot occupied with medicine remaining
        const user = await User.findOne({
          where: { passkey: payload.passkey },
        });
        if (!user) {
          throw new Error("ไม่พบผู้ใช้งาน");
        }
        const userId = user.dataValues.id;

        // Log that medicine remains in slot
        await unifiedLoggingService.logDispensing({
          userId: userId,
          slotId: payload.slotId,
          hn: payload.hn,
          operation: "dispense-continue",
          message: `จ่ายยาต่อเนื่อง: slot ${payload.slotId}, HN: ${payload.hn} - ยังมียาเหลืออยู่`,
        });

        // Update hardware state
        await ku16Instance.sleep(1000);
        ku16Instance.sendCheckState();

        return {
          success: true,
          slotId: payload.slotId,
          hn: payload.hn,
          message: "Continue operation completed - slot remains occupied",
          action: "continue",
        };
      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Universal dispense-continue error: slot ${payload.slotId}, error: ${error.message}`,
        component: "DispenseAdapter",
        details: { slotId: payload.slotId, operation: "dispense-continue", error: error.message },
      });

      // Send error event to frontend with appropriate message
      let errorMessage = "เกิดข้อผิดพลาดในการดำเนินการต่อ";

      if (
        error.message.includes("กรุณากรอกรหัสผ่าน") ||
        error.message.includes("ไม่พบผู้ใช้งาน")
      ) {
        errorMessage = error.message;
      }

      mainWindow.webContents.send("dispense-continue-error", {
        slotId: payload.slotId,
        message: errorMessage,
        error: error.message,
      });

      // Don't re-throw the error - let the operation complete so frontend gets the error event
      return {
        success: false,
        slotId: payload.slotId,
        message: errorMessage,
        error: error.message,
      };
    }
  });
};
