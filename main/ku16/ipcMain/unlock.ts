import { ipcMain } from "electron";
import { KU16 } from "..";

export const unlockHandler = (ku16: KU16) => {
  ipcMain.handle("unlock", async (event, payload) => {
    ku16.sendUnlock(payload);
    await ku16.sleep(1000)
    ku16.sendCheckState();
  });
};
