import { createHash } from "crypto";
import * as os from "os";
import * as jwt from "jsonwebtoken";
import { Setting } from "../../db/model/setting.model";
import { LICENSE_CONFIG, APP_SERIAL } from "../config/constants";
import { ESP32Client } from "../utils/esp32Client";

// 🔹 ฟังก์ชันสร้าง HWID (อิงจาก MAC Address และ Hostname)
export function getHardwareId(): string {
  const macAddress =
    os.networkInterfaces()?.["eth0"]?.[0]?.mac || "00:00:00:00:00:00";
  const hostname = os.hostname();
  return createHash("sha256")
    .update(macAddress + hostname)
    .digest("hex");
}

interface LicensePayload {
  app_serial: string;
  mac_address: string;
  ssid: string;
  password: string;
  ip_address: string;
  exp: number;
  iat: number;
}

/**
 * Helper function to delete license from database when validation fails
 */
async function deleteLicenseFromDatabase(): Promise<void> {
  console.log("🗑️ [DEBUG] Deleting invalid license from database...");
  try {
    await Setting.update({ activated_key: null }, { where: { id: 1 } });
    console.log("✅ [DEBUG] License deleted from database successfully");
  } catch (error) {
    console.error("❌ [DEBUG] Failed to delete license from database:", error);
  }
}

// 🔹 ฟังก์ชันตรวจสอบว่าระบบมีการ activate แล้วหรือไม่และตรวจสอบ ESP32
export async function validateLicense(): Promise<boolean> {
  console.log(
    "🔍 [DEBUG] validateLicense: Starting comprehensive license validation..."
  );

  try {
    // Step 1: Get license from database
    console.log(
      "📂 [DEBUG] validateLicense: Fetching license from database..."
    );
    const setting = await Setting.findOne({ where: { id: 1 } });
    if (!setting || !setting.dataValues.activated_key) {
      console.warn("⚠️ [DEBUG] validateLicense: No license found in database");
      return false;
    }

    const token = setting.dataValues.activated_key;
    console.log(
      `🔑 [DEBUG] validateLicense: Found token in database (length: ${token.length})`
    );
    console.log(
      `🔑 [DEBUG] validateLicense: Token preview: ${token.substring(0, 50)}...`
    );

    // In test mode, just check if token exists
    if (LICENSE_CONFIG.TEST_MODE) {
      console.log(
        "⚠️ [DEBUG] validateLicense: TEST MODE - License validation passed (token exists)"
      );
      return true;
    }

    let decoded: LicensePayload;

    try {
      // Step 2: Verify and decode JWT
      console.log("🔒 [DEBUG] validateLicense: Verifying JWT signature...");
      const SECRET_KEY = LICENSE_CONFIG.JWT_SECRET_KEY;
      console.log(
        `🔑 [DEBUG] validateLicense: Using secret key: ${SECRET_KEY.substring(
          0,
          20
        )}...`
      );

      decoded = jwt.verify(token, SECRET_KEY) as LicensePayload;
      console.log("✅ [DEBUG] validateLicense: JWT verification successful");
      console.log(
        "📋 [DEBUG] validateLicense: Decoded token:",
        JSON.stringify(decoded, null, 2)
      );

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      console.log(
        `⏰ [DEBUG] validateLicense: Current time: ${now}, Token expires: ${decoded.exp}`
      );

      if (decoded.exp && decoded.exp < now) {
        console.error(
          "❌ [DEBUG] validateLicense: Token is expired - deleting license"
        );
        await deleteLicenseFromDatabase();
        return false;
      }
    } catch (error) {
      console.error(
        "❌ [DEBUG] validateLicense: JWT validation error:",
        error.message
      );
      console.error(
        "❌ [DEBUG] validateLicense: Invalid JWT - deleting license"
      );
      await deleteLicenseFromDatabase();
      return false;
    }

    try {
      // Step 3: Validate app_serial number
      console.log("🔒 [DEBUG] validateLicense: Checking app_serial...");
      console.log(`🔑 [DEBUG] Expected app_serial: "${APP_SERIAL}"`);
      console.log(`🔑 [DEBUG] Token app_serial: "${decoded.app_serial}"`);

      if (decoded.app_serial !== APP_SERIAL) {
        console.error(
          "❌ [DEBUG] validateLicense: App serial mismatch - deleting license"
        );
        await deleteLicenseFromDatabase();
        return false;
      }
      console.log("✅ [DEBUG] validateLicense: App serial validation passed");

      // Step 4: Check ESP32 connection and validate MAC address
      console.log("🌐 [DEBUG] validateLicense: Validating ESP32 connection...");
      console.log(`📡 [DEBUG] Target ESP32 IP: ${decoded.ip_address}`);
      console.log(`🔍 [DEBUG] Expected MAC: ${decoded.mac_address}`);

      const esp32Client = new ESP32Client(decoded.ip_address);

      // Check ESP32 health
      console.log("🏥 [DEBUG] validateLicense: Checking ESP32 health...");
      const healthResponse = await esp32Client.checkHealth();
      console.log("✅ [DEBUG] validateLicense: ESP32 health check passed");
      console.log(`💚 [DEBUG] ESP32 status: ${healthResponse.server.status}`);

      // Get MAC address from ESP32
      console.log(
        "🔍 [DEBUG] validateLicense: Getting MAC address from ESP32..."
      );
      const actualMacAddress = await esp32Client.getMacAddress();
      console.log(`🏷️ [DEBUG] ESP32 MAC address: ${actualMacAddress}`);

      // Step 5: Compare MAC addresses
      console.log("🔍 [DEBUG] validateLicense: Comparing MAC addresses...");
      console.log(`🔑 [DEBUG] Expected: "${decoded.mac_address}"`);
      console.log(`🔑 [DEBUG] Got: "${actualMacAddress}"`);

      if (actualMacAddress !== decoded.mac_address) {
        console.error(
          "❌ [DEBUG] validateLicense: MAC address mismatch - deleting license"
        );
        await deleteLicenseFromDatabase();
        return false;
      }
      console.log("✅ [DEBUG] validateLicense: MAC address validation passed");

      console.log(
        "🎉 [DEBUG] validateLicense: All validations passed successfully!"
      );
      return true;
    } catch (error) {
      console.error(
        "❌ [DEBUG] validateLicense: ESP32 validation failed:",
        error.message
      );
      console.error(
        "❌ [DEBUG] validateLicense: Cannot connect to ESP32 or validation failed - deleting license"
      );
      await deleteLicenseFromDatabase();
      return false;
    }
  } catch (error) {
    console.error("❌ [DEBUG] validateLicense: Unexpected error:", error);
    await deleteLicenseFromDatabase();
    return false;
  }
}
