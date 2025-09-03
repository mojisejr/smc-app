// License data structure สำหรับการเก็บข้อมูลใน license file
export interface LicenseData {
  // ข้อมูลองค์กร
  organization: string;
  customerId: string;
  applicationId: string;

  // ข้อมูลเวลา
  generatedAt: string; // วันที่สร้าง license
  expiryDate: string; // วันหมดอายุ (YYYY-MM-DD)

  // Hardware binding
  macAddress: string; // MAC address จาก ESP32

  // WiFi credentials สำหรับ ESP32 connection
  wifiSsid: string; // WiFi SSID สำหรับเชื่อมต่อ ESP32
  wifiPassword: string; // WiFi Password

  // Metadata
  version: string; // Version ของ license format
  checksum?: string; // Checksum สำหรับ verification
  license_type: "production" | "internal" | "development";
}

// ESP32 response structure จาก GET /mac endpoint
export interface ESP32MacResponse {
  mac: string; // MAC address in format "XX:XX:XX:XX:XX:XX"
  status: "success" | "error";
  timestamp?: number; // Unix timestamp
  device_info?: {
    ip: string;
    firmware_version?: string;
  };
}

// CLI command options
export interface GenerateOptions {
  org: string; // Organization name
  customer: string; // Customer ID
  app: string; // Application ID
  expiry: string; // Expiry date (YYYY-MM-DD)
  esp32Ip?: string; // ESP32 IP address (optional)
  wifiSsid?: string; // WiFi SSID (optional for Phase 9)
  wifiPassword?: string; // WiFi password (optional for Phase 9)
  output?: string; // Output file path (optional)
  type?: "production" | "internal" | "development"; // License type (optional, defaults to 'production')
}

export interface ValidateOptions {
  file: string; // License file path
}

export interface InfoOptions {
  file: string; // License file path
}

export interface TestESP32Options {
  ip: string; // ESP32 IP address
}

export interface UpdateExpiryOptions {
  file: string; // License file path
  newExpiry: string; // New expiry date (YYYY-MM-DD)
  output?: string; // Output filename (optional)
  macAddress: string; // MAC address for validation
  wifiSsid: string; // WiFi SSID for validation
}

// License validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: LicenseData;
}

// KDF Context for HKDF key derivation (secure, no sensitive data)
export interface KDFContext {
  salt: string; // Deterministic salt (Base64)
  info: string; // Context info for HKDF (non-sensitive data only)
  algorithm: "hkdf-sha256"; // HKDF algorithm identifier
}

// License file structure (encrypted) - HKDF v2.0 Only
export interface LicenseFile {
  version: string; // License file format version (2.0.0 for HKDF)
  encrypted_data: string; // AES-256 encrypted license data (Base64)
  algorithm: string; // Encryption algorithm used
  created_at: string; // Creation timestamp

  // HKDF context (v2.0+ only, no sensitive data exposed)
  kdf_context: KDFContext; // KDF context for HKDF key generation (required)
}

// Error types
export interface CLIError {
  code: string;
  message: string;
  details?: any;
}

// WiFi password validation result
export interface WiFiPasswordValidation {
  isValid: boolean;
  strength: "weak" | "medium" | "strong";
  errors: string[];
  warnings: string[];
}

// Encryption configuration (Dynamic Key)
export interface EncryptionConfig {
  algorithm: "aes-256-cbc";
  iv_length: number; // IV length for AES
  // Note: key is now generated dynamically from license data
}

// ESP32 connection configuration
export interface ESP32Config {
  ip: string;
  port: number; // Default 80 for HTTP
  timeout: number; // Connection timeout in ms
  max_retries: number; // Maximum retry attempts
}
