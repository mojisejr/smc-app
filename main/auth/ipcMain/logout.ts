import { ipcMain } from "electron";
import { Authentication } from "..";
import { logger } from "../../logger";
import { LogoutRequest } from "../../interfaces/auth";


export const logoutRequestHandler = (auth: Authentication) =>  {
    ipcMain.handle("logout-req", async (event, payload: LogoutRequest) => {
        await logger({ user: payload.name, message: "logged out" });
        await auth.logout(); 
    })
}