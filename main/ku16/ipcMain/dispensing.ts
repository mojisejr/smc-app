import { ipcMain } from "electron";
import { KU16 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
import { BuildTimeController } from "../../ku-controllers/BuildTimeController";

export const dispenseHandler = (ku16: KU16) => {
  ipcMain.handle("dispense", async (_event, payload) => {
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
          message: `dispense: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      // MIGRATION: Check controller connection before operation
      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // MIGRATION: Use controller.dispense() instead of ku16.dispense()
      // DS12Controller implements dispense() with enhanced security and validation
      await controller.dispense(payload);
      
      // PRESERVE: Same timing pattern - 1 second sleep then check state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // MIGRATION: Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } catch (error) {
      // PRESERVE: Same IPC error event and message format
      ku16.win.webContents.send("dispense-error", { message: error.message });

      // PRESERVE: Exact same error logging patterns
      await logger({
        user: "system",
        message: `dispense: slot #${payload.slotId} by ${userName} error`,
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
