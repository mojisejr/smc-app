#!/usr/bin/env node

/**
 * SMC License Parser - Enhanced HKDF Support
 * 
 * ใช้สำหรับ:
 * - Enhanced build-prep script
 * - Development reset script  
 * - License validation ใน production
 * 
 * Features:
 * - HKDF v2.0 support (RFC 5869)
 * - Legacy v1.0 backward compatibility  
 * - AES-256-CBC decryption
 * - Dynamic key generation
 * - Enhanced error handling และ validation
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * License data structure ที่ถอดรหัสได้จาก license.lic
 */
export interface LicenseData {
  organization: string;
  customer: string;
  application_name: string;
  expiry_date: string;
  hardware_binding: {
    mac_address: string;
  };
  network: {
    wifi_ssid: string;
    wifi_password: string;
  };
  issued_date: string;
  no_expiry?: boolean;
}

/**
 * License format types
 */
export type LicenseFormat = 'cli-json' | 'raw' | 'unknown';

/**
 * CLI JSON license structure จาก SMC License CLI (Dynamic Key v1.0)
 */
export interface CLILicenseWrapper {
  version: string;
  encrypted_data: string;
  algorithm: string;
  created_at: string;
  
  // Legacy v1.0: Dynamic key metadata (security vulnerability - MAC exposed)
  key_metadata?: {
    applicationId: string;
    customerId: string;
    wifiSsid: string;
    macAddress: string;
  };
  
  // HKDF v2.0: Secure key derivation context (no sensitive data)
  kdf_context?: {
    salt: string;      // Deterministic salt (Base64)
    info: string;      // Context info for HKDF (non-sensitive)
    algorithm: string; // 'hkdf-sha256'
  };
}

/**
 * HKDF Context สำหรับ key derivation
 */
export interface HKDFContext {
  salt: string;      // Base64 encoded deterministic salt
  info: string;      // Context information string
  algorithm: string; // HKDF algorithm (hkdf-sha256)
}

/**
 * License data structure สำหรับ HKDF v2.0
 */
export interface HKDFLicenseData {
  organization: string;
  customerId: string;
  applicationId: string;
  generatedAt: string;
  expiryDate: string;
  macAddress: string;
  wifiSsid: string;
  wifiPassword: string;
  version: string;
  checksum: string;
}

/**
 * License parser options
 */
export interface LicenseParserOptions {
  secretKey?: string;
  validateExpiry?: boolean;
  verbose?: boolean;
}

/**
 * License parser errors
 */
export class LicenseParserError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LicenseParserError';
  }
}

/**
 * Main license parser class
 */
export class LicenseParser {
  private secretKey: string;
  private verbose: boolean;

  constructor(options: LicenseParserOptions = {}) {
    // ใช้ SHARED_SECRET_KEY จาก .env หรือ default key
    this.secretKey = options.secretKey || 
      process.env.SHARED_SECRET_KEY || 
      'SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS';
      
    this.verbose = options.verbose || false;

    // Validate secret key length สำหรับ AES-256
    if (this.secretKey.length < 32) {
      throw new LicenseParserError(
        'Secret key must be at least 32 characters for AES-256',
        'INVALID_KEY_LENGTH'
      );
    }
  }

  /**
   * HKDF Key Derivation (RFC 5869 implementation)
   */
  private deriveHKDFKey(ikm: Buffer, salt: string, info: string, length: number = 32): Buffer {
    // HKDF-Extract: HMAC-SHA256(salt, ikm)
    const prk = crypto.createHmac('sha256', Buffer.from(salt, 'base64')).update(ikm).digest();
    
    // HKDF-Expand: HMAC-SHA256(prk, info + counter)
    const iterations = Math.ceil(length / 32); // SHA256 produces 32 bytes
    const chunks: Buffer[] = [];
    
    for (let i = 1; i <= iterations; i++) {
      const hmac = crypto.createHmac('sha256', prk);
      hmac.update(info);
      hmac.update(Buffer.from([i]));
      const chunk = hmac.digest();
      chunks.push(chunk);
    }
    
    // Concatenate all chunks and take only needed length
    const okm = Buffer.concat(chunks);
    return okm.slice(0, length);
  }

