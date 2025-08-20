import crypto from 'crypto';
import chalk from 'chalk';
import { LicenseData, LicenseFile, EncryptionConfig, WiFiPasswordValidation } from '../types';

/**
 * Encryption Module for SMC License System
 * 
 * ใช้ AES-256-CBC สำหรับเข้ารหัส license data
 * แทนที่ Base64 encoding ที่ไม่ปลอดภัยในระบบเดิม
 */

// Shared secret key สำหรับ encrypt/decrypt
// ในการใช้งานจริง key นี้ต้องถูกเก็บอย่างปลอดภัย
const SHARED_SECRET_KEY = 'SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS';

// Pre-computed key สำหรับ performance optimization
const PRECOMPUTED_KEY = crypto.createHash('sha256').update(SHARED_SECRET_KEY).digest('hex').slice(0, 32);

// Encryption configuration
const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-cbc',
  key: PRECOMPUTED_KEY, // ใช้ pre-computed key แทนการ hash ทุกครั้ง
  iv_length: 16 // 16 bytes IV for AES
};

/**
 * สร้าง IV (Initialization Vector) สำหรับ AES encryption
 */
function generateIV(): Buffer {
  return crypto.randomBytes(ENCRYPTION_CONFIG.iv_length);
}

/**
 * เข้ารหัสข้อมูล license ด้วย AES-256-CBC
 * 
 * @param data - License data object
 * @returns Encrypted string (Base64)
 */
export function encryptLicenseData(data: LicenseData): string {
  try {
    console.log(chalk.blue('🔐 Encrypting license data...'));
    
    // Convert license data เป็น JSON string (compact format สำหรับ performance)
    const jsonString = JSON.stringify(data, null, 0);
    console.log(chalk.gray(`   Data size: ${jsonString.length} bytes`));
    
    // Generate random IV
    const iv = generateIV();
    
    // สร้าง cipher ด้วย createCipheriv (แทนที่ deprecated createCipher)
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, ENCRYPTION_CONFIG.key, iv);
    
    // เข้ารหัสข้อมูล
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // รวม IV กับ encrypted data (IV:ENCRYPTED_DATA)
    const result = iv.toString('hex') + ':' + encrypted;
    
    console.log(chalk.green(`   ✅ Encryption successful`));
    console.log(chalk.gray(`   Encrypted size: ${result.length} characters`));
    
    return Buffer.from(result).toString('base64'); // Convert เป็น Base64 เพื่อความสะดวกในการจัดเก็บ
    
  } catch (error: any) {
    console.log(chalk.red(`   ❌ Encryption failed: ${error.message}`));
    throw new Error(`License encryption failed: ${error.message}`);
  }
}

/**
 * ถอดรหัสข้อมูล license ด้วย AES-256-CBC
 * 
 * @param encryptedData - Encrypted string (Base64)
 * @returns License data object
 */
