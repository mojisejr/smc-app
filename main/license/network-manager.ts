import axios from 'axios';
import { logger } from '../logger';

/**
 * Network Manager
 * 
 * จัดการการเชื่อมต่อเครือข่ายและ ESP32
 * รองรับ retry mechanisms และ network diagnostics
 */

export interface NetworkConnectionResult {
  success: boolean;
  ip?: string;
  macAddress?: string;
  error?: string;
  responseTime?: number;
  timestamp: Date;
}

export interface NetworkDiagnostics {
  ping: boolean;
  httpAccess: boolean;
  macAddressAccessible: boolean;
  responseTime: number;
  lastError?: string;
}

export class NetworkManager {
  private static instance: NetworkManager;
  private currentIP: string = '192.168.4.1';
  private timeoutMs: number = 10000; // 10 seconds
  private retryAttempts: number = 3;
  private retryDelayMs: number = 2000; // 2 seconds

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  /**
   * ตั้งค่า ESP32 IP address
   */
  setESP32IP(ip: string): void {
    this.currentIP = ip;
    console.log(`info: ESP32 IP updated to: ${ip}`);
  }

  /**
   * ตั้งค่า timeout และ retry parameters
   */
  setConnectionParams(timeoutMs: number, retryAttempts: number, retryDelayMs: number): void {
    this.timeoutMs = timeoutMs;
    this.retryAttempts = retryAttempts;
    this.retryDelayMs = retryDelayMs;
    
    console.log(`info: Network params updated - timeout: ${timeoutMs}ms, retries: ${retryAttempts}, delay: ${retryDelayMs}ms`);
  }

