import * as fs from "fs/promises";
import * as path from "path";
import * as process from "process";
import crypto from "crypto";

/**
 * HKDF v2.0 License File Manager
 *
 * จัดการ license.lic files ด้วย HKDF-based encryption
 * ใช้ ESP32 MAC address เป็น hardware binding เสมอ
 * ❌ ไม่รองรับ Legacy v1.0 อีกต่อไป
 */

// HKDF configuration (RFC 5869) - ตรงกับ CLI
const HKDF_CONFIG = {
  hash: "sha256",
  key_length: 32, // 32 bytes for AES-256
  salt_length: 32, // 32 bytes random salt
  info_prefix: "SMC_LICENSE_KDF_v1.0", // Context info prefix
};

// Encryption configuration - ตรงกับ CLI
const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-cbc",
  iv_length: 16, // 16 bytes IV for AES
};

// License data structure (Phase 9: WiFi-free)
export interface LicenseData {
  organization: string;
  customerId: string;
  applicationId: string;
  generatedAt: string;
  expiryDate: string;
  macAddress: string;
  version: string;
  checksum?: string;
  // Phase 9: WiFi credentials removed but kept for backward compatibility
  wifiSsid: string;
  wifiPassword: string;
  // License type support for internal/development licenses
  license_type?: "production" | "internal" | "development";
}

// KDF Context for HKDF key derivation - ตรงกับ CLI types
export interface KDFContext {
  salt: string; // Deterministic salt (Base64)
  info: string; // Context info for HKDF (non-sensitive data only)
  algorithm: "hkdf-sha256"; // HKDF algorithm identifier
}

// License file structure (HKDF v2.0 only) - ตรงกับ CLI types
export interface LicenseFile {
  version: string; // License file format version (2.0.0 for HKDF)
  encrypted_data: string; // AES-256 encrypted license data (Base64)
  algorithm: string; // Encryption algorithm used
  created_at: string; // Creation timestamp

  // HKDF context (v2.0+ only, no sensitive data exposed)
  kdf_context: KDFContext; // KDF context for HKDF key generation (required)
}

/**
 * Generate HKDF key from license data และ KDF context
 * ใช้ HKDF (RFC 5869) สำหรับ secure key derivation
 *
 * @param licenseData - Complete license data (รวม sensitive data)
 * @param kdfContext - KDF context จาก license file
 * @returns 32-byte encryption key
 */
