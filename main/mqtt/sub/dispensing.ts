import { MqttClient } from "mqtt/*";

export const subDispensing = (mqtt: MqttClient) => {
  mqtt.subscribe("dispensing");
};