  /**
   * ทดสอบการเชื่อมต่อ ESP32 พร้อม retry mechanism
   */
  async testESP32Connection(customIP?: string): Promise<NetworkConnectionResult> {
    const targetIP = customIP || this.currentIP;
    const startTime = Date.now();
    
    console.log(`info: Testing ESP32 connection to ${targetIP}...`);
    
    await logger({
      user: 'system',
      message: `Testing ESP32 connection to ${targetIP}`
    });

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      console.log(`info: Connection attempt ${attempt}/${this.retryAttempts}`);
      
      try {
        const result = await this.performConnectionTest(targetIP, attempt);
        
        if (result.success) {
          const totalTime = Date.now() - startTime;
          console.log(`info: ✅ ESP32 connection successful after ${attempt} attempt(s) in ${totalTime}ms`);
          
          await logger({
            user: 'system',
            message: `ESP32 connection successful - IP: ${targetIP}, MAC: ${result.macAddress}, Time: ${totalTime}ms`
          });
          
          return {
            ...result,
            responseTime: totalTime,
            timestamp: new Date()
          };
        }
        
        // ถ้าไม่สำเร็จและยังมีการลองใหม่อีก ให้รอ
        if (attempt < this.retryAttempts) {
          console.log(`info: Attempt ${attempt} failed, retrying in ${this.retryDelayMs}ms...`);
          await this.delay(this.retryDelayMs);
        }
        
      } catch (error: any) {
        console.error(`error: Connection attempt ${attempt} failed:`, error.message);
        
        // ถ้าเป็นความผิดพลาดร้ายแรง ให้หยุดทันที
        if (this.isFatalError(error)) {
          break;
        }
        
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelayMs);
        }
      }
    }

    // ทุก attempts ล้มเหลว
    const totalTime = Date.now() - startTime;
    const errorMsg = `All connection attempts failed after ${totalTime}ms`;
    
    console.log(`error: ❌ ${errorMsg}`);
    
    await logger({
      user: 'system',
      message: `ESP32 connection failed - IP: ${targetIP}, Total time: ${totalTime}ms`
    });

    return {
      success: false,
      error: errorMsg,
      responseTime: totalTime,
      timestamp: new Date()
    };
  }

  /**
   * ทำการทดสอบการเชื่อมต่อครั้งเดียว
   */
  private async performConnectionTest(ip: string, attemptNumber: number): Promise<NetworkConnectionResult> {
    const macUrl = `http://${ip}/mac`;
    const healthUrl = `http://${ip}/health`;
    
    try {
      console.log(`debug: [Attempt ${attemptNumber}] Requesting MAC address from ${macUrl}`);
      
      // Test MAC address endpoint
      const macResponse = await axios.get(macUrl, {
        timeout: this.timeoutMs,
        validateStatus: (status) => status === 200
      });

      if (!macResponse.data || !macResponse.data.mac) {
        throw new Error('Invalid MAC address response format');
      }

      const macAddress = macResponse.data.mac.toUpperCase();
      console.log(`info: [Attempt ${attemptNumber}] Retrieved MAC address: ${macAddress}`);

      // Optional health check
      let healthStatus = 'unknown';
      try {
        const healthResponse = await axios.get(healthUrl, {
          timeout: 3000 // Shorter timeout for health check
        });
        healthStatus = healthResponse.data?.status || 'unknown';
        console.log(`debug: [Attempt ${attemptNumber}] Health status: ${healthStatus}`);
      } catch (healthError) {
        console.log(`debug: [Attempt ${attemptNumber}] Health check failed (non-critical):`, healthError.message);
      }

      return {
        success: true,
        ip: ip,
        macAddress: macAddress,
        timestamp: new Date()
      };

    } catch (error: any) {
      const errorMsg = this.parseConnectionError(error);
      console.log(`debug: [Attempt ${attemptNumber}] Connection failed: ${errorMsg}`);
      
      return {
        success: false,
        error: errorMsg,
        timestamp: new Date()
      };
    }
  }

  /**
   * รันการวิเคราะห์เครือข่ายแบบละเอียด
   */
  async runNetworkDiagnostics(ip?: string): Promise<NetworkDiagnostics> {
    const targetIP = ip || this.currentIP;
    const startTime = Date.now();
    
    console.log(`info: Running network diagnostics for ${targetIP}...`);
    
    const diagnostics: NetworkDiagnostics = {
      ping: false,
      httpAccess: false,
      macAddressAccessible: false,
      responseTime: 0,
    };

    try {
      // Test 1: Basic HTTP connectivity
      console.log('debug: Testing basic HTTP connectivity...');
      const healthResponse = await axios.get(`http://${targetIP}/health`, {
        timeout: 5000
      });
      
      diagnostics.httpAccess = healthResponse.status === 200;
      diagnostics.ping = true; // If HTTP works, ping is assumed working
      
      console.log(`info: HTTP connectivity: ${diagnostics.httpAccess ? 'OK' : 'Failed'}`);

      // Test 2: MAC address endpoint
      console.log('debug: Testing MAC address endpoint...');
      const macResponse = await axios.get(`http://${targetIP}/mac`, {
        timeout: 5000
      });
      
      diagnostics.macAddressAccessible = !!(macResponse.data?.mac);
      console.log(`info: MAC endpoint: ${diagnostics.macAddressAccessible ? 'OK' : 'Failed'}`);

    } catch (error: any) {
      console.error('debug: Network diagnostics error:', error.message);
      diagnostics.lastError = this.parseConnectionError(error);
    }

    diagnostics.responseTime = Date.now() - startTime;
    
    console.log('info: Network diagnostics completed:', diagnostics);
    
    await logger({
      user: 'system',
      message: `Network diagnostics - IP: ${targetIP}, HTTP: ${diagnostics.httpAccess}, MAC: ${diagnostics.macAddressAccessible}, Time: ${diagnostics.responseTime}ms`
    });

    return diagnostics;
  }

  /**
   * ลอง IP addresses หลายตัว
   */
  async scanForESP32(ipRange: string[] = ['192.168.4.1', '192.168.1.100', '10.0.0.1']): Promise<NetworkConnectionResult[]> {
    console.log(`info: Scanning for ESP32 devices in ${ipRange.length} IP addresses...`);
    
    const results: NetworkConnectionResult[] = [];
    
    // Test แต่ละ IP address แบบ parallel
    const promises = ipRange.map(async (ip) => {
      console.log(`debug: Testing IP: ${ip}`);
      
      try {
        const result = await this.performConnectionTest(ip, 1);
        results.push(result);
        
        if (result.success) {
          console.log(`info: ✅ Found ESP32 at ${ip} - MAC: ${result.macAddress}`);
        }
        
        return result;
      } catch (error) {
        console.log(`debug: IP ${ip} not accessible`);
        results.push({
          success: false,
          error: 'Not accessible',
          timestamp: new Date()
        });
        return null;
      }
    });

    await Promise.all(promises);
    
    const foundDevices = results.filter(r => r.success);
    console.log(`info: ESP32 scan completed - found ${foundDevices.length}/${ipRange.length} devices`);
    
    return results;
  }

  /**
   * Parse connection error เป็น user-friendly message
   */
  private parseConnectionError(error: any): string {
    if (error.code === 'ECONNREFUSED') {
      return 'ESP32 ปฏิเสธการเชื่อมต่อ - ตรวจสอบว่าอุปกรณ์เปิดอยู่';
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return 'ไม่พบอุปกรณ์ ESP32 ที่ IP address นี้';
    }
    
    if (error.code === 'ETIMEDOUT') {
      return 'หมดเวลาการเชื่อมต่อ - ตรวจสอบเครือข่าย WiFi';
    }
    
    if (error.response) {
      return `HTTP Error ${error.response.status}: ${error.response.statusText}`;
    }
    
    return error.message || 'Unknown network error';
  }

  /**
   * ตรวจสอบว่าเป็น error ที่ไม่ควรลองใหม่
   */
  private isFatalError(error: any): boolean {
    // Network errors ที่ไม่มีประโยชน์ในการลองใหม่
    const fatalCodes = ['ENOTFOUND', 'EAI_AGAIN'];
    return fatalCodes.includes(error.code);
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ดึงสถานะปัจจุบันของ network manager
   */
  getStatus(): {
    currentIP: string;
    timeoutMs: number;
    retryAttempts: number;
    retryDelayMs: number;
  } {
    return {
      currentIP: this.currentIP,
      timeoutMs: this.timeoutMs,
      retryAttempts: this.retryAttempts,
      retryDelayMs: this.retryDelayMs,
    };
  }
}