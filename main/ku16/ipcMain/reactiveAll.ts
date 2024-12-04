import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const reactiveAllHanlder = (ku16: KU16) =>  {
    ipcMain.handle("reactivate-all", async (event, payload) => {
        await logger({ message: "reactivate all", user: payload.stuffId });
        await ku16.reactiveAllSlots();
    })
}