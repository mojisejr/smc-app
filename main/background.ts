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
    fullscreen: true,
    closable: true,
    autoHideMenuBar: true,
  });

  sequelize
    .authenticate()
    .then(() => console.log("database connected"))
    .catch((error) => console.log(error));

  // const ku16 = new KU16("/dev/tty.usbserial-A10MY6R2", 2, mainWindow);
  const ku16 = new KU16("COM3", 2,  mainWindow);


  ku16.receive();

  //handler
  initHandler(ku16);
  unlockHandler(ku16);
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

