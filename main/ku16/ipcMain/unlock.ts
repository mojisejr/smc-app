import { ipcMain } from "electron";
import { KU16 } from "..";

export const unlockHandler = (ku16: KU16) => {
  ipcMain.handle("unlock", async (event, payload) => {
    console.log("unlock");
    await ku16.unlock(payload);
  });
};
