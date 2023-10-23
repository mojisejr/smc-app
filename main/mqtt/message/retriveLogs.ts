import { BrowserWindow } from "electron";

interface State {
  id: number;
  message?: string;
  timestamp?: string;
}
export const handleRetriveLogs = (win: BrowserWindow, payload: State[]) => {
    win.webContents.send("retrive_logs", payload);
};
