import * as http from "http";
import { logger } from "../logger";
import { getValidationMode } from "../utils/environment";

/**
 * ESP32 Client
 *
 * จัดการการเชื่อมต่อกับ ESP32 สำหรับ MAC address validation
 * และ WiFi management
 */

export interface ESP32MacResponse {
  // รองรับทั้ง format เก่าและใหม่ สำหรับ backward compatibility
  mac?: string; // Legacy format: { "mac": "F4:65:0B:58:66:A4" }
  mac_address?: string; // New format: { "mac_address": "F4:65:0B:58:66:A4" }
  status?: "success" | "error";
  timestamp?: number;
  customer_id?: string;
  organization?: string;
  device_info?: {
    ip: string;
    firmware_version?: string;
  };
}

export interface ESP32ConnectionConfig {
  ip: string;
  port: number;
  timeout: number;
  max_retries: number;
}

export class ESP32Client {
  // Default configuration
  static readonly DEFAULT_CONFIG: ESP32ConnectionConfig = {
    ip: process.env.SMC_ESP32_DEFAULT_IP || "192.168.4.1",
    port: 80,
    timeout: parseInt(process.env.SMC_WIFI_CONNECTION_TIMEOUT || "10000"),
    max_retries: 3,
  };

  static readonly MAC_ENDPOINT = process.env.SMC_ESP32_MAC_ENDPOINT || "/mac";

  /**
   * ทดสอบการเชื่อมต่อกับ ESP32 (HKDF v2.0)
   * 🔒 เสมอต้องเชื่อมต่อกับ ESP32 จริง - ไม่มี bypass
   */
  static async testConnection(ip?: string): Promise<boolean> {
    const targetIp = ip || this.DEFAULT_CONFIG.ip;

    try {
      console.log(`info: Testing ESP32 connection to ${targetIp}`);

      const response = await this.makeHttpRequest(targetIp, this.MAC_ENDPOINT);

      if (response.statusCode === 200) {
        console.log(`info: ESP32 connection test successful`);
        return true;
      } else {
        console.log(
          `debug: ESP32 connection test failed with status ${response.statusCode}`
        );
        return false;
      }
    } catch (error) {
      console.error(`error: ESP32 connection test failed:`, error);
      return false;
    }
  }

