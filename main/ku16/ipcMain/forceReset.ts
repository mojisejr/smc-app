import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";
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
        await unifiedLoggingService.logInfo({
        message: `force-reset: user not found`,
        component: "KU16Handler",
        details: { user: "system" },
      });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userName = user.dataValues.name;
      userId = user.dataValues.id;

      await ku16.resetSlot(payload.slotId);
      await unifiedLoggingService.logInfo({
        message: `force-reset: slot #${payload.slotId} by ${userName}`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logForceReset({
        userId: userId,
        slotId: payload.slotId,
        reason: `การดำเนินการ`,
        message: `การดำเนินการ`,
      });
      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
      });
      await unifiedLoggingService.logInfo({
        message: `force-reset: slot #${payload.slotId} by ${userName} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logForceReset({
        userId: userId,
        slotId: payload.slotId,
        reason: `ล้างช่องไม่สำเร็จ`,
        message: `ล้างช่องไม่สำเร็จ`,
      });
    }
  });
};
