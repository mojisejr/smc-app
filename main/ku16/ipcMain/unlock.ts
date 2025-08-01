import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";

export const unlockHandler = (ku16: KU16) => {
  ipcMain.handle("unlock", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      userId = user.dataValues.id;

      if (!user) {
        await unifiedLoggingService.logInfo({
        message: `unlock: user not found`,
        component: "KU16Handler",
        details: { user: "system" },
      });

        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userName = user.dataValues.name;

      await ku16.sendUnlock(payload);
      await unifiedLoggingService.logInfo({
        message: `unlock: slot #${payload.slotId} by ${user.dataValues.name}`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logUnlock({
        userId: userId,
        slotId: payload.slotId,
        hn: payload.hn,
        message: `ปลดล็อคสำเร็จ`,
      });
      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("unlock-error", {
        message: "ปลดล็อกไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });
      await unifiedLoggingService.logInfo({
        message: `unlock: slot #${payload.slotId} by ${userName} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logUnlock({
        userId: userId,
        slotId: payload.slotId,
        hn: payload.hn,
        message: `ปลดล็อคล้มเหลว`,
      });
    }
  });
};
