import { ipcMain } from "electron";
import { KU16 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
import { BuildTimeController } from "../../ku-controllers/BuildTimeController";

export const unlockHandler = (ku16: KU16) => {
  ipcMain.handle("unlock", async (_event, payload) => {
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
          message: `unlock: user not found`,
        });

        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      // MIGRATION: Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // MIGRATION: Use controller.sendUnlock() instead of ku16.sendUnlock()
      // DS12Controller implements sendUnlock() with same signature and security validation
      await controller.sendUnlock(payload);
      
      // PRESERVE: Exact same logging patterns and messages
      await logger({
        user: "system",
        message: `unlock: slot #${payload.slotId} by ${user.dataValues.name}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "unlock",
        message: "ปลดล็อคสำเร็จ",
      });
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      // Create delay utility matching KU16.sleep() behavior
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // MIGRATION: Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      // Use original KU16 window for error messaging (controller.win is protected)
      ku16.win.webContents.send("unlock-error", {
        message: "ปลดล็อกไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });
      
      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `unlock: slot #${payload.slotId} by ${userName} error`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "unlock-error",
        message: "ปลดล็อคล้มเหลว",
      });
    }
  });
};
