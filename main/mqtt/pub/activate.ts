import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubActivate = (mqtt: MqttClient) => {
  ipcMain.handle("activate", (event, payload) => {
    mqtt.publish("activate", JSON.stringify(payload));
  });
};
