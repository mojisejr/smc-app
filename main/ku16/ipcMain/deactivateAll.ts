import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";
export const deactiveAllHandler = (ku16: KU16) => {
  ipcMain.handle("deactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await unifiedLoggingService.logInfo({
        message: `deactivate-all: user is not admin`,
        component: "KU16Handler",
        details: { user: "system" },
      });
        throw new Error("ไม่สามารถยกเลิกการใช้งานระบบได้");
      }

      const result = await ku16.deactiveAllSlots();
      await ku16.sleep(1000);
      ku16.sendCheckState();

      await unifiedLoggingService.logInfo({
        message: `deactivate-all: all slots deactivated by ${payload.name}`,
        component: "KU16Handler",
        details: { user: "system" },
      });

      return result;
    } catch (error) {
      console.log(error);
      ku16.win.webContents.send("deactivate-all-error", {
        message: "ไม่สามารถยกเลิกการใช้งานระบบได้",
      });

      await unifiedLoggingService.logInfo({
        message: `deactivate-all: all slots deactivated by ${payload.name} error`,
        component: "KU16Handler",
        details: { user: "system" },
      });
    }
  });
};
