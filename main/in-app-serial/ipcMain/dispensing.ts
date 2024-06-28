import { ipcMain } from "electron";
import { KU16 } from "../serial-port";

export const dispenseHandler = (ku16: KU16) => {
  ipcMain.handle("dispense", async (event, payload) => {
    console.log("dispense");
    console.log(payload);
    await ku16.dispense(payload);
  });
};
