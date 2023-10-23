import { MqttClient } from "mqtt/*";

export const subDispensingReset = (mqtt: MqttClient) => {
  mqtt.subscribe("dispensing-reset");
};
