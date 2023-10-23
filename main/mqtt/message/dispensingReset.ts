import { BrowserWindow } from "electron";

interface Dispensing {
  slot?: number;
  hn?: string;
  timestamp?: number;
  unlocking: boolean;
  dispensing: boolean;
}

export const handleDispensingReset = (
  mainWindow: BrowserWindow,
  payload: Dispensing
) => {
  mainWindow.webContents.send("dispensing-reset", payload);
};
