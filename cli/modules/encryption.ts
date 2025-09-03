import crypto from "crypto";
import chalk from "chalk";
import {
  LicenseData,
  LicenseFile,
  EncryptionConfig,
  WiFiPasswordValidation,
  KDFContext,
} from "../types";

/**
 * Encryption Module for SMC License System
 *
 * ใช้ AES-256-CBC สำหรับเข้ารหัส license data
 * ใช้ HKDF (RFC 5869) แทน Dynamic Key เพื่อความปลอดภัยสูงสุด
 * ไม่มี sensitive data ใน license file เพื่อป้องกัน MAC address exposure
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-cbc",
  iv_length: 16, // 16 bytes IV for AES
};

// HKDF configuration (RFC 5869)
const HKDF_CONFIG = {
  hash: "sha256",
  key_length: 32, // 32 bytes for AES-256
  salt_length: 32, // 32 bytes random salt
  info_prefix: "SMC_LICENSE_KDF_v1.0", // Context info prefix
};

/**
 * Generate random salt for HKDF
 *
 * @returns Random salt buffer (32 bytes)
 */
function generateSalt(): Buffer {
  return crypto.randomBytes(HKDF_CONFIG.salt_length);
}

/**
 * Create deterministic KDF context from stable license data
 * ใช้ stable salt จาก non-sensitive data เพื่อให้ regenerate ได้
 *
 * @param licenseData - License data object
 * @returns KDF context (deterministic but secure)
 */
export function createKDFContext(licenseData: LicenseData): KDFContext {
  console.log(chalk.blue("🔑 Creating deterministic KDF context..."));

  // สร้าง deterministic salt จาก non-sensitive stable data
  const saltInput = `${licenseData.applicationId}|${licenseData.customerId}|${licenseData.expiryDate}`;
  const salt = crypto.createHash("sha256").update(saltInput).digest();

  // สร้าง info context (WiFi-free for Phase 9)
  const contextParts = [
    HKDF_CONFIG.info_prefix,
    licenseData.applicationId,
    licenseData.customerId,
    licenseData.expiryDate,
    licenseData.version || "1.0.0",
    // Phase 9: ลบ wifiSsid ออกเพื่อแก้ Chicken-Egg Problem
  ];

  const info = contextParts.join("|");

  const kdfContext: KDFContext = {
    salt: salt.toString("base64"),
    info: info,
    algorithm: "hkdf-sha256",
  };

  console.log(chalk.green("   ✅ Deterministic KDF context created"));
  console.log(
    chalk.gray(
      `   Salt (deterministic): ${salt.toString("base64").substring(0, 16)}...`
    )
  );
  console.log(chalk.gray(`   Info: ${info.substring(0, 50)}...`));
  console.log(
    chalk.blue("   🔄 Same input data → Same KDF context → Same license")
  );

  return kdfContext;
}

/**
 * Generate HKDF key from license data และ KDF context
 * ใช้ HKDF (RFC 5869) สำหรับ secure key derivation
 *
 * @param licenseData - Complete license data (รวม sensitive data)
 * @param kdfContext - KDF context จาก license file
 * @returns 32-byte encryption key
 */
