import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16"; // Legacy - to be removed
import { KU16SmartStateManager } from "../hardware/ku16/stateManager"; // New modern KU16
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { unifiedLoggingService } from "../services/unified-logging.service";
import { connectionStatusService } from "../services/connection-status.service";
import { User } from "../../db/model/user.model";

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
  ku16Instance: KU16 | null, // Legacy - to be removed
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow,
  ku16StateManager?: KU16SmartStateManager | null // New modern KU16 - optional for transition
) => {
  ipcMain.handle("unlock", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      // Pre-operation connection validation
      const connectionValidation = await connectionStatusService.validateBeforeOperation('ปลดล็อกช่องยา');
      if (!connectionValidation.isValid) {
        mainWindow.webContents.send("unlock-error", {
          slotId: payload.slotId,
          message: connectionValidation.errorMessage,
          error: connectionValidation.status.error
        });
        return {
          success: false,
          slotId: payload.slotId,
          message: connectionValidation.errorMessage,
          error: connectionValidation.status.error
        };
      }

      // Input validation and user authentication (same as KU16 original)
      if (!payload.passkey) {
        await unifiedLoggingService.logError({
          message: `Unlock failed: empty passkey provided for slot ${payload.slotId}`,
          component: "UnlockAdapter",
          details: { slotId: payload.slotId, reason: "empty_passkey" },
        });
        throw new Error("กรุณากรอกรหัสผ่าน");
      }

      // Sanitize input
      const sanitizedPasskey = payload.passkey.toString().trim();

      // Validate user by passkey (matching KU16 original unlock handler)
      const user = await User.findOne({ where: { passkey: sanitizedPasskey } });

      if (!user) {
        await unifiedLoggingService.logWarning({
          message: `Unlock failed: user not found for slot ${payload.slotId}`,
          component: "UnlockAdapter",
          details: { slotId: payload.slotId, reason: "user_not_found" },
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] unlock routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      // await logger({
      //   user: "system",
      //   message: `Universal unlock request: slot ${payload.slotId}, HN: ${payload.hn}, user: ${userName}, hardware: ${hardwareInfo.type}`,
      // });

      if (hardwareInfo.type === "CU12" && cu12StateManager) {
        // Route to CU12 unlock operation with user-controlled modal flow
        console.log(
          `[CU12-UNLOCK] Processing unlock for slot ${payload.slotId} with user-controlled modal flow`
        );

        // Enter operation mode for focused monitoring
        await cu12StateManager.enterOperationMode(
          `unlock_slot_${payload.slotId}`
        );

        try {
          // Step 1: Send hardware unlock command (non-blocking)
          const success = await cu12StateManager.performUnlockOperation(
            payload.slotId
          );

          if (!success) {
            throw new Error("CU12 unlock operation failed");
          }

          // Step 2: Update database slot state (opening: true to indicate unlock in progress)
          const { Slot } = require("../../db/model/slot.model");
          await Slot.update(
            {
              hn: payload.hn,
              occupied: false, // Not occupied yet, waiting for user to put medication
              opening: true, // Slot is currently opening
              timestamp: payload.timestamp,
            },
            { where: { slotId: payload.slotId } }
          );

          // Step 3: Show wait modal and let user control the flow (unlocking: true)
          // Modal will stay open until user clicks "ตกลง" button
          mainWindow.webContents.send("unlocking", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            unlocking: true, // Keep modal open for user interaction
          });

          // Log successful unlock with Enhanced Logging
          await unifiedLoggingService.logUnlock({
            userId: userId,
            slotId: payload.slotId,
            hn: payload.hn,
            message: `ปลดล็อกช่องยาช่องที่ ${payload.slotId} สำเร็จ โดย ${userName}`,
          });

          // Log system info
          await unifiedLoggingService.logInfo({
            message: `CU12 unlock initiated: slot ${payload.slotId}, HN: ${payload.hn}, user: ${userName}`,
            component: "CU12-UnlockAdapter",
            details: {
              slotId: payload.slotId,
              hn: payload.hn,
              userId,
              userName,
              hardware: "CU12",
            },
          });

          return {
            success: true,
            slotId: payload.slotId,
            message: "Unlock initiated - waiting for user confirmation",
            userControlled: true,
          };
        } catch (error) {
          // On error: Close wait modal immediately
          mainWindow.webContents.send("unlocking", {
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp,
            unlocking: false,
          });
          throw error;
        } finally {
          // Always exit operation mode
          await cu12StateManager.exitOperationMode();
        }
      } else if (hardwareInfo.type === "KU16") {
        // Route to KU16 unlock operation - Modern or Legacy
        console.log(
          `[KU16-UNLOCK] Processing unlock for slot ${payload.slotId}`
        );

        // Use new KU16SmartStateManager if available, otherwise fall back to legacy
        if (ku16StateManager) {
          // NEW: Modern KU16 using state manager (same pattern as CU12)
          console.log(
            `[KU16-MODERN-UNLOCK] Using KU16SmartStateManager for slot ${payload.slotId}`
          );

          try {
            // Prepare unlock payload with user authentication
            const unlockPayload = {
              slotId: payload.slotId,
              hn: payload.hn,
              timestamp: payload.timestamp,
              passkey: sanitizedPasskey
            };

            // Execute unlock operation with modern state management
            const result = await ku16StateManager.performUnlockOperation(unlockPayload);

            if (result.success) {
              // Log successful unlock with Enhanced Logging
              await unifiedLoggingService.logUnlock({
                userId: userId,
                slotId: payload.slotId,
                hn: payload.hn,
                message: `ปลดล็อกช่องยาช่องที่ ${payload.slotId} สำเร็จ โดย ${userName}`,
              });

              await unifiedLoggingService.logInfo({
                message: `KU16 modern unlock completed successfully: slot ${payload.slotId}, HN: ${payload.hn}, user: ${userName}`,
                component: "KU16-ModernUnlockAdapter",
                details: {
                  slotId: payload.slotId,
                  hn: payload.hn,
                  userId,
                  userName,
                  hardware: "KU16-Modern",
                },
              });

              return {
                success: true,
                slotId: payload.slotId,
                message: "KU16 unlock operation completed successfully",
                modernArchitecture: true
              };
            } else {
              await unifiedLoggingService.logError({
                message: `KU16 modern unlock failed: slot ${payload.slotId}, error: ${result.error}`,
                component: "KU16-ModernUnlockAdapter",
                details: {
                  slotId: payload.slotId,
                  hn: payload.hn,
                  userId,
                  userName,
                  hardware: "KU16-Modern",
                  error: result.error,
                },
              });
              throw new Error(result.error || "KU16 unlock operation failed");
            }
          } catch (error) {
            await unifiedLoggingService.logError({
              message: `KU16 modern unlock operation failed: ${error.message}`,
              component: "KU16-ModernUnlockAdapter",
              details: {
                slotId: payload.slotId,
                error: error.message,
                hardware: "KU16-Modern",
              },
            });
            throw error;
          }

        } else if (ku16Instance) {
          // LEGACY: Old monolithic KU16 class (for backward compatibility during transition)
          console.log(
            `[KU16-LEGACY-UNLOCK] Using legacy KU16 class for slot ${payload.slotId}`
          );

          if (!ku16Instance.connected) {
            await unifiedLoggingService.logError({
              message: `KU16 legacy unlock failed: connection error for slot ${payload.slotId}`,
              component: "KU16-LegacyUnlockAdapter",
              details: {
                slotId: payload.slotId,
                reason: "connection_error",
                hardware: "KU16-Legacy",
              },
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

          // Use existing KU16 unlock logic
          const result = await ku16Instance.sendUnlock({
            slotId: payload.slotId,
            hn: payload.hn,
            timestamp: payload.timestamp
          });

          // Log successful unlock with Enhanced Logging
          await unifiedLoggingService.logUnlock({
            userId: userId,
            slotId: payload.slotId,
            hn: payload.hn,
            message: `ปลดล็อกช่องยาช่องที่ ${payload.slotId} สำเร็จ โดย ${userName} (Legacy)`,
          });

          await unifiedLoggingService.logInfo({
            message: `KU16 legacy unlock initiated: slot ${payload.slotId}, HN: ${payload.hn}, user: ${userName}`,
            component: "KU16-LegacyUnlockAdapter",
            details: {
              slotId: payload.slotId,
              hn: payload.hn,
              userId,
              userName,
              hardware: "KU16-Legacy",
            },
          });

          return {
            success: true,
            slotId: payload.slotId,
            message: "KU16 legacy unlock initiated",
            legacyMode: true
          };
        } else {
          throw new Error("No KU16 instance available (neither modern nor legacy)");
        }
      } else {
        const errorMsg = `Hardware ${hardwareInfo.type} not initialized or not supported for unlock operation`;
        console.error(`[UNIVERSAL-ADAPTER] ${errorMsg}`);

        // await logger({
        //   user: "system",
        //   message: `Universal unlock error: ${errorMsg}`,
        // });

        throw new Error(errorMsg);
      }
    } catch (error) {
      // await logger({
      //   user: "system",
      //   message: `Universal unlock error: slot ${payload.slotId}, user: ${
      //     userName || "unknown"
      //   }, error: ${error.message}`,
      // });

      // Log the unlock error with authenticated user if available
      if (userId) {
        // await logDispensing({
        //   userId: userId,
        //   hn: payload.hn,
        //   slotId: payload.slotId,
        //   process: 'unlock-error',
        //   message: 'ปลดล็อคล้มเหลว',
        // });
      }

      // Send error event to frontend with appropriate message
      let errorMessage = "เกิดข้อผิดพลาดในการปลดล็อค";

      if (
        error.message.includes("กรุณากรอกรหัสผ่าน") ||
        error.message.includes("ไม่พบผู้ใช้งาน")
      ) {
        errorMessage = error.message;
      }

      mainWindow.webContents.send("unlock-error", {
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
