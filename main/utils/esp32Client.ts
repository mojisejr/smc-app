import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ESP32_CONFIG } from '../config/constants';
import { ActivationError, ActivationErrorCode } from '../errors/activationError';

interface ESP32HealthResponse {
  server: {
    status: string;
    uptime_ms: number;
    connected_clients: number;
  };
  info: {
    device: string;
    mac_address: string;
    ap_ip: string;
    ap_ssid: string;
  };
}

interface ESP32MacResponse {
  mac_address: string;
}

export class ESP32Client {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(ipAddress: string) {
    this.baseUrl = `http://${ipAddress}`;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: ESP32_CONFIG.HTTP_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Check ESP32 health status
   * @returns Promise<ESP32HealthResponse>
   */
  async checkHealth(): Promise<ESP32HealthResponse> {
    return this.retryRequest(async () => {
      try {
        const response: AxiosResponse<ESP32HealthResponse> = await this.client.get('/health');
        
        if (response.data.server?.status !== 'healthy') {
          throw new ActivationError(
            ActivationErrorCode.HARDWARE_MISMATCH,
            `ESP32 ไม่ทำงานปกติ: สถานะ ${response.data.server?.status || 'unknown'}`
          );
        }

        return response.data;
      } catch (error) {
        if (error instanceof ActivationError) {
          throw error;
        }
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new ActivationError(
            ActivationErrorCode.HARDWARE_MISMATCH,
            'ไม่สามารถเชื่อมต่อกับ ESP32 ได้ กรุณาตรวจสอบการเชื่อมต่อ WiFi'
          );
        }

        if (error.code === 'ECONNABORTED') {
          throw new ActivationError(
            ActivationErrorCode.HARDWARE_MISMATCH,
            'ESP32 ตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง'
          );
        }

        throw new ActivationError(
          ActivationErrorCode.UNEXPECTED_ERROR,
          `ข้อผิดพลาดในการเชื่อมต่อ ESP32: ${error.message}`
        );
      }
    });
  }

  /**
   * Get ESP32 MAC address
   * @returns Promise<string> MAC address
   */
  async getMacAddress(): Promise<string> {
    return this.retryRequest(async () => {
      try {
        const response: AxiosResponse<ESP32MacResponse> = await this.client.get('/mac');
        
        if (!response.data.mac_address) {
          throw new ActivationError(
            ActivationErrorCode.HARDWARE_MISMATCH,
            'ESP32 ไม่ส่ง MAC address กลับมา'
          );
        }

        return response.data.mac_address;
      } catch (error) {
        if (error instanceof ActivationError) {
          throw error;
        }
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          throw new ActivationError(
            ActivationErrorCode.HARDWARE_MISMATCH,
            'ไม่สามารถเชื่อมต่อกับ ESP32 ได้ กรุณาตรวจสอบการเชื่อมต่อ WiFi'
          );
        }

        throw new ActivationError(
          ActivationErrorCode.UNEXPECTED_ERROR,
          `ข้อผิดพลาดในการขอ MAC address: ${error.message}`
        );
      }
    });
  }

  /**
   * Retry mechanism for HTTP requests
   */
  private async retryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= ESP32_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (error instanceof ActivationError && 
            error.code !== ActivationErrorCode.UNEXPECTED_ERROR) {
          throw error;
        }
        
        // If this is the last attempt, throw the error
        if (attempt === ESP32_CONFIG.MAX_RETRIES) {
          throw lastError;
        }
        
        // Wait before retrying
        console.log(`ESP32 request failed, retrying in ${ESP32_CONFIG.RETRY_DELAY}ms... (attempt ${attempt}/${ESP32_CONFIG.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, ESP32_CONFIG.RETRY_DELAY));
      }
    }
    
    throw lastError;
  }
}