import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { getHardwareType } from "../setting/getHardwareType";
import { User } from "../../db/model/user.model";
import { Slot } from "../../db/model/slot.model";
import { unifiedLoggingService } from "../services/unified-logging.service";

/**
 * Universal Admin Management Adapters
 *
 * These adapters provide hardware-agnostic admin slot management functionality
 * by routing calls to the appropriate hardware implementation based on system configuration.
 *
 * Supported Operations:
 * - deactivate-admin: Single slot deactivation by admin
 * - deactivate-all: Bulk deactivation of all slots
 * - reactivate-all: Bulk reactivation of all slots
 */

export const registerUniversalDeactivateAdminHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("deactivate-admin", async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name },
      });

      // if (!user || user.dataValues.role !== "ADMIN") {
      //   await logger({
      //     user: "system",
      //     message: `deactivate-admin: unauthorized attempt by ${payload.name}`,
      //   });
      //   throw new Error("ไม่สามารถปิดช่องได้ - ไม่มีสิทธิ์");
      // }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] deactivate-admin routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 deactivation - Direct database update (same as KU16)
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Direct database update for admin setting
        await Slot.update(
          { isActive: false },
          { where: { slotId: payload.slotId } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        // Emit deactivated event for frontend listeners
        mainWindow.webContents.send("deactivated", { slotId: payload.slotId });

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          slotId: payload.slotId,
          message: "ปิดใช้งานช่องเก็บยาสำเร็จ",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 deactivation
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        const result = await ku16Instance.deactivate(payload.slotId);
        await ku16Instance.sleep(1000);
        ku16Instance.sendCheckState();

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return result;
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      mainWindow.webContents.send("deactivate-admin-error", {
        message: "ไม่สามารถปิดช่องได้",
        slotId: payload.slotId,
        error: error.message,
      });

      throw error;
    }
  });
};

export const registerUniversalDeactivateAllHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("deactivate-all", async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name },
      });

      if (!user || user.dataValues.role !== "ADMIN") {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("ไม่สามารถปิดระบบทั้งหมดได้ - ไม่มีสิทธิ์");
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] deactivate-all routing to ${hardwareInfo.type}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 bulk deactivation - Direct database update
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Direct database update for all slots
        await Slot.update(
          { isActive: false },
          { where: { slotId: { [require("sequelize").Op.lte]: 12 } } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        // Emit deactivated event for all slots (1-12 for CU12)
        for (let slotId = 1; slotId <= 12; slotId++) {
          mainWindow.webContents.send("deactivated", { slotId });
        }

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          message: "ปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 bulk deactivation
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        const result = await ku16Instance.deactivateAll();
        ku16Instance.sendCheckState();

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return result;
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      mainWindow.webContents.send("deactivate-all-error", {
        message: "ไม่สามารถปิดระบบทั้งหมดได้",
        error: error.message,
      });

      throw error;
    }
  });
};

export const registerUniversalReactivateAdminHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("reactivate-admin", async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name },
      });

      if (!user || user.dataValues.role !== "ADMIN") {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("ไม่สามารถเปิดช่องได้ - ไม่มีสิทธิ์");
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] reactivate-admin routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 reactivation - Direct database update (same as KU16)
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Direct database update for admin setting
        await Slot.update(
          { isActive: true },
          { where: { slotId: payload.slotId } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          slotId: payload.slotId,
          message: "เปิดใช้งานช่องเก็บยาสำเร็จ",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 reactivation
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        const result = await ku16Instance.reactive(payload.slotId);

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return result;
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      mainWindow.webContents.send("reactivate-admin-error", {
        message: "ไม่สามารถเปิดช่องได้",
        slotId: payload.slotId,
        error: error.message,
      });

      throw error;
    }
  });
};

export const registerUniversalReactivateAllHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("reactivate-all", async (event, payload) => {
    try {
      // Validate admin permissions
      const user = await User.findOne({
        where: { name: payload.name },
      });

      if (!user || user.dataValues.role !== "ADMIN") {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("ไม่สามารถเปิดระบบทั้งหมดได้ - ไม่มีสิทธิ์");
      }

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] reactivate-all routing to ${hardwareInfo.type}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 bulk reactivation - Direct database update
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Direct database update for all slots
        await Slot.update(
          { isActive: true },
          { where: { slotId: { [require("sequelize").Op.lte]: 12 } } }
        );

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          message: "เปิดใช้งานช่องเก็บยาทั้งหมดสำเร็จ",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 bulk reactivation
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        const result = await ku16Instance.reactiveAll();
        ku16Instance.sendCheckState();

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return result;
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      mainWindow.webContents.send("reactivate-all-error", {
        message: "ไม่สามารถเปิดระบบทั้งหมดได้",
        error: error.message,
      });

      throw error;
    }
  });
};

export const registerUniversalDeactivateHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle("deactivate", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      // Input validation
      if (!payload.passkey) {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("กรุณากรอกรหัสผ่าน");
      }

      if (!payload.reason) {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("กรุณากรอกเหตุผลของการปิดช่อง");
      }

      // Sanitize input
      const sanitizedPasskey = payload.passkey.toString().trim();

      // Debug logging (secure - don't log actual passkey)
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      // Validate user by passkey (same as original KU16 deactivate handler)
      const user = await User.findOne({
        where: { passkey: sanitizedPasskey },
      });

      if (!user) {
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });
        throw new Error("รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านอีกครั้ง");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Get current hardware configuration
      const hardwareInfo = await getHardwareType();

      console.log(
        `[UNIVERSAL-ADAPTER] deactivate routing to ${hardwareInfo.type} for slot ${payload.slotId}`
      );

      if (hardwareInfo.type === "DS12" && cu12StateManager) {
        // Route to CU12 deactivation
        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Direct database update for user deactivation
        await Slot.update(
          { isActive: false, opening: false, occupied: false, hn: null },
          { where: { slotId: payload.slotId } }
        );

        // Log the dispensing action
        await unifiedLoggingService.logDeactive({
          userId: userId,
          slotId: payload.slotId,
          reason: payload.reason,
          message: `ปิดช่องยา: ${payload.reason}`,
        });

        // Trigger frontend sync to update UI immediately
        await cu12StateManager.triggerFrontendSync();

        // Emit deactivated event for frontend listeners
        mainWindow.webContents.send("deactivated", { slotId: payload.slotId });

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        return {
          success: true,
          slotId: payload.slotId,
          message: "ปิดใช้งานช่องเก็บยาสำเร็จ",
        };
      } else if (hardwareInfo.type === "DS16" && ku16Instance) {
        // Route to KU16 deactivation (existing logic)
        await ku16Instance.deactivate(payload.slotId);

        await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

        // Log the dispensing action
        await unifiedLoggingService.logDeactive({
          userId: userId,
          slotId: payload.slotId,
          reason: payload.reason,
          message: `ปิดช่องยา: ${payload.reason}`,
        });

        await ku16Instance.sleep(1000);
        ku16Instance.sendCheckState();

        // Emit deactivated event for frontend listeners
        mainWindow.webContents.send("deactivated", { slotId: payload.slotId });

        return {
          success: true,
          slotId: payload.slotId,
          message: "ปิดใช้งานช่องเก็บยาสำเร็จ",
        };
      } else {
        throw new Error(
          `Hardware ${hardwareInfo.type} not initialized or not supported`
        );
      }
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: "System operation logged",
        component: "System",
        details: {},
      });

      // Log the dispensing error only if we have a valid userId
      if (userId) {
        await logDispensing({
          userId: userId,
          hn: null,
          slotId: payload.slotId,
          process: "deactivate-error",
          message: "ปิดช่องล้มเหลว",
        });
      }

      // Send specific error message based on error type
      let errorMessage = "ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง";

      // Use the actual error message for better user feedback
      if (
        error.message.includes("กรุณากรอกรหัสผ่าน") ||
        error.message.includes("กรุณากรอกเหตุผลของการปิดช่อง") ||
        error.message.includes("รหัสผ่านไม่ถูกต้อง")
      ) {
        errorMessage = error.message;
      }

      mainWindow.webContents.send("deactivate-error", {
        message: errorMessage,
        slotId: payload.slotId,
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
