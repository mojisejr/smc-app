import { MqttClient } from "mqtt/*";
export const pubInit = (mqtt: MqttClient) => {
  mqtt.publish("init", JSON.stringify({ init: 1 }));
};
