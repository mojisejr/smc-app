import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";

export const forceResetHanlder = (ku16: KU16) => {
  ipcMain.handle("force-reset", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({
        where: {
          passkey: payload.passkey,
        },
      });

      if (!user) {
        await logger({
          user: "system",
          message: `force-reset: user not found`,
        });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userName = user.dataValues.name;
      userId = user.dataValues.id;

      await ku16.resetSlot(payload.slotId);
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
      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
      });
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