  /**
   * Parse HKDF v2.0 license
   */
  private parseHKDFLicense(licenseWrapper: CLILicenseWrapper, sensitiveData: {
    macAddress: string;
    wifiSsid: string;
  }): HKDFLicenseData {
    if (!licenseWrapper.kdf_context) {
      throw new LicenseParserError('Missing KDF context for HKDF v2.0 license', 'MISSING_KDF_CONTEXT');
    }
    
    const { salt, info, algorithm } = licenseWrapper.kdf_context;
    
    if (algorithm !== 'hkdf-sha256') {
      throw new LicenseParserError(`Unsupported KDF algorithm: ${algorithm}`, 'UNSUPPORTED_KDF');
    }
    
    // สร้าง IKM (Input Keying Material) จาก sensitive data (ต้องตรงกับ CLI)
    // CLI pattern: applicationId_customerId_wifiSsid_macAddress_expiryDate
    // CLI info format: "SMC_LICENSE_KDF_v1.0|applicationId|customerId|expiryDate|version"
    const infoComponents = info.split('|');
    if (infoComponents.length < 5) {
      throw new LicenseParserError(`Invalid KDF info format, expected 5 components, got ${infoComponents.length}`, 'INVALID_KDF_INFO');
    }
    
    const applicationId = infoComponents[1]; 
    const customerId = infoComponents[2];
    const expiryDate = infoComponents[3];
    // infoComponents[4] is version, not needed for IKM
    
    // Match CLI IKM pattern exactly
    const ikm_parts = [
      applicationId,
      customerId,
      sensitiveData.wifiSsid,
      sensitiveData.macAddress,
      expiryDate
    ];
    
    const ikmString = ikm_parts.join('_');
    const ikm = Buffer.from(ikmString, 'utf8');
    
    // Derive key using HKDF
    const derivedKey = this.deriveHKDFKey(ikm, salt, info, 32);
    
    if (this.verbose) {
      console.log('info: HKDF key derivation successful');
      console.log(`info: Key preview: ${derivedKey.toString('hex').substring(0, 8)}...`);
    }
    
    // Decrypt license data
    return this.decryptHKDFLicenseData(licenseWrapper.encrypted_data, derivedKey);
  }

  /**
   * Decrypt HKDF license data
   */
  private decryptHKDFLicenseData(encryptedData: string, key: Buffer): HKDFLicenseData {
    try {
      // CLI format: Base64 → UTF8 → split by ':' → IV:encryptedHex
      const hexData = Buffer.from(encryptedData, 'base64').toString('utf8');
      
      // แยก IV กับ encrypted data (format: "ivHex:encryptedHex")
      const parts = hexData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format - expected IV:encryptedData');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedHex = parts[1];
      
      if (this.verbose) {
        console.log(`info: IV length: ${iv.length} bytes`);
        console.log(`info: Encrypted data length: ${encryptedHex.length} characters`);
      }
      
      // Decrypt using AES-256-CBC (CLI pattern: hex input, utf8 output)
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Parse JSON
      const licenseData = JSON.parse(decrypted) as HKDFLicenseData;
      
      if (this.verbose) {
        console.log('info: HKDF license data decrypted successfully');
        console.log(`info: Organization: ${licenseData.organization}`);
        console.log(`info: Customer: ${licenseData.customerId}`);
        console.log(`info: Expiry: ${licenseData.expiryDate}`);
      }
      
      return licenseData;
      
    } catch (error: any) {
      throw new LicenseParserError(
        `HKDF decryption failed: ${error.message}`,
        'HKDF_DECRYPT_ERROR'
      );
    }
  }