export function generateHKDFKey(
  licenseData: LicenseData,
  kdfContext: KDFContext
): Buffer {
  console.log(chalk.blue("🔐 Generating HKDF key..."));

  try {
    // สร้าง Input Key Material (IKM) จาก sensitive license data (WiFi-free)
    const ikm_parts = [
      licenseData.applicationId,
      licenseData.customerId,
      licenseData.macAddress, // Sensitive data - ไม่อยู่ใน context
      licenseData.expiryDate,
      // Phase 9: ลบ wifiSsid ออกจาก key derivation
    ];

    const ikm = Buffer.from(ikm_parts.join("_"), "utf8");

    // แปลง salt จาก base64
    const salt = Buffer.from(kdfContext.salt, "base64");

    // แปลง info จาก string
    const info = Buffer.from(kdfContext.info, "utf8");

    console.log(chalk.gray(`   IKM size: ${ikm.length} bytes`));
    console.log(chalk.gray(`   Salt size: ${salt.length} bytes`));
    console.log(chalk.gray(`   Info size: ${info.length} bytes`));

    // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
    const prk = crypto.createHmac(HKDF_CONFIG.hash, salt).update(ikm).digest();

    // HKDF-Expand: OKM = HMAC-Hash(PRK, info + 0x01)
    const expandInfo = Buffer.concat([info, Buffer.from([0x01])]);
    const okm = crypto
      .createHmac(HKDF_CONFIG.hash, prk)
      .update(expandInfo)
      .digest();

    // ตัด key ให้ได้ขนาดที่ต้องการ (32 bytes สำหรับ AES-256)
    const derivedKey = okm.slice(0, HKDF_CONFIG.key_length);

    console.log(chalk.green("   ✅ HKDF key generated"));
    console.log(chalk.gray(`   Key size: ${derivedKey.length} bytes`));
    console.log(
      chalk.gray(
        `   Key preview: ${derivedKey.toString("hex").substring(0, 8)}...`
      )
    );

    return derivedKey;
  } catch (error: any) {
    console.log(
      chalk.red(`   ❌ HKDF key generation failed: ${error.message}`)
    );
    throw new Error(`HKDF key generation failed: ${error.message}`);
  }
}

/**
 * สร้าง IV (Initialization Vector) สำหรับ AES encryption
 */
function generateIV(): Buffer {
  return crypto.randomBytes(ENCRYPTION_CONFIG.iv_length);
}

/**
 * สร้าง deterministic IV จาก license data สำหรับ HKDF regeneration
 * Same input data → Same IV → Same license
 */
function generateDeterministicIV(licenseData: LicenseData): Buffer {
  // สร้าง IV จาก hash ของข้อมูลสำคัญ (WiFi-free for Phase 9)
  const ivSource = `${licenseData.applicationId}_${licenseData.customerId}_${licenseData.expiryDate}_${licenseData.macAddress}`;
  const hash = crypto.createHash("sha256").update(ivSource).digest();
  return hash.slice(0, ENCRYPTION_CONFIG.iv_length); // ใช้ 16 bytes แรก
}

/**
 * เข้ารหัสข้อมูล license ด้วย AES-256-CBC + HKDF
 *
 * @param data - License data object
 * @param kdfContext - KDF context สำหรับ key derivation
 * @returns Encrypted string (Base64)
 */
