import { ipcMain } from "electron";
import { CU12 } from "..";
import { logDispensing, logger } from "../../logger";
import { User } from "../../../db/model/user.model";
import { Slot } from "../../../db/model/slot.model";

export const unlockHandler = (cu12: CU12) => {
  ipcMain.handle("unlock", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      // Validate slot ID for CU12 (1-12)
      if (payload.slotId < 1 || payload.slotId > 12) {
        throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
      }

      const user = await User.findOne({ where: { passkey: payload.passkey } });

      if (!user) {
        await logger({
          user: "system",
          message: `unlock: user not found`,
        });
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Convert slot ID to lock number (0-11)
      const locknum = payload.slotId - 1;

      // Send unlock command to CU12
      const success = await cu12.unlock(locknum);

      if (success) {
        // Update slot status in database
        await Slot.update(
          {
            opening: true,
            timestamp: Date.now(),
            lockStatus: 0, // Unlocked
            errorCode: 0, // No error
          },
          { where: { slotId: payload.slotId } }
        );

        await logger({
          user: "system",
          message: `unlock: slot #${payload.slotId} by ${user.dataValues.name}`,
        });

        await logDispensing({
          userId: userId,
          hn: payload.hn,
          slotId: payload.slotId,
          process: "unlock",
          message: "ปลดล็อคสำเร็จ",
        });

        // Wait for hardware response
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check state after unlock
        await cu12.getStatus();
      } else {
        throw new Error("Unlock command failed");
      }
    } catch (error) {
      const errorMessage = error.message || "Unknown error occurred";

      // Update slot with error status
      if (payload.slotId >= 1 && payload.slotId <= 12) {
        await Slot.update(
          {
            opening: false,
            lockStatus: 1, // Locked
            errorCode: 1, // Error occurred
          },
          { where: { slotId: payload.slotId } }
        );
      }

      // Use event.sender instead of cu12.win
      event.sender.send("unlock-error", {
        message: "ปลดล็อกไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
        errorCode: error.errorCode || 0,
      });

      await logger({
        user: "system",
        message: `unlock: slot #${payload.slotId} by ${userName} error - ${errorMessage}`,
      });

      if (userId) {
        await logDispensing({
          userId: userId,
          hn: payload.hn,
          slotId: payload.slotId,
          process: "unlock-error",
          message: "ปลดล็อคล้มเหลว",
        });
      }
    }
  });
};
