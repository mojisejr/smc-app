import * as fs from "fs";
import * as jwt from "jsonwebtoken";
import {
  ActivationError,
  ActivationErrorCode,
} from "../errors/activationError";
import { Setting } from "../../db/model/setting.model";
import { APP_SERIAL, LICENSE_CONFIG } from "../config/constants";
import { ESP32Client } from "../utils/esp32Client";

interface LicensePayload {
  app_serial: string;
  mac_address: string;
  ssid: string;
  password: string;
  ip_address: string;
  exp: number;
  iat: number;
}

export class ActivationService {
  /**
   * Main entry point for license activation from license.json file
   * This now returns WiFi credentials for manual connection
   * @param filePath Path to the license.json file
   * @returns WiFi credentials for user to connect manually
   */
  public static async processLicenseFile(filePath: string): Promise<{
    ssid: string;
    password: string;
    ip_address: string;
    mac_address: string;
  }> {
    console.log("🚀 [DEBUG] Starting license file processing...");
    console.log(`📁 [DEBUG] File path: ${filePath}`);

    try {
      // Step 1: Read the license file
      console.log("📖 [DEBUG] Step 1: Reading license file...");
      const fileContent = this._readLicenseFile(filePath);
      console.log(
        `✅ [DEBUG] File read successfully, content length: ${fileContent.length} characters`
      );

      // Step 2: Parse JSON and extract JWT
      console.log("🔍 [DEBUG] Step 2: Parsing JSON and extracting JWT...");
      const token = this._parseAndExtractJWT(fileContent);
      console.log(
        `✅ [DEBUG] JWT extracted successfully, token length: ${token.length} characters`
      );
      console.log(`🔐 [DEBUG] Token preview: ${token.substring(0, 50)}...`);

      // Step 3: Verify and decode JWT
      console.log("🔓 [DEBUG] Step 3: Verifying and decoding JWT...");
      const payload = this._verifyAndDecodeJWT(token);
      console.log("✅ [DEBUG] JWT decoded successfully");
      console.log("📋 [DEBUG] Payload:", JSON.stringify(payload, null, 2));

      // Step 4: Validate app_serial against hardcoded value
      console.log("🔒 [DEBUG] Step 4: Validating app_serial...");
      console.log(`🔑 [DEBUG] Expected APP_SERIAL: ${APP_SERIAL}`);
      console.log(`🔑 [DEBUG] Payload app_serial: ${payload.app_serial}`);
      this._validateAppSerial(payload);
      console.log("✅ [DEBUG] App serial validation passed");

      // Return WiFi credentials for manual connection
      const result = {
        ssid: payload.ssid,
        password: payload.password,
        ip_address: payload.ip_address,
        mac_address: payload.mac_address,
      };

      console.log("🎉 [DEBUG] License processing completed successfully");
      console.log(
        "📶 [DEBUG] WiFi credentials:",
        JSON.stringify(result, null, 2)
      );

      return result;
    } catch (error) {
      console.error("❌ [DEBUG] Error during license processing:", error);

      if (error instanceof ActivationError) {
        console.error(
          `❌ [DEBUG] ActivationError - Code: ${error.code}, Message: ${error.message}`
        );
        throw error;
      }

      console.error(
        "❌ [DEBUG] Unexpected error during license processing:",
        error
      );
      throw new ActivationError(
        ActivationErrorCode.UNEXPECTED_ERROR,
        `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}`
      );
    }
  }

  /**
   * Complete activation after WiFi connection is established
   * @param filePath Path to the license.json file
   */
  public static async completeActivation(filePath: string): Promise<void> {
    try {
      // Re-process the license file
      const fileContent = this._readLicenseFile(filePath);
      const token = this._parseAndExtractJWT(fileContent);
      const payload = this._verifyAndDecodeJWT(token);

      // Validate app_serial again
      this._validateAppSerial(payload);

      // Perform ESP32 hardware validation
      await this._validateESP32Hardware(payload);

      // Save the license
      await this._saveLicense(token);
    } catch (error) {
      if (error instanceof ActivationError) {
        throw error;
      }

      console.error("Unexpected error during activation completion:", error);
      throw new ActivationError(
        ActivationErrorCode.UNEXPECTED_ERROR,
        `เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error.message}`
      );
    }
  }

