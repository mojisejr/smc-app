import { ipcMain } from "electron";
import { CU12SmartStateManager } from "../stateManager";

export const cu12DispenseContinueHandler = (
  stateManager: CU12SmartStateManager
) => {
  ipcMain.handle("cu12-dispense-continue", async (event, payload) => {
    try {
      

      // Enter operation mode for continue dispensing
      await stateManager.enterOperationMode(
        `dispense_continue_slot_${payload.slotId}`
      );

      // Pre-operation status check
      const preOpStatus = await stateManager.syncSlotStatus("PRE_OPERATION");
      const targetSlot = preOpStatus.find(
        (slot) => slot.slotId === payload.slotId
      );

      if (!targetSlot) {
        throw new Error(`Slot ${payload.slotId} not found`);
      }

      // Check if slot is in appropriate state for continue dispensing
      if (targetSlot.isLocked) {
        throw new Error(
          `Slot ${payload.slotId} is still locked, cannot continue dispensing`
        );
      }

      // Perform continue dispensing logic (integrate with actual CU12 hardware)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate continue dispense time

      

      // Post-operation sync
      const postOpStatus = await stateManager.syncSlotStatus("POST_OPERATION");

      

      // Exit operation mode
      await stateManager.exitOperationMode();

      return {
        success: true,
        slotId: payload.slotId,
        message: "ดำเนินการจ่ายยาต่อสำเร็จ",
        slotStatus: postOpStatus.find((slot) => slot.slotId === payload.slotId),
        monitoringMode: stateManager.getMonitoringMode(),
      };
    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      

      

      event.sender.send("cu12-dispense-continue-error", {
        message: "การดำเนินการจ่ายยา CU12 ต่อล้มเหลว กรุณาลองใหม่อีกครั้ง",
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
