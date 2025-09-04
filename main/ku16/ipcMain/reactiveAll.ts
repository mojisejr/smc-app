import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const reactiveAllHanlder = (ku16: KU16) => {
  ipcMain.handle("reactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `reactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      const result = await ku16.reactiveAllSlots();
      await ku16.sleep(1000);
      ku16.sendCheckState();

      return result;
    } catch (error) {
      await logger({
        user: "system",
        message: `reactivate-all: all slots reactivated by ${payload.name} error`,
      });
      ku16.win.webContents.send("reactivate-all-error", {
        message: "ไม่สามารถเปิดใช้งานระบบได้",
      });
    }
  });
};
