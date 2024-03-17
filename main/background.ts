import { BrowserWindow, app, ipcMain } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { url } from "./mqtt";
import { connect } from "mqtt";
import { pubInit } from "./mqtt/pub/init";
import { handleKuStates } from "./mqtt/message/kuStates";
import { subKuState } from "./mqtt/sub/kuStates";
import { pubUnlock } from "./mqtt/pub/unlock";
import { subUnlocking } from "./mqtt/sub/unlocking";
import { subDispensing } from "./mqtt/sub/dispensing";
import { handleDispensing } from "./mqtt/message/dispensing";
import { handleUnlocking } from "./mqtt/message/unlocking";
import { pubDispense } from "./mqtt/pub/dispense";
import { pubDispensingReset } from "./mqtt/pub/dispensingReset";
import { subDispensingReset } from "./mqtt/sub/dispensingReset";
import { pubInitOnIpc } from "./mqtt/pub/initOnIpc";
import { handleDispensingReset } from "./mqtt/message/dispensingReset";
import { pubResetSlot } from "./mqtt/pub/resetSlot";
import { subGetLogs } from "./mqtt/sub/getLogs";
import { handleRetriveLogs } from "./mqtt/message/retriveLogs";
import { pubGetLogs } from "./mqtt/pub/getLogs";
import { handleRetriveSensor } from "./mqtt/message/retrieveSensors";
import { subGetSensors } from "./mqtt/sub/getSensors";
import { pubActivate } from "./mqtt/pub/activate";
import { pubDeactivate } from "./mqtt/pub/deactivate";
import { subDeactivated } from './mqtt/sub/deactivated';
import { handleDeactivated } from './mqtt/message/deactivated';
import { pubReactiveAll } from "./mqtt/pub/reactiveAll";

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

  const mqtt = connect(url);

  //Publisher
  pubInit(mqtt);
  pubInitOnIpc(mqtt);
  pubUnlock(mqtt);
  pubDispense(mqtt);
  pubDispensingReset(mqtt);
  pubResetSlot(mqtt);
  pubGetLogs(mqtt);
  pubActivate(mqtt);
  pubDeactivate(mqtt);
  pubReactiveAll(mqtt);

  //Subscriber
  subKuState(mqtt);
  subUnlocking(mqtt);
  subDispensing(mqtt);
  subDispensingReset(mqtt);
  subGetLogs(mqtt);
  subGetSensors(mqtt);
  subDeactivated(mqtt);
  

  //Event Listener
  mqtt.on("connect", () => {
    mqtt.on("message", (topic, payload) => {
      const parsedPayload = JSON.parse(payload.toString());
      switch (topic) {
        case "ku_states": {
          handleKuStates(mainWindow, parsedPayload);
          break;
        }
        case "dispensing": {
          handleDispensing(mainWindow, parsedPayload);
          break;
        }
        case "unlocking": {
          handleUnlocking(mainWindow, parsedPayload);
          break;
        }
        case "dispensing-reset": {
          handleDispensingReset(mainWindow, parsedPayload);
          break;
        }
        case "retrive_logs": {
          handleRetriveLogs(mainWindow, parsedPayload);
          break;
        }
        case "get_sensors": {
          handleRetriveSensor(mainWindow, parsedPayload);
          break;
        }
        case "activated": {
		pubInit(mqtt);
          break;
        }
        case "deactivated": {
	  handleDeactivated(mainWindow);
	  break;
        }
      }
    });
  });


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
