// License data structure สำหรับการเก็บข้อมูลใน license file
export interface LicenseData {
  // ข้อมูลองค์กร
  organization: string;
  customerId: string;
  applicationId: string;
  
  // ข้อมูลเวลา
  generatedAt: string;        // วันที่สร้าง license
  expiryDate: string;         // วันหมดอายุ (YYYY-MM-DD)
  
  // Hardware binding
  macAddress: string;         // MAC address จาก ESP32
  
  // Metadata
  version: string;            // Version ของ license format
  checksum?: string;          // Checksum สำหรับ verification
}

// ESP32 response structure จาก GET /mac endpoint
export interface ESP32MacResponse {
  mac: string;                // MAC address in format "XX:XX:XX:XX:XX:XX"
  status: 'success' | 'error';
  timestamp?: number;         // Unix timestamp
  device_info?: {
    ip: string;
    firmware_version?: string;
  };
}

// CLI command options
export interface GenerateOptions {
  org: string;                // Organization name
  customer: string;           // Customer ID
  app: string;                // Application ID
  expiry: string;             // Expiry date (YYYY-MM-DD)
  esp32Ip: string;           // ESP32 IP address
  wifiSsid?: string;         // WiFi SSID (optional)
  wifiPassword?: string;     // WiFi password (optional)
  output: string;            // Output filename
}

export interface ValidateOptions {
  file: string;              // License file path
}

export interface InfoOptions {
  file: string;              // License file path
}

export interface TestESP32Options {
  ip: string;                // ESP32 IP address
}

// License validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: LicenseData;
}

// License file structure (encrypted)
export interface LicenseFile {
  version: string;           // License file format version
  encrypted_data: string;    // AES-256 encrypted license data (Base64)
  algorithm: string;         // Encryption algorithm used
  created_at: string;        // Creation timestamp
}

// Error types
export interface CLIError {
  code: string;
  message: string;
  details?: any;
}

// Encryption configuration
export interface EncryptionConfig {
  algorithm: 'aes-256-cbc';
  key: string;               // Shared secret key
  iv_length: number;         // IV length for AES
}

// ESP32 connection configuration
export interface ESP32Config {
  ip: string;
  port: number;              // Default 80 for HTTP
  timeout: number;           // Connection timeout in ms
  max_retries: number;       // Maximum retry attempts
}