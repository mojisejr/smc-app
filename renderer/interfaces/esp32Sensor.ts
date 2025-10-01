/**
 * ESP32 Sensor Interface for Smart Medication Cart (SMC) - Renderer Layer
 * Medical Device Compliance: Type definitions for ESP32 sensor data handling
 * 
 * This interface defines the complete ESP32 sensor response structure
 * for medical device environmental monitoring applications.
 */

/**
 * Complete ESP32 sensor response structure from /sensor endpoint
 * Based on actual ESP32 device API specification
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
 * Processed indicator data structure for UI components
 * This is the structure sent from main process to renderer process
 */
export interface IndicatorData {
  /** Temperature reading in Celsius */
  temp: number;
  
  /** Humidity reading in percentage */
  humid: number;
  
  /** Error message if any (empty string if no error) */
  error: string;
  
  /** Timestamp of the last successful reading */
  lastUpdate?: number;
  
  /** Sensor availability status */
  sensorAvailable?: boolean;
  
  /** Customer ID for audit trail */
  customerId?: string;
}

/**
 * IPC response structure for indicator data
 * Used for communication between main and renderer processes
 */
export interface IndicatorResponse {
  /** Operation success status */
  success: boolean;
  
  /** Error or status message */
  message: string | null;
  
  /** Indicator data payload */
  data: IndicatorData | null;
}

/**
 * Error types for ESP32 sensor communication in renderer layer
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
 * ESP32 sensor error interface for UI error handling
 */
export interface ESP32SensorError {
  type: ESP32SensorErrorType;
  message: string;
  timestamp: number;
  retryCount?: number;
}

/**
 * Hook state interface for useIndicator hook
 */
export interface UseIndicatorState {
  /** Loading state for UI feedback */
  loading: boolean;
  
  /** Current indicator response */
  indicator?: IndicatorResponse;
  
  /** Connection status with ESP32 */
  connected: boolean;
  
  /** Last error if any */
  lastError?: ESP32SensorError;
}

/**
 * Type guard to validate ESP32 sensor response
 */
export function isValidESP32SensorResponse(data: any): data is ESP32SensorResponse {
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

/**
 * Type guard to validate indicator data
 */
export function isValidIndicatorData(data: any): data is IndicatorData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.temp === 'number' &&
    typeof data.humid === 'number' &&
    typeof data.error === 'string'
  );
}