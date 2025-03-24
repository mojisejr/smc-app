import { ipcMain } from "electron";
import { KU16 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";

export const deactivateAdminHandler = (ku16: KU16) => {
  ipcMain.handle("deactivate-admin", async (event, payload) => {
    try {
      const user = await User.findOne({
        where: {
          name: payload.name,
        },
      });

      if (user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถปิดช่องได้");
      }

      const result = await ku16.deactivate(payload.slotId);
      await ku16.sleep(1000);
      ku16.sendCheckState();

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
      });

      return result;
    } catch (error) {
      ku16.win.webContents.send("deactivate-admin-error", {
        message: "ไม่สามารถปิดช่องได้",
      });

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
      });
    }
  });
};
