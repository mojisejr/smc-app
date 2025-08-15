import { ipcMain } from "electron";
import { KU16 } from "..";
import { CheckLockedBack } from "../../interfaces/unlock";
import { BuildTimeController } from "../../ku-controllers/BuildTimeController";

export const checkLockedBackHandler = (ku16: KU16) => {
  ipcMain.handle("check-locked-back", async (_event, _payload: CheckLockedBack) => {
    // MIGRATION: Use BuildTimeController instead of KU16
    // Maintain exact same functionality for slot closure verification
    const controller = BuildTimeController.getCurrentController();
    
    if (controller && controller.isConnected()) {
      // MIGRATION: Use controller.sendCheckState() instead of ku16.sendCheckState()
      await controller.sendCheckState();
    } else {
      // FALLBACK: Use original KU16 if controller not available
      // This ensures zero regression during transition period
      ku16.sendCheckState();
    }
  });
};