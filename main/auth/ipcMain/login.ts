
import { BrowserWindow, ipcMain } from "electron";
import { Authentication } from "..";
import { logger } from "../../logger";
import { AuthRequest, AuthResponse } from "../../interfaces/auth";


export const loginRequestHandler = (win: BrowserWindow, auth: Authentication) =>  {
    ipcMain.handle("login-req", async (event, payload: AuthRequest) => {
        const result: AuthResponse = await auth.login(payload.passkey);
        if(result == null) {
            win.webContents.send("login-res", null)
            return;
        }
        await logger({ user: result.name, message: "login success" });
        win.webContents.send("login-res", result);
        
    })
}