import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";
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
        await unifiedLoggingService.logInfo({
        message: `deactivate: user not found`,
        component: "KU16Handler",
        details: { user: "system" },
      });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      await ku16.deactivate(payload.slotId);
      await unifiedLoggingService.logInfo({
        message: `deactivate: slot #${payload.slotId} by ${user.dataValues.name}`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logUsing({
        category: "deactivate",
        userId: userId,
        slotId: payload.slotId,
        hn: null,
        message: `การดำเนินการ`,
      });
      await ku16.sleep(1000);
      ku16.sendCheckState();
    } catch (error) {
      ku16.win.webContents.send("deactivate-error", {
        message: "ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
      });
      await unifiedLoggingService.logInfo({
        message: `deactivate: slot #${payload.slotId} by ${userName} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      await unifiedLoggingService.logUsing({
        category: "deactivate-error",
        userId: userId,
        slotId: payload.slotId,
        hn: null,
        message: `ปิดช่องล้มเหลว`,
      });
    }
  });
};
