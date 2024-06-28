import { BrowserWindow, app, ipcMain } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { url } from "./mqtt";
import { connect } from "mqtt";

import { sequelize } from "../db/sequelize";
import { KU16 } from "./in-app-serial/serial-port";
import { initHandler } from "./in-app-serial/ipcMain/init";
import { getAllSlots } from "./db";
import { unlockHandler } from "./in-app-serial/ipcMain/unlock";
import { dispenseHandler } from "./in-app-serial/ipcMain/dispensing";

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

  const serial = new KU16("/dev/tty.usbserial-A10MY6R2", 2, mainWindow);

  serial.receive();

  //handler
  initHandler(serial);
  unlockHandler(serial);
  dispenseHandler(serial);

  // await getAllSlots(mainWindow);

  // serial.unlock(2);
  // serial.checkState();

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
