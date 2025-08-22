// Customer data types (minimal)
export interface CustomerInfo {
  organization: string;
  customerId: string;
  applicationName: string;
}

// ESP32 device info
export interface ESP32Device {
  port: string;
  description: string;
  manufacturer?: string;
}

// Deployment state
export interface DeploymentState {
  customer: CustomerInfo | null;
  selectedDevice: ESP32Device | null;
  isDeploying: boolean;
  progress: number;
  status: string;
}

// CSV Export related types
export interface CSVExportData {
  timestamp: string;
  organization: string;
  customer_id: string;
  application_name: string;
  wifi_ssid: string;
  wifi_password: string;
  mac_address: string;
  ip_address: string;
}

export interface CSVExportResult {
  success: boolean;
  filePath: string;
  filename: string;
  isNewFile: boolean;
  rowsTotal: number;
  error?: string;
}

// Dual export result (JSON + CSV)
export interface DualExportResult {
  json: {
    success: boolean;
    filePath: string;
    filename: string;
    error?: string;
  };
  csv: CSVExportResult;
}