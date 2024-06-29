import { BrowserWindow, app, ipcMain } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16";
import { initHandler } from "./ku16/ipcMain/init";
import { unlockHandler } from "./ku16/ipcMain/unlock";
import { dispenseHandler } from "./ku16/ipcMain/dispensing";
import { dispensingResetHanlder } from "./ku16/ipcMain/reset";

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

  const ku16 = new KU16("/dev/tty.usbserial-A10MY6R2", 2, mainWindow);

  ku16.receive();

  //handler
  initHandler(ku16);
  unlockHandler(ku16);
  dispenseHandler(ku16);
  dispensingResetHanlder(ku16);

  // const mqtt = connect(url);

  // //Event Listener
  // mqtt.on("connect", () => {
  //   mqtt.on("message", (topic, payload) => {
  //     const parsedPayload = JSON.parse(payload.toString());
  //     switch (topic) {
  //       case "ku_states": {
  //         handleKuStates(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "dispensing": {
  //         handleDispensing(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "unlocking": {
  //         handleUnlocking(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "dispensing-reset": {
  //         handleDispensingReset(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "retrive_logs": {
  //         handleRetriveLogs(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "get_sensors": {
  //         handleRetriveSensor(mainWindow, parsedPayload);
  //         break;
  //       }
  //       case "activated": {
  //         pubInit(mqtt);
  //         break;
  //       }
  //       case "deactivated": {
  //         handleDeactivated(mainWindow);
  //         break;
  //       }
  //     }
  //   });
  // });

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
