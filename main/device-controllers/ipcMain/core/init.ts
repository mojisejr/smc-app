import { BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import { logger } from "../../../logger";
import { BuildTimeController } from "../../../ku-controllers/BuildTimeController";

export const initHandler = () => {
  ipcMain.handle("init", async (event: IpcMainEvent) => {
    // INSTRUMENTATION: Track init call frequency
    console.log(`[MAIN PROCESS] init() called at ${new Date().toISOString()}`);
    
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use BuildTimeController instead of KU16
    // Maintain exact same functionality and error messages for zero regression
    const controller = BuildTimeController.getCurrentController();
    
    console.log(
      `${BuildTimeController.getDeviceType()}_CONNECTION: ${controller && controller.isConnected() ? "CONNECTED" : "NO CONNECTION"}`
    );

    if (!controller || !controller.isConnected()) {
      // PRESERVE: Exact same Thai language error messages and logging
      await logger({
        user: "system",
        message: `init: failed on connection error`,
      });
      win.webContents.send("init-failed-on-connection-error", {
        title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
        message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
        suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
        path: "/error/connection-error",
      });
      return;
    }
    
    // Use controller.sendCheckState() instead of ku16.sendCheckState()
    // DS12Controller implements sendCheckState() method with same signature
    await controller.sendCheckState();
  });
};