function generateHKDFKey(
  licenseData: LicenseData,
  kdfContext: KDFContext
): Buffer {
  console.log("DEBUG: Starting HKDF key generation for license decryption...");
  console.log(`DEBUG: HKDF Config - Hash: ${HKDF_CONFIG.hash}, Key Length: ${HKDF_CONFIG.key_length} bytes`);

  try {
    // สร้าง Input Key Material (IKM) จาก sensitive license data (WiFi-free for Phase 9)
    const ikm_parts = [
      licenseData.applicationId,
      licenseData.customerId,
      licenseData.macAddress, // Sensitive data - ไม่อยู่ใน context
      licenseData.expiryDate,
      // Phase 9: ลบ wifiSsid ออกจาก key derivation
    ];

    console.log(`DEBUG: IKM Parts Count: ${ikm_parts.length}`);
    console.log(`DEBUG: IKM Parts - ApplicationId: ${licenseData.applicationId}`);
    console.log(`DEBUG: IKM Parts - CustomerId: ${licenseData.customerId}`);
    console.log(`DEBUG: IKM Parts - MAC Address: ${licenseData.macAddress}`);
    console.log(`DEBUG: IKM Parts - Expiry Date: ${licenseData.expiryDate}`);

    const ikm = Buffer.from(ikm_parts.join("_"), "utf8");
    console.log(`DEBUG: IKM String: ${ikm_parts.join("_")}`);

    // แปลง salt จาก base64
    const salt = Buffer.from(kdfContext.salt, "base64");

    // แปลง info จาก string
    const info = Buffer.from(kdfContext.info, "utf8");

    console.log(`DEBUG: IKM size: ${ikm.length} bytes`);
    console.log(`DEBUG: Salt size: ${salt.length} bytes (expected: ${HKDF_CONFIG.salt_length})`);
    console.log(`DEBUG: Info size: ${info.length} bytes`);
    console.log(`DEBUG: KDF Context Info: ${kdfContext.info}`);
    console.log(`DEBUG: KDF Context Algorithm: ${kdfContext.algorithm}`);

    // Validate salt length
    if (salt.length !== HKDF_CONFIG.salt_length) {
      console.error(`ERROR: Invalid salt length: ${salt.length} bytes (expected: ${HKDF_CONFIG.salt_length})`);
      throw new Error(`Invalid salt length: ${salt.length} bytes (expected: ${HKDF_CONFIG.salt_length})`);
    }

    // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
    console.log("DEBUG: Starting HKDF-Extract phase...");
    const prk = crypto.createHmac(HKDF_CONFIG.hash, salt).update(ikm).digest();
    console.log(`DEBUG: PRK generated, size: ${prk.length} bytes`);

    // HKDF-Expand: OKM = HMAC-Hash(PRK, info + 0x01)
    console.log("DEBUG: Starting HKDF-Expand phase...");
    const expandInfo = Buffer.concat([info, Buffer.from([0x01])]);
    console.log(`DEBUG: Expand Info size: ${expandInfo.length} bytes`);
    
    const okm = crypto
      .createHmac(HKDF_CONFIG.hash, prk)
      .update(expandInfo)
      .digest();
    console.log(`DEBUG: OKM generated, size: ${okm.length} bytes`);

    // ตัด key ให้ได้ขนาดที่ต้องการ (32 bytes สำหรับ AES-256)
    const derivedKey = okm.slice(0, HKDF_CONFIG.key_length);

    console.log("INFO: ✅ HKDF key generated successfully");
    console.log(`DEBUG: Final derived key size: ${derivedKey.length} bytes (expected: ${HKDF_CONFIG.key_length})`);
    console.log(`DEBUG: Key derivation completed successfully`);

    return derivedKey;
  } catch (error: any) {
    console.error(`error: HKDF key generation failed: ${error.message}`);
    throw new Error(`HKDF key generation failed: ${error.message}`);
  }
}

/**
 * ถอดรหัสข้อมูล license ด้วย AES-256-CBC + HKDF
 *
 * @param encryptedData - Encrypted string (Base64)
 * @param kdfContext - KDF context จาก license file
 * @param keyData - Key data for HKDF (เมื่อรู้ sensitive data)
 * @returns License data object
 */
