import { ipcMain } from "electron";
import { CU12 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";

export const dispenseContinueHandler = (cu12: CU12) => {
  ipcMain.handle("dispense-continue", async (event, payload) => {
    let userId = null;
    let userName = null;
    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      if (!user) {
        await logger({
          user: "system",
          message: `dispense-continue: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }
      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Validate slot ID for CU12 (1-12)
      if (payload.slotId < 1 || payload.slotId > 12) {
        throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
      }

      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "dispense-continue",
        message: "จ่ายยาสำเร็จยังมียาอยู่ในช่อง",
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await cu12.getStatus();
    } catch (error) {
      event.sender.send("dispense-error", {
        message: "ไม่สามารถจ่ายยาได้กรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
      });

      await logger({
        user: "system",
        message: `dispense-continue: slot #${payload.slotId} by ${userName} error`,
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
