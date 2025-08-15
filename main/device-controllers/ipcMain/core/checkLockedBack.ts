import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { CheckLockedBack } from "../../../interfaces/unlock";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const checkLockedBackHandler = () => {
  ipcMain.handle(
    "check-locked-back",
    async (event: IpcMainEvent, payload: CheckLockedBack) => {
      console.log("DISPENSING DIALOG TRACE: CHECK LOCKED BACK ON IPCMAIN");
      // Get BrowserWindow from IPC event instead of using KU16 reference
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        throw new Error("Could not find BrowserWindow from IPC event");
      }

      // Use BuildTimeController instead of KU16
      // Maintain exact same functionality for slot closure verification
      const controller = BuildTimeController.getCurrentController();

      if (!controller || !controller.isConnected()) {
        throw new Error("ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้");
      }

      // Use controller.sendCheckState() instead of ku16.sendCheckState()
      // DS12Controller implements sendCheckState() method with same signature
      await controller.sendCheckState();
    }
  );
};
