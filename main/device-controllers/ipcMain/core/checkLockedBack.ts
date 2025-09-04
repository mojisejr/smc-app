import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { CheckLockedBack } from "../../../interfaces/unlock";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const checkLockedBackHandler = () => {
  ipcMain.handle(
    "check-locked-back",
    async (event: IpcMainEvent, payload: CheckLockedBack) => {
      // Dispensing dialog trace removed
      
      // Get BrowserWindow from IPC event instead of using KU16 reference
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        const error = new Error("Could not find BrowserWindow from IPC event");
        console.error("CHECKLOCKEDBACK ERROR:", error);
        throw error;
      }

      // Use BuildTimeController instead of KU16
      // Maintain exact same functionality for slot closure verification
      const controller = BuildTimeController.getCurrentController();

      if (!controller || !controller.isConnected()) {
        const error = new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
        console.error("CHECKLOCKEDBACK ERROR: Controller not connected");
        
        // Send error event to UI
        win.webContents.send("locked-back-error", {
          slotId: payload.slotId,
          error: error.message
        });
        
        throw error;
      }

      try {
        // Check locked back debug log removed
        
        // Store the payload data in controller for later use when hardware responds
        if (controller.setDispensingContext) {
          controller.setDispensingContext(payload);
        }
        
        // Use controller.sendCheckState() instead of ku16.sendCheckState()
        // DS12Controller implements sendCheckState() method with same signature
        await controller.sendCheckState();
        
        // Check state success debug log removed
        
        // Note: The actual locked-back-success event will be sent by DS12Controller
        // when it receives and processes the hardware response
        
      } catch (error) {
        console.error("CHECKLOCKEDBACK ERROR: Failed to send check state command:", error);
        
        // Send error event to UI
        win.webContents.send("locked-back-error", {
          slotId: payload.slotId,
          error: error.message || "Failed to check slot status"
        });
        
        throw error;
      }
    }
  );
};