  /**
   * Task 3.1: Read the license file from filesystem
   */
  private static _readLicenseFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, "utf8");
    } catch (error) {
      throw new ActivationError(
        ActivationErrorCode.INVALID_FILE_FORMAT,
        `ไม่สามารถอ่านไฟล์ได้: ${error.message}`
      );
    }
  }

  /**
   * Task 3.2: Parse JSON and extract JWT token
   */
  private static _parseAndExtractJWT(fileContent: string): string {
    try {
      const jsonData = JSON.parse(fileContent);

      if (!jsonData.token || typeof jsonData.token !== "string") {
        throw new ActivationError(ActivationErrorCode.INVALID_FILE_FORMAT);
      }

      return jsonData.token;
    } catch (error) {
      if (error instanceof ActivationError) {
        throw error;
      }

      throw new ActivationError(ActivationErrorCode.INVALID_FILE_FORMAT);
    }
  }

  /**
   * Verify JWT signature and decode payload
   */
  private static _verifyAndDecodeJWT(token: string): LicensePayload {
    console.log("🔓 [DEBUG] _verifyAndDecodeJWT: Starting JWT verification...");
    console.log(`⚙️ [DEBUG] Test mode: ${LICENSE_CONFIG.TEST_MODE}`);
    console.log(`🔑 [DEBUG] Secret key: ${LICENSE_CONFIG.JWT_SECRET_KEY}`);

    try {
      let decoded: LicensePayload;

      if (LICENSE_CONFIG.TEST_MODE) {
        // In test mode, decode without verification for development
        console.log(
          "⚠️ [DEBUG] TEST MODE: Skipping JWT signature verification"
        );
        decoded = jwt.decode(token) as LicensePayload;
        console.log("📋 [DEBUG] Decoded payload (no verification):", decoded);

        if (!decoded) {
          console.error("❌ [DEBUG] Failed to decode JWT token");
          throw new ActivationError(ActivationErrorCode.INVALID_FILE_FORMAT);
        }
      } else {
        // Production mode: verify signature
        console.log("🔒 [DEBUG] PRODUCTION MODE: Verifying JWT signature...");
        decoded = jwt.verify(
          token,
          LICENSE_CONFIG.JWT_SECRET_KEY
        ) as LicensePayload;
        console.log("✅ [DEBUG] JWT signature verified successfully");
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      console.log(`⏰ [DEBUG] Current timestamp: ${now}`);
      console.log(`⏰ [DEBUG] Token expires at: ${decoded.exp}`);
      console.log(`⏰ [DEBUG] Token issued at: ${decoded.iat}`);

      if (decoded.exp && decoded.exp < now) {
        console.error(
          `❌ [DEBUG] Token is expired. Current: ${now}, Expires: ${decoded.exp}`
        );
        throw new ActivationError(ActivationErrorCode.LICENSE_EXPIRED);
      }

      console.log("✅ [DEBUG] Token expiration check passed");
      return decoded;
    } catch (error) {
      console.error("❌ [DEBUG] Error in JWT verification:", error);
      console.error("❌ [DEBUG] Error name:", error.name);
      console.error("❌ [DEBUG] Error message:", error.message);

      if (error instanceof ActivationError) {
        throw error;
      }

      if (error.name === "TokenExpiredError") {
        console.error("❌ [DEBUG] JWT library says token is expired");
        throw new ActivationError(ActivationErrorCode.LICENSE_EXPIRED);
      }

      if (
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError"
      ) {
        console.error("❌ [DEBUG] JWT signature verification failed");
        throw new ActivationError(ActivationErrorCode.INVALID_SIGNATURE);
      }

      console.error("❌ [DEBUG] Unexpected JWT error");
      throw new ActivationError(
        ActivationErrorCode.UNEXPECTED_ERROR,
        `ข้อผิดพลาดในการตรวจสอบลิขสิทธิ์: ${error.message}`
      );
    }
  }

  /**
   * Validate app_serial against hardcoded value
   */
  private static _validateAppSerial(payload: LicensePayload): void {
    console.log(
      "🔒 [DEBUG] _validateAppSerial: Starting app serial validation..."
    );
    console.log(`📋 [DEBUG] Payload fields check:`);
    console.log(
      `  - app_serial: ${payload.app_serial ? "✅" : "❌"} (${
        payload.app_serial
      })`
    );
    console.log(
      `  - mac_address: ${payload.mac_address ? "✅" : "❌"} (${
        payload.mac_address
      })`
    );
    console.log(`  - ssid: ${payload.ssid ? "✅" : "❌"} (${payload.ssid})`);
    console.log(
      `  - password: ${payload.password ? "✅" : "❌"} (${payload.password})`
    );
    console.log(
      `  - ip_address: ${payload.ip_address ? "✅" : "❌"} (${
        payload.ip_address
      })`
    );

    // Ensure license has required fields
    if (
      !payload.app_serial ||
      !payload.mac_address ||
      !payload.ssid ||
      !payload.password
    ) {
      console.error("❌ [DEBUG] Required fields missing in license payload");
      throw new ActivationError(
        ActivationErrorCode.INVALID_FILE_FORMAT,
        "ข้อมูลลิขสิทธิ์ไม่สมบูรณ์"
      );
    }

    // Compare app_serial with hardcoded value
    console.log("🔑 [DEBUG] Comparing app_serial values:");
    console.log(`  Expected: "${APP_SERIAL}"`);
    console.log(`  Got:      "${payload.app_serial}"`);
    console.log(
      `  Match:    ${payload.app_serial === APP_SERIAL ? "✅" : "❌"}`
    );

    if (payload.app_serial !== APP_SERIAL) {
      console.error("❌ [DEBUG] App serial mismatch!");
      throw new ActivationError(
        ActivationErrorCode.HARDWARE_MISMATCH,
        "ลิขสิทธิ์นี้ไม่สามารถใช้กับแอปพลิเคชันนี้ได้"
      );
    }

    console.log("✅ [DEBUG] App serial validation passed");
  }

  /**
   * Validate ESP32 hardware through WiFi connection and REST API
   */
  private static async _validateESP32Hardware(
    payload: LicensePayload
  ): Promise<void> {
    console.log(
      "🌐 [DEBUG] _validateESP32Hardware: Starting ESP32 validation..."
    );
    console.log(`📡 [DEBUG] Target IP: ${payload.ip_address}`);
    console.log(`🔍 [DEBUG] Expected MAC: ${payload.mac_address}`);

    try {
      console.log(`🚀 [DEBUG] กำลังตรวจสอบ ESP32 ที่ ${payload.ip_address}...`);

      // Create ESP32 client
      console.log("🔧 [DEBUG] Creating ESP32 client...");
      const esp32Client = new ESP32Client(payload.ip_address);
      console.log("✅ [DEBUG] ESP32 client created successfully");

      // Step 1: Check ESP32 health
      console.log("🏥 [DEBUG] Step 1: Checking ESP32 health...");
      console.log("📞 [DEBUG] ตรวจสอบสถานะ ESP32...");
      const healthResponse = await esp32Client.checkHealth();
      console.log("✅ [DEBUG] Health check completed");
      console.log(
        "📊 [DEBUG] Health response:",
        JSON.stringify(healthResponse, null, 2)
      );
      console.log(
        `💚 [DEBUG] ESP32 สถานะ: ${healthResponse.server.status} (uptime: ${healthResponse.server.uptime_ms}ms)`
      );

      // Step 2: Get MAC address from ESP32
      console.log("🔍 [DEBUG] Step 2: Getting MAC address from ESP32...");
      console.log("📞 [DEBUG] ขอ MAC address จาก ESP32...");
      const actualMacAddress = await esp32Client.getMacAddress();
      console.log("✅ [DEBUG] MAC address retrieved successfully");
      console.log(`🏷️ [DEBUG] ESP32 MAC address: ${actualMacAddress}`);

      // Step 3: Compare MAC addresses
      console.log("🔍 [DEBUG] Step 3: Comparing MAC addresses...");
      console.log(`🔑 [DEBUG] MAC comparison:`);
      console.log(`  Expected: "${payload.mac_address}"`);
      console.log(`  Got:      "${actualMacAddress}"`);
      console.log(
        `  Match:    ${actualMacAddress === payload.mac_address ? "✅" : "❌"}`
      );

      if (actualMacAddress !== payload.mac_address) {
        console.error("❌ [DEBUG] MAC address mismatch!");
        throw new ActivationError(
          ActivationErrorCode.HARDWARE_MISMATCH,
          `MAC address ไม่ตรงกัน\nคาดหวัง: ${payload.mac_address}\nได้จริง: ${actualMacAddress}`
        );
      }

      console.log("🎉 [DEBUG] ✅ การตรวจสอบ ESP32 สำเร็จ!");
    } catch (error) {
      console.error("❌ [DEBUG] Error during ESP32 validation:", error);
      console.error("❌ [DEBUG] Error type:", typeof error);
      console.error("❌ [DEBUG] Error name:", error.name);
      console.error("❌ [DEBUG] Error message:", error.message);

      if (error instanceof ActivationError) {
        console.error("❌ [DEBUG] Re-throwing ActivationError");
        throw error;
      }

      console.error("❌ [DEBUG] Wrapping in UNEXPECTED_ERROR");
      throw new ActivationError(
        ActivationErrorCode.UNEXPECTED_ERROR,
        `ข้อผิดพลาดในการตรวจสอบ ESP32: ${error.message}`
      );
    }
  }

  /**
   * Task 3.5: Save the license token to database
   */
  private static async _saveLicense(token: string): Promise<void> {
    try {
      const result = await Setting.update(
        { activated_key: token },
        { where: { id: 1 } }
      );

      if (!result || result[0] === 0) {
        throw new ActivationError(
          ActivationErrorCode.UNEXPECTED_ERROR,
          "ไม่สามารถบันทึกลิขสิทธิ์ได้"
        );
      }
    } catch (error) {
      if (error instanceof ActivationError) {
        throw error;
      }

      throw new ActivationError(
        ActivationErrorCode.UNEXPECTED_ERROR,
        `ข้อผิดพลาดในการบันทึกลิขสิทธิ์: ${error.message}`
      );
    }
  }
}
