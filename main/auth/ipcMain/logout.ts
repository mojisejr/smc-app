import { ipcMain } from "electron";
import { Authentication } from "..";
import { LogoutRequest } from "../../interfaces/auth";
import { unifiedLoggingService } from "../services/unified-logging.service";

export const logoutRequestHandler = (auth: Authentication) => {
  ipcMain.handle("logout-req", async (event, payload: LogoutRequest) => {
    // await logger({ user: payload.name, message: "logged out" });
    await auth.logout();
  });
};
