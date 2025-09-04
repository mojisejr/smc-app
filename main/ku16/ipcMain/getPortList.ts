import { ipcMain } from "electron";
import { KU16 } from "..";

export const getPortListHandler = (ku16: KU16) => {
  ipcMain.handle("get-port-list", async (event, payload) => {
    return await KU16.LIST();
  });
};