  /**
   * ดึง MAC address จาก ESP32 (HKDF v2.0 + Internal License Support)
   * 🔒 ตรวจสอบ license type ก่อน - bypass สำหรับ internal/development licenses
   * พร้อม retry logic และ error handling
   */
  static async getMacAddress(ip?: string): Promise<string | null> {
    const targetIp = ip || this.DEFAULT_CONFIG.ip;

    // ตรวจสอบ license type ก่อนเรียก ESP32 hardware
    try {
      const { LicenseFileManager } = await import("./file-manager");
      const licenseData = await LicenseFileManager.parseLicenseFile();

      if (
        licenseData &&
        (licenseData.license_type === "internal" ||
          licenseData.license_type === "development")
      ) {
        console.log(
          `info: ${licenseData.license_type.toUpperCase()} license detected - bypassing ESP32 hardware validation`
        );
        await logger({
          user: "system",
          message: `${licenseData.license_type.toUpperCase()} license bypass - ESP32 hardware validation skipped for organization: ${
            licenseData.organization
          }`,
        });

        // Return mock MAC address for internal/development licenses
        const mockMacAddress = "F4:65:0B:58:66:A4"; // Standard format mock MAC
        console.log(
          `info: Using mock MAC address for ${licenseData.license_type} license: ${mockMacAddress}`
        );
        return mockMacAddress;
      }
    } catch (error) {
      console.log(
        "debug: License type check failed, proceeding with ESP32 hardware validation:",
        error.message
      );
    }

    // Production license หรือไม่สามารถตรวจสอบ license type ได้ - ใช้ ESP32 hardware validation
    console.log("info: Connecting to ESP32 hardware for MAC address retrieval");
    await logger({
      user: "system",
      message: "ESP32 MAC address request - hardware binding required",
    });

    let lastError: Error | null = null;

    for (
      let attempt = 1;
      attempt <= this.DEFAULT_CONFIG.max_retries;
      attempt++
    ) {
      try {
        console.log(
          `info: Attempting to get MAC address from ESP32 (attempt ${attempt}/${this.DEFAULT_CONFIG.max_retries})`
        );

        const response = await this.makeHttpRequest(
          targetIp,
          this.MAC_ENDPOINT
        );

        if (response.statusCode !== 200) {
          throw new Error(
            `HTTP ${response.statusCode}: ${response.statusMessage}`
          );
        }

        const responseData = JSON.parse(response.data) as ESP32MacResponse;

        // รองรับทั้ง format เก่าและใหม่ของ ESP32 API
        const macFromResponse = responseData.mac_address || responseData.mac;

        if (!macFromResponse) {
          console.error(
            "debug: ESP32 Response:",
            JSON.stringify(responseData, null, 2)
          );
          throw new Error(
            "ESP32 response missing MAC address (checked both mac and mac_address fields)"
          );
        }

        // ตรวจสอบ status ถ้ามี (optional สำหรับ backward compatibility)
        if (responseData.status && responseData.status !== "success") {
          throw new Error(
            `ESP32 returned error status: ${responseData.status}`
          );
        }

        const macAddress = macFromResponse.toUpperCase();
        console.log(`info: MAC address retrieved from ESP32: ${macAddress}`);

        // Log สำหรับ audit (ไม่เก็บ MAC ในฐานข้อมูล)
        await logger({
          user: "system",
          message: "ESP32 MAC address validated successfully",
        });

        return macAddress;
      } catch (error: any) {
        lastError = error;
        console.error(
          `error: Failed to get MAC address (attempt ${attempt}):`,
          error.message
        );

        // รอก่อน retry (เว้นแต่เป็น attempt สุดท้าย)
        if (attempt < this.DEFAULT_CONFIG.max_retries) {
          const delayMs = 1000 * attempt; // Exponential backoff
          console.log(`debug: Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }

    // ล้มเหลวทุก attempt
    console.error(
      `error: Failed to get MAC address after ${this.DEFAULT_CONFIG.max_retries} attempts`
    );

    await logger({
      user: "system",
      message: `ESP32 MAC address retrieval failed after ${this.DEFAULT_CONFIG.max_retries} attempts: ${lastError?.message}`,
    });

    return null;
  }

  /**
   * เชื่อมต่อกับ ESP32 WiFi network
   * (ใช้ system WiFi manager)
   */
  static async connectToWiFi(ssid: string, password: string): Promise<boolean> {
    try {
      console.log(`info: Connecting to ESP32 WiFi network: ${ssid}`);

      // ใช้ WiFiManager สำหรับการเชื่อมต่อ
      const { SystemWiFiManager } = await import("./wifi-manager");
      const connected = await SystemWiFiManager.connectToNetwork(
        ssid,
        password
      );

      if (connected) {
        console.log(`info: Successfully connected to ESP32 WiFi: ${ssid}`);

        // ทดสอบ connection กับ ESP32
        const testResult = await this.testConnection();
        if (testResult) {
          await logger({
            user: "system",
            message: `Successfully connected to ESP32 WiFi network`,
          });
          return true;
        } else {
          console.log("debug: WiFi connected but ESP32 not responding");
          return false;
        }
      } else {
        console.error(`error: Failed to connect to ESP32 WiFi: ${ssid}`);
        return false;
      }
    } catch (error) {
      console.error("error: ESP32 WiFi connection failed:", error);
      await logger({
        user: "system",
        message: `ESP32 WiFi connection failed: ${error.message}`,
      });
      return false;
    }
  }

  /**
   * ตัดการเชื่อมต่อจาก ESP32 WiFi
   */
  static async disconnectWiFi(ssid?: string): Promise<void> {
    try {
      if (!ssid) {
        console.log("info: No SSID provided for disconnection");
        return;
      }

      console.log(`info: Disconnecting from ESP32 WiFi: ${ssid}`);

      const { SystemWiFiManager } = await import("./wifi-manager");
      await SystemWiFiManager.disconnectFromNetwork(ssid);

      await logger({
        user: "system",
        message: "Disconnected from ESP32 WiFi network",
      });
    } catch (error) {
      console.error("error: Failed to disconnect from ESP32 WiFi:", error);
    }
  }

  /**
   * ตรวจสอบว่าเชื่อมต่อกับ ESP32 WiFi อยู่หรือไม่
   */
  static async isConnectedToESP32(ssid: string): Promise<boolean> {
    try {
      const { SystemWiFiManager } = await import("./wifi-manager");
      const isConnected = await SystemWiFiManager.isConnectedTo(ssid);

      if (isConnected) {
        // ทดสอบ ESP32 response ด้วย
        return await this.testConnection();
      }

      return false;
    } catch (error) {
      console.error("error: Failed to check ESP32 WiFi connection:", error);
      return false;
    }
  }

  /**
   * HTTP request helper สำหรับ ESP32 communication
   */
  private static async makeHttpRequest(
    ip: string,
    path: string
  ): Promise<{ statusCode?: number; statusMessage?: string; data: string }> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: ip,
        port: this.DEFAULT_CONFIG.port,
        path: path,
        method: "GET",
        timeout: this.DEFAULT_CONFIG.timeout,
        headers: {
          "User-Agent": "SMC-License-System/1.0.0",
          Accept: "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            data: data,
          });
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(
          new Error(
            `HTTP request timeout after ${this.DEFAULT_CONFIG.timeout}ms`
          )
        );
      });

      req.setTimeout(this.DEFAULT_CONFIG.timeout);
      req.end();
    });
  }

  /**
   * Utility function สำหรับ delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ดึงข้อมูลสถานะ ESP32 (สำหรับ diagnostic)
   */
  static async getDeviceInfo(ip?: string): Promise<any> {
    const targetIp = ip || this.DEFAULT_CONFIG.ip;

    try {
      console.log(`info: Getting ESP32 device info from ${targetIp}`);

      const response = await this.makeHttpRequest(targetIp, "/info");

      if (response.statusCode === 200) {
        const deviceInfo = JSON.parse(response.data);
        console.log(`info: ESP32 device info retrieved`);
        return deviceInfo;
      } else {
        console.log(
          `debug: ESP32 device info not available (status ${response.statusCode})`
        );
        return null;
      }
    } catch (error) {
      console.error("error: Failed to get ESP32 device info:", error);
      return null;
    }
  }

  /**
   * รีเซ็ต ESP32 connection (ถ้า ESP32 รองรับ)
   */
  static async resetDevice(ip?: string): Promise<boolean> {
    const targetIp = ip || this.DEFAULT_CONFIG.ip;

    try {
      console.log(`info: Resetting ESP32 device at ${targetIp}`);

      const response = await this.makeHttpRequest(targetIp, "/reset");

      if (response.statusCode === 200) {
        console.log(`info: ESP32 reset command sent successfully`);
        await logger({
          user: "system",
          message: "ESP32 device reset command sent",
        });
        return true;
      } else {
        console.log(
          `debug: ESP32 reset failed with status ${response.statusCode}`
        );
        return false;
      }
    } catch (error) {
      console.error("error: Failed to reset ESP32:", error);
      return false;
    }
  }
}
