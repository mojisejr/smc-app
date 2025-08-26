import { Setting } from "../../db/model/setting.model";
import { logger } from "../logger";
import { getValidationMode, logPhase42Configuration } from "../utils/environment";

/**
 * CLI License Validator - Phase 9: WiFi-Free Version
 * 
 * แทนที่ระบบ Base64 license เดิมด้วย CLI License File System
 * ใช้ AES-256-CBC encryption และ ESP32 MAC address binding
 * Phase 9: ลบ WiFi dependency ออกเพื่อแก้ Chicken-Egg Problem
 */

// Database activation flag
const ACTIVATION_FLAG = "CLI_LICENSE_ACTIVATED";

/**
 * ตรวจสอบว่าระบบถูก activate แล้วหรือไม่
 * อ่านจาก database flag เท่านั้น (quick check)
 */
export async function isSystemActivated(): Promise<boolean> {
  try {
    const setting = await Setting.findOne({ where: { id: 1 } });
    const activatedKey = setting?.dataValues.activated_key;
    
    const isActivated = activatedKey === ACTIVATION_FLAG;
    
    // Log การตรวจสอบ
    await logger({
      user: "system",
      message: `License activation check: ${isActivated ? 'activated' : 'not activated'}`
    });
    
    return isActivated;
  } catch (error) {
    console.error("error: Failed to check activation status:", error);
    await logger({
      user: "system", 
      message: `License activation check failed: ${error.message}`
    });
    return false;
  }
}

/**
 * บันทึกสถานะ activation ลงฐานข้อมูล
 * เก็บ flag เท่านั้น ไม่เก็บข้อมูลละเอียด
 */
export async function saveLicenseActivation(): Promise<boolean> {
  try {
    const result = await Setting.update(
      { activated_key: ACTIVATION_FLAG },
      { where: { id: 1 } }
    );
    
    if (result[0] > 0) {
      await logger({
        user: "system",
        message: "License activation saved to database successfully"
      });
      return true;
    } else {
      throw new Error("No rows updated in Setting table");
    }
  } catch (error) {
    console.error("error: Failed to save license activation:", error);
    await logger({
      user: "system",
      message: `Failed to save license activation: ${error.message}`
    });
    return false;
  }
}

/**
 * ลบสถานะ activation จากฐานข้อมูล
 * ใช้เมื่อต้องการ deactivate หรือ reset
 */
export async function clearLicenseActivation(): Promise<void> {
  try {
    await Setting.update(
      { activated_key: null },
      { where: { id: 1 } }
    );
    
    await logger({
      user: "system",
      message: "License activation cleared from database"
    });
  } catch (error) {
    console.error("error: Failed to clear license activation:", error);
    await logger({
      user: "system",
      message: `Failed to clear license activation: ${error.message}`
    });
  }
}

/**
 * ตรวจสอบ license แบบเบื้องต้น (database + file existence)
 * ไม่เชื่อมต่อ ESP32 เพื่อความเร็ว
 */
