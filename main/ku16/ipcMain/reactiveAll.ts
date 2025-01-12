import { ipcMain } from "electron";
import { KU16 } from "..";
import { logger } from "../../logger";

export const reactiveAllHanlder = (ku16: KU16) =>  {
    ipcMain.handle("reactivate-all", async (event, payload) => {
        await logger({ message: "reactivate all", user: payload.user });
        await ku16.reactiveAllSlots();
        await ku16.sleep(1000);
        ku16.sendCheckState();
    })
}