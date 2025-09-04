import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { logDispensing, logger } from "../../../logger";
import { User } from "../../../../db/model/user.model";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const dispenseContinueHandler = () => {
  ipcMain.handle("dispense-continue", async (event: IpcMainEvent, payload) => {
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
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      userId = user?.dataValues?.id || null;

      if (!user) {
        // PRESERVE: Exact same Thai language error messages and logging
        await logger({
          user: "system",
          message: `dispense-continue: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      // Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // PRESERVE: Exact same dispensing log entry for dispense-continue
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-continue",
        message: "จ่ายยาสำเร็จยังมียาอยู่ในช่อง",
      });

      // PRESERVE: Same timing pattern - 1 second sleep then check state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use BrowserWindow from event instead of ku16.win
      win.webContents.send("dispense-error", {
        message: "ไม่สามารถจ่ายยาได้กรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `dispense-continue: slot #${payload.slotId} by ${userName} error`,
      });

      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-error",
        message: "จ่ายยาล้มเหลว",
      });
    }
  });
};