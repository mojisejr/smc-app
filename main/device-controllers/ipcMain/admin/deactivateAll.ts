import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { logger } from "../../../logger";
import { User } from "../../../../db/model/user.model";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const deactivateAllHandler = () => {
  ipcMain.handle("deactivate-all", async (event: IpcMainEvent, payload) => {
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use BuildTimeController instead of KU16
    // Maintain exact same functionality, error messages, and timing patterns
    const controller = BuildTimeController.getCurrentController();

    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (!user || user.dataValues.role !== "ADMIN") {
        // PRESERVE: Exact same Thai language error messages and logging
        await logger({
          user: "system",
          message: `deactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถยกเลิกการใช้งานระบบได้");
      }

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // Use controller.deactiveAllSlots() instead of ku16.deactiveAllSlots()
      // DS12Controller implements deactiveAllSlots() with same signature
      const result = await controller.deactiveAllSlots!(payload.passkey);
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      // Create delay utility matching KU16.sleep() behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();

      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      win.webContents.send("deactivate-all-error", {
        message: "ไม่สามารถยกเลิกการใช้งานระบบได้",
      });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name} error`,
      });
    }
  });
};