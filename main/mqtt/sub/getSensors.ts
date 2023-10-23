import { MqttClient } from "mqtt/*";

export const subGetSensors = (mqtt: MqttClient) => {
  mqtt.subscribe("get_sensors");
};
