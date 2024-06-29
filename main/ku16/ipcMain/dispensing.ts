import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const dispenseHandler = (ku16: KU16) => {
  ipcMain.handle("dispense", async (event, payload) => {
    console.log("dispense");
    console.log(payload);
    await logger({ message: "dispense", user: "user-1234",  })
    await ku16.dispense(payload);
  });
};
