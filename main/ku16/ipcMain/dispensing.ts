import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const dispenseHandler = (ku16: KU16) => {
  ipcMain.handle("dispense", async (event, payload) => {
    await logger({ message: "dispense", user: payload.user });
    await ku16.dispense(payload);
    await ku16.sleep(1000);
    ku16.sendCheckState();
  });
};
