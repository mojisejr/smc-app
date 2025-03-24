import { ipcMain } from "electron";
import { validateLicense } from "../validator";

export const checkActivationKeyHandler = async () => {
  ipcMain.handle("check-activation-key", async () => {
    return await validateLicense();
  });
};