  /**
   * Convert HKDF license data to legacy format
   */
  private convertHKDFToLegacy(hkdfData: HKDFLicenseData): LicenseData {
    return {
      organization: hkdfData.organization,
      customer: hkdfData.customerId,
      application_name: hkdfData.applicationId,
      expiry_date: hkdfData.expiryDate,
      hardware_binding: {
        mac_address: hkdfData.macAddress
      },
      network: {
        wifi_ssid: hkdfData.wifiSsid,
        wifi_password: hkdfData.wifiPassword
      },
      issued_date: hkdfData.generatedAt,
      no_expiry: hkdfData.expiryDate === '2099-12-31'
    };
  }

  /**
   * Enhanced license file parser with HKDF v2.0 support
   */
  public async parseLicenseFile(filePath: string, sensitiveData?: {
    macAddress: string;
    wifiSsid: string;
  }): Promise<LicenseData> {
    try {
      if (this.verbose) {
        console.log(`info: Reading license file: ${filePath}`);
      }

      // ตรวจสอบว่าไฟล์มีอยู่จริง
      if (!fs.existsSync(filePath)) {
        throw new LicenseParserError(
          `License file not found: ${filePath}`,
          'FILE_NOT_FOUND'
        );
      }

      // อ่านไฟล์ license (encrypted content)
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      if (this.verbose) {
        console.log('info: License file loaded, detecting format...');
      }

      // Detect license format และ version
      const licenseFormat = this.detectLicenseFormat(fileContent);
      
      if (licenseFormat === 'cli-json') {
        try {
          const cliWrapper = JSON.parse(fileContent) as CLILicenseWrapper;
          
          // ตรวจสอบ HKDF v2.0 format
          if (cliWrapper.kdf_context) {
            if (this.verbose) {
              console.log('info: HKDF v2.0 license detected');
              console.log(`info: Version: ${cliWrapper.version}`);
              console.log(`info: KDF Algorithm: ${cliWrapper.kdf_context.algorithm}`);
            }
            
            // ต้องมี sensitive data สำหรับ HKDF
            if (!sensitiveData) {
              throw new LicenseParserError(
                'HKDF v2.0 license requires MAC address and WiFi SSID for key derivation',
                'MISSING_SENSITIVE_DATA'
              );
            }
            
            // Parse HKDF license
            const hkdfData = this.parseHKDFLicense(cliWrapper, sensitiveData);
            const licenseData = this.convertHKDFToLegacy(hkdfData);
            
            if (this.verbose) {
              console.log('info: HKDF v2.0 license parsed successfully');
              console.log(`info: Organization: ${licenseData.organization}`);
              console.log(`info: Customer: ${licenseData.customer}`);
              console.log(`info: Expiry: ${licenseData.expiry_date}`);
            }
            
            return licenseData;
          }
          
          // Legacy v1.0 with key_metadata
          else if (cliWrapper.key_metadata) {
            if (this.verbose) {
              console.log('info: Legacy v1.0 license with dynamic key detected');
              console.log(`info: Application: ${cliWrapper.key_metadata.applicationId}`);
              console.log(`info: Customer: ${cliWrapper.key_metadata.customerId}`);
            }
            
            // Use legacy dynamic key approach
            const encryptedContent = this.normalizeEncryptedContent(fileContent, licenseFormat);
            const decryptedData = this.decryptLicense(encryptedContent, cliWrapper.key_metadata);
            const licenseData = this.validateLicenseData(decryptedData);
            
            if (this.verbose) {
              console.log('info: Legacy dynamic key license parsed successfully');
            }
            
            return licenseData;
          }
          
          // Unknown CLI format
          else {
            if (this.verbose) {
              console.log('info: Unknown CLI JSON format - attempting legacy parsing');
            }
            
            // Fallback to legacy approach
            const encryptedContent = this.normalizeEncryptedContent(fileContent, licenseFormat);
            const decryptedData = this.decryptLicense(encryptedContent);
            return this.validateLicenseData(decryptedData);
          }
          
        } catch (error: any) {
          if (error instanceof LicenseParserError) {
            throw error;
          }
          
          // JSON parsing error - fallback to legacy
          if (this.verbose) {
            console.log(`info: JSON parsing failed: ${error.message} - trying legacy approach`);
          }
        }
      }
      
      // Legacy raw format or fallback
      if (this.verbose) {
        console.log('info: Using legacy license format');
        console.log('info: Attempting decryption with shared secret key...');
      }
      
      const encryptedContent = this.normalizeEncryptedContent(fileContent, licenseFormat);
      const decryptedData = this.decryptLicense(encryptedContent);
      const licenseData = this.validateLicenseData(decryptedData);
      
      if (this.verbose) {
        console.log('info: License decryption successful');
        console.log(`info: Organization: ${licenseData.organization}`);
        console.log(`info: Customer: ${licenseData.customer}`);
        console.log(`info: Expiry: ${licenseData.expiry_date}`);
      }

      return licenseData;

    } catch (error: any) {
      if (error instanceof LicenseParserError) {
        throw error;
      }
      
      // Wrap other errors
      throw new LicenseParserError(
        `Failed to parse license: ${error.message}`,
        'PARSE_FAILED'
      );
    }
  }

