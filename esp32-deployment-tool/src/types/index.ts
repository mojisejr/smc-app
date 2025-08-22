// Customer data types (minimal)
export interface CustomerInfo {
  organization: string;
  customerId: string;
  applicationName: string;
  expiryDate: string; // YYYY-MM-DD format
  noExpiry?: boolean; // True for permanent licenses (no expiry)
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
  expiry_date: string;
  license_status: 'pending' | 'completed' | 'failed' | 'skipped';
  license_file: string;
  notes: string;
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