function decryptLicenseData(
  encryptedData: string,
  kdfContext: KDFContext,
  keyData: {
    applicationId: string;
    customerId: string;
    macAddress: string;
    expiryDate: string;
    // Phase 9: wifiSsid no longer required for key derivation
  }
): LicenseData {
  try {
    console.log("DEBUG: Starting HKDF license data decryption...");
    console.log(`DEBUG: Encrypted data length: ${encryptedData.length} characters`);
    console.log(`DEBUG: Key data - ApplicationId: ${keyData.applicationId}`);
    console.log(`DEBUG: Key data - CustomerId: ${keyData.customerId}`);
    console.log(`DEBUG: Key data - MAC Address: ${keyData.macAddress}`);
    console.log(`DEBUG: Key data - Expiry Date: ${keyData.expiryDate}`);

    // สร้าง temporary license data object สำหรับ HKDF key generation (WiFi-free)
    const tempLicenseData: LicenseData = {
      applicationId: keyData.applicationId,
      customerId: keyData.customerId,
      macAddress: keyData.macAddress,
      expiryDate: keyData.expiryDate,
      organization: "", // จะได้จาก decrypted data
      generatedAt: "",
      version: "1.0.0",
      checksum: "",
      // Phase 9: WiFi fields empty for key derivation
      wifiSsid: "",
      wifiPassword: "",
    };

    console.log("DEBUG: Temporary license data object created for HKDF key generation");

    // สร้าง HKDF key จาก key data และ KDF context
    const derivedKey = generateHKDFKey(tempLicenseData, kdfContext);

    console.log("DEBUG: HKDF key generated, proceeding with AES-256-CBC decryption");
    console.log(`DEBUG: Using encryption algorithm: ${ENCRYPTION_CONFIG.algorithm}`);

    // Decode จาก Base64
    console.log("DEBUG: Decoding encrypted data from Base64...");
    const hexData = Buffer.from(encryptedData, "base64").toString("utf8");
    console.log(`DEBUG: Hex data length: ${hexData.length} characters`);

    // แยก IV กับ encrypted data
    console.log("DEBUG: Parsing IV and encrypted data...");
    const parts = hexData.split(":");
    if (parts.length !== 2) {
      console.error(`ERROR: Invalid encrypted data format - expected 2 parts (IV:data), got ${parts.length}`);
      throw new Error("Invalid encrypted data format - expected IV:data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    console.log(`DEBUG: IV length: ${iv.length} bytes (expected: ${ENCRYPTION_CONFIG.iv_length})`);
    console.log(`DEBUG: Encrypted data length: ${encrypted.length} characters`);

    // Validate IV length
    if (iv.length !== ENCRYPTION_CONFIG.iv_length) {
      console.error(`ERROR: Invalid IV length: ${iv.length} bytes (expected: ${ENCRYPTION_CONFIG.iv_length})`);
      throw new Error(`Invalid IV length: ${iv.length} bytes (expected: ${ENCRYPTION_CONFIG.iv_length})`);
    }

    // สร้าง decipher ด้วย createDecipheriv ด้วย HKDF key
    console.log("DEBUG: Creating AES-256-CBC decipher...");
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      iv
    );

    // ถอดรหัสข้อมูล
    console.log("DEBUG: Decrypting data with AES-256-CBC...");
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    console.log(`DEBUG: Decrypted data length: ${decrypted.length} characters`);

    // Parse JSON
    console.log("DEBUG: Parsing decrypted JSON data...");
    const decryptedLicenseData = JSON.parse(decrypted);

    console.log("INFO: ✅ HKDF license decryption successful");
    console.log(`INFO: Organization: ${decryptedLicenseData.organization}`);
    console.log(`DEBUG: Decrypted license data keys: ${Object.keys(decryptedLicenseData).join(', ')}`);

    return decryptedLicenseData as LicenseData;
  } catch (error: any) {
    console.error(`error: HKDF license decryption failed: ${error.message}`);
    throw new Error(`License HKDF decryption failed: ${error.message}`);
  }
}

export class LicenseFileManager {
  // Default license file paths - ordered by priority
  static readonly LICENSE_FILE_PATHS = [
    // 1. Production resources paths (highest priority)
    path.join(process.cwd(), "resources", "license.lic"),
    path.join(process.cwd(), "Resources", "license.lic"),
    path.join(process.cwd(), "dist", "resources", "license.lic"),
    path.join(process.cwd(), "build", "resources", "license.lic"),

    // 2. Electron app resources (production build)
    path.join((process as any).resourcesPath || "", "license.lic"),
    path.join((process as any).resourcesPath || "", "app", "license.lic"),

    // 3. Current working directory paths
    path.join(process.cwd(), "license.lic"),
    path.join(process.cwd(), "License.lic"),
    "./license.lic",
    "./License.lic",

    // 4. Legacy/fallback paths
    path.join(process.cwd(), "app", "license.lic"),
    path.join(process.cwd(), "src", "license.lic"),
  ];

  /**
   * หา license.lic file ในตำแหน่งต่างๆ
   * ค้นหาตาม priority order
   */
  static async findLicenseFile(): Promise<string | null> {
    try {
      const isProduction = process.env.NODE_ENV === "production";
      console.log(
        `debug: Starting license file search... (mode: ${
          isProduction ? "production" : "development"
        })`
      );
      console.log(`debug: Current working directory: ${process.cwd()}`);
      console.log(
        `debug: Process resources path: ${
          (process as any).resourcesPath || "not available"
        }`
      );

      // ตรวจสอบ custom path จาก environment variable ก่อน
      const customPath = process.env.SMC_LICENSE_FILE_PATH;
      console.log(
        `debug: Custom license path from env: ${customPath || "not set"}`
      );

      if (customPath) {
        try {
          await fs.access(customPath);
          console.log(`info: Found license file at custom path: ${customPath}`);
          return path.resolve(customPath);
        } catch (error: any) {
          console.log(
            `debug: Custom license path not accessible: ${customPath} (${
              error.code || error.message
            })`
          );
        }
      }

      // ค้นหาตาม default paths
      console.log(
        `debug: Searching in ${this.LICENSE_FILE_PATHS.length} default paths...`
      );

      let searchAttempts = 0;
      for (const filePath of this.LICENSE_FILE_PATHS) {
        searchAttempts++;
        const resolvedPath = path.resolve(filePath);
        console.log(
          `debug: [${searchAttempts}/${this.LICENSE_FILE_PATHS.length}] Checking: ${resolvedPath}`
        );

        try {
          await fs.access(resolvedPath);
          console.log(`info: ✅ Found license file at: ${resolvedPath}`);

          // Additional validation for production
          if (isProduction) {
            const stats = await fs.stat(resolvedPath);
            if (stats.size === 0) {
              console.log(`warn: License file is empty, continuing search...`);
              continue;
            }
            console.log(`info: License file size: ${stats.size} bytes`);
          }

          return resolvedPath;
        } catch (err: any) {
          console.log(
            `debug: Not found at ${filePath}: ${
              err.code || err.message || "ENOENT"
            }`
          );
          continue;
        }
      }

      // Production-specific suggestions
      if (isProduction) {
        console.log(
          "warn: ❌ No license.lic file found for production deployment"
        );
        console.log(
          "warn: Production deployment requires license.lic file in resources directory"
        );
        console.log("warn: Solutions:");
        console.log(
          "  1. Generate license using: smc-license generate [options]"
        );
        console.log("  2. Copy license.lic to resources/ directory");
        console.log("  3. Set SMC_LICENSE_FILE_PATH environment variable");
      } else {
        console.log("debug: No license.lic file found in any location");
        console.log(
          "debug: For development, this is normal - license validation will be bypassed"
        );
      }

      console.log(`debug: Searched ${searchAttempts} paths total`);
      return null;
    } catch (error) {
      console.error("error: Failed to search for license file:", error);

      // Production error handling
      if (process.env.NODE_ENV === "production") {
        console.error(
          "error: Critical failure in production license file search"
        );
        console.error("error: This may prevent application startup");
      }

      return null;
    }
  }

  /**
   * อ่านและ parse HKDF v2.0 license file
   * 🔒 ต้องใช้ ESP32 MAC address เสมอ - ไม่มี bypass
   * WiFi SSID จะถูกดึงจาก KDF context โดยอัตโนมัติ
   *
   * @param filePath - License file path (optional, will search if not provided)
   * @param esp32MacAddress - ESP32 MAC address from real hardware (REQUIRED)
   * @returns License data หรือ null ถ้า fail
   */
  static async parseLicenseFile(
    filePath?: string,
    esp32MacAddress?: string
  ): Promise<LicenseData | null> {
    try {
      // ถ้าไม่ระบุ path ให้ค้นหาเอง
      const targetPath = filePath || (await this.findLicenseFile());

      if (!targetPath) {
        console.log("debug: No license file path provided and none found");
        return null;
      }

      console.log(`info: Parsing HKDF v2.0 license file: ${targetPath}`);

      // ตรวจสอบ ESP32 hardware requirement
      if (!esp32MacAddress) {
        console.error(
          "error: ESP32 MAC address จำเป็นสำหรับ HKDF license parsing"
        );
        console.error("error: license.lic ต้องใช้ ESP32 hardware binding เสมอ");
        throw new Error("ESP32 MAC address จำเป็นสำหรับการอ่าน license file");
      }

      console.log(
        `info: Using ESP32 hardware binding - MAC: ${esp32MacAddress}`
      );

      // อ่านไฟล์
      const fileContent = await fs.readFile(targetPath, "utf8");

      // Parse JSON structure
      const licenseFile = JSON.parse(fileContent) as LicenseFile;

      // ตรวจสอบ HKDF v2.0+ format (รองรับ Phase 9 v2.1.0)
      if (
        (!licenseFile.version.startsWith("2.0") &&
          !licenseFile.version.startsWith("2.1")) ||
        !licenseFile.kdf_context
      ) {
        console.error(
          `error: License file version ${licenseFile.version} ไม่รองรับ`
        );
        console.error(
          "error: SMC App รองรับเฉพาะ HKDF v2.0+ licenses เท่านั้น"
        );
        console.error("error: Legacy v1.0 licenses ไม่รองรับอีกต่อไป");
        throw new Error(
          "License file format ไม่รองรับ - ต้องการ HKDF v2.0+ (version 2.0.x หรือ 2.1.x) เท่านั้น"
        );
      }

      // ตรวจสอบ algorithm
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        throw new Error(
          `Unsupported encryption algorithm: ${licenseFile.algorithm}`
        );
      }

      console.log(
        `info: ✅ HKDF license file detected (${licenseFile.version})`
      );
      console.log(`info: Algorithm: ${licenseFile.algorithm}`);
      console.log(`info: Created: ${licenseFile.created_at}`);

      // Parse KDF context เพื่อได้ non-sensitive data
      const kdfInfo = licenseFile.kdf_context.info;
      const infoParts = kdfInfo.split("|");

      // Phase 9: Support both v2.0.0 (6 parts with WiFi) and v2.1.0 (5 parts WiFi-free)
      const isWiFiFree = licenseFile.version.startsWith("2.1");
      const expectedParts = isWiFiFree ? 5 : 6;

      if (infoParts.length < expectedParts) {
        throw new Error(
          `Invalid KDF context info format (expected ${expectedParts} parts, got ${infoParts.length})`
        );
      }

      // Extract non-sensitive data จาก KDF context
      const applicationId = infoParts[1];
      const customerId = infoParts[2];
      const expiryDate = infoParts[3];
      const version = infoParts[4];
      const wifiSsid = isWiFiFree ? "" : infoParts[5]; // WiFi SSID (Phase 9: empty for v2.1.0)

      console.log(`info: Application ID: ${applicationId}`);
      console.log(`info: Customer ID: ${customerId}`);
      console.log(`info: Expiry: ${expiryDate}`);
      console.log(`info: Version: ${version}`);
      if (isWiFiFree) {
        console.log(`info: Phase 9: WiFi-free license (v2.1.0)`);
      } else {
        console.log(`info: WiFi SSID from license: ${wifiSsid}`);
      }

      // สร้าง key data รวม sensitive และ non-sensitive data (Phase 9: WiFi-free)
      const keyData = {
        applicationId,
        customerId,
        macAddress: esp32MacAddress, // จาก ESP32 hardware
        expiryDate,
        // Phase 9: ลบ wifiSsid ออกจาก key data สำหรับ v2.1.0
      };

      // ถอดรหัส license data ด้วย HKDF
      const licenseData = decryptLicenseData(
        licenseFile.encrypted_data,
        licenseFile.kdf_context,
        keyData
      );

      console.log(`info: ✅ HKDF license file parsed successfully`);
      console.log(`info: Organization: ${licenseData.organization}`);
      console.log(`info: Customer: ${licenseData.customerId}`);
      console.log(`info: Expires: ${licenseData.expiryDate}`);

      return licenseData;
    } catch (error: any) {
      console.error("error: Failed to parse HKDF license file:", error.message);
      return null;
    }
  }

  /**
   * ตรวจสอบ HKDF v2.0 license file structure ว่าถูกต้องหรือไม่
   */
  static async validateFileStructure(filePath: string): Promise<boolean> {
    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      const licenseFile = JSON.parse(fileContent) as LicenseFile;

      // ตรวจสอบ HKDF v2.0 required fields
      const requiredFields = [
        "version",
        "encrypted_data",
        "algorithm",
        "created_at",
        "kdf_context",
      ];
      for (const field of requiredFields) {
        if (!licenseFile[field as keyof LicenseFile]) {
          console.log(
            `debug: Missing required field in HKDF license file: ${field}`
          );
          return false;
        }
      }

      // ตรวจสอบ HKDF v2.0+ version (รองรับ Phase 9)
      if (
        !licenseFile.version.startsWith("2.0") &&
        !licenseFile.version.startsWith("2.1")
      ) {
        console.log(
          `debug: Unsupported license version: ${licenseFile.version} (expected: 2.0.x or 2.1.x)`
        );
        return false;
      }

      // ตรวจสอบ KDF context structure
      if (
        !licenseFile.kdf_context ||
        !licenseFile.kdf_context.salt ||
        !licenseFile.kdf_context.info ||
        licenseFile.kdf_context.algorithm !== "hkdf-sha256"
      ) {
        console.log("debug: Invalid KDF context structure");
        return false;
      }

      // ตรวจสอบ algorithm support
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        console.log(`debug: Unsupported algorithm: ${licenseFile.algorithm}`);
        return false;
      }

      console.log(
        "info: ✅ HKDF v2.0 license file structure validation passed"
      );
      return true;
    } catch (error) {
      console.error(
        "error: HKDF license file structure validation failed:",
        error
      );
      return false;
    }
  }

  /**
   * ดึง WiFi credentials จาก license data (backward compatibility)
   * Phase 9: WiFi credentials available for v2.0.x, not available for v2.1.x
   *
   * @param licenseData - License data object
   * @returns WiFi credentials object or null for WiFi-free licenses
   */
  static async extractWiFiCredentials(
    licenseData: LicenseData
  ): Promise<{ ssid: string; password: string } | null> {
    try {
      // v2.1.x: WiFi-free licenses don't have WiFi credentials
      if (licenseData.version.startsWith("2.1")) {
        console.log(
          "info: WiFi-free license detected - no WiFi credentials available"
        );
        return null;
      }

      // v2.0.x: WiFi credentials should be available
      if (licenseData.wifiSsid && licenseData.wifiPassword) {
        console.log(
          `info: WiFi credentials extracted for v${licenseData.version}`
        );
        return {
          ssid: licenseData.wifiSsid,
          password: licenseData.wifiPassword,
        };
      }

      console.log("warn: WiFi credentials missing from v2.0.x license");
      return null;
    } catch (error: any) {
      console.error(
        `error: WiFi credential extraction failed: ${error.message}`
      );
      return null;
    }
  }

  /**
   * ตรวจสอบ license data integrity
   */
  static validateLicenseData(licenseData: LicenseData): boolean {
    try {
      // ตรวจสอบ required fields (Phase 9: WiFi-free)
      const requiredFields = [
        "organization",
        "customerId",
        "applicationId",
        "expiryDate",
        "macAddress",
      ];
      for (const field of requiredFields) {
        if (!licenseData[field as keyof LicenseData]) {
          console.log(
            `debug: Missing required field in license data: ${field}`
          );
          return false;
        }
      }

      // ตรวจสอบ checksum ถ้ามี (Phase 9: WiFi-free checksum)
      if (licenseData.checksum) {
        const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}`;
        const expectedChecksum = crypto
          .createHash("sha256")
          .update(checksumData)
          .digest("hex")
          .slice(0, 16);

        if (licenseData.checksum !== expectedChecksum) {
          console.log(
            "debug: License data integrity check failed (checksum mismatch)"
          );
          return false;
        }
      }

      console.log("info: License data validation passed (Phase 9: WiFi-free)");
      return true;
    } catch (error) {
      console.error("error: License data validation failed:", error);
      return false;
    }
  }

  /**
   * ตรวจสอบว่า license file มีอยู่และสามารถอ่านได้
   */
  static async isLicenseFileAvailable(): Promise<boolean> {
    const filePath = await this.findLicenseFile();
    return filePath !== null;
  }
}
