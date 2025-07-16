import { ipcMain } from "electron";
import { CU12 } from "..";
import { SerialPort } from "serialport";

export const getPortListHandler = (cu12: CU12) => {
  ipcMain.handle("get-port-list", async (event, payload) => {
    return await SerialPort.list();
  });
};
