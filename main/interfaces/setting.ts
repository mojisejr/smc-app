export interface ISetting {
  id: number;
  ku_port: string;
  ku_baudrate: number;
  available_slots: number;
  max_user: number;
  service_code: string;
  indi_port: string;
  indi_baudrate: number;
  device_type: string;
}

export interface IUpdateSetting {
  ku_port: string;
  ku_baudrate: number;
}
