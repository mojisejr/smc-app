import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { logger } from "../../../logger";
import { User } from "../../../../db/model/user.model";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const deactivateAdminHandler = () => {
  ipcMain.handle("deactivate-admin", async (event: IpcMainEvent, payload) => {
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use BuildTimeController instead of KU16
    // Maintain exact same functionality, error messages, and timing patterns
    const controller = BuildTimeController.getCurrentController();

    try {
      const user = await User.findOne({
        where: {
          name: payload.name,
        },
      });

      if (!user || user.dataValues.role !== "ADMIN") {
        // PRESERVE: Exact same Thai language error messages and logging
        await logger({
          user: "system",
          message: `deactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถปิดช่องได้");
      }

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // Use controller.deactivate() instead of ku16.deactivate()
      // DS12Controller implements deactivate() with same signature
      const result = await controller.deactivate(payload.slotId, payload.name);
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      // Create delay utility matching KU16.sleep() behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();

      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
      });

      return result;
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      win.webContents.send("deactivate-admin-error", {
        message: "ไม่สามารถปิดช่องได้",
      });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
      });
    }
  });
};