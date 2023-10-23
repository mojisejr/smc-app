import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";
export const pubGetLogs = (mqtt: MqttClient) => {
  ipcMain.handle("get_logs", (event, payload) => {
    mqtt.publish("get_logs", JSON.stringify(payload));
  });
};
