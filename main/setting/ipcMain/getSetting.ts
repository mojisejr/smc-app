import { BrowserWindow, ipcMain } from "electron";
import  { logger } from "../../logger";
import { getSetting } from "../getSetting";

export const getSettingHandler = (win: BrowserWindow) => {
  ipcMain.handle("get-setting", async (event, payload) => {
    const setting = await getSetting();
    if(setting == null || setting == undefined) {
      win.webContents.send("get-setting-res", null);
      await logger({ user: "system", message: "Setting is not found" });
      return;
    }
    win.webContents.send("get-setting-res", setting);
  });
};
