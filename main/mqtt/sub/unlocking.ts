import { MqttClient } from "mqtt/*";

export const subUnlocking = (mqtt: MqttClient) => {
  mqtt.subscribe("unlocking");
};
