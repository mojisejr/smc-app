import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";
export const reactivateAdminHandler = (ku16: KU16) => {
  ipcMain.handle("reactivate-admin", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await unifiedLoggingService.logInfo({
        message: `reactivate-admin: user is not admin`,
        component: "KU16Handler",
        details: { user: "system" },
      });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      const result = await ku16.reactive(payload.slotId);
      await ku16.sleep(1000);
      ku16.sendCheckState();

      return result;
    } catch (error) {
      await unifiedLoggingService.logInfo({
        message: `reactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });
      ku16.win.webContents.send("reactivate-admin-error", {
        message: "ไม่สามารถเปิดใช้งานระบบได้",
      });
    }
  });
};
