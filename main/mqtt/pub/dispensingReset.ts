import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubDispensingReset = (mqtt: MqttClient) => {
  ipcMain.handle("reset", (event, payload) => {
    mqtt.publish("reset", JSON.stringify(payload));
  });
};
