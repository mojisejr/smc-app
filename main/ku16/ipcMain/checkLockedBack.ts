import { ipcMain } from "electron";
import { KU16 } from "..";
import { CheckLockedBack } from "../../interfaces/unlock";

export const checkLockedBackHandler = (ku16: KU16) => {
  ipcMain.handle("check-locked-back", async (event, payload: CheckLockedBack) => {
    ku16.sendCheckState();
  });
};