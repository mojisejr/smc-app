import { BrowserWindow } from "electron";

interface Unlocking {
  slot?: number;
  hn?: string;
  timestamp?: number;
  unlocking: boolean;
  dispensing: boolean;
}

export const handleResetFinished = (
  mainWindow: BrowserWindow,
  payload: Unlocking
) => {
  mainWindow.webContents.send("reset-finished", payload);
};
