import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const deactiveHanlder = (ku16: KU16) =>  {
    ipcMain.handle("deactivate", async (event, payload) => {
        await logger({ message: `deactivate slot# ${payload.slot}`, user: payload.stuffId });
        await ku16.deactivate(payload.slot);
    })
}