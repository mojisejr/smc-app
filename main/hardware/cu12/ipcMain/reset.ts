import { ipcMain } from "electron";
import { CU12SmartStateManager } from "../stateManager";
import { unifiedLoggingService } from "../../../services/unified-logging.service";

export const cu12ResetHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle("cu12-reset", async (event, payload) => {
    try {
      

      // Enter operation mode for reset
      await stateManager.enterOperationMode(`reset_slot_${payload.slotId}`);

      // Pre-operation status check
      await stateManager.syncSlotStatus("PRE_OPERATION");

      // Perform reset operation (integrate with actual CU12 hardware)
      // This would send the reset command to the specific slot
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate reset time

      // Post-operation sync to verify reset
      const postResetStatus = await stateManager.syncSlotStatus(
        "POST_OPERATION"
      );

      await logger({
        user: "system",
        message: `CU12 reset: slot #${payload.slotId} completed successfully`,
      });

      // Exit operation mode
      await stateManager.exitOperationMode();

      return {
        success: true,
        slotId: payload.slotId,
        message: "รีเซ็ตช่องเก็บยาสำเร็จ",
        slotStatus: postResetStatus.find(
          (slot) => slot.slotId === payload.slotId
        ),
        monitoringMode: stateManager.getMonitoringMode(),
      };
    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      

      event.sender.send("cu12-reset-error", {
        message: "การรีเซ็ต DS12 ล้มเหลว กรุณาลองใหม่อีกครั้ง",
        slotId: payload.slotId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        slotId: payload.slotId,
      };
    }
  });
};
