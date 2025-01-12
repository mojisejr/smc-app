import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const deactiveHanlder = (ku16: KU16) =>  {
    ipcMain.handle("deactivate", async (event, payload) => {
        await logger({ message: `deactivate slot# ${payload.slot}`, user: payload.user });
        await ku16.deactivate(payload.slot);
        await ku16.sleep(1000);
        ku16.sendCheckState();
    })
}