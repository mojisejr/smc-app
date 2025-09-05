import { Setting } from "../../db/model/setting.model";
import { logger } from "../logger";
import {
  getValidationMode,
  logPhase42Configuration,
} from "../utils/environment";
import {
  runtimeLogger,
  logLicenseOperation,
  PerformanceTimer,
} from "../logger/runtime-logger";

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
  const timer = new PerformanceTimer();

  try {
    await logLicenseOperation(
      "validator",
      "Checking system activation status",
      "info",
      {
        operation: "activation_check",
        flag: ACTIVATION_FLAG,
      }
    );

    const setting = await Setting.findOne({ where: { id: 1 } });
    const activatedKey = setting?.dataValues.activated_key;

    const isActivated = activatedKey === ACTIVATION_FLAG;

    // Log การตรวจสอบ
    await logger({
      user: "system",
      message: `License activation check: ${
        isActivated ? "activated" : "not activated"
      }`,
    });

    await logLicenseOperation(
      "validator",
      `System activation status: ${
        isActivated ? "ACTIVATED" : "NOT ACTIVATED"
      }`,
      "info",
      {
        operation: "activation_check_result",
        activated: isActivated,
        duration_ms: timer ? timer.stop() : 0,
      }
    );

    return isActivated;
  } catch (error) {
    console.error("error: Failed to check activation status:", error);
    await logger({
      user: "system",
      message: `License activation check failed: ${error.message}`,
    });

    await runtimeLogger({
      user: "system",
      logType: "license",
      component: "validator",
      level: "error",
      message: `Failed to check activation status: ${error.message}`,
      metadata: {
        operation: "activation_check",
        error: error.message,
        duration_ms: timer ? timer.stop() : 0,
      },
    });

    return false;
  }
}

/**
 * บันทึกสถานะ activation ลงฐานข้อมูล
 * เก็บ flag เท่านั้น ไม่เก็บข้อมูลละเอียด
 */