export function decryptLicenseData(encryptedData: string): LicenseData {
  try {
    console.log(chalk.blue('🔓 Decrypting license data...'));
    
    // Decode จาก Base64
    const hexData = Buffer.from(encryptedData, 'base64').toString('utf8');
    
    // แยก IV กับ encrypted data
    const parts = hexData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    console.log(chalk.gray(`   IV length: ${iv.length} bytes`));
    console.log(chalk.gray(`   Data length: ${encrypted.length} characters`));
    
    // สร้าง decipher ด้วย createDecipheriv (แทนที่ deprecated createDecipher)
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, ENCRYPTION_CONFIG.key, iv);
    
    // ถอดรหัสข้อมูล
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON
    const licenseData = JSON.parse(decrypted);
    
    console.log(chalk.green(`   ✅ Decryption successful`));
    console.log(chalk.gray(`   Organization: ${licenseData.organization}`));
    
    return licenseData as LicenseData;
    
  } catch (error: any) {
    console.log(chalk.red(`   ❌ Decryption failed: ${error.message}`));
    throw new Error(`License decryption failed: ${error.message}`);
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
  },
  macAddress: string,
  wifiCredentials: {
    ssid: string;
    password: string;
  }
): LicenseData {
  
  console.log(chalk.blue('📝 Creating license data structure...'));
  
  // Validate expiry date format (YYYY-MM-DD)
  const expiryRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!expiryRegex.test(options.expiry)) {
    throw new Error('Invalid expiry date format. Use YYYY-MM-DD');
  }
  
  // ตรวจสอบว่าวันหมดอายุไม่ใช่อดีต
  const expiryDate = new Date(options.expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to beginning of day
  
  if (expiryDate < today) {
    throw new Error('Expiry date cannot be in the past');
  }
  
  // สร้าง license data
  const licenseData: LicenseData = {
    organization: options.org.trim(),
    customerId: options.customer.trim(),
    applicationId: options.app.trim(),
    generatedAt: new Date().toISOString(),
    expiryDate: options.expiry,
    macAddress: macAddress.toUpperCase(), // Normalize MAC address เป็นตัวใหญ่
    wifiSsid: wifiCredentials.ssid.trim(),
    wifiPassword: wifiCredentials.password,
    version: '1.0.0',
    checksum: '' // จะถูกสร้างหลังจากนี้
  };
  
  // สร้าง checksum สำหรับ verification (รวม WiFi data)
  const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}${licenseData.wifiSsid}`;
  licenseData.checksum = crypto.createHash('sha256').update(checksumData).digest('hex').slice(0, 16);
  
  console.log(chalk.green('   ✅ License data created'));
  console.log(chalk.gray(`   Organization: ${licenseData.organization}`));
  console.log(chalk.gray(`   Customer ID: ${licenseData.customerId}`));
  console.log(chalk.gray(`   Application: ${licenseData.applicationId}`));
  console.log(chalk.gray(`   Expiry: ${licenseData.expiryDate}`));
  console.log(chalk.gray(`   MAC Address: ${licenseData.macAddress}`));
  console.log(chalk.gray(`   WiFi SSID: ${licenseData.wifiSsid}`));
  console.log(chalk.gray(`   WiFi Password: ${'*'.repeat(licenseData.wifiPassword.length)}`)); // ซ่อน password
  console.log(chalk.gray(`   Checksum: ${licenseData.checksum}`));
  
  return licenseData;
}

/**
 * สร้าง license file structure สำหรับบันทึกลงไฟล์
 * 
 * @param licenseData - License data object
 * @returns LicenseFile object
 */
export function createLicenseFile(licenseData: LicenseData): LicenseFile {
  console.log(chalk.blue('📄 Creating license file structure...'));
  
  // เข้ารหัส license data
  const encryptedData = encryptLicenseData(licenseData);
  
  // สร้าง license file structure
  const licenseFile: LicenseFile = {
    version: '1.0.0',
    encrypted_data: encryptedData,
    algorithm: ENCRYPTION_CONFIG.algorithm,
    created_at: new Date().toISOString()
  };
  
  console.log(chalk.green('   ✅ License file structure created'));
  console.log(chalk.gray(`   Format version: ${licenseFile.version}`));
  console.log(chalk.gray(`   Algorithm: ${licenseFile.algorithm}`));
  console.log(chalk.gray(`   Created at: ${licenseFile.created_at}`));
  
  return licenseFile;
}

/**
 * อ่านและ parse license file
 * 
 * @param licenseFileContent - License file content (JSON string)
 * @returns LicenseData object
 */
export function parseLicenseFile(licenseFileContent: string): LicenseData {
  try {
    console.log(chalk.blue('📖 Parsing license file...'));
    
    // Parse JSON
    const licenseFile = JSON.parse(licenseFileContent) as LicenseFile;
    
    // ตรวจสอบ version compatibility
    if (licenseFile.version !== '1.0.0') {
      console.log(chalk.yellow(`   ⚠️  Warning: License file version ${licenseFile.version} may not be compatible`));
    }
    
    // ตรวจสอบ algorithm
    if (licenseFile.algorithm !== ENCRYPTION_CONFIG.algorithm) {
      throw new Error(`Unsupported encryption algorithm: ${licenseFile.algorithm}`);
    }
    
    console.log(chalk.gray(`   File version: ${licenseFile.version}`));
    console.log(chalk.gray(`   Algorithm: ${licenseFile.algorithm}`));
    console.log(chalk.gray(`   Created: ${licenseFile.created_at}`));
    
    // ถอดรหัส license data
    const licenseData = decryptLicenseData(licenseFile.encrypted_data);
    
    console.log(chalk.green('   ✅ License file parsed successfully'));
    
    return licenseData;
    
  } catch (error: any) {
    console.log(chalk.red(`   ❌ License file parsing failed: ${error.message}`));
    throw new Error(`Invalid license file: ${error.message}`);
  }
}

/**
 * ตรวจสอบความถูกต้องของ license data
 * 
 * @param licenseData - License data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateLicenseData(licenseData: LicenseData): boolean {
  console.log(chalk.blue('✅ Validating license data...'));
  
  // ตรวจสอบ required fields (รวม WiFi credentials)
  const requiredFields = ['organization', 'customerId', 'applicationId', 'expiryDate', 'macAddress', 'wifiSsid', 'wifiPassword'];
  for (const field of requiredFields) {
    if (!licenseData[field as keyof LicenseData]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // ตรวจสอบ expiry date
  const expiryDate = new Date(licenseData.expiryDate);
  const today = new Date();
  
  if (expiryDate < today) {
    throw new Error('License has expired');
  }
  
  // ตรวจสอบ checksum ถ้ามี (รวม WiFi SSID)
  if (licenseData.checksum) {
    const checksumData = `${licenseData.organization}${licenseData.customerId}${licenseData.applicationId}${licenseData.expiryDate}${licenseData.macAddress}${licenseData.wifiSsid}`;
    const expectedChecksum = crypto.createHash('sha256').update(checksumData).digest('hex').slice(0, 16);
    
    if (licenseData.checksum !== expectedChecksum) {
      throw new Error('License data integrity check failed');
    }
  }
  
  console.log(chalk.green('   ✅ License data validation passed'));
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
export function validateWiFiPassword(password: string, bypassCheck: boolean = false): WiFiPasswordValidation {
  const result: WiFiPasswordValidation = {
    isValid: true,
    strength: 'medium',
    errors: [],
    warnings: []
  };

  // ถ้า bypass ให้ผ่านทุกอย่าง แต่ยังแสดง warning
  if (bypassCheck) {
    console.log(chalk.yellow('⚠️  Password validation bypassed for development'));
    result.warnings.push('Password validation bypassed - use strong passwords in production');
    return result;
  }

  // ตรวจสอบความยาว
  if (password.length < 8) {
    result.errors.push('Password must be at least 8 characters long');
    result.isValid = false;
  }

  if (password.length < 12) {
    result.warnings.push('Consider using passwords longer than 12 characters');
  }

  // ตรวจสอบ complexity
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const complexityScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  if (complexityScore < 2) {
    result.errors.push('Password must contain at least 2 types: lowercase, uppercase, numbers, special characters');
    result.isValid = false;
  }

  // กำหนด strength
  if (complexityScore >= 4 && password.length >= 12) {
    result.strength = 'strong';
  } else if (complexityScore >= 3 && password.length >= 8) {
    result.strength = 'medium';
  } else {
    result.strength = 'weak';
  }

  // ตรวจสอบ common weak passwords
  const weakPasswords = ['password', '123456', 'wifi123', 'admin123', 'smc123'];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    result.warnings.push('Avoid using common password patterns');
    result.strength = 'weak';
  }

  return result;
}