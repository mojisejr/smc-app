import { BrowserWindow } from "electron";

interface Unlocking {
  slot?: number;
  hn?: string;
  timestamp?: number;
  unlocking: boolean;
  dispensing: boolean;
}

export const handleUnlocking = (
  mainWindow: BrowserWindow,
  payload: Unlocking
) => {
  mainWindow.webContents.send("unlocking", payload);
};
