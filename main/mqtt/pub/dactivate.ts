import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubDeactivate = (mqtt: MqttClient) => {
  ipcMain.handle("active", (event, payload) => {
    mqtt.publish("active", JSON.stringify(payload));
  });
};
