import { MqttClient } from "mqtt/*";

export const subKuState = (mqtt: MqttClient) => {
  mqtt.subscribe("ku_states");
};
