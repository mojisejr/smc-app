import { ipcMain } from "electron";
import { CU12 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
import { Slot } from "../../../db/model/slot.model";

export const dispensingResetHandler = (cu12: CU12) => {
  ipcMain.handle("reset", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      if (!user) {
        await logger({
          user: "system",
          message: `reset: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }
      userId = user.dataValues.id;
      userName = user.dataValues.name;

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
        message: `reset: slot #${payload.slotId} by ${userName}`,
      });
      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-end",
        message: "จ่ายยาสำเร็จไม่มีอะไรเหลือในช่อง",
      });

      // Wait and get status
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();
    } catch (error) {
      event.sender.send("dispense-error", {
        message:
          error.message || "จ่ายยาไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });
      await logger({
        user: "system",
        message: `reset: slot #${payload.slotId} by ${userName} error`,
      });
      if (userId) {
        await logDispensing({
          userId: userId,
          hn: payload.hn,
          slotId: payload.slotId,
          process: "dispense-error",
          message: "จ่ายยาล้มเหลว",
        });
      }
    }
  });
};
