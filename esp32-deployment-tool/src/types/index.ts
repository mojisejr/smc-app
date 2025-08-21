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