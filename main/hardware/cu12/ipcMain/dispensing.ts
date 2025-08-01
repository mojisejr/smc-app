import { ipcMain } from "electron";
import { CU12SmartStateManager } from "../stateManager";
import { User } from "../../../../db/model/user.model";

export const cu12DispenseHandler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle("cu12-dispense", async (event, payload) => {
    let userId = null;
    let userName = null;

    try {
      const user = await User.findOne({ where: { passkey: payload.passkey } });

      if (!user) {
        
        throw new Error("ไม่พบผู้ใช้งาน");
      }

      userId = user.dataValues.id;
      userName = user.dataValues.name;

      // Enter operation mode for focused monitoring
      await stateManager.enterOperationMode(`dispense_slot_${payload.slotId}`);

      // Pre-operation status check
      const preOpStatus = await stateManager.syncSlotStatus("PRE_OPERATION");
      const targetSlot = preOpStatus.find(
        (slot) => slot.slotId === payload.slotId
      );

      if (!targetSlot || !targetSlot.isLocked) {
        throw new Error(
          `Slot ${payload.slotId} is not in locked state for dispensing`
        );
      }

      // Perform dispensing logic (this would integrate with actual CU12 hardware)
      // For now, we'll simulate the dispensing process
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate dispense time

      

      

      // Post-operation sync
      await stateManager.syncSlotStatus("POST_OPERATION");

      // Exit operation mode
      await stateManager.exitOperationMode();

      return {
        success: true,
        slotId: payload.slotId,
        message: "จ่ายยาสำเร็จ",
        monitoringMode: stateManager.getMonitoringMode(),
      };
    } catch (error) {
      // Ensure we exit operation mode even on error
      await stateManager.exitOperationMode();

      event.sender.send("cu12-dispense-error", {
        message: "การจ่ายยา CU12 ล้มเหลว กรุณาลองใหม่อีกครั้ง",
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
