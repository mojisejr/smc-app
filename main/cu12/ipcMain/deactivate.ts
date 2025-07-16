import { ipcMain } from "electron";
import { CU12 } from "..";
import { User } from "../../../db/model/user.model";
import { logDispensing, logger } from "../../logger";
import { Slot } from "../../../db/model/slot.model";

export const deactivateHandler = (cu12: CU12) => {
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
        await logger({
          user: "system",
          message: `deactivate: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Validate slot ID for CU12 (1-12)
      if (payload.slotId < 1 || payload.slotId > 12) {
        throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
      }

      // Deactivate slot in database (same as KU16 deactivate)
      await Slot.update(
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

      await logger({
        user: "system",
        message: `deactivate: slot #${payload.slotId} by ${user.dataValues.name}`,
      });
      await logDispensing({
        userId: userId,
        hn: null,
        slotId: payload.slotId,
        process: "deactivate",
        message: payload.reason,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();
    } catch (error) {
      event.sender.send("deactivate-error", {
        message: "ไม่สามารถปิดช่องได้ กรุณาตรวจสอบรหัสผ่านอีกครั้ง",
      });
      await logger({
        user: "system",
        message: `deactivate: slot #${payload.slotId} by ${userName} error`,
      });
      if (userId) {
        await logDispensing({
          userId: userId,
          hn: null,
          slotId: payload.slotId,
          process: "deactivate-error",
          message: "ปิดช่องล้มเหลว",
        });
      }
    }
  });
};
