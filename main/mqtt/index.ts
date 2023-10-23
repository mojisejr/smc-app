export const mqttConfig = {
  protocol: "mqtt",
  host: "localhost",
  port: "1883",
  clientId: "MAIN_APP_4931",
};

export const url = `${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}`;
