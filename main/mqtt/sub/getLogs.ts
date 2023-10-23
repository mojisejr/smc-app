import { MqttClient } from "mqtt/*";

export const subGetLogs = (mqtt: MqttClient) => {
  mqtt.subscribe("retrive_logs");
};
