import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { GenerateOptions } from '../types';
import { getESP32MacAddress } from './esp32';
import { 
  createLicenseData, 
  createLicenseFile, 
  encryptLicenseData,
  validateLicenseData 
} from './encryption';

/**
 * License Generation Module
 * 
 * รวบรวม ESP32 communication และ encryption
 * เพื่อสร้าง license file แบบครบครัน
 */

/**
 * สร้าง license file สมบูรณ์
 * 
 * @param options - Generation options from CLI
 * @returns Path to generated license file
 */
export async function generateLicenseFile(options: GenerateOptions): Promise<string> {
  try {
    console.log(chalk.blue('\n🚀 Starting license generation process...'));
    console.log(chalk.gray('====================================='));
    
    // Step 1: ดึง MAC address จาก ESP32
    console.log(chalk.cyan('\n📡 Step 1: Connecting to ESP32...'));
    const esp32Response = await getESP32MacAddress(options.esp32Ip);
    
    if (esp32Response.status !== 'success') {
      throw new Error('Failed to retrieve MAC address from ESP32');
    }
    
    const macAddress = esp32Response.mac;
    console.log(chalk.green(`✅ MAC address retrieved: ${macAddress}`));
    
    // Step 2: สร้าง license data structure
    console.log(chalk.cyan('\n📝 Step 2: Creating license data...'));
    const licenseData = createLicenseData({
      org: options.org,
      customer: options.customer,
      app: options.app,
      expiry: options.expiry
    }, macAddress);
    
    // Step 3: Validate license data
    console.log(chalk.cyan('\n✅ Step 3: Validating license data...'));
    validateLicenseData(licenseData);
    
    // Step 4: สร้าง license file structure และเข้ารหัส
    console.log(chalk.cyan('\n🔐 Step 4: Creating encrypted license file...'));
    const licenseFile = createLicenseFile(licenseData);
    
    // Step 5: บันทึก license file
    console.log(chalk.cyan('\n💾 Step 5: Saving license file...'));
    
    // สร้าง filename ถ้าไม่ได้ระบุ extension
    let filename = options.output;
    if (!filename.endsWith('.lic')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.lic'; // แทนที่ extension หรือเพิ่ม .lic
    }
    
    // สร้าง absolute path
    const outputPath = path.resolve(process.cwd(), filename);
    
    // บันทึกเป็น JSON format
    const licenseFileContent = JSON.stringify(licenseFile, null, 2);
    await fs.writeFile(outputPath, licenseFileContent, 'utf8');
    
    console.log(chalk.green(`✅ License file saved: ${outputPath}`));
    console.log(chalk.gray(`   File size: ${licenseFileContent.length} bytes`));
    
    // Step 6: แสดงสรุปผลลัพธ์
    console.log(chalk.blue('\n📊 License Generation Summary:'));
    console.log(chalk.gray('====================================='));
    console.log(chalk.white(`Organization:     ${licenseData.organization}`));
    console.log(chalk.white(`Customer ID:      ${licenseData.customerId}`));
    console.log(chalk.white(`Application ID:   ${licenseData.applicationId}`));
    console.log(chalk.white(`MAC Address:      ${licenseData.macAddress}`));
    console.log(chalk.white(`Generated At:     ${licenseData.generatedAt}`));
    console.log(chalk.white(`Expires On:       ${licenseData.expiryDate}`));
    console.log(chalk.white(`Checksum:         ${licenseData.checksum}`));
    console.log(chalk.white(`Output File:      ${outputPath}`));
    console.log(chalk.white(`Encryption:       AES-256-CBC`));
    
    // คำนวณจำนวนวันที่เหลือ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    console.log(chalk.white(`Days Until Expiry: ${daysUntilExpiry} days`));
    
    // Step 7: แสดง Shared Key Information สำหรับ Application Setup
    console.log(chalk.blue('\n🔑 Application Setup Information:'));
    console.log(chalk.gray('====================================='));
    console.log(chalk.white('Add this to your application .env file:'));
    console.log(chalk.green(`SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS`));
    
    console.log(chalk.white('\n📝 Quick Commands:'));
    console.log(chalk.cyan(`echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" >> .env`));
    console.log(chalk.gray(`# Copy license file: cp ${path.basename(outputPath)} /path/to/your/app/`));
    
    console.log(chalk.yellow('\n⚠️  Security Notes:'));
    console.log(chalk.gray('• Keep the SHARED_SECRET_KEY confidential'));
    console.log(chalk.gray('• Never commit .env files to version control'));
    console.log(chalk.gray('• Both license.lic and .env are required for activation'));
    
    console.log(chalk.green('\n🎉 License generation completed successfully!'));
    
    return outputPath;
    
  } catch (error: any) {
    console.log(chalk.red('\n❌ License generation failed:'));
    console.log(chalk.red(`Error: ${error.message}`));
    
    // Troubleshooting suggestions
    console.log(chalk.yellow('\n🔧 Troubleshooting:'));
    console.log(chalk.gray('1. Ensure ESP32 is accessible and /mac endpoint is working'));
    console.log(chalk.gray('2. Check that expiry date is in YYYY-MM-DD format and in the future'));
    console.log(chalk.gray('3. Verify write permissions for output directory'));
    console.log(chalk.gray('4. Make sure all required parameters are provided'));
    
    throw error;
  }
}

