// Customer data types (minimal)
export interface CustomerInfo {
  organization: string;
  customerId: string;
  applicationName: string;
  expiryDate: string; // YYYY-MM-DD format
  noExpiry?: boolean; // True for permanent licenses (no expiry)
}

// ESP32 device info with chip detection capabilities
export interface ESP32Device {
  port: string;
  description: string;
  manufacturer?: string;
  // Chip detection and compatibility fields
  chipType?: string; // e.g., 'ESP32-S3', 'ESP32', 'ESP32-C3'
  boardConfig?: string; // PlatformIO board configuration
  isSupported?: boolean; // Whether chip is supported for deployment
  isMedicalDeviceCompatible?: boolean; // Medical device licensing compatibility
  macAddress?: string; // Device MAC address for license binding
  chipDetails?: {
    chipRevision?: string;
    flashSize?: string;
    crystalFreq?: string;
  };
  detectionStatus?: 'pending' | 'detecting' | 'detected' | 'failed';
  detectionError?: string;
}

// Deployment state
export interface DeploymentState {
  customer: CustomerInfo | null;
  selectedDevice: ESP32Device | null;
  isDeploying: boolean;
  progress: number;
  status: string;
  deploymentComplete?: boolean;
  deviceIP?: string;
  macAddress?: string;
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

// Sensor testing related types
export interface SensorReading {
  temp: number;
  humid: number;
  sensor: string;
  gpio: number;
  mode: "live" | "mock" | "mock_fallback";
  sensor_available: boolean;
  timestamp: number;
  customer_id: string;
}

export interface SensorTestPanelProps {
  deviceIP: string;
  isVisible: boolean;
  onClose?: () => void;
}