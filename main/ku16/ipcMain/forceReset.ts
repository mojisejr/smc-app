import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";
import { BuildTimeController } from "../../ku-controllers/BuildTimeController";

export const forceResetHanlder = (ku16: KU16) => {
  ipcMain.handle("force-reset", async (_event, payload) => {
    // MIGRATION: Use BuildTimeController instead of KU16
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

      // MIGRATION: Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // MIGRATION: Use controller.resetSlot() instead of ku16.resetSlot()
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
      
      // MIGRATION: Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and Thai language message
      ku16.win.webContents.send("force-reset-error", {
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
