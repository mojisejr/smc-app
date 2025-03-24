import { ipcMain } from "electron";
import { activateLicense } from "../validator";

export const activateKeyHandler = async () => {
  ipcMain.handle("activate-key", async (event, payload) => {
    const key = payload.key;
    const result = await activateLicense(key);
    return result;
  });
};
