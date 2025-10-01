import { BrowserWindow } from "electron";
import axios from "axios";
import {
  DEFAULT_ESP32_SENSOR_CONFIG,
  ESP32SensorConfig,
  ESP32SensorResponse,
  ESP32SensorError,
  ESP32SensorErrorType,
  validateESP32SensorResponse,
} from "../../config/esp32-sensor.config";
import { IndicatorParams } from "../interfaces/indicatorParams";

/**
 * ESP32 Indicator Device for Smart Medication Cart (SMC)
 * Medical Device Compliance: HTTP-based sensor communication with audit logging
 *
 * Replaces Serial Port communication with HTTP REST API calls to ESP32 device
 * Implements 1-minute polling mechanism for medical device environmental monitoring
 */
export class IndicatorDevice {
  private win: BrowserWindow;
  private config: ESP32SensorConfig;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private retryCount: number = 0;
  private lastSuccessfulReading: number = 0;

  constructor(config: Partial<ESP32SensorConfig> = {}, win: BrowserWindow) {
    this.win = win;
    this.config = { ...DEFAULT_ESP32_SENSOR_CONFIG, ...config };

    // Medical device audit logging
    if (this.config.enableLogging) {
      console.log(
        `INFO: ESP32 IndicatorDevice initialized with endpoint: ${this.config.endpointUrl}`
      );
    }
  }

  /**
   * Start polling ESP32 sensor data
   * Implements medical device compliance with regular interval monitoring
   */
  public startPolling(): void {
    if (this.isPolling) {
      console.log("INFO: ESP32 polling already active");
      return;
    }

    this.isPolling = true;

    // Initial reading
    this.fetchSensorData();

    // Set up interval polling
    this.pollingInterval = setInterval(() => {
      this.fetchSensorData();
    }, this.config.pollingIntervalMs);

    if (this.config.enableLogging) {
      console.log(
        `INFO: ESP32 polling started with ${this.config.pollingIntervalMs}ms interval`
      );
    }
  }

  /**
   * Stop polling ESP32 sensor data
   * Clean shutdown for medical device compliance
   */
  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isPolling = false;

    if (this.config.enableLogging) {
      console.log("INFO: ESP32 polling stopped");
    }
  }

  /**
   * Fetch sensor data from ESP32 device via HTTP
   * Implements retry mechanism and error handling for medical device reliability
   */
  private async fetchSensorData(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeoutMs
      );

      const response = await axios.get<ESP32SensorResponse>(
        this.config.endpointUrl,
        {
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = response.data;

      // Validate response structure for medical device compliance
      if (!validateESP32SensorResponse(data)) {
        throw new Error("Invalid ESP32 sensor response structure");
      }

      // Process successful response
      this.handleSuccessfulReading(data);
      this.retryCount = 0; // Reset retry count on success
    } catch (error) {
      this.handleSensorError(error);
    }
  }

  /**
   * Handle successful sensor reading
   * Convert ESP32 response to IndicatorParams format for IPC communication
   */
  private handleSuccessfulReading(data: ESP32SensorResponse): void {
    this.lastSuccessfulReading = Date.now();

    const indicatorData: IndicatorParams = {
      temp: data.temp,
      humid: data.humid,
      error: data.sensor_available ? "" : "Sensor not available",
    };

    // Send data to renderer process via IPC
    this.win.webContents.send("retrive-indicator", {
      success: true,
      message: null,
      data: indicatorData,
    });

    if (this.config.enableLogging) {
      console.log(
        `INFO: ESP32 sensor data received - Temp: ${data.temp}°C, Humidity: ${data.humid}%`
      );
    }
  }

  /**
   * Handle sensor communication errors
   * Implements retry mechanism and medical device error reporting
   */
  private handleSensorError(error: any): void {
    const sensorError: ESP32SensorError = {
      type: this.categorizeError(error),
      message: error.message || "Unknown ESP32 sensor error",
      timestamp: Date.now(),
      retryCount: this.retryCount,
    };

    // Medical device audit logging
    console.log(
      `ERROR: ESP32 sensor communication failed - ${sensorError.type}: ${sensorError.message}`
    );

    // Implement retry mechanism if enabled
    if (this.config.enableRetry && this.retryCount < this.config.maxRetries) {
      this.retryCount++;

      setTimeout(() => {
        if (this.config.enableLogging) {
          console.log(
            `INFO: ESP32 retry attempt ${this.retryCount}/${this.config.maxRetries}`
          );
        }
        this.fetchSensorData();
      }, this.config.retryDelayMs * Math.pow(2, this.retryCount - 1)); // Exponential backoff

      return;
    }

    // Send error to renderer process
    this.win.webContents.send("retrive-indicator", {
      success: false,
      message: `ไม่สามารถเชื่อมต่อกับ ESP32 sensor: ${sensorError.message}`,
      data: null,
    });

    // Reset retry count after max attempts
    this.retryCount = 0;
  }

  /**
   * Categorize error types for medical device error handling
   */
  private categorizeError(error: any): ESP32SensorErrorType {
    if (error.name === "AbortError") {
      return ESP32SensorErrorType.TIMEOUT_ERROR;
    }

    if (error.message?.includes("fetch")) {
      return ESP32SensorErrorType.NETWORK_ERROR;
    }

    if (error.message?.includes("JSON")) {
      return ESP32SensorErrorType.PARSE_ERROR;
    }

    if (error.message?.includes("Invalid")) {
      return ESP32SensorErrorType.INVALID_RESPONSE;
    }

    if (error.message?.includes("refused")) {
      return ESP32SensorErrorType.CONNECTION_REFUSED;
    }

    return ESP32SensorErrorType.NETWORK_ERROR;
  }

  /**
   * Get current connection status for health monitoring
   */
  public getConnectionStatus(): { connected: boolean; lastReading: number } {
    const now = Date.now();
    const timeSinceLastReading = now - this.lastSuccessfulReading;
    const connected = timeSinceLastReading < this.config.pollingIntervalMs * 2; // Consider disconnected if no reading for 2 intervals

    return {
      connected,
      lastReading: this.lastSuccessfulReading,
    };
  }

  /**
   * Legacy method for compatibility - now starts polling instead of serial receive
   * @deprecated Use startPolling() instead
   */
  public receive(): void {
    console.log(
      "INFO: Legacy receive() method called - starting ESP32 polling"
    );
    this.startPolling();
  }
}
