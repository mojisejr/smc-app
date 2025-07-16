import { ipcMain } from "electron";
import { CU12 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";
import { Slot } from "../../../db/model/slot.model";

export const deactivateAllHandler = (cu12: CU12) => {
  ipcMain.handle("deactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (!user || user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถยกเลิกการใช้งานระบบได้");
      }

      // Deactivate all slots in database (same as KU16 deactiveAllSlots)
      const result = await Slot.update(
        {
          isActive: false,
          lockStatus: 1, // Locked
          errorCode: 0, // No error
        },
        { where: { isActive: true } }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      console.log(error);
      event.sender.send("deactivate-all-error", {
        message: "ไม่สามารถยกเลิกการใช้งานระบบได้",
      });

      await logger({
        user: "system",
        message: `deactivate-all: all slots deactivated by ${payload.name} error`,
      });
    }
  });
};
