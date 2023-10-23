import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";
export const pubResetSlot = (mqtt: MqttClient) => {
  ipcMain.handle("force-reset", (event, payload) => {
    mqtt.publish("force-reset", JSON.stringify(payload));
  });
};