/**
 * สร้าง sample license file สำหรับทดสอบ (ไม่ต้องใช้ ESP32 จริง)
 * 
 * @param options - Generation options
 * @param mockMacAddress - Mock MAC address สำหรับทดสอบ
 * @returns Path to generated license file
 */
export async function generateSampleLicenseFile(
  options: GenerateOptions, 
  mockMacAddress: string = 'AA:BB:CC:DD:EE:FF'
): Promise<string> {
  
  try {
    console.log(chalk.blue('\n🧪 Generating sample license file (without ESP32)...'));
    console.log(chalk.yellow('⚠️  This is a test license with mock MAC address'));
    console.log(chalk.gray('====================================='));
    
    // สร้าง license data ด้วย mock MAC
    console.log(chalk.cyan('\n📝 Creating license data with mock MAC...'));
    const licenseData = createLicenseData({
      org: options.org,
      customer: options.customer,
      app: `${options.app}_TEST`, // เพิ่ม _TEST ก่อนสร้าง checksum
      expiry: options.expiry
    }, mockMacAddress);
    
    // Validate และสร้างไฟล์
    validateLicenseData(licenseData);
    const licenseFile = createLicenseFile(licenseData);
    
    // สร้าง test filename
    let filename = options.output;
    if (!filename.endsWith('.lic')) {
      filename = filename.replace(/\.[^.]+$/, '') + '.lic';
    }
    
    // เพิ่ม _test suffix
    const testFilename = filename.replace('.lic', '_test.lic');
    const outputPath = path.resolve(process.cwd(), testFilename);
    
    // บันทึกไฟล์
    const licenseFileContent = JSON.stringify(licenseFile, null, 2);
    await fs.writeFile(outputPath, licenseFileContent, 'utf8');
    
    console.log(chalk.green(`✅ Sample license file saved: ${outputPath}`));
    console.log(chalk.yellow(`⚠️  This license uses mock MAC address: ${mockMacAddress}`));
    
    // แสดง Shared Key Information สำหรับ Application Setup
    console.log(chalk.blue('\n🔑 Application Setup Information:'));
    console.log(chalk.gray('====================================='));
    console.log(chalk.white('Add this to your application .env file:'));
    console.log(chalk.green(`SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS`));
    
    console.log(chalk.white('\n📝 Quick Commands:'));
    console.log(chalk.cyan(`echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" >> .env`));
    console.log(chalk.gray(`# Copy test license: cp ${path.basename(outputPath)} /path/to/your/app/license.lic`));
    
    console.log(chalk.yellow('\n⚠️  Test Mode Reminder:'));
    console.log(chalk.gray('• This uses mock MAC address for testing'));
    console.log(chalk.gray('• Use without --test-mode for production'));
    
    return outputPath;
    
  } catch (error: any) {
    console.log(chalk.red('\n❌ Sample license generation failed:'));
    console.log(chalk.red(`Error: ${error.message}`));
    throw error;
  }
}

/**
 * แสดงข้อมูล license file ในรูปแบบที่อ่านง่าย
 * 
 * @param filePath - Path to license file
 */
export async function displayLicenseInfo(filePath: string): Promise<void> {
  try {
    console.log(chalk.blue(`\n📄 License File Information: ${path.basename(filePath)}`));
    console.log(chalk.gray('====================================='));
    
    // อ่านไฟล์
    const fileContent = await fs.readFile(filePath, 'utf8');
    const licenseFile = JSON.parse(fileContent);
    
    // แสดงข้อมูล file structure
    console.log(chalk.cyan('📋 File Structure:'));
    console.log(chalk.white(`   Format Version: ${licenseFile.version}`));
    console.log(chalk.white(`   Algorithm: ${licenseFile.algorithm}`));
    console.log(chalk.white(`   Created At: ${licenseFile.created_at}`));
    console.log(chalk.white(`   File Size: ${fileContent.length} bytes`));
    
    // ถอดรหัสและแสดงข้อมูล license
    console.log(chalk.cyan('\n🔓 License Data:'));
    // TODO: Implement decryption display ใน Phase 4
    console.log(chalk.yellow('   (License data decryption will be implemented in Phase 4)'));
    
  } catch (error: any) {
    console.log(chalk.red('\n❌ Failed to display license info:'));
    console.log(chalk.red(`Error: ${error.message}`));
    throw error;
  }
}

/**
 * ตรวจสอบว่าไฟล์ license มีอยู่และสามารถอ่านได้
 * 
 * @param filePath - Path to license file
 * @returns true if file exists and readable
 */
export async function checkLicenseFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}