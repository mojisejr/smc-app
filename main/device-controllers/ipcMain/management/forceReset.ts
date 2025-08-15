import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { User } from "../../../../db/model/user.model";
import { logDispensing, logger } from "../../../logger";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const forceResetHandler = () => {
  ipcMain.handle("force-reset", async (event: IpcMainEvent, payload) => {
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use BuildTimeController instead of KU16
    // Maintain exact same functionality, error messages, and timing patterns
    const controller = BuildTimeController.getCurrentController();
    
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({
        where: {
          passkey: payload.passkey,
        },
      });

      if (!user) {
        // PRESERVE: Exact same Thai language error messages and logging
        await logger({
          user: "system",
          message: `force-reset: user not found`,
        });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userName = user.dataValues.name;
      userId = user.dataValues.id;

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // Use controller.resetSlot() instead of ku16.resetSlot()
      // DS12Controller implements resetSlot() with same signature and enhanced security
      await controller.resetSlot(payload.slotId, payload.passkey);
      
      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "force-reset",
        message: payload.reason,
      });
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      win.webContents.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
      });
      
      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName} error`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "force-reset-error",
        message: "ล้างช่องไม่สำเร็จ",
      });
    }
  });
};