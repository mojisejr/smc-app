import { ipcMain } from "electron";
import { KU16 } from "../serial-port";

export const initHandler = (ku16: KU16) => {
  ipcMain.handle("init", async (payload) => {
    console.log(`init: ${new Date().toISOString()}`);
    await ku16.checkState();
  });
};