export function encryptLicenseData(
  data: LicenseData,
  kdfContext: KDFContext
): string {
  try {
    console.log(chalk.blue("🔐 Encrypting license data with HKDF..."));

    // สร้าง HKDF key จาก license data และ KDF context
    const derivedKey = generateHKDFKey(data, kdfContext);

    // Convert license data เป็น JSON string (compact format สำหรับ performance)
    const jsonString = JSON.stringify(data, null, 0);
    console.log(chalk.gray(`   Data size: ${jsonString.length} bytes`));

    // Generate deterministic IV for license regeneration
    const iv = generateDeterministicIV(data);

    // สร้าง cipher ด้วย createCipheriv ด้วย HKDF key
    const cipher = crypto.createCipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      iv
    );

    // เข้ารหัสข้อมูล
    let encrypted = cipher.update(jsonString, "utf8", "hex");
    encrypted += cipher.final("hex");

    // รวม IV กับ encrypted data (IV:ENCRYPTED_DATA)
    const result = iv.toString("hex") + ":" + encrypted;

    console.log(chalk.green(`   ✅ HKDF encryption successful`));
    console.log(chalk.gray(`   Encrypted size: ${result.length} characters`));

    return Buffer.from(result).toString("base64"); // Convert เป็น Base64 เพื่อความสะดวกในการจัดเก็บ
  } catch (error: any) {
    console.log(chalk.red(`   ❌ HKDF encryption failed: ${error.message}`));
    throw new Error(`License HKDF encryption failed: ${error.message}`);
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
export function decryptLicenseData(
  encryptedData: string,
  kdfContext: KDFContext,
  keyData: {
    applicationId: string;
    customerId: string;
    macAddress: string;
    expiryDate: string;
  }
): LicenseData {
  try {
    console.log(chalk.blue("🔓 Decrypting license data with HKDF..."));

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
      license_type: "production", // Default type, will be overridden by decrypted data
      // Phase 9: ลบ WiFi fields ออก
      wifiSsid: "",
      wifiPassword: "",
    };

    // สร้าง HKDF key จาก key data และ KDF context
    const derivedKey = generateHKDFKey(tempLicenseData, kdfContext);

    console.log(chalk.gray(`   Using HKDF key for decryption`));

    // Decode จาก Base64
    const hexData = Buffer.from(encryptedData, "base64").toString("utf8");

    // แยก IV กับ encrypted data
    const parts = hexData.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    console.log(chalk.gray(`   IV length: ${iv.length} bytes`));
    console.log(chalk.gray(`   Data length: ${encrypted.length} characters`));

    // สร้าง decipher ด้วย createDecipheriv ด้วย HKDF key
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      derivedKey,
      iv
    );

    // ถอดรหัสข้อมูล
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    // Parse JSON
    const decryptedLicenseData = JSON.parse(decrypted);

    console.log(chalk.green(`   ✅ HKDF decryption successful`));
    console.log(
      chalk.gray(`   Organization: ${decryptedLicenseData.organization}`)
    );

    return decryptedLicenseData as LicenseData;
  } catch (error: any) {
    console.log(chalk.red(`   ❌ HKDF decryption failed: ${error.message}`));
    throw new Error(`License HKDF decryption failed: ${error.message}`);
  }
}

/**
 * สร้าง license data object จาก input parameters
 *
 * @param options - License generation options
 * @param macAddress - MAC address from ESP32
 * @param wifiCredentials - WiFi SSID and password for ESP32 connection
 * @returns LicenseData object
 */
