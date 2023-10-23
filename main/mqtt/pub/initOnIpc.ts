import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";
export const pubInitOnIpc = (mqtt: MqttClient) => {
  ipcMain.handle("init", (event, payload) => {
    mqtt.publish("init", JSON.stringify({ init: 1 }));
  });
};
