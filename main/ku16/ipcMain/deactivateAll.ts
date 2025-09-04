import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const deactiveAllHandler = (ku16: KU16) => {
  ipcMain.handle("deactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถยกเลิกการใช้งานระบบได้");
      }

      const result = await ku16.deactiveAllSlots();
      await ku16.sleep(1000);
      ku16.sendCheckState();

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      // Error logged elsewhere
      ku16.win.webContents.send("deactivate-all-error", {
        message: "ไม่สามารถยกเลิกการใช้งานระบบได้",
      });

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name} error`,
      });
    }
  });
};
