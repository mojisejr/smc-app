import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubUnlock = (mqtt: MqttClient) => {
  ipcMain.handle("unlock", (event, payload) => {
    mqtt.publish("unlock", JSON.stringify(payload));
  });
};
