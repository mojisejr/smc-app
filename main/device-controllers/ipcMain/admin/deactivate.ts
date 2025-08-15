import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { logger, logDispensing } from "../../../logger";
import { User } from "../../../../db/model/user.model";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const deactivateHandler = () => {
  ipcMain.handle("deactivate", async (event: IpcMainEvent, payload) => {
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
          message: `deactivate: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // Use controller.deactivate() instead of ku16.deactivate()
      // DS12Controller implements deactivate() with same signature
      await controller.deactivate(payload.slotId, payload.passkey);

      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `deactivate: slot #${payload.slotId} by ${user.dataValues.name}`,
      });
      await logDispensing({
        userId: userId,
        hn: null,
        slotId: payload.slotId,
        process: "deactivate",
        message: payload.reason,
      });

      // PRESERVE: Same timing pattern - 1 second sleep then check state
      // Create delay utility matching KU16.sleep() behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      win.webContents.send("deactivate-error", {
        message: "ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
      });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `deactivate: slot #${payload.slotId} by ${userName} error`,
      });
      await logDispensing({
        userId: userId,
        hn: null,
        slotId: payload.slotId,
        process: "deactivate-error",
        message: "ปิดช่องล้มเหลว",
      });
    }
  });
};