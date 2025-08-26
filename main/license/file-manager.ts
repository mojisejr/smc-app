import * as fs from 'fs/promises';
import * as path from 'path';
import * as process from 'process';
import crypto from 'crypto';

/**
 * HKDF v2.0 License File Manager
 * 
 * จัดการ license.lic files ด้วย HKDF-based encryption
 * ใช้ ESP32 MAC address เป็น hardware binding เสมอ
 * ❌ ไม่รองรับ Legacy v1.0 อีกต่อไป
 */

// HKDF configuration (RFC 5869) - ตรงกับ CLI
const HKDF_CONFIG = {
  hash: 'sha256',
  key_length: 32, // 32 bytes for AES-256
  salt_length: 32, // 32 bytes random salt
  info_prefix: 'SMC_LICENSE_KDF_v1.0' // Context info prefix
};

// Encryption configuration - ตรงกับ CLI
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-cbc',
  iv_length: 16 // 16 bytes IV for AES
};

// License data structure (ตรงกับ CLI types)
export interface LicenseData {
  organization: string;
  customerId: string;
  applicationId: string;
  generatedAt: string;
  expiryDate: string;
  macAddress: string;
  wifiSsid: string;           // WiFi SSID สำหรับเชื่อมต่อ ESP32
  wifiPassword: string;       // WiFi Password
  version: string;
  checksum?: string;
}

// KDF Context for HKDF key derivation - ตรงกับ CLI types
export interface KDFContext {
  salt: string;              // Deterministic salt (Base64)
  info: string;              // Context info for HKDF (non-sensitive data only)
  algorithm: 'hkdf-sha256';  // HKDF algorithm identifier
}

// License file structure (HKDF v2.0 only) - ตรงกับ CLI types
export interface LicenseFile {
  version: string;           // License file format version (2.0.0 for HKDF)
  encrypted_data: string;    // AES-256 encrypted license data (Base64)
  algorithm: string;         // Encryption algorithm used
  created_at: string;        // Creation timestamp
  
  // HKDF context (v2.0+ only, no sensitive data exposed)
  kdf_context: KDFContext;   // KDF context for HKDF key generation (required)
}

/**
 * Generate HKDF key from license data และ KDF context
 * ใช้ HKDF (RFC 5869) สำหรับ secure key derivation
 * 
 * @param licenseData - Complete license data (รวม sensitive data)
 * @param kdfContext - KDF context จาก license file
 * @returns 32-byte encryption key
 */
