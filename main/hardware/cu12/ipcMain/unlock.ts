import { ipcMain } from "electron";
import { CU12SmartStateManager } from "../stateManager";
import { User } from "../../../../db/model/user.model";
import { unifiedLoggingService } from "../../../services/unified-logging.service";

export const cu12UnlockHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle("cu12-unlock", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });

      if (!user) {
        
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Trigger user interaction for active monitoring
      await stateManager.onUserInteraction();

      // Perform unlock operation with operation mode management
      const unlockSuccess = await stateManager.performUnlockOperation(
        payload.slotId
      );

      if (!unlockSuccess) {
        throw new Error("Unlock operation failed");
      }

      

      

      // Post-operation sync to ensure state consistency
      await stateManager.syncSlotStatus("POST_OPERATION");

      return {
        success: true,
        slotId: payload.slotId,
        monitoringMode: stateManager.getMonitoringMode(),
      };
    } catch (error) {
      // Send error to renderer
      event.sender.send("cu12-unlock-error", {
        message: "ปลดล็อก CU12 ไม่สำเร็จกรุณาตรวจสอบรหัสผู้ใช้งานอีกครั้ง",
        slotId: payload.slotId,
        error: error.message,
      });

      await logger({
        user: "system",
        message: `CU12 unlock: slot #${payload.slotId} by ${userName} error - ${error.message}`,
      });

      await logDispensing({
        userId: userId,
        hn: payload.hn,
        slotId: payload.slotId,
        process: "unlock-error",
        message: "ปลดล็อค CU12 ล้มเหลว",
      });

      return {
        success: false,
        error: error.message,
        slotId: payload.slotId,
      };
    }
  });
};