  /**
   * ตรวจสอบ format ของ license file
   */
  private detectLicenseFormat(content: string): LicenseFormat {
    const trimmedContent = content.trim();
    
    // ตรวจสอบว่าเป็น JSON format หรือไม่
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmedContent);
        // ตรวจสอบว่ามี fields ที่จำเป็นสำหรับ CLI format
        if (parsed.version && parsed.encrypted_data && parsed.algorithm) {
          return 'cli-json';
        }
      } catch (error) {
        // ไม่ใช่ valid JSON
      }
    }
    
    // ตรวจสอบว่าเป็น raw format (iv:encryptedData)
    if (trimmedContent.includes(':') && !trimmedContent.includes('{')) {
      const parts = trimmedContent.split(':');
      if (parts.length === 2 && parts[0].length === 32 && parts[1].length > 0) {
        return 'raw';
      }
    }
    
    return 'unknown';
  }

  /**
   * แปลง license content เป็น standard format (iv:encryptedData)
   */
  private normalizeEncryptedContent(content: string, format: LicenseFormat): string {
    switch (format) {
      case 'cli-json':
        return this.convertCLIFormatToRaw(content);
      
      case 'raw':
        return content.trim();
      
      default:
        throw new LicenseParserError(
          `Unsupported license format: ${format}. Supported formats: CLI JSON wrapper, raw iv:encryptedData`,
          'UNSUPPORTED_FORMAT'
        );
    }
  }

  /**
   * แปลง CLI JSON format เป็น raw format
   */
  private convertCLIFormatToRaw(jsonContent: string): string {
    try {
      const cliLicense: CLILicenseWrapper = JSON.parse(jsonContent);
      
      // Validate required fields
      if (!cliLicense.encrypted_data) {
        throw new Error('Missing encrypted_data field in CLI license');
      }
      
      if (cliLicense.algorithm !== 'aes-256-cbc') {
        throw new Error(`Unsupported encryption algorithm: ${cliLicense.algorithm}`);
      }
      
      if (this.verbose) {
        console.log(`info: CLI license version: ${cliLicense.version}`);
        console.log(`info: Created at: ${cliLicense.created_at}`);
      }
      
      // CLI format เก็บ "iv:encryptedData" string ใน base64
      const base64Data = cliLicense.encrypted_data;
      const rawFormat = Buffer.from(base64Data, 'base64').toString('utf8');
      
      // Validate ว่าได้ format ที่ถูกต้อง
      if (!rawFormat.includes(':') || rawFormat.split(':').length !== 2) {
        throw new Error('Invalid CLI license format: Expected iv:encryptedData inside base64');
      }
      
      if (this.verbose) {
        console.log('info: Successfully extracted iv:encryptedData from CLI JSON base64');
        console.log(`info: Raw format: ${rawFormat.substring(0, 50)}...`);
      }
      
      return rawFormat;
      
    } catch (error: any) {
      throw new LicenseParserError(
        `Failed to convert CLI JSON format: ${error.message}`,
        'CLI_FORMAT_CONVERSION_FAILED'
      );
    }
  }

  /**
   * สร้าง Dynamic Key จาก key metadata
   */
  private generateDynamicKey(keyMetadata: {
    applicationId: string;
    customerId: string;
    wifiSsid: string;
    macAddress: string;
  }): string {
    const keyComponents = `${keyMetadata.applicationId}_${keyMetadata.customerId}_${keyMetadata.wifiSsid}_${keyMetadata.macAddress}`;
    
    if (this.verbose) {
      console.log(`info: Generating dynamic key from components`);
      console.log(`info: Key components: ${keyComponents.substring(0, 50)}...`);
    }
    
    const dynamicKey = crypto.createHash('sha256').update(keyComponents).digest('hex').slice(0, 32);
    
    if (this.verbose) {
      console.log(`info: Dynamic key generated: ${dynamicKey.substring(0, 8)}...`);
    }
    
    return dynamicKey;
  }

  /**
   * ถอดรหัส AES-256-CBC encrypted license content (รองรับ Dynamic Key)
   */
  private decryptLicense(encryptedContent: string, keyMetadata?: {
    applicationId: string;
    customerId: string;
    wifiSsid: string;
    macAddress: string;
  }): string {
    try {
      // Parse encrypted data format: iv:encryptedData
      const parts = encryptedContent.trim().split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted format. Expected: iv:encryptedData');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = Buffer.from(parts[1], 'hex');

      if (this.verbose) {
        console.log(`info: IV length: ${iv.length}, Expected: 16`);
        console.log(`info: Encrypted data length: ${encryptedData.length}`);
        console.log(`info: Secret key length: ${this.secretKey.length}`);
      }

      // Try multiple key derivation methods (Dynamic Key + Legacy)
      const keyVariants: string[] = [];
      
      // ถ้ามี key metadata ใช้ Dynamic Key
      if (keyMetadata) {
        const dynamicKey = this.generateDynamicKey(keyMetadata);
        keyVariants.push(dynamicKey);
        
        if (this.verbose) {
          console.log('info: Using Dynamic Key approach (new format)');
        }
      }
      
      // Legacy shared key variants (สำหรับ backward compatibility)
      keyVariants.push(
        this.secretKey.slice(0, 32),                           // First 32 chars
        this.secretKey.substring(0, 32),                       // Alternative slice
        Buffer.from(this.secretKey, 'utf8').slice(0, 32).toString(),     // UTF8 buffer slice
        crypto.createHash('sha256').update(this.secretKey).digest('hex').slice(0, 32) // SHA256 hash
      );
      
      if (this.verbose && !keyMetadata) {
        console.log('info: Using Legacy Shared Key approach (old format)');
      }

      for (let i = 0; i < keyVariants.length; i++) {
        try {
          const key = keyVariants[i];
          
          if (this.verbose && i > 0) {
            console.log(`info: Trying key variant ${i + 1}...`);
          }
          
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          decipher.setAutoPadding(true);
          
          let decrypted = decipher.update(encryptedData);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          
          const decryptedText = decrypted.toString('utf8');
          
          // Validate it's valid JSON
          const parsedData = JSON.parse(decryptedText);
          
          if (this.verbose) {
            console.log(`info: AES-256-CBC decryption successful with key variant ${i + 1}`);
            console.log(`info: Decrypted data keys: ${Object.keys(parsedData).join(', ')}`);
          }
          
          return decryptedText;
          
        } catch (keyError: any) {
          // Try next key variant
          if (this.verbose && i === keyVariants.length - 1) {
            console.log(`info: Key variant ${i + 1} failed: ${keyError.message}`);
          }
          continue;
        }
      }

      throw new Error('All key variants failed - license may be corrupted or use different encryption');

    } catch (error: any) {
      // Enhanced error details for debugging
      const errorDetails = {
        message: error.message,
        secretKeyLength: this.secretKey?.length || 0,
        encryptedContentPreview: encryptedContent.substring(0, 100)
      };
      
      if (this.verbose) {
        console.log('error: All decryption attempts failed:', errorDetails);
      }
      
      throw new LicenseParserError(
        `License decryption failed: ${error.message}. Tried multiple key variants - this may indicate wrong secret key, different CLI version, or corrupted license data.`,
        'DECRYPTION_FAILED'
      );
    }
  }

  /**
   * Validate และ parse license JSON data
   */
  private validateLicenseData(jsonString: string): LicenseData {
    try {
      const data = JSON.parse(jsonString);

      if (this.verbose) {
        console.log('info: Validating license data structure...');
        console.log(`info: Available fields: ${Object.keys(data).join(', ')}`);
      }

      // Support both CLI format และ legacy format
      const organization = data.organization;
      const customer = data.customer || data.customerId;
      const application_name = data.application_name || data.applicationId;
      const expiry_date = data.expiry_date || data.expiryDate;
      const mac_address = data.hardware_binding?.mac_address || data.macAddress;
      const wifi_ssid = data.network?.wifi_ssid || data.wifiSsid;
      const wifi_password = data.network?.wifi_password || data.wifiPassword || '';

      // ตรวจสอบ required fields
      const requiredData = {
        organization,
        customer,
        application_name,
        expiry_date,
        mac_address
      };

      const missingFields = Object.entries(requiredData)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Handle no expiry licenses (expiry_date = "2099-12-31")
      const noExpiry = expiry_date === '2099-12-31';
      
      // สร้าง LicenseData object with normalized structure
      const licenseData: LicenseData = {
        organization,
        customer,
        application_name,
        expiry_date,
        hardware_binding: {
          mac_address
        },
        network: {
          wifi_ssid: wifi_ssid || 'UNKNOWN_SSID',
          wifi_password
        },
        issued_date: data.issued_date || data.generatedAt || new Date().toISOString(),
        no_expiry: noExpiry
      };

      if (this.verbose) {
        console.log('info: License validation successful');
        console.log(`info: Normalized - Organization: ${licenseData.organization}`);
        console.log(`info: Normalized - Customer: ${licenseData.customer}`);
        console.log(`info: Normalized - Expiry: ${licenseData.expiry_date}`);
      }

      return licenseData;

    } catch (error: any) {
      throw new LicenseParserError(
        `License validation failed: ${error.message}`,
        'VALIDATION_FAILED'
      );
    }
  }

  /**
   * ตรวจสอบว่า license หมดอายุหรือยัง
   */
  public isLicenseExpired(licenseData: LicenseData): boolean {
    // ถ้าเป็น no expiry license
    if (licenseData.no_expiry || licenseData.expiry_date === '2099-12-31') {
      return false;
    }

    const expiryDate = new Date(licenseData.expiry_date);
    const currentDate = new Date();
    
    return currentDate > expiryDate;
  }

  /**
   * สร้าง summary ข้อมูล license สำหรับ logging
   */
  public getLicenseSummary(licenseData: LicenseData): string {
    const expiryStatus = licenseData.no_expiry 
      ? 'No expiry (permanent)' 
      : `Expires: ${licenseData.expiry_date}`;
      
    return `${licenseData.organization} | ${licenseData.customer} | ${expiryStatus}`;
  }
}

/**
 * Utility function สำหรับ quick license parsing
 */
export async function parseLicense(
  filePath: string, 
  options: LicenseParserOptions = {}
): Promise<LicenseData> {
  const parser = new LicenseParser(options);
  return await parser.parseLicenseFile(filePath);
}

/**
 * Utility function สำหรับตรวจสอบว่า license file valid หรือไม่
 */
export async function validateLicenseFile(filePath: string): Promise<boolean> {
  try {
    await parseLicense(filePath);
    return true;
  } catch (error) {
    return false;
  }
}