import * as fs from 'fs/promises';
import * as path from 'path';
import * as process from 'process';
import crypto from 'crypto';

/**
 * License File Manager
 * 
 * จัดการ license.lic files สำหรับระบบ CLI License
 * ใช้ encryption logic เดียวกับ CLI tool
 */

// Shared secret key - ต้องตรงกับ CLI tool
const SHARED_SECRET_KEY = process.env.SMC_LICENSE_SHARED_KEY || 
  'SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS';

// Pre-computed key สำหรับ performance (32 bytes สำหรับ AES-256)
const PRECOMPUTED_KEY = crypto.createHash('sha256')
  .update(SHARED_SECRET_KEY)
  .digest();

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-cbc' as const,
  key: PRECOMPUTED_KEY,
  iv_length: 16
};

// License data structure (ตรงกับ CLI types)
export interface LicenseData {
  organization: string;
  customerId: string;
  applicationId: string;
  generatedAt: string;
  expiryDate: string;
  macAddress: string;
  version: string;
  checksum?: string;
}

// License file structure (ตรงกับ CLI types)
export interface LicenseFile {
  version: string;
  encrypted_data: string;
  algorithm: string;
  created_at: string;
}

export class LicenseFileManager {
  // Default license file paths
  static readonly LICENSE_FILE_PATHS = [
    './license.lic',
    './License.lic',
    path.join(process.cwd(), 'license.lic'),
    path.join(process.cwd(), 'License.lic'),
    path.join(process.cwd(), 'resources', 'license.lic'),
    path.join(process.cwd(), 'Resources', 'license.lic')
  ];

  /**
   * หา license.lic file ในตำแหน่งต่างๆ
   * ค้นหาตาม priority order
   */
  static async findLicenseFile(): Promise<string | null> {
    try {
      // ตรวจสอบ custom path จาก environment variable ก่อน
      const customPath = process.env.SMC_LICENSE_FILE_PATH;
      if (customPath) {
        try {
          await fs.access(customPath, fs.constants.F_OK | fs.constants.R_OK);
          console.log(`info: Found license file at custom path: ${customPath}`);
          return customPath;
        } catch {
          console.log(`debug: Custom license path not found: ${customPath}`);
        }
      }

      // ค้นหาตาม default paths
      for (const filePath of this.LICENSE_FILE_PATHS) {
        try {
          await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
          console.log(`info: Found license file at: ${filePath}`);
          return path.resolve(filePath);
        } catch {
          // ไม่พบไฟล์ที่ path นี้
          continue;
        }
      }

      console.log("debug: No license.lic file found in any default location");
      return null;

    } catch (error) {
      console.error("error: Failed to search for license file:", error);
      return null;
    }
  }

  /**
   * อ่านและ parse license file จาก path ที่ระบุ
   */
  static async parseLicenseFile(filePath?: string): Promise<LicenseData | null> {
    try {
      // ถ้าไม่ระบุ path ให้ค้นหาเอง
      const targetPath = filePath || await this.findLicenseFile();
      
      if (!targetPath) {
        console.log("debug: No license file path provided and none found");
        return null;
      }

      console.log(`info: Parsing license file: ${targetPath}`);

      // อ่านไฟล์
      const fileContent = await fs.readFile(targetPath, 'utf8');
      
      // Parse JSON structure
      const licenseFile = JSON.parse(fileContent) as LicenseFile;

      // ตรวจสอบ version compatibility
      if (licenseFile.version !== '1.0.0') {
        console.log(`debug: License file version ${licenseFile.version} may not be compatible`);
      }

      // ตรวจสอบ algorithm
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        throw new Error(`Unsupported encryption algorithm: ${licenseFile.algorithm}`);
      }

      // ถอดรหัส license data
      const licenseData = this.decryptLicenseData(licenseFile.encrypted_data);

      console.log(`info: License file parsed successfully`);
      console.log(`info: Organization: ${licenseData.organization}`);
      console.log(`info: Customer: ${licenseData.customerId}`);
      console.log(`info: Expires: ${licenseData.expiryDate}`);

      return licenseData;

    } catch (error) {
      console.error("error: Failed to parse license file:", error);
      return null;
    }
  }

  /**
   * ถอดรหัส license data ด้วย AES-256-CBC
   * (เหมือนกับ CLI encryption.ts)
   */
  private static decryptLicenseData(encryptedData: string): LicenseData {
    try {
      console.log('info: Decrypting license data...');
      
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
      
      // สร้าง decipher
      const decipher = crypto.createDecipheriv(
        ENCRYPTION_CONFIG.algorithm, 
        ENCRYPTION_CONFIG.key, 
        iv
      );
      
      // ถอดรหัส
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse JSON
      const licenseData = JSON.parse(decrypted);
      
      console.log('info: License data decryption successful');
      
      return licenseData as LicenseData;
      
    } catch (error: any) {
      console.error(`error: License decryption failed: ${error.message}`);
      throw new Error(`License decryption failed: ${error.message}`);
    }
  }

  /**
   * ตรวจสอบ license file structure ว่าถูกต้องหรือไม่
   */
  static async validateFileStructure(filePath: string): Promise<boolean> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const licenseFile = JSON.parse(fileContent) as LicenseFile;
      
      // ตรวจสอบ required fields
      const requiredFields = ['version', 'encrypted_data', 'algorithm', 'created_at'];
      for (const field of requiredFields) {
        if (!licenseFile[field as keyof LicenseFile]) {
          console.log(`debug: Missing required field in license file: ${field}`);
          return false;
        }
      }
      
      // ตรวจสอบ algorithm support
      if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
        console.log(`debug: Unsupported algorithm: ${licenseFile.algorithm}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error("error: License file structure validation failed:", error);
      return false;
    }
  }

  /**
   * ดึง WiFi credentials จาก license data
   * ใช้สำหรับเชื่อมต่อ ESP32
   */
  static async extractWiFiCredentials(licenseData: LicenseData): Promise<{ssid: string, password: string} | null> {
    try {
      // WiFi credentials อาจถูก encode ไว้ใน applicationId หรือ organization
      // ตาม format ที่ CLI tool สร้างไว้
      
      // ตัวอย่าง format: applicationId มี format "SMC_Cabinet_WIFI_SSID_PASSWORD"
      const appId = licenseData.applicationId;
      
      // ถ้ามี WiFi info ใน applicationId
      if (appId.includes('_WIFI_')) {
        const parts = appId.split('_WIFI_');
        if (parts.length === 2) {
          const wifiPart = parts[1];
          const [ssid, password] = wifiPart.split('_PWD_');
          
          if (ssid && password) {
            console.log(`info: Extracted WiFi credentials from license`);
            console.log(`info: SSID: ${ssid}`);
            return { ssid, password };
          }
        }
      }

      // Fallback: ใช้ข้อมูลจาก customer ID หรือ organization
      // สำหรับ test license หรือ format อื่น
      
      console.log("debug: No WiFi credentials found in license, using test defaults");
      return {
        ssid: 'SMC_ESP32_' + licenseData.customerId.slice(0, 6),
        password: 'smc' + licenseData.checksum?.slice(0, 8) || 'smc12345'
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
      // ตรวจสอบ required fields
      const requiredFields = ['organization', 'customerId', 'applicationId', 'expiryDate', 'macAddress'];
      for (const field of requiredFields) {
        if (!licenseData[field as keyof LicenseData]) {
          console.log(`debug: Missing required field in license data: ${field}`);
          return false;
        }
      }
      
      // ตรวจสอบ checksum ถ้ามี
      if (licenseData.checksum) {
        const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}`;
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