import { ipcMain } from "electron";
import { MqttClient } from "mqtt/*";

export const pubDispense = (mqtt: MqttClient) => {
  ipcMain.handle("dispense", (event, payload) => {
    mqtt.publish("dispense", JSON.stringify(payload));
  });
};
