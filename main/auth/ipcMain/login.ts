import { BrowserWindow, ipcMain } from "electron";
import { Authentication } from "..";
import { AuthRequest, AuthResponse } from "../../interfaces/auth";
import { unifiedLoggingService } from "../services/unified-logging.service";

export const loginRequestHandler = (
  win: BrowserWindow,
  auth: Authentication
) => {
  ipcMain.handle("login-req", async (event, payload: AuthRequest) => {
    const result: AuthResponse = await auth.login(payload.passkey);
    if (result == null) {
      win.webContents.send("login-res", null);
      return;
    }
    // await logger({ user: result.name, message: "เข้าสู่ระบบตั้งค่าสำเร็จ" });
    win.webContents.send("login-res", result);
  });
};
