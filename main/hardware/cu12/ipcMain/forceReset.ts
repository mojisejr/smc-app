import { ipcMain } from "electron";
import { CU12SmartStateManager } from "../stateManager";

export const cu12ForceResetHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle("cu12-force-reset", async (event, payload) => {
    try {
      

      // Enter operation mode for force reset
      await stateManager.enterOperationMode(
        `force_reset_slot_${payload.slotId}`
      );

      // Force reset bypasses normal state checks
      // This is an emergency operation that should always work
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate force reset time

      // Clear any failure tracking for this slot
      const failureDetector = (stateManager as any).failureDetector;
      if (failureDetector) {
        failureDetector.resetFailureTracking(`slot_${payload.slotId}`);
      }

      // Post-operation sync to verify force reset
      const postResetStatus = await stateManager.syncSlotStatus(
        "POST_OPERATION"
      );

      

      // Exit operation mode
      await stateManager.exitOperationMode();

      return {
        success: true,
        slotId: payload.slotId,
        message: "บังคับรีเซ็ตช่องเก็บยาสำเร็จ",
        slotStatus: postResetStatus.find(
          (slot) => slot.slotId === payload.slotId
        ),
        monitoringMode: stateManager.getMonitoringMode(),
      };
    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      

      event.sender.send("cu12-force-reset-error", {
        message: "การบังคับรีเซ็ต DS12 ล้มเหลว กรุณาติดต่อผู้ดูแลระบบ",
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
