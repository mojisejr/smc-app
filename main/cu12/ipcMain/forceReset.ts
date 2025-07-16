import { ipcMain } from "electron";
import { CU12 } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";
import { Slot } from "../../../db/model/slot.model";

export const forceResetHandler = (cu12: CU12) => {
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
        await logger({
          user: "system",
          message: `force-reset: user not found`,
        });
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      userName = user.dataValues.name;
      userId = user.dataValues.id;

      // Validate slot ID for CU12 (1-12)
      if (payload.slotId < 1 || payload.slotId > 12) {
        throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
      }

      // Reset slot in database (same as KU16 resetSlot)
      await Slot.update(
        {
          hn: null,
          occupied: false,
          opening: false,
          lockStatus: 1, // Locked
          errorCode: 0, // No error
        },
        { where: { slotId: payload.slotId } }
      );

      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "force-reset",
        message: payload.reason,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();
    } catch (error) {
      event.sender.send("force-reset-error", {
        message: "ล้างช่องไม่สำเร็จกรุณาลองใหม่อีกครั้ง",
      });
      await logger({
        user: "system",
        message: `force-reset: slot #${payload.slotId} by ${userName} error`,
      });
      if (userId) {
        await logDispensing({
          userId: userId,
          hn: payload.hn,
          slotId: payload.slotId,
          process: "force-reset-error",
          message: "ล้างช่องไม่สำเร็จ",
        });
      }
    }
  });
};
