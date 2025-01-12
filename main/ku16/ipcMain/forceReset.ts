import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const forceResetHanlder = (ku16: KU16) =>  {
    ipcMain.handle("force-reset", async (event, payload) => {
        await logger({ message: "force reset", user: payload.user });
        await ku16.resetSlot(payload.slot);
        await ku16.sleep(1000);
        ku16.sendCheckState();
    })
}