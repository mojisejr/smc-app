import { ipcMain } from "electron";
import { KU16 } from "..";

export const dispensingResetHanlder = (ku16: KU16) => {
  ipcMain.handle("reset", async (event, payload) => {
    console.log("reset");
    console.log(payload);
    await ku16.resetSlot(payload.slot);
  });
};

