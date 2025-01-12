import { ipcMain } from "electron";
import { KU16 } from "..";

export const dispensingResetHanlder = (ku16: KU16) => {
  ipcMain.handle("reset", async (event, payload) => {
    await ku16.resetSlot(payload.slot);
    await ku16.sleep(1000);
    ku16.sendCheckState();
  });
};

