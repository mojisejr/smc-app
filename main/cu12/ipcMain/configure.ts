import { ipcMain } from "electron";
import { CU12 } from "..";
import { Setting } from "../../../db/model/setting.model";
import { logger } from "../../logger";
import { buildCommand, CU12_COMMANDS } from "../utils/command-parser";

export const configureHandler = (cu12: CU12) => {
  ipcMain.handle(
    "configure-cu12",
    async (
      event,
      config: {
        unlockTime?: number;
        delayedUnlock?: number;
        pushDoorWait?: number;
        baudRate?: number;
        address?: number;
      }
    ) => {
      try {
        const setting = await Setting.findOne();
        if (!setting) {
          throw new Error("Settings not found");
        }

        // Update unlock time if provided
        if (config.unlockTime !== undefined) {
          await cu12.setUnlockTime(config.unlockTime);
          await setting.update({ unlock_time: config.unlockTime });
        }

        // Update delayed unlock if provided
        if (config.delayedUnlock !== undefined) {
          await cu12.setDelayTime(config.delayedUnlock);
          await setting.update({ delayed_unlock: config.delayedUnlock });
        }

        // Update push door wait if provided
        if (config.pushDoorWait !== undefined) {
          await cu12.setPushDoorTime(config.pushDoorWait);
          await setting.update({ push_door_wait: config.pushDoorWait });
        }

        // Update baud rate if provided
        if (config.baudRate !== undefined) {
          await cu12.setBaudRate(config.baudRate);
          await setting.update({ cu_baudrate: config.baudRate });
        }

        // Update address if provided
        if (config.address !== undefined) {
          await setting.update({ cu_address: config.address });
        }

        await logger({
          user: "system",
          message: `configure-cu12: device configuration updated`,
        });

        return { success: true, message: "CU12 configuration updated" };
      } catch (error) {
        await logger({
          user: "system",
          message: `configure-cu12: configuration failed - ${error.message}`,
        });
        return { success: false, error: error.message };
      }
    }
  );
};
