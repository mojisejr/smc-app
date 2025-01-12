import { BrowserWindow, ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const initHandler = (ku16: KU16, win: BrowserWindow) => {
  ipcMain.handle("init", async (event, payload) => {
    console.log(`KU16_CONNECTION: ${ku16.connected ? "CONNECTED" : "NO CONNECTION"}`);
    if(!ku16.connected) {
      win.webContents.send("connection", { title: "KU16", message: "KU16 is not connected", suggestion: "Please check the connection and try again." }); 
      return;
    }
    ku16.sendCheckState();
  });
};
