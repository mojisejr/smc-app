import { BrowserWindow, app} from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16";
import { initHandler } from "./ku16/ipcMain/init";
import { unlockHandler } from "./ku16/ipcMain/unlock";
import { dispenseHandler } from "./ku16/ipcMain/dispensing";
import { dispensingResetHanlder } from "./ku16/ipcMain/reset";
import { LoggingHandler } from "./logger";
import { forceResetHanlder } from "./ku16/ipcMain/forceReset";
import { reactiveAllHanlder } from "./ku16/ipcMain/reactiveAll";
import { deactiveHanlder } from "./ku16/ipcMain/deactivate";
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { checkLockedBackHandler } from "./ku16/ipcMain/checkLockedBack";


/**
 * Indicates whether the application is running in production mode.
 * 
 * This boolean value is determined by checking the `NODE_ENV` environment variable.
 * If `NODE_ENV` is set to "production", `isProd` will be `true`; otherwise, it will be `false`.
 */
const isProd: boolean = process.env.NODE_ENV === "production";
let mainWindow: BrowserWindow;
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  mainWindow = createWindow("main", {
    fullscreen: false, 
    minWidth: 800,
    minHeight: 600,
    closable: true,
    autoHideMenuBar: true,
  });

  let dbConnection = false;
  
  //connect to database
  const sql = await sequelize.sync();

  const settings = await getSetting();


  if(settings && sql) { 
    //connected after authentication
    dbConnection = true;
  }

  
  

  //define ku16
  const ku16 = new KU16(settings.ku_port, settings.ku_baudrate, settings.available_slots,  mainWindow);

  //authentication
  const auth = new Authentication();





  //receive data from ku16
  ku16.receive();

  //handler
  getSettingHandler(mainWindow);
  updateSettingHandler(mainWindow, ku16);
  

  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  initHandler(ku16,mainWindow);
  unlockHandler(ku16);
  checkLockedBackHandler(ku16);
  dispenseHandler(ku16);
  dispensingResetHanlder(ku16);
  LoggingHandler(ku16);
  forceResetHanlder(ku16);
  deactiveHanlder(ku16);
  reactiveAllHanlder(ku16);

  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }



})();

app.on("window-all-closed", () => {
  app.quit();
});