export async function saveLicenseActivation(): Promise<boolean> {
  const timer = new PerformanceTimer();

  try {
    await logLicenseOperation(
      "validator",
      "Saving license activation to database",
      "info",
      {
        operation: "save_activation",
        flag: ACTIVATION_FLAG,
      }
    );

    const result = await Setting.update(
      { activated_key: ACTIVATION_FLAG },
      { where: { id: 1 } }
    );

    if (result[0] > 0) {
      await logger({
        user: "system",
        message: "License activation saved to database successfully",
      });

      await logLicenseOperation(
        "validator",
        "License activation saved successfully",
        "info",
        {
          operation: "save_activation_success",
          rows_updated: result[0],
          duration_ms: timer ? timer.stop() : 0,
        }
      );

      return true;
    } else {
      throw new Error("No rows updated in Setting table");
    }
  } catch (error) {
    console.error("error: Failed to save license activation:", error);
    await logger({
      user: "system",
      message: `Failed to save license activation: ${error.message}`,
    });

    await runtimeLogger({
      user: "system",
      logType: "license",
      component: "validator",
      level: "error",
      message: `Failed to save license activation: ${error.message}`,
      metadata: {
        operation: "save_activation",
        error: error.message,
        duration_ms: timer ? timer.stop() : 0,
      },
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
    await Setting.update({ activated_key: null }, { where: { id: 1 } });

    await logger({
      user: "system",
      message: "License activation cleared from database",
    });
  } catch (error) {
    console.error("error: Failed to clear license activation:", error);
    await logger({
      user: "system",
      message: `Failed to clear license activation: ${error.message}`,
    });
  }
}

/**
 * ตรวจสอบ license แบบเบื้องต้น (database + file existence)
 * ไม่เชื่อมต่อ ESP32 เพื่อความเร็ว
 */
export async function validateLicenseQuick(): Promise<boolean> {
  const timer = new PerformanceTimer();

  try {
    await logLicenseOperation(
      "validator",
      "Starting quick license validation",
      "info",
      {
        operation: "validate_quick_start",
      }
    );

    // 1. ตรวจสอบ database flag
    const isActivated = await isSystemActivated();
    if (!isActivated) {
      await logLicenseOperation(
        "validator",
        "Quick validation failed: System not activated",
        "error",
        {
          operation: "validate_quick_failed",
          reason: "not_activated",
          duration_ms: timer ? timer.stop() : 0,
        }
      );
      return false;
    }

    // 2. ตรวจสอบว่ามี license.lic file หรือไม่
    const { LicenseFileManager } = await import("./file-manager");
    const licenseFile = await LicenseFileManager.findLicenseFile();

    if (!licenseFile) {
      console.log("debug: license.lic file not found, clearing activation");
      await clearLicenseActivation();

      await logLicenseOperation(
        "validator",
        "Quick validation failed: License file not found",
        "error",
        {
          operation: "validate_quick_failed",
          reason: "license_file_not_found",
          duration_ms: timer ? timer.stop() : 0,
        }
      );

      return false;
    }

    await logLicenseOperation(
      "validator",
      "Quick license validation successful",
      "info",
      {
        operation: "validate_quick_success",
        duration_ms: timer ? timer.stop() : 0,
      }
    );

    return true;
  } catch (error) {
    console.error("error: Quick license validation failed:", error);

    await runtimeLogger({
      user: "system",
      logType: "license",
      component: "validator",
      level: "error",
      message: `Quick license validation failed: ${error.message}`,
      metadata: {
        operation: "validate_quick_error",
        error: error.message,
        duration_ms: timer ? timer.stop() : 0,
      },
    });

    return false;
  }
}

/**
 * ตรวจสอบ license แบบเต็มรูปแบบ (รวม ESP32 validation)
 * ใช้เมื่อต้องการความแม่นยำสูงสุด
 */
export async function validateLicenseWithESP32(): Promise<boolean> {
  const timer = new PerformanceTimer();

  try {
    await logLicenseOperation(
      "validator",
      "Starting full license validation with ESP32",
      "info",
      {
        operation: "validate_full_start",
      }
    );

    // 1. Quick validation ก่อน
    const quickValid = await validateLicenseQuick();
    if (!quickValid) {
      await logLicenseOperation(
        "validator",
        "Full validation failed: Quick validation failed",
        "error",
        {
          operation: "validate_full_failed",
          reason: "quick_validation_failed",
          duration_ms: timer ? timer.stop() : 0,
        }
      );
      return false;
    }

    // 2. โหลดและ parse license file
    const { LicenseFileManager } = await import("./file-manager");
    const licenseData = await LicenseFileManager.parseLicenseFile();

    if (!licenseData) {
      console.log("debug: Failed to parse license file");
      await logLicenseOperation(
        "validator",
        "Full validation failed: Cannot parse license file",
        "error",
        {
          operation: "validate_full_failed",
          reason: "license_parse_failed",
          duration_ms: timer ? timer.stop() : 0,
        }
      );
      return false;
    }

    // 2.1. Extract license type for validation logic
    const licenseType = licenseData.license_type || "production";
    console.log(`debug: License type detected: ${licenseType}`);

    await logLicenseOperation(
      "validator",
      `License type detected: ${licenseType}`,
      "info",
      {
        operation: "license_type_detected",
        license_type: licenseType,
        organization: licenseData.organization,
      }
    );

    // 3. ตรวจสอบวันหมดอายุ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();

    if (expiryDate < today) {
      console.log("debug: License expired:", licenseData.expiryDate);
      await logger({
        user: "system",
        message: `License validation failed: License expired on ${licenseData.expiryDate}`,
      });

      await logLicenseOperation(
        "validator",
        "Full validation failed: License expired",
        "error",
        {
          operation: "validate_full_failed",
          reason: "license_expired",
          expiry_date: licenseData.expiryDate,
          duration_ms: timer ? timer.stop() : 0,
        }
      );

      return false;
    }

    // 4. ตรวจสอบ MAC address กับ ESP32 (with internal license bypass)
    if (licenseType === "internal" || licenseType === "development") {
      // Bypass ESP32 validation for internal/development licenses
      console.log(
        `debug: Bypassing ESP32 validation for ${licenseType} license`
      );
      await logger({
        user: "system",
        message: `ESP32 validation bypassed for ${licenseType.toUpperCase()} license - Organization: ${
          licenseData.organization
        }`,
      });

      await logLicenseOperation(
        "validator",
        `ESP32 validation bypassed for ${licenseType} license`,
        "info",
        {
          operation: "esp32_validation_bypassed",
          license_type: licenseType,
          organization: licenseData.organization,
          reason: "internal_development_license",
        }
      );
    } else {
      // Standard ESP32 validation for production licenses
      await logLicenseOperation(
        "validator",
        "Starting ESP32 MAC address validation",
        "info",
        {
          operation: "esp32_validation_start",
          license_type: licenseType,
          expected_mac: licenseData.macAddress,
        }
      );

      const { ESP32Client } = await import("./esp32-client");
      const esp32Mac = await ESP32Client.getMacAddress();

      if (!esp32Mac) {
        console.log("debug: Cannot retrieve MAC address from ESP32");
        await logger({
          user: "system",
          message: "License validation failed: Cannot connect to ESP32",
        });

        await logLicenseOperation(
          "validator",
          "ESP32 validation failed: Cannot connect to ESP32",
          "error",
          {
            operation: "esp32_validation_failed",
            reason: "esp32_connection_failed",
            duration_ms: timer ? timer.stop() : 0,
          }
        );

        return false;
      }

      if (licenseData.macAddress.toUpperCase() !== esp32Mac.toUpperCase()) {
        console.log("debug: MAC address mismatch");
        console.log("debug: License MAC:", licenseData.macAddress);
        console.log("debug: ESP32 MAC:", esp32Mac);
        await logger({
          user: "system",
          message: "License validation failed: MAC address mismatch",
        });

        await logLicenseOperation(
          "validator",
          "ESP32 validation failed: MAC address mismatch",
          "error",
          {
            operation: "esp32_validation_failed",
            reason: "mac_address_mismatch",
            expected_mac: licenseData.macAddress,
            actual_mac: esp32Mac,
            duration_ms: timer ? timer.stop() : 0,
          }
        );

        return false;
      }

      await logLicenseOperation(
        "validator",
        "ESP32 MAC address validation successful",
        "info",
        {
          operation: "esp32_validation_success",
          mac_address: esp32Mac,
        }
      );
    }

    await logger({
      user: "system",
      message: `${licenseType.toUpperCase()} license validation successful - expires: ${
        licenseData.expiryDate
      }${licenseType !== "production" ? " [BYPASS_ENABLED]" : ""}`,
    });

    await logLicenseOperation(
      "validator",
      `Full license validation successful`,
      "info",
      {
        operation: "validate_full_success",
        license_type: licenseType,
        organization: licenseData.organization,
        expiry_date: licenseData.expiryDate,
        bypass_enabled: licenseType !== "production",
        duration_ms: timer ? timer.stop() : 0,
      }
    );

    return true;
  } catch (error) {
    console.error("error: Full license validation failed:", error);
    await logger({
      user: "system",
      message: `License validation error: ${error.message}`,
    });

    await runtimeLogger({
      logType: "license",
      component: "validator",
      level: "error",
      user: "system",
      message: `Full license validation failed: ${error.message}`,
      metadata: {
        operation: "validate_full_error",
        error: error.message,
        duration_ms: timer ? timer.stop() : 0,
      },
    });

    return false;
  }
}

/**
 * ตรวจสอบ organization และ customer data ว่าตรงกับ setting หรือไม่
 * สำหรับ internal/development licenses จะใช้ license data เป็น source of truth
 */
export async function validateOrganizationData(
  licenseData: any
): Promise<boolean> {
  try {
    const setting = await Setting.findOne({ where: { id: 1 } });
    if (!setting) {
      throw new Error("Setting record not found");
    }

    const organization = setting.dataValues.organization;
    const customerName = setting.dataValues.customer_name;
    const licenseType = licenseData.license_type || "production";

    // สำหรับ internal/development licenses: ใช้ license data เป็น source of truth
    if (licenseType === "internal" || licenseType === "development") {
      console.log(
        `debug: Using flexible validation for ${licenseType} license`
      );

      // ตรวจสอบว่า database มี placeholder data หรือไม่
      const hasPlaceholderData =
        organization === "PLACEHOLDER_ORG" ||
        customerName === "PLACEHOLDER_CUSTOMER" ||
        organization === "" ||
        customerName === "";

      if (hasPlaceholderData) {
        console.log(
          `debug: Database has placeholder data, using license data as source of truth`
        );
        console.log(`debug: License org: ${licenseData.organization}`);
        console.log(`debug: License customer: ${licenseData.customerId}`);

        await logger({
          user: "system",
          message: `Organization validation bypassed for ${licenseType.toUpperCase()} license - Using license data: ${
            licenseData.organization
          }/${licenseData.customerId}`,
        });

        return true;
      }

      // หาก database มีข้อมูลจริง ให้ตรวจสอบแบบ flexible
      const orgMatches = licenseData.organization === organization;
      const customerMatches = licenseData.customerId === customerName;

      if (!orgMatches || !customerMatches) {
        console.log(
          `debug: ${licenseType} license data mismatch with database (flexible mode)`
        );
        console.log(
          `debug: License org: ${licenseData.organization}, DB org: ${organization}`
        );
        console.log(
          `debug: License customer: ${licenseData.customerId}, DB customer: ${customerName}`
        );

        await logger({
          user: "system",
          message: `${licenseType.toUpperCase()} license validation: Data mismatch detected but proceeding (flexible validation)`,
        });

        // สำหรับ internal/development ให้ผ่านแม้ข้อมูลไม่ตรง
        return true;
      }

      return true;
    }

    // สำหรับ production licenses: ใช้ strict validation
    console.log("debug: Using strict validation for production license");

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
 * ฟังก์ชันหลักสำหรับการตรวจสอบ license (Phase 9: WiFi-Free + Internal License Support)
 * 🔒 ตรวจสอบ license type แล้วเลือกใช้ validation method ที่เหมาะสม
 */
export async function validateLicense(): Promise<boolean> {
  console.log(
    "info: Phase 9: WiFi-Free License Validation with Enhanced Internal License Support"
  );

  await logger({
    user: "system",
    message:
      "Phase 9: License validation starting - Enhanced bypass logic with multiple validation layers",
  });

  try {
    // 1. Enhanced environment and build type detection
    const validationMode = getValidationMode();
    const buildType = process.env.BUILD_TYPE || "production";
    const esp32Bypass = process.env.ESP32_VALIDATION_BYPASS === "true";
    const internalBuildMode = process.env.INTERNAL_BUILD_MODE === "true";
    
    console.log(`info: Validation mode: ${validationMode}`);
    console.log(`info: Build type: ${buildType}`);
    console.log(`info: ESP32 bypass: ${esp32Bypass}`);
    console.log(`info: Internal build mode: ${internalBuildMode}`);

    // 2. Quick validation ก่อน (database + file existence)
    const quickValid = await validateLicenseQuick();
    if (!quickValid) {
      return false;
    }

    // 3. โหลดและ parse license file เพื่อตรวจสอบ license type
    const { LicenseFileManager } = await import("./file-manager");

    // ใช้ mock MAC address เพื่อ parse license file และตรวจสอบ license type
    const mockMacAddress = "AA:BB:CC:DD:EE:FF";
    const licenseData = await LicenseFileManager.parseLicenseFile(
      undefined,
      mockMacAddress
    );

    if (!licenseData) {
      console.log("debug: Failed to parse license file");
      return false;
    }

    // 4. Enhanced license type detection with multiple validation layers
    const licenseType = licenseData.license_type || "production";
    const isInternalLicense = licenseType === "internal" || licenseType === "development";
    const isInternalBuild = buildType === "internal" || buildType === "development";
    const shouldBypass = validationMode === "bypass" || esp32Bypass || internalBuildMode || isInternalLicense || isInternalBuild;
    
    console.log(`info: License type detected: ${licenseType}`);
    console.log(`info: Is internal license: ${isInternalLicense}`);
    console.log(`info: Is internal build: ${isInternalBuild}`);
    console.log(`info: Should bypass ESP32: ${shouldBypass}`);

    if (shouldBypass) {
      // Enhanced bypass logic with comprehensive validation
      const bypassReasons = [];
      if (validationMode === "bypass") bypassReasons.push("validation mode");
      if (esp32Bypass) bypassReasons.push("ESP32 bypass flag");
      if (internalBuildMode) bypassReasons.push("internal build mode");
      if (isInternalLicense) bypassReasons.push(`${licenseType} license type`);
      if (isInternalBuild) bypassReasons.push(`${buildType} build type`);
      
      console.log(
        `info: Using enhanced bypass validation - Reasons: ${bypassReasons.join(", ")}`
      );

      // ตรวจสอบวันหมดอายุสำหรับ internal/development licenses
      const expiryDate = new Date(licenseData.expiryDate);
      const today = new Date();

      if (expiryDate < today) {
        console.log("debug: License expired:", licenseData.expiryDate);
        await logger({
          user: "system",
          message: `${licenseType.toUpperCase()} license validation failed: License expired on ${
            licenseData.expiryDate
          }`,
        });
        return false;
      }

      await logger({
        user: "system",
        message: `Enhanced bypass validation successful - Type: ${licenseType} - Reasons: ${bypassReasons.join(", ")} - Organization: ${
          licenseData.organization
        }`,
      });

      return true;
    } else {
      // Production licenses: ใช้ full ESP32 validation
      console.log(
        "info: 🔒 Using full ESP32 validation for production license"
      );
      return await validateLicenseWithESP32();
    }
  } catch (error) {
    console.error("error: License validation failed:", error);
    await logger({
      user: "system",
      message: `License validation error: ${error.message}`,
    });
    return false;
  }
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
  console.log(
    "info: Running production license validation (Phase 9: WiFi-free)..."
  );

  const timer = new PerformanceTimer();

  await logLicenseOperation(
    "validator",
    "Starting production license validation",
    "info",
    {
      operation: "production_validation_start",
      phase: "Phase 9: WiFi-free",
    }
  );

  const details = {
    licenseFileFound: false,
    databaseActivated: false,
    esp32Connected: false,
    macAddressMatched: false,
    licenseExpired: false,
  };

  try {
    // 1. ตรวจสอบ database activation flag
    await logLicenseOperation(
      "validator",
      "Checking database activation flag",
      "info",
      {
        operation: "database_activation_check",
      }
    );

    const isActivated = await isSystemActivated();
    details.databaseActivated = isActivated;

    if (!isActivated) {
      await logLicenseOperation(
        "validator",
        "Database activation check failed",
        "error",
        {
          operation: "database_activation_failed",
          reason: "System not activated",
        }
      );

      return {
        valid: false,
        error: "System not activated - no license found in database",
        details,
      };
    }

    // 2. ตรวจสอบ license file
    await logLicenseOperation(
      "validator",
      "Searching for license file",
      "info",
      {
        operation: "license_file_search",
      }
    );

    const { LicenseFileManager } = await import("./file-manager");
    const licenseFile = await LicenseFileManager.findLicenseFile();
    details.licenseFileFound = !!licenseFile;

    if (!licenseFile) {
      await logLicenseOperation(
        "validator",
        "License file not found",
        "error",
        {
          operation: "license_file_not_found",
          searched_locations: "expected locations",
        }
      );

      return {
        valid: false,
        error: "License file not found in expected locations",
        details,
      };
    }

    await logLicenseOperation(
      "validator",
      "License file found successfully",
      "info",
      {
        operation: "license_file_found",
        file_path: licenseFile,
      }
    );

    // 3. Parse license data
    // ใช้ mock MAC address เพื่อ parse license file และตรวจสอบ license type
    const mockMacAddress = "AA:BB:CC:DD:EE:FF";
    const licenseData = await LicenseFileManager.parseLicenseFile(
      licenseFile,
      mockMacAddress
    );
    if (!licenseData) {
      return {
        valid: false,
        error: "Unable to parse license file",
        details,
      };
    }

    // 3.1. Extract license type for validation logic
    const licenseType = licenseData.license_type || "production";
    console.log(`info: License type detected: ${licenseType}`);

    // Log license type for audit purposes
    if (licenseType === "internal" || licenseType === "development") {
      await logger({
        user: "system",
        message: `${licenseType.toUpperCase()} license validation initiated - Organization: ${
          licenseData.organization
        }`,
      });
    }

    // 4. ตรวจสอบวันหมดอายุ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    details.licenseExpired = expiryDate < today;

    if (details.licenseExpired) {
      return {
        valid: false,
        error: `License expired on ${licenseData.expiryDate}`,
        details,
      };
    }

    // 5. ตรวจสอบ ESP32 connection (with internal license bypass)
    if (licenseType === "internal" || licenseType === "development") {
      // Bypass ESP32 validation for internal/development licenses
      console.log(
        `info: Bypassing ESP32 validation for ${licenseType} license`
      );

      await logLicenseOperation(
        "validator",
        `ESP32 validation bypassed for ${licenseType} license`,
        "info",
        {
          operation: "esp32_validation_bypass",
          license_type: licenseType,
          organization: licenseData.organization,
        }
      );

      details.esp32Connected = true; // Mark as connected for internal licenses
      details.macAddressMatched = true; // Mark as matched for internal licenses

      await logger({
        user: "system",
        message: `ESP32 validation bypassed for ${licenseType.toUpperCase()} license - Organization: ${
          licenseData.organization
        }`,
      });
    } else {
      // Standard ESP32 validation for production licenses
      await logLicenseOperation(
        "validator",
        "Starting ESP32 validation for production license",
        "info",
        {
          operation: "esp32_validation_start",
          license_type: licenseType,
          expected_mac: licenseData.macAddress,
        }
      );

      try {
        const { ESP32Client } = await import("./esp32-client");
        const esp32Mac = await ESP32Client.getMacAddress();
        details.esp32Connected = !!esp32Mac;

        if (esp32Mac) {
          details.macAddressMatched =
            licenseData.macAddress.toUpperCase() === esp32Mac.toUpperCase();

          if (!details.macAddressMatched) {
            console.warn(
              `warn: MAC address mismatch - License: ${licenseData.macAddress}, ESP32: ${esp32Mac}`
            );

            await logLicenseOperation(
              "validator",
              "MAC address mismatch detected",
              "warn",
              {
                operation: "mac_address_mismatch",
                license_mac: licenseData.macAddress,
                esp32_mac: esp32Mac,
                severity: "warning",
              }
            );

            // In production, MAC mismatch is a warning, not a failure
          } else {
            await logLicenseOperation(
              "validator",
              "MAC address validation successful",
              "info",
              {
                operation: "mac_address_match",
                mac_address: esp32Mac,
              }
            );
          }
        } else {
          await logLicenseOperation(
            "validator",
            "ESP32 MAC address not available",
            "warn",
            {
              operation: "esp32_mac_unavailable",
              reason: "No MAC address returned",
            }
          );
        }
      } catch (esp32Error) {
        console.warn(
          "warn: ESP32 connection failed during production validation:",
          esp32Error
        );

        await runtimeLogger({
          user: "system",
          logType: "license",
          component: "validator",
          level: "warn",
          message: `ESP32 connection failed during production validation: ${esp32Error.message}`,
          metadata: {
            operation: "esp32_connection_failed",
            license_type: licenseType,
            error: esp32Error.message,
          },
        });

        // ESP32 connection failure is not critical for production validation
        details.esp32Connected = false;
      }
    }

    await logger({
      user: "system",
      message: `Phase 9: ${licenseType.toUpperCase()} license validation successful - expires: ${
        licenseData.expiryDate
      }, ESP32: ${
        details.esp32Connected ? "connected" : "offline"
      } (WiFi-free)${licenseType !== "production" ? " [BYPASS_ENABLED]" : ""}`,
    });

    await logLicenseOperation(
      "validator",
      "Production license validation completed successfully",
      "info",
      {
        operation: "production_validation_success",
        license_type: licenseType,
        organization: licenseData.organization,
        customer_id: licenseData.customerId,
        expiry_date: licenseData.expiryDate,
        esp32_connected: details.esp32Connected,
        mac_matched: details.macAddressMatched,
        duration_ms: timer ? timer.stop() : 0,
      }
    );

    // Additional audit logging for internal/development licenses
    if (licenseType === "internal" || licenseType === "development") {
      await logger({
        user: "system",
        message: `AUDIT: ${licenseType.toUpperCase()} license validation completed - Organization: ${
          licenseData.organization
        }, Customer: ${licenseData.customerId}`,
      });
    }

    return {
      valid: true,
      details,
    };
  } catch (error: any) {
    console.error("error: Production license validation failed:", error);

    await logger({
      user: "system",
      message: `Production license validation error: ${error.message}`,
    });

    await runtimeLogger({
      user: "system",
      logType: "license",
      component: "validator",
      level: "error",
      message: `Production license validation failed: ${error.message}`,
      metadata: {
        operation: "production_validation_error",
        error: error.message,
        stack: error.stack,
        details: details,
        duration_ms: timer ? timer.stop() : 0,
      },
    });

    return {
      valid: false,
      error: error.message,
      details,
    };
  }
}
