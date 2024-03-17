import { MqttClient } from "mqtt/*";

export const subDeactivated = (mqtt: MqttClient) => {
  mqtt.subscribe("deactivated");
};
