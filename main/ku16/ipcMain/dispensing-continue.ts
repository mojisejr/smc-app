import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";
export const dispenseContinueHandler = (ku16: KU16) => {
  ipcMain.handle("dispense-continue", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      userId = user.dataValues.id;

      if (!user) {
        await unifiedLoggingService.logInfo({
        message: `dispense-continue: user not found`,
        component: "KU16Handler",
        details: { user: "system" },
      });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      await unifiedLoggingService.logDispensing({
        userId: userId,
        slotId: payload.slotId,
        hn: payload.hn,
        operation: "dispense-continue",
        message: `จ่ายยาสำเร็จยังมียาอยู่ในช่อง`,
      });

      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("dispense-error", {
        message: "ไม่สามารถจ่ายยาได้กรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });

      await unifiedLoggingService.logInfo({
        message: `dispense-continue: slot #${payload.slotId} by ${userName} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });

      await unifiedLoggingService.logDispensing({
        userId: userId,
        slotId: payload.slotId,
        hn: payload.hn,
        operation: "dispense-error",
        message: `จ่ายยาล้มเหลว`,
      });
    }
  });
};
