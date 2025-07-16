import { ipcMain } from "electron";
import { CU12 } from "..";
import { logger } from "../../logger";

export const initHandler = (cu12: CU12) => {
  ipcMain.handle("init", async (event, payload) => {
    console.log(
      `CU12_CONNECTION: ${cu12.isConnected() ? "CONNECTED" : "NO CONNECTION"}`
    );

    if (!cu12.isConnected()) {
      await logger({
        user: "system",
        message: `init: failed on connection error`,
      });
      event.sender.send("init-failed-on-connection-error", {
        title: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้",
        message: "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้ ตรวจสอบที่หน้า admin",
        suggestion: "กรุณาตรวจสอบการเชื่อมต่อกับตู้เก็บยา และลองใหม่อีกครั้ง",
        path: "/error/connection-error",
      });
      return;
    }
    await cu12.getStatus();
  });
};
