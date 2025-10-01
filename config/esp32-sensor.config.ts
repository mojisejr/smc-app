/**
 * ESP32 Sensor Configuration for Smart Medication Cart (SMC)
 * Medical Device Compliance: Configuration for sensor data polling and error handling
 * 
 * This configuration manages HTTP communication with ESP32 devices for environmental monitoring
 * in medical device applications. All settings are designed for medical-grade reliability.
 */

export interface ESP32SensorConfig {
  /** ESP32 device endpoint URL for sensor data retrieval */
  readonly endpointUrl: string;
  
  /** Polling interval in milliseconds (default: 60 seconds for medical device compliance) */
  readonly pollingIntervalMs: number;
  
  /** HTTP request timeout in milliseconds */
  readonly timeoutMs: number;
  
  /** Maximum number of retry attempts for failed requests */
  readonly maxRetries: number;
  
  /** Delay between retry attempts in milliseconds (exponential backoff) */
  readonly retryDelayMs: number;
  
  /** Enable/disable automatic retry mechanism */
  readonly enableRetry: boolean;
  
  /** Enable/disable detailed logging for audit trail */
  readonly enableLogging: boolean;
  
  /** Connection health check interval in milliseconds */
  readonly healthCheckIntervalMs: number;
}

/**
 * Default ESP32 sensor configuration for medical device deployment
 * These settings prioritize reliability and audit compliance over performance
 */
export const DEFAULT_ESP32_SENSOR_CONFIG: ESP32SensorConfig = {
  // Standard ESP32 AP mode IP address
  endpointUrl: 'http://192.168.4.1/sensor',
  
  // 60-second polling interval for medical device compliance
  // Balances data freshness with network resource conservation
  pollingIntervalMs: 60 * 1000,
  
  // 10-second timeout for HTTP requests
  timeoutMs: 10 * 1000,
  
  // Maximum 3 retry attempts for medical device reliability
  maxRetries: 3,
  
  // 2-second initial retry delay with exponential backoff
  retryDelayMs: 2 * 1000,
  
  // Enable automatic retry for medical device resilience
  enableRetry: true,
  
  // Enable detailed logging for medical device audit trail
  enableLogging: true,
  
  // Health check every 5 minutes to monitor ESP32 connectivity
  healthCheckIntervalMs: 5 * 60 * 1000,
} as const;

/**
 * ESP32 sensor response structure based on actual device API
 * This interface ensures type safety for medical device data handling
 */
export interface ESP32SensorResponse {
  /** Request success status */
  success: boolean;
  
  /** Temperature reading in Celsius */
  temp: number;
  
  /** Humidity reading in percentage */
  humid: number;
  
  /** Sensor type identifier (e.g., "SHT30") */
  sensor: string;
  
  /** Operating mode (e.g., "live") */
  mode: string;
  
  /** Sensor availability status */
  sensor_available: boolean;
  
  /** Unix timestamp of the reading */
  timestamp: number;
  
  /** Customer identification for audit trail */
  customer_id: string;
}

/**
 * Error types for ESP32 sensor communication
 * Used for medical device error handling and audit logging
 */
export enum ESP32SensorErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  SENSOR_UNAVAILABLE = 'SENSOR_UNAVAILABLE',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
}

/**
 * ESP32 sensor error interface for structured error handling
 */
export interface ESP32SensorError {
  type: ESP32SensorErrorType;
  message: string;
  timestamp: number;
  retryCount?: number;
  originalError?: Error;
}

/**
 * Get ESP32 sensor configuration with optional overrides
 * Allows customization while maintaining medical device defaults
 */
export function getESP32SensorConfig(overrides?: Partial<ESP32SensorConfig>): ESP32SensorConfig {
  return {
    ...DEFAULT_ESP32_SENSOR_CONFIG,
    ...overrides,
  };
}

/**
 * Validate ESP32 sensor response structure
 * Ensures data integrity for medical device compliance
 */
export function validateESP32SensorResponse(data: any): data is ESP32SensorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.success === 'boolean' &&
    typeof data.temp === 'number' &&
    typeof data.humid === 'number' &&
    typeof data.sensor === 'string' &&
    typeof data.mode === 'string' &&
    typeof data.sensor_available === 'boolean' &&
    typeof data.timestamp === 'number' &&
    typeof data.customer_id === 'string'
  );
}