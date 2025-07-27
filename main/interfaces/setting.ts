export interface ISetting {
  id: number;
  // CU12 Configuration (12-slot system)
  cu_port?: string;
  cu_baudrate?: number;
  // Legacy KU16 Configuration (15-slot system)
  ku_port: string;
  ku_baudrate: number;
  // System Configuration
  available_slots: number;
  max_user: number;
  service_code: string;
  max_log_counts?: number;
  organization?: string;
  customer_name?: string;
  activated_key?: string;
  // Indicator Device Configuration
  indi_port: string;
  indi_baudrate: number;
}

export interface IUpdateSetting {
  ku_port: string;
  ku_baudrate: number;
}