export function createLicenseData(
  options: {
    org: string;
    customer: string;
    app: string;
    expiry: string;
    type?: "production" | "internal" | "development";
  },
  macAddress: string
  // Phase 9: ลบ wifiCredentials parameter ออก
): LicenseData {
  console.log(chalk.blue("📝 Creating license data structure..."));

  // Validate expiry date format (YYYY-MM-DD)
  const expiryRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!expiryRegex.test(options.expiry)) {
    throw new Error("Invalid expiry date format. Use YYYY-MM-DD");
  }

  // ตรวจสอบว่าวันหมดอายุไม่ใช่อดีต
  const expiryDate = new Date(options.expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to beginning of day

  if (expiryDate < today) {
    throw new Error("Expiry date cannot be in the past");
  }

  // สร้าง license data (WiFi-free for Phase 9)
  const licenseData: LicenseData = {
    organization: options.org.trim(),
    customerId: options.customer.trim(),
    applicationId: options.app.trim(),
    generatedAt: new Date().toISOString(),
    expiryDate: options.expiry,
    macAddress: macAddress.toUpperCase(), // Normalize MAC address เป็นตัวใหญ่
    version: "1.0.0",
    checksum: "", // จะถูกสร้างหลังจากนี้
    // Phase 9: ลบ WiFi credentials ออกจาก license data
    wifiSsid: "",
    wifiPassword: "",
    license_type: options.type || "production", // Default to production if not specified
  };

  // สร้าง checksum สำหรับ verification (WiFi-free for Phase 9)
  const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}${licenseData.license_type}`;
  licenseData.checksum = crypto
    .createHash("sha256")
    .update(checksumData)
    .digest("hex")
    .slice(0, 16);

  console.log(chalk.green("   ✅ License data created (WiFi-free)"));
  console.log(chalk.gray(`   Organization: ${licenseData.organization}`));
  console.log(chalk.gray(`   Customer ID: ${licenseData.customerId}`));
  console.log(chalk.gray(`   Application: ${licenseData.applicationId}`));
  console.log(chalk.gray(`   Expiry: ${licenseData.expiryDate}`));
  console.log(chalk.gray(`   MAC Address: ${licenseData.macAddress}`));
  console.log(chalk.cyan(`   License Type: ${licenseData.license_type}`));
  console.log(
    chalk.yellow(`   ⚠️  Phase 9: WiFi credentials removed from license`)
  );
  console.log(chalk.gray(`   Checksum: ${licenseData.checksum}`));

  return licenseData;
}

/**
 * สร้าง license file structure สำหรับบันทึกลงไฟล์ (HKDF Version)
 *
 * @param licenseData - License data object
 * @returns LicenseFile object
 */
export function createLicenseFile(licenseData: LicenseData): LicenseFile {
  console.log(chalk.blue("📄 Creating HKDF license file structure..."));

  // สร้าง KDF context (ไม่รวม sensitive data)
  const kdfContext = createKDFContext(licenseData);

  // เข้ารหัส license data ด้วย HKDF
  const encryptedData = encryptLicenseData(licenseData, kdfContext);

  // สร้าง license file structure พร้อม KDF context (ปลอดภัย)
  const licenseFile: LicenseFile = {
    version: "2.1.0", // Phase 9: WiFi-free license structure
    encrypted_data: encryptedData,
    algorithm: ENCRYPTION_CONFIG.algorithm,
    created_at: new Date().toISOString(),

    // KDF context สำหรับ HKDF key generation (ไม่มี sensitive data)
    kdf_context: kdfContext,
  };

  console.log(chalk.green("   ✅ HKDF license file structure created"));
  console.log(chalk.gray(`   Format version: ${licenseFile.version} (HKDF)`));
  console.log(chalk.gray(`   Algorithm: ${licenseFile.algorithm}`));
  console.log(chalk.gray(`   Created at: ${licenseFile.created_at}`));
  console.log(chalk.green("   🔒 No sensitive data exposed in license file"));

  return licenseFile;
}

/**
 * อ่านและ parse license file ด้วย HKDF v2.0
 * WiFi SSID จะถูกดึงจาก KDF context แทนการส่งเป็น parameter
 *
 * @param licenseFileContent - License file content (JSON string)
 * @param sensitiveData - Sensitive data for key generation (MAC address only)
 * @returns LicenseData object
 */
export function parseLicenseFile(
  licenseFileContent: string,
  sensitiveData: {
    macAddress: string;
  }
): LicenseData {
  try {
    console.log(chalk.blue("📖 Parsing HKDF license file..."));

    // Parse JSON
    const licenseFile = JSON.parse(licenseFileContent) as LicenseFile;

    // ตรวจสอบ HKDF version (support both 2.0.x and 2.1.x)
    if (
      (licenseFile.version.startsWith("2.0") ||
        licenseFile.version.startsWith("2.1")) &&
      licenseFile.kdf_context
    ) {
      console.log(
        chalk.green(`   ✅ HKDF format detected (v${licenseFile.version})`)
      );

      // ตรวจสอบ algorithm
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        throw new Error(
          `Unsupported encryption algorithm: ${licenseFile.algorithm}`
        );
      }

      console.log(chalk.gray(`   File version: ${licenseFile.version} (HKDF)`));
      console.log(chalk.gray(`   Algorithm: ${licenseFile.algorithm}`));
      console.log(chalk.gray(`   Created: ${licenseFile.created_at}`));

      // Parse KDF context เพื่อได้ non-sensitive data (support both WiFi and WiFi-free)
      const kdfInfo = licenseFile.kdf_context.info;
      const infoParts = kdfInfo.split("|");

      // Dynamic part detection: v2.1.x = 5 parts (WiFi-free), v2.0.x = 6 parts (WiFi-enabled)
      const isWiFiFree = licenseFile.version.startsWith("2.1");
      const expectedParts = isWiFiFree ? 5 : 6;

      if (infoParts.length < expectedParts) {
        throw new Error(
          `Invalid KDF context info format (expected ${expectedParts} parts for v${licenseFile.version}, got ${infoParts.length})`
        );
      }

      // Extract non-sensitive data จาก KDF context (support both formats)
      const applicationId = infoParts[1];
      const customerId = infoParts[2];
      const expiryDate = infoParts[3];
      const version = infoParts[4];

      // WiFi SSID extraction (v2.0.x only, v2.1.x is WiFi-free)
      const wifiSsid = isWiFiFree ? undefined : infoParts[5];

      console.log(chalk.gray(`   Application ID: ${applicationId}`));
      console.log(chalk.gray(`   Customer ID: ${customerId}`));
      console.log(chalk.gray(`   Expiry: ${expiryDate}`));
      console.log(chalk.gray(`   Version: ${version}`));
      if (!isWiFiFree && wifiSsid) {
        console.log(chalk.gray(`   WiFi SSID: ${wifiSsid}`));
      }

      // สร้าง key data รวม sensitive และ non-sensitive data (dynamic based on version)
      const keyData: any = {
        applicationId,
        customerId,
        macAddress: sensitiveData.macAddress,
        expiryDate,
      };

      // เพิ่ม WiFi SSID สำหรับ v2.0.x compatibility
      if (!isWiFiFree && wifiSsid) {
        keyData.wifiSsid = wifiSsid;
      }

      // ถอดรหัส license data
      const licenseData = decryptLicenseData(
        licenseFile.encrypted_data,
        licenseFile.kdf_context,
        keyData
      );

      console.log(chalk.green("   ✅ HKDF license file parsed successfully"));

      return licenseData;
    } else {
      throw new Error(
        "Not a valid HKDF license file format (expected version 2.0.x or 2.1.x with kdf_context)"
      );
    }
  } catch (error: any) {
    console.log(
      chalk.red(`   ❌ HKDF license file parsing failed: ${error.message}`)
    );
    throw new Error(`Invalid HKDF license file: ${error.message}`);
  }
}

/**
 * ตรวจสอบความถูกต้องของ license data
 *
 * @param licenseData - License data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateLicenseData(licenseData: LicenseData): boolean {
  console.log(chalk.blue("✅ Validating license data..."));

  // ตรวจสอบ required fields (WiFi-free for Phase 9)
  const requiredFields = [
    "organization",
    "customerId",
    "applicationId",
    "expiryDate",
    "macAddress",
  ];
  for (const field of requiredFields) {
    if (!licenseData[field as keyof LicenseData]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // ตรวจสอบ expiry date
  const expiryDate = new Date(licenseData.expiryDate);
  const today = new Date();

  if (expiryDate < today) {
    throw new Error("License has expired");
  }

  // ตรวจสอบ checksum ถ้ามี (WiFi-free for Phase 9)
  if (licenseData.checksum) {
    const checksumData = `${licenseData.organization}${licenseData.customerId}${
      licenseData.applicationId
    }${licenseData.expiryDate}${licenseData.macAddress}${
      licenseData.license_type || "production"
    }`;
    const expectedChecksum = crypto
      .createHash("sha256")
      .update(checksumData)
      .digest("hex")
      .slice(0, 16);

    if (licenseData.checksum !== expectedChecksum) {
      throw new Error("License data integrity check failed");
    }
  }

  console.log(chalk.green("   ✅ License data validation passed"));
  console.log(chalk.gray(`   Valid until: ${licenseData.expiryDate}`));

  return true;
}

/**
 * ตรวจสอบ WiFi password strength
 *
 * @param password - WiFi password to validate
 * @param bypassCheck - Skip validation for development
 * @returns WiFiPasswordValidation result
 */
/**
 * แสดงข้อมูล basic ของ license file โดยไม่ decrypt
 * ใช้สำหรับ validate และ info commands ที่ไม่มี sensitive data
 */
export function getLicenseFileBasicInfo(licenseFileContent: string): {
  isValid: boolean;
  errors: string[];
  fileInfo?: {
    version: string;
    algorithm: string;
    created_at: string;
    encrypted_data_length: number;
    has_kdf_context: boolean;
    kdf_algorithm?: string;
    file_size: number;
  };
} {
  const result: any = {
    isValid: false,
    errors: [],
  };

  try {
    // Parse JSON
    const licenseFile = JSON.parse(licenseFileContent);

    // ตรวจสอบ required fields สำหรับ HKDF v2.0
    const requiredFields = [
      "version",
      "encrypted_data",
      "algorithm",
      "created_at",
      "kdf_context",
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in licenseFile)
    );

    if (missingFields.length > 0) {
      result.errors.push(
        `Missing required fields: ${missingFields.join(", ")}`
      );
      return result;
    }

    // ตรวจสอบ KDF context structure
    if (
      !licenseFile.kdf_context ||
      typeof licenseFile.kdf_context !== "object"
    ) {
      result.errors.push("Invalid or missing kdf_context");
      return result;
    }

    const kdfRequiredFields = ["salt", "info", "algorithm"];
    const kdfMissingFields = kdfRequiredFields.filter(
      (field) => !(field in licenseFile.kdf_context)
    );

    if (kdfMissingFields.length > 0) {
      result.errors.push(
        `Missing KDF context fields: ${kdfMissingFields.join(", ")}`
      );
      return result;
    }

    // ตรวจสอบ version compatibility (support 2.0.x and 2.1.x)
    if (
      !licenseFile.version.startsWith("2.0") &&
      !licenseFile.version.startsWith("2.1")
    ) {
      result.errors.push(
        `Unsupported license version: ${licenseFile.version}. HKDF system requires version 2.0.x or 2.1.x`
      );
      return result;
    }

    // สร้างข้อมูล basic info
    result.isValid = true;
    result.fileInfo = {
      version: licenseFile.version,
      algorithm: licenseFile.algorithm,
      created_at: licenseFile.created_at,
      encrypted_data_length: licenseFile.encrypted_data.length,
      has_kdf_context: true,
      kdf_algorithm: licenseFile.kdf_context.algorithm,
      file_size: licenseFileContent.length,
    };

    return result;
  } catch (error: any) {
    result.errors.push(`JSON parsing error: ${error.message}`);
    return result;
  }
}

export function validateWiFiPassword(
  password: string,
  bypassCheck: boolean = false
): WiFiPasswordValidation {
  const result: WiFiPasswordValidation = {
    isValid: true,
    strength: "medium",
    errors: [],
    warnings: [],
  };

  // ถ้า bypass ให้ผ่านทุกอย่าง แต่ยังแสดง warning
  if (bypassCheck) {
    console.log(
      chalk.yellow("⚠️  Password validation bypassed for development")
    );
    result.warnings.push(
      "Password validation bypassed - use strong passwords in production"
    );
    return result;
  }

  // ตรวจสอบความยาว
  if (password.length < 8) {
    result.errors.push("Password must be at least 8 characters long");
    result.isValid = false;
  }

  if (password.length < 12) {
    result.warnings.push("Consider using passwords longer than 12 characters");
  }

  // ตรวจสอบ complexity
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const complexityScore = [
    hasLowerCase,
    hasUpperCase,
    hasNumbers,
    hasSpecialChars,
  ].filter(Boolean).length;

  if (complexityScore < 2) {
    result.errors.push(
      "Password must contain at least 2 types: lowercase, uppercase, numbers, special characters"
    );
    result.isValid = false;
  }

  // กำหนด strength
  if (complexityScore >= 4 && password.length >= 12) {
    result.strength = "strong";
  } else if (complexityScore >= 3 && password.length >= 8) {
    result.strength = "medium";
  } else {
    result.strength = "weak";
  }

  // ตรวจสอบ common weak passwords
  const weakPasswords = ["password", "123456", "wifi123", "admin123", "smc123"];
  if (weakPasswords.some((weak) => password.toLowerCase().includes(weak))) {
    result.warnings.push("Avoid using common password patterns");
    result.strength = "weak";
  }

  return result;
}
