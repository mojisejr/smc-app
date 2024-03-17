import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubReactiveAll = (mqtt: MqttClient) => {
  ipcMain.handle("reactivate-all", (event, payload) => {
    mqtt.publish("reactivate-all", JSON.stringify(payload));
  });
};
