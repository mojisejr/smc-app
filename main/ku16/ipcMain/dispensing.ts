import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const dispenseHandler = (ku16: KU16) => {
  ipcMain.handle("dispense", async (event, payload) => {
    await logger({ message: "dispense", user: payload.stuffId });
    await ku16.dispense(payload);
  });
};
