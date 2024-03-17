import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubDeactivate = (mqtt: MqttClient) => {
  ipcMain.handle("deactivate", (event, payload) => {
    mqtt.publish("deactivate", JSON.stringify(payload));
  });
}
