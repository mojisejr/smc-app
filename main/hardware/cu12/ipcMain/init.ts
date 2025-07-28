import { BrowserWindow, ipcMain, dialog } from "electron";
import { CU12SmartStateManager } from "../stateManager";

export const cu12InitHandler = (
  stateManager: CU12SmartStateManager,
  win: BrowserWindow
) => {
  ipcMain.handle("cu12-init", async (event, payload) => {
    try {
      const isConnected = stateManager.isConnected();

      if (!isConnected) {
        win.webContents.send("cu12-init-failed-on-connection-error", {
          title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยา CU12 ได้",
          message:
            "ไม่สามารถเชื่อมต่อกับตู้เก็บยา CU12 ได้ ตรวจสอบที่หน้า admin",
          suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
          path: "/error/connection-error",
        });
        return { success: false, error: "Connection failed" };
      }

      // Trigger user interaction to activate monitoring
      await stateManager.onUserInteraction();

      // Sync slot status for initialization
      const slotStatus = await stateManager.syncSlotStatus("PRE_OPERATION");

      return {
        success: true,
        connected: isConnected,
        monitoringMode: stateManager.getMonitoringMode(),
        slotStatus,
      };
    } catch (error) {
      win.webContents.send("cu12-init-failed-on-connection-error", {
        title: "CU12 Initialization Error",
        message: `Initialization failed: ${error.message}`,
        suggestion: "Please check hardware connection and try again",
        path: "/error/connection-error",
      });
      return { success: false, error: error.message };
    }
  });
};
