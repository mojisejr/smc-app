import { ipcMain } from "electron";
import { KU16 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
import { BuildTimeController } from "../../ku-controllers/BuildTimeController";

export const dispensingResetHanlder = (ku16: KU16) => {
  ipcMain.handle("reset", async (_event, payload) => {
    // MIGRATION: Use BuildTimeController instead of KU16
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
          message: `reset: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      // MIGRATION: Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // MIGRATION: Use controller.resetSlot() instead of ku16.resetSlot()
      // DS12Controller implements resetSlot() with same signature
      await controller.resetSlot(payload.slotId, payload.passkey);
      
      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `reset: slot #${payload.slotId} by ${user.dataValues.name}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-end",
        message: "จ่ายยาสำเร็จไม่มียาเหลือในช่อง",
      });
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // MIGRATION: Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      ku16.win.webContents.send("dispense-error", {
        message: "จ่ายยาไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });
      
      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `reset: slot #${payload.slotId} by ${userName} error`,
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
