export interface ISetting {
  id: number;
  // Hardware Configuration
  hardware_type?: 'AUTO' | 'KU16' | 'CU12';
  ku_port: string;
  ku_baudrate: number;
  cu_port?: string;
  cu_baudrate?: number;
  // System Configuration
  available_slots: number;
  max_user: number;
  service_code: string;
  max_log_counts: number;
  // Indicator Configuration
  indi_port?: string;
  indi_baudrate?: number;
}

export interface IUpdateSetting {
  // Hardware Configuration
  hardware_type?: 'AUTO' | 'KU16' | 'CU12';
  ku_port?: string;
  ku_baudrate?: number;
  cu_port?: string;
  cu_baudrate?: number;
  // System Configuration  
  available_slots?: number;
}
