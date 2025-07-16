import { ipcMain } from "electron";
import { CU12 } from "..";
import { Setting } from "../../../db/model/setting.model";
import { Slot } from "../../../db/model/slot.model";
import { logger } from "../../logger";

export const getCU12StatusHandler = (cu12: CU12) => {
  ipcMain.handle("get-cu12-status", async (event) => {
    try {
      const setting = await Setting.findOne();
      if (!setting) {
        throw new Error("Settings not found");
      }

      // Get device status
      const deviceStatus = await cu12.getStatus();

      // Get all slots status
      const slots = await Slot.findAll({
        where: { isActive: true },
        order: [["slotId", "ASC"]],
      });

      // Get device version information
      const versionInfo = await cu12.getVersion();

      // Get device configuration
      const config = cu12.getConfig();

      const statusData = {
        deviceStatus,
        slots: slots.map((slot: any) => ({
          slotId: slot.slotId,
          hn: slot.hn,
          occupied: slot.occupied,
          opening: slot.opening,
          lockStatus: slot.lockStatus,
          errorCode: slot.errorCode,
          timestamp: slot.timestamp,
        })),
        deviceInfo: {
          version: versionInfo,
          config: config,
          connected: cu12.isConnected(),
          state: cu12.getState(),
        },
        settings: {
          cu_port: (setting as any).cu_port,
          cu_baudrate: (setting as any).cu_baudrate,
          cu_address: (setting as any).cu_address,
          available_slots: (setting as any).available_slots,
          unlock_time: (setting as any).unlock_time,
          delayed_unlock: (setting as any).delayed_unlock,
          push_door_wait: (setting as any).push_door_wait,
        },
      };

      await logger({
        user: "system",
        message: `get-cu12-status: status retrieved successfully`,
      });

      return {
        success: true,
        data: statusData,
      };
    } catch (error) {
      await logger({
        user: "system",
        message: `get-cu12-status: failed to get status - ${error.message}`,
      });
      return { success: false, error: error.message };
    }
  });
};
