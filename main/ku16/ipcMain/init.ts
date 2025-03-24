import { BrowserWindow, ipcMain, dialog } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const initHandler = (ku16: KU16, win: BrowserWindow) => {
  ipcMain.handle("init", async (event, payload) => {
    console.log(
      `KU16_CONNECTION: ${ku16.connected ? "CONNECTED" : "NO CONNECTION"}`
    );

    if (!ku16.connected) {
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
    ku16.sendCheckState();
  });
};