function generateHKDFKey(licenseData: LicenseData, kdfContext: KDFContext): Buffer {
  console.log('info: Generating HKDF key for license decryption...');
  
  try {
    // สร้าง Input Key Material (IKM) จาก sensitive license data
    const ikm_parts = [
      licenseData.applicationId,
      licenseData.customerId,
      licenseData.wifiSsid,
      licenseData.macAddress, // Sensitive data - ไม่อยู่ใน context
      licenseData.expiryDate
    ];
    
    const ikm = Buffer.from(ikm_parts.join('_'), 'utf8');
    
    // แปลง salt จาก base64
    const salt = Buffer.from(kdfContext.salt, 'base64');
    
    // แปลง info จาก string
    const info = Buffer.from(kdfContext.info, 'utf8');
    
    console.log(`debug: IKM size: ${ikm.length} bytes`);
    console.log(`debug: Salt size: ${salt.length} bytes`);
    console.log(`debug: Info size: ${info.length} bytes`);
    
    // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
    const prk = crypto.createHmac(HKDF_CONFIG.hash, salt).update(ikm).digest();
    
    // HKDF-Expand: OKM = HMAC-Hash(PRK, info + 0x01)
    const expandInfo = Buffer.concat([info, Buffer.from([0x01])]);
    const okm = crypto.createHmac(HKDF_CONFIG.hash, prk).update(expandInfo).digest();
    
    // ตัด key ให้ได้ขนาดที่ต้องการ (32 bytes สำหรับ AES-256)
    const derivedKey = okm.slice(0, HKDF_CONFIG.key_length);
    
    console.log('info: ✅ HKDF key generated successfully');
    console.log(`debug: Key size: ${derivedKey.length} bytes`);
    
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
    wifiSsid: string;
    macAddress: string;
    expiryDate: string;
  }
): LicenseData {
  try {
    console.log('info: Decrypting HKDF license data...');
    
    // สร้าง temporary license data object สำหรับ HKDF key generation
    const tempLicenseData: LicenseData = {
      applicationId: keyData.applicationId,
      customerId: keyData.customerId,
      wifiSsid: keyData.wifiSsid,
      macAddress: keyData.macAddress,
      expiryDate: keyData.expiryDate,
      organization: '', // จะได้จาก decrypted data
      generatedAt: '',
      wifiPassword: '',
      version: '1.0.0',
      checksum: ''
    };
    
    // สร้าง HKDF key จาก key data และ KDF context
    const derivedKey = generateHKDFKey(tempLicenseData, kdfContext);
    
    console.log('debug: Using HKDF key for decryption');
    
    // Decode จาก Base64
    const hexData = Buffer.from(encryptedData, 'base64').toString('utf8');
    
    // แยก IV กับ encrypted data
    const parts = hexData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    console.log(`debug: IV length: ${iv.length} bytes`);
    console.log(`debug: Data length: ${encrypted.length} characters`);
    
    // สร้าง decipher ด้วย createDecipheriv ด้วย HKDF key
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, derivedKey, iv);
    
    // ถอดรหัสข้อมูล
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON
    const decryptedLicenseData = JSON.parse(decrypted);
    
    console.log('info: ✅ HKDF license decryption successful');
    console.log(`info: Organization: ${decryptedLicenseData.organization}`);
    
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
    path.join(process.cwd(), 'resources', 'license.lic'),
    path.join(process.cwd(), 'Resources', 'license.lic'),
    path.join(process.cwd(), 'dist', 'resources', 'license.lic'),
    path.join(process.cwd(), 'build', 'resources', 'license.lic'),
    
    // 2. Electron app resources (production build)
    path.join((process as any).resourcesPath || '', 'license.lic'),
    path.join((process as any).resourcesPath || '', 'app', 'license.lic'),
    
    // 3. Current working directory paths
    path.join(process.cwd(), 'license.lic'), 
    path.join(process.cwd(), 'License.lic'),
    './license.lic',
    './License.lic',
    
    // 4. Legacy/fallback paths
    path.join(process.cwd(), 'app', 'license.lic'),
    path.join(process.cwd(), 'src', 'license.lic')
  ];

  /**
   * หา license.lic file ในตำแหน่งต่างๆ
   * ค้นหาตาม priority order
   */
  static async findLicenseFile(): Promise<string | null> {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      console.log(`debug: Starting license file search... (mode: ${isProduction ? 'production' : 'development'})`);
      console.log(`debug: Current working directory: ${process.cwd()}`);
      console.log(`debug: Process resources path: ${(process as any).resourcesPath || 'not available'}`);
      
      // ตรวจสอบ custom path จาก environment variable ก่อน
      const customPath = process.env.SMC_LICENSE_FILE_PATH;
      console.log(`debug: Custom license path from env: ${customPath || 'not set'}`);
      
      if (customPath) {
        try {
          await fs.access(customPath);
          console.log(`info: Found license file at custom path: ${customPath}`);
          return path.resolve(customPath);
        } catch (error: any) {
          console.log(`debug: Custom license path not accessible: ${customPath} (${error.code || error.message})`);
        }
      }

      // ค้นหาตาม default paths
      console.log(`debug: Searching in ${this.LICENSE_FILE_PATHS.length} default paths...`);
      
      let searchAttempts = 0;
      for (const filePath of this.LICENSE_FILE_PATHS) {
        searchAttempts++;
        const resolvedPath = path.resolve(filePath);
        console.log(`debug: [${searchAttempts}/${this.LICENSE_FILE_PATHS.length}] Checking: ${resolvedPath}`);
        
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
          console.log(`debug: Not found at ${filePath}: ${err.code || err.message || 'ENOENT'}`);
          continue;
        }
      }

      // Production-specific suggestions
      if (isProduction) {
        console.log("warn: ❌ No license.lic file found for production deployment");
        console.log("warn: Production deployment requires license.lic file in resources directory");
        console.log("warn: Solutions:");
        console.log("  1. Generate license using: smc-license generate [options]");
        console.log("  2. Copy license.lic to resources/ directory");
        console.log("  3. Set SMC_LICENSE_FILE_PATH environment variable");
      } else {
        console.log("debug: No license.lic file found in any location");
        console.log("debug: For development, this is normal - license validation will be bypassed");
      }
      
      console.log(`debug: Searched ${searchAttempts} paths total`);
      return null;

    } catch (error) {
      console.error("error: Failed to search for license file:", error);
      
      // Production error handling
      if (process.env.NODE_ENV === 'production') {
        console.error("error: Critical failure in production license file search");
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
      const targetPath = filePath || await this.findLicenseFile();
      
      if (!targetPath) {
        console.log("debug: No license file path provided and none found");
        return null;
      }

      console.log(`info: Parsing HKDF v2.0 license file: ${targetPath}`);

      // ตรวจสอบ ESP32 hardware requirement
      if (!esp32MacAddress) {
        console.error('error: ESP32 MAC address จำเป็นสำหรับ HKDF license parsing');
        console.error('error: license.lic ต้องใช้ ESP32 hardware binding เสมอ');
        throw new Error('ESP32 MAC address จำเป็นสำหรับการอ่าน license file');
      }

      console.log(`info: Using ESP32 hardware binding - MAC: ${esp32MacAddress}`);

      // อ่านไฟล์
      const fileContent = await fs.readFile(targetPath, 'utf8');
      
      // Parse JSON structure
      const licenseFile = JSON.parse(fileContent) as LicenseFile;

      // ตรวจสอบ HKDF v2.0 format
      if (licenseFile.version !== '2.0.0' || !licenseFile.kdf_context) {
        console.error(`error: License file version ${licenseFile.version} ไม่รองรับ`);
        console.error('error: SMC App รองรับเฉพาะ HKDF v2.0 licenses เท่านั้น');
        console.error('error: Legacy v1.0 licenses ไม่รองรับอีกต่อไป');
        throw new Error('License file format ไม่รองรับ - ต้องการ HKDF v2.0 (version 2.0.0) เท่านั้น');
      }

      // ตรวจสอบ algorithm
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${licenseFile.algorithm}`);
      }

      console.log(`info: ✅ HKDF v2.0 license file detected`);
      console.log(`info: Algorithm: ${licenseFile.algorithm}`);
      console.log(`info: Created: ${licenseFile.created_at}`);

      // Parse KDF context เพื่อได้ non-sensitive data รวม WiFi SSID
      const kdfInfo = licenseFile.kdf_context.info;
      const infoParts = kdfInfo.split('|');
      
      if (infoParts.length < 6) {
        throw new Error('Invalid KDF context info format - missing WiFi SSID (expected 6 parts, got ' + infoParts.length + ')');
      }
      
      // Extract non-sensitive data จาก KDF context
      const applicationId = infoParts[1];
      const customerId = infoParts[2];
      const expiryDate = infoParts[3];
      const version = infoParts[4];
      const wifiSsid = infoParts[5];  // WiFi SSID จาก KDF context
      
      console.log(`info: Application ID: ${applicationId}`);
      console.log(`info: Customer ID: ${customerId}`);
      console.log(`info: Expiry: ${expiryDate}`);
      console.log(`info: Version: ${version}`);
      console.log(`info: WiFi SSID from license: ${wifiSsid}`);
      
      // สร้าง key data รวม sensitive และ non-sensitive data
      const keyData = {
        applicationId,
        customerId,
        wifiSsid: wifiSsid,          // จาก KDF context (ไม่ใช่ parameter อีกต่อไป)
        macAddress: esp32MacAddress,  // จาก ESP32 hardware
        expiryDate
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
      const fileContent = await fs.readFile(filePath, 'utf8');
      const licenseFile = JSON.parse(fileContent) as LicenseFile;
      
      // ตรวจสอบ HKDF v2.0 required fields
      const requiredFields = ['version', 'encrypted_data', 'algorithm', 'created_at', 'kdf_context'];
      for (const field of requiredFields) {
        if (!licenseFile[field as keyof LicenseFile]) {
          console.log(`debug: Missing required field in HKDF license file: ${field}`);
          return false;
        }
      }
      
      // ตรวจสอบ HKDF v2.0 version
      if (licenseFile.version !== '2.0.0') {
        console.log(`debug: Unsupported license version: ${licenseFile.version} (expected: 2.0.0)`);
        return false;
      }
      
      // ตรวจสอบ KDF context structure
      if (!licenseFile.kdf_context || 
          !licenseFile.kdf_context.salt || 
          !licenseFile.kdf_context.info || 
          licenseFile.kdf_context.algorithm !== 'hkdf-sha256') {
        console.log('debug: Invalid KDF context structure');
        return false;
      }
      
      // ตรวจสอบ algorithm support
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        console.log(`debug: Unsupported algorithm: ${licenseFile.algorithm}`);
        return false;
      }
      
      console.log('info: ✅ HKDF v2.0 license file structure validation passed');
      return true;
      
    } catch (error) {
      console.error("error: HKDF license file structure validation failed:", error);
      return false;
    }
  }


  /**
   * ดึง WiFi credentials จาก license data
   * อ่านจาก wifiSsid และ wifiPassword ที่ถูก decrypt จาก license โดยตรง
   */
  static async extractWiFiCredentials(licenseData: LicenseData): Promise<{ssid: string, password: string} | null> {
    try {
      console.log('info: Extracting WiFi credentials from license data...');
      
      // ตรวจสอบว่ามี WiFi credentials ใน license data
      if (!licenseData.wifiSsid || !licenseData.wifiPassword) {
        console.log("error: WiFi credentials not found in license data");
        console.log(`debug: wifiSsid: ${licenseData.wifiSsid || 'undefined'}`);
        console.log(`debug: wifiPassword: ${licenseData.wifiPassword ? '***hidden***' : 'undefined'}`);
        return null;
      }
      
      // Validate WiFi credentials format
      const ssid = licenseData.wifiSsid.trim();
      const password = licenseData.wifiPassword;
      
      if (!ssid || ssid.length === 0) {
        console.log("error: WiFi SSID is empty or invalid");
        return null;
      }
      
      if (!password || password.length < 4) {
        console.log("error: WiFi password is too short or invalid");
        return null;
      }
      
      console.log(`info: WiFi credentials extracted successfully`);
      console.log(`info: SSID: ${ssid}`);
      console.log(`info: Password: ${'*'.repeat(password.length)} (${password.length} characters)`);
      
      return {
        ssid: ssid,
        password: password
      };
      
    } catch (error) {
      console.error("error: Failed to extract WiFi credentials:", error);
      return null;
    }
  }

  /**
   * ตรวจสอบ license data integrity
   */
  static validateLicenseData(licenseData: LicenseData): boolean {
    try {
      // ตรวจสอบ required fields (รวม WiFi credentials)
      const requiredFields = ['organization', 'customerId', 'applicationId', 'expiryDate', 'macAddress', 'wifiSsid', 'wifiPassword'];
      for (const field of requiredFields) {
        if (!licenseData[field as keyof LicenseData]) {
          console.log(`debug: Missing required field in license data: ${field}`);
          return false;
        }
      }
      
      // ตรวจสอบ checksum ถ้ามี (รวม WiFi SSID)
      if (licenseData.checksum) {
        const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}${licenseData.wifiSsid}`;
        const expectedChecksum = crypto.createHash('sha256')
          .update(checksumData)
          .digest('hex')
          .slice(0, 16);
        
        if (licenseData.checksum !== expectedChecksum) {
          console.log("debug: License data integrity check failed (checksum mismatch)");
          return false;
        }
      }
      
      console.log("info: License data validation passed");
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