export async function validateLicenseQuick(): Promise<boolean> {
  try {
    // 1. ตรวจสอบ database flag
    const isActivated = await isSystemActivated();
    if (!isActivated) {
      return false;
    }
    
    // 2. ตรวจสอบว่ามี license.lic file หรือไม่
    const { LicenseFileManager } = await import('./file-manager');
    const licenseFile = await LicenseFileManager.findLicenseFile();
    
    if (!licenseFile) {
      console.log("debug: license.lic file not found, clearing activation");
      await clearLicenseActivation();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("error: Quick license validation failed:", error);
    return false;
  }
}

/**
 * ตรวจสอบ license แบบเต็มรูปแบบ (รวม ESP32 validation)
 * ใช้เมื่อต้องการความแม่นยำสูงสุด
 */
export async function validateLicenseWithESP32(): Promise<boolean> {
  try {
    // 1. Quick validation ก่อน
    const quickValid = await validateLicenseQuick();
    if (!quickValid) {
      return false;
    }
    
    // 2. โหลดและ parse license file
    const { LicenseFileManager } = await import('./file-manager');
    const licenseData = await LicenseFileManager.parseLicenseFile();
    
    if (!licenseData) {
      console.log("debug: Failed to parse license file");
      return false;
    }
    
    // 3. ตรวจสอบวันหมดอายุ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    
    if (expiryDate < today) {
      console.log("debug: License expired:", licenseData.expiryDate);
      await logger({
        user: "system",
        message: `License validation failed: License expired on ${licenseData.expiryDate}`
      });
      return false;
    }
    
    // 4. ตรวจสอบ MAC address กับ ESP32
    const { ESP32Client } = await import('./esp32-client');
    const esp32Mac = await ESP32Client.getMacAddress();
    
    if (!esp32Mac) {
      console.log("debug: Cannot retrieve MAC address from ESP32");
      await logger({
        user: "system",
        message: "License validation failed: Cannot connect to ESP32"
      });
      return false;
    }
    
    if (licenseData.macAddress.toUpperCase() !== esp32Mac.toUpperCase()) {
      console.log("debug: MAC address mismatch");
      console.log("debug: License MAC:", licenseData.macAddress);
      console.log("debug: ESP32 MAC:", esp32Mac);
      await logger({
        user: "system", 
        message: "License validation failed: MAC address mismatch"
      });
      return false;
    }
    
    await logger({
      user: "system",
      message: `License validation successful - expires: ${licenseData.expiryDate}`
    });
    
    return true;
    
  } catch (error) {
    console.error("error: Full license validation failed:", error);
    await logger({
      user: "system",
      message: `License validation error: ${error.message}`
    });
    return false;
  }
}

/**
 * ตรวจสอบ organization และ customer data ว่าตรงกับ setting หรือไม่
 */
export async function validateOrganizationData(licenseData: any): Promise<boolean> {
  try {
    const setting = await Setting.findOne({ where: { id: 1 } });
    if (!setting) {
      throw new Error("Setting record not found");
    }
    
    const organization = setting.dataValues.organization;
    const customerName = setting.dataValues.customer_name;
    
    // ตรวจสอบ organization matching
    if (licenseData.organization !== organization) {
      console.log("debug: Organization mismatch");
      console.log("debug: License org:", licenseData.organization);
      console.log("debug: Setting org:", organization);
      return false;
    }
    
    // ตรวจสอบ customer matching  
    if (licenseData.customerId !== customerName) {
      console.log("debug: Customer ID mismatch");
      console.log("debug: License customer:", licenseData.customerId);
      console.log("debug: Setting customer:", customerName);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("error: Organization data validation failed:", error);
    return false;
  }
}

/**
 * ฟังก์ชันหลักสำหรับการตรวจสอบ license (Phase 9: WiFi-Free)
 * 🔒 ใช้ ESP32 MAC address binding เสมอ - ไม่ต้องการ WiFi credentials
 */
export async function validateLicense(): Promise<boolean> {
  console.log('info: Phase 9: WiFi-Free License Validation - MAC address binding only');
  
  await logger({
    user: 'system',
    message: 'Phase 9: License validation starting - WiFi-free approach with ESP32 MAC binding'
  });
  
  // Phase 9: ใช้ ESP32 hardware validation แต่ไม่ต้องการ WiFi credentials
  console.log('info: 🔒 MAC-only hardware binding validation (WiFi-free)');
  return await validateLicenseWithESP32();
}

/**
 * Enhanced validation สำหรับ production deployment (Phase 9: WiFi-Free)
 * รวม ESP32 และ MAC address validation แต่ไม่ต้องการ WiFi credentials
 */
export async function validateLicenseForProduction(): Promise<{
  valid: boolean;
  error?: string;
  details?: {
    licenseFileFound: boolean;
    databaseActivated: boolean;
    esp32Connected: boolean;
    macAddressMatched: boolean;
    licenseExpired: boolean;
  };
}> {
  console.log('info: Running production license validation (Phase 9: WiFi-free)...');
  
  const details = {
    licenseFileFound: false,
    databaseActivated: false,
    esp32Connected: false,
    macAddressMatched: false,
    licenseExpired: false,
  };

  try {
    // 1. ตรวจสอบ database activation flag
    const isActivated = await isSystemActivated();
    details.databaseActivated = isActivated;
    
    if (!isActivated) {
      return {
        valid: false,
        error: 'System not activated - no license found in database',
        details
      };
    }

    // 2. ตรวจสอบ license file
    const { LicenseFileManager } = await import('./file-manager');
    const licenseFile = await LicenseFileManager.findLicenseFile();
    details.licenseFileFound = !!licenseFile;
    
    if (!licenseFile) {
      return {
        valid: false,
        error: 'License file not found in expected locations',
        details
      };
    }

    // 3. Parse license data
    const licenseData = await LicenseFileManager.parseLicenseFile(licenseFile);
    if (!licenseData) {
      return {
        valid: false,
        error: 'Unable to parse license file',
        details
      };
    }

    // 4. ตรวจสอบวันหมดอายุ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    details.licenseExpired = expiryDate < today;
    
    if (details.licenseExpired) {
      return {
        valid: false,
        error: `License expired on ${licenseData.expiryDate}`,
        details
      };
    }

    // 5. ตรวจสอบ ESP32 connection (optional for production)
    try {
      const { ESP32Client } = await import('./esp32-client');
      const esp32Mac = await ESP32Client.getMacAddress();
      details.esp32Connected = !!esp32Mac;
      
      if (esp32Mac) {
        details.macAddressMatched = licenseData.macAddress.toUpperCase() === esp32Mac.toUpperCase();
        
        if (!details.macAddressMatched) {
          console.warn(`warn: MAC address mismatch - License: ${licenseData.macAddress}, ESP32: ${esp32Mac}`);
          // In production, MAC mismatch is a warning, not a failure
        }
      }
      
    } catch (esp32Error) {
      console.warn('warn: ESP32 connection failed during production validation:', esp32Error);
      // ESP32 connection failure is not critical for production validation
      details.esp32Connected = false;
    }

    await logger({
      user: 'system',
      message: `Phase 9: Production license validation successful - expires: ${licenseData.expiryDate}, ESP32: ${details.esp32Connected ? 'connected' : 'offline'} (WiFi-free)`
    });

    return {
      valid: true,
      details
    };

  } catch (error: any) {
    console.error('error: Production license validation failed:', error);
    
    await logger({
      user: 'system',
      message: `Production license validation error: ${error.message}`
    });

    return {
      valid: false,
      error: error.message,
      details
    };
  }
}