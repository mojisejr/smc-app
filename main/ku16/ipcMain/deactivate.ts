import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";

export const deactiveHanlder = (ku16: KU16) => {
  ipcMain.handle("deactivate", async (event, payload) => {
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
          message: `deactivate: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      await ku16.deactivate(payload.slotId);
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
      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("deactivate-error", {
        message: "ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
      });
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
