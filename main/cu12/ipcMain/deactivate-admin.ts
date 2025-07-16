import { ipcMain } from "electron";
import { CU12 } from "..";
import { User } from "../../../db/model/user.model";
import { logger } from "../../logger";
import { Slot } from "../../../db/model/slot.model";

export const deactivateAdminHandler = (cu12: CU12) => {
  ipcMain.handle("deactivate-admin", async (event, payload) => {
    try {
      const user = await User.findOne({
        where: {
          name: payload.name,
        },
      });

      if (!user || user.dataValues.role !== "ADMIN") {
        await logger({
          user: "system",
          message: `deactivate-admin: user is not admin`,
        });
        throw new Error("ไม่สามารถปิดช่องได้");
      }

      // Validate slot ID for CU12 (1-12)
      if (payload.slotId < 1 || payload.slotId > 12) {
        throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
      }

      // Deactivate slot in database (same as KU16 deactivate)
      const result = await Slot.update(
        {
          isActive: false,
          hn: null,
          occupied: false,
          opening: false,
          lockStatus: 1, // Locked
          errorCode: 0, // No error
        },
        { where: { slotId: payload.slotId } }
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name}`,
      });

      return result;
    } catch (error) {
      event.sender.send("deactivate-admin-error", {
        message: "ไม่สามารถปิดช่องได้",
      });

      await logger({
        user: "system",
        message: `deactivate-admin: slot #${payload.slotId} by ${payload.name} error`,
      });
    }
  });
};
