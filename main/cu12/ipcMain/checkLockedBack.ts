import { ipcMain } from "electron";
import { CU12 } from "..";
import { CheckLockedBack } from "../../interfaces/unlock";

export const checkLockedBackHandler = (cu12: CU12) => {
  ipcMain.handle(
    "check-locked-back",
    async (event, payload: CheckLockedBack) => {
      await cu12.getStatus();
    }
  );
};
