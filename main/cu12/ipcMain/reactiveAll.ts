import { ipcMain } from "electron";
import { CU12 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";
import { Slot } from "../../../db/model/slot.model";

export const reactiveAllHandler = (cu12: CU12) => {
  ipcMain.handle("reactivate-all", async (event, payload) => {
    try {
      const user = await User.findOne({ where: { name: payload.name } });

      if (!user || user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `reactivate-all: user is not admin`,
        });
        throw new Error("ไม่สามารถเปิดใช้งานระบบได้");
      }

      // Reactivate all slots in database (same as KU16 reactiveAllSlots)
      const result = await Slot.update(
        {
          isActive: true,
          lockStatus: 1, // Locked
          errorCode: 0, // No error
        },
        { where: { isActive: false } }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();

      await logger({
        user: "system",
        message: `reactivate-all: all slots reactivated by ${payload.name}`,
      });

      return result;
    } catch (error) {
      await logger({
        user: "system",
        message: `reactivate-all: all slots reactivated by ${payload.name} error`,
      });
      event.sender.send("reactivate-all-error", {
        message: "ไม่สามารถเปิดใช้งานระบบได้",
      });
    }
  });
};
