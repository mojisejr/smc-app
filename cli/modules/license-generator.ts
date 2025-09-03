import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import { GenerateOptions } from "../types";
import { getESP32MacAddress } from "./esp32";
import { LicenseRegistry } from "./license-registry";
import {
  createLicenseData,
  createLicenseFile,
  encryptLicenseData,
  validateLicenseData,
} from "./encryption";

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
export async function generateLicenseFile(
  options: GenerateOptions
): Promise<string> {
  try {
    console.log(chalk.blue("\n🚀 Starting license generation process..."));
    console.log(chalk.gray("====================================="));

    // Step 1: ดึง MAC address จาก ESP32
    console.log(chalk.cyan("\n📡 Step 1: Connecting to ESP32..."));
    const esp32Response = await getESP32MacAddress(options.esp32Ip);

    if (esp32Response.status !== "success") {
      throw new Error("Failed to retrieve MAC address from ESP32");
    }

    const macAddress = esp32Response.mac;
    console.log(chalk.green(`✅ MAC address retrieved: ${macAddress}`));

    // Step 2: สร้าง license data structure
    console.log(chalk.cyan("\n📝 Step 2: Creating license data..."));

    // Phase 9: ไม่ต้องการ WiFi credentials อีกต่อไป
    console.log(
      chalk.yellow(
        "   ⚠️  Phase 9: WiFi credentials no longer required for license generation"
      )
    );

    const licenseData = createLicenseData(
      {
        org: options.org,
        customer: options.customer,
        app: options.app,
        expiry: options.expiry,
        type: options.type || "production",
      },
      macAddress
    );

    // Step 3: Validate license data
    console.log(chalk.cyan("\n✅ Step 3: Validating license data..."));
    validateLicenseData(licenseData);

    // Step 4: สร้าง license file structure และเข้ารหัส
    console.log(chalk.cyan("\n🔐 Step 4: Creating encrypted license file..."));
    const licenseFile = createLicenseFile(licenseData);

    // Step 5: บันทึก license file
    console.log(chalk.cyan("\n💾 Step 5: Saving license file..."));

    // สร้าง filename ถ้าไม่ได้ระบุ extension
    let filename = options.output || "license.lic";
    if (!filename.endsWith(".lic")) {
      filename = filename.replace(/\.[^.]+$/, "") + ".lic"; // แทนที่ extension หรือเพิ่ม .lic
    }

    // สร้าง absolute path
    const outputPath = path.resolve(process.cwd(), filename);

    // บันทึกเป็น JSON format
    const licenseFileContent = JSON.stringify(licenseFile, null, 2);
    await fs.writeFile(outputPath, licenseFileContent, "utf8");

    console.log(chalk.green(`✅ License file saved: ${outputPath}`));
    console.log(chalk.gray(`   File size: ${licenseFileContent.length} bytes`));

    // Step 6: Audit logging for internal/development licenses
    if (
      licenseData.license_type === "internal" ||
      licenseData.license_type === "development"
    ) {
      console.log(chalk.cyan("\n🔍 Step 6: Audit Logging..."));
      const registry = new LicenseRegistry({ verbose: true });
      await registry.logInternalLicenseGeneration({
        organization: licenseData.organization,
        customer_id: licenseData.customerId,
        application_name: licenseData.applicationId,
        license_type: licenseData.license_type,
        file_path: outputPath,
        generated_by: process.env.USER || process.env.USERNAME || "CLI_USER",
        purpose:
          licenseData.license_type === "internal"
            ? "INTERNAL_DEPLOYMENT"
            : "DEVELOPMENT_TESTING",
      });
      console.log(
        chalk.green(
          `✅ Audit log recorded for ${licenseData.license_type} license`
        )
      );
    }

    // Step 7: แสดงสรุปผลลัพธ์
    console.log(chalk.blue("\n📊 License Generation Summary:"));
    console.log(chalk.gray("====================================="));
    console.log(chalk.white(`Organization:     ${licenseData.organization}`));
    console.log(chalk.white(`Customer ID:      ${licenseData.customerId}`));
    console.log(chalk.white(`Application ID:   ${licenseData.applicationId}`));
    console.log(chalk.white(`MAC Address:      ${licenseData.macAddress}`));
    console.log(chalk.white(`Generated At:     ${licenseData.generatedAt}`));
    console.log(chalk.white(`Expires On:       ${licenseData.expiryDate}`));
    console.log(chalk.white(`Checksum:         ${licenseData.checksum}`));
    console.log(chalk.white(`Output File:      ${outputPath}`));
    console.log(chalk.white(`Encryption:       AES-256-CBC`));
    console.log(
      chalk.white(
        `License Type:     ${
          licenseData.license_type?.toUpperCase() || "PRODUCTION"
        }`
      )
    );

    // Special warnings for internal/development licenses
    if (licenseData.license_type === "internal") {
      console.log(chalk.red("\n⚠️  INTERNAL LICENSE WARNING:"));
      console.log(chalk.red("   This license bypasses ESP32 validation"));
      console.log(chalk.red("   Only for SMC internal deployment"));
      console.log(chalk.red("   Audit trail has been recorded"));
    } else if (licenseData.license_type === "development") {
      console.log(chalk.yellow("\n⚠️  DEVELOPMENT LICENSE WARNING:"));
      console.log(
        chalk.yellow("   This license is for development/testing only")
      );
      console.log(chalk.yellow("   Not suitable for production deployment"));
    }

    // คำนวณจำนวนวันที่เหลือ
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(chalk.white(`Days Until Expiry: ${daysUntilExpiry} days`));

    // Step 7: แสดง Self-Contained License Information
    console.log(chalk.blue("\n🎆 Self-Contained License Information:"));
    console.log(chalk.gray("====================================="));
    console.log(
      chalk.white("This license uses Dynamic Shared Key technology:")
    );
    console.log(chalk.green(`• No separate shared key management required`));
    console.log(chalk.green(`• License is self-contained and secure`));
    console.log(chalk.green(`• Unique encryption key per license`));

    console.log(chalk.white("\n📝 Deployment Instructions:"));
    console.log(
      chalk.cyan(`# Simply copy the license file to your application:`)
    );
    console.log(
      chalk.gray(`cp ${path.basename(outputPath)} /path/to/your/app/`)
    );
    console.log(chalk.cyan(`# No .env file setup required!`));

    console.log(chalk.yellow("\n⚠️  Security Notes:"));
    console.log(chalk.gray("• Each license has a unique encryption key"));
    console.log(chalk.gray("• Key is derived from license data automatically"));
    console.log(
      chalk.gray("• Only license.lic file is required for activation")
    );

    console.log(chalk.green("\n🎉 License generation completed successfully!"));

    return outputPath;
  } catch (error: any) {
    console.log(chalk.red("\n❌ License generation failed:"));
    console.log(chalk.red(`Error: ${error.message}`));

    // Troubleshooting suggestions
    console.log(chalk.yellow("\n🔧 Troubleshooting:"));
    console.log(
      chalk.gray("1. Ensure ESP32 is accessible and /mac endpoint is working")
    );
    console.log(
      chalk.gray(
        "2. Check that expiry date is in YYYY-MM-DD format and in the future"
      )
    );
    console.log(chalk.gray("3. Verify write permissions for output directory"));
    console.log(
      chalk.gray("4. Make sure all required parameters are provided")
    );

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
  mockMacAddress: string = "AA:BB:CC:DD:EE:FF"
): Promise<string> {
  try {
    console.log(
      chalk.blue("\n🧪 Generating sample license file (without ESP32)...")
    );
    console.log(
      chalk.yellow("⚠️  This is a test license with mock MAC address")
    );
    console.log(chalk.gray("====================================="));

    // สร้าง license data ด้วย mock MAC
    console.log(chalk.cyan("\n📝 Creating license data with mock MAC..."));

    // Phase 9: ไม่ต้องการ WiFi credentials สำหรับ test license
    console.log(
      chalk.yellow(
        "   ⚠️  Phase 9: Test license generation without WiFi credentials"
      )
    );

    const licenseData = createLicenseData(
      {
        org: options.org,
        customer: options.customer,
        app: `${options.app}_TEST`, // เพิ่ม _TEST ก่อนสร้าง checksum
        expiry: options.expiry,
        type: options.type || "production",
      },
      mockMacAddress
    );

    // Validate และสร้างไฟล์
    validateLicenseData(licenseData);
    const licenseFile = createLicenseFile(licenseData);

    // สร้าง test filename
    let filename = options.output || "license.lic";
    if (!filename.endsWith(".lic")) {
      filename = filename.replace(/\.[^.]+$/, "") + ".lic";
    }

    // เพิ่ม _test suffix
    const testFilename = filename.replace(".lic", "_test.lic");
    const outputPath = path.resolve(process.cwd(), testFilename);

    // บันทึกไฟล์
    const licenseFileContent = JSON.stringify(licenseFile, null, 2);
    await fs.writeFile(outputPath, licenseFileContent, "utf8");

    console.log(chalk.green(`✅ Sample license file saved: ${outputPath}`));
    console.log(
      chalk.yellow(`⚠️  This license uses mock MAC address: ${mockMacAddress}`)
    );

    // Audit logging for internal/development test licenses
    if (
      licenseData.license_type === "internal" ||
      licenseData.license_type === "development"
    ) {
      console.log(chalk.cyan("\n🔍 Audit Logging for Test License..."));
      const registry = new LicenseRegistry({ verbose: true });
      await registry.logInternalLicenseGeneration({
        organization: licenseData.organization,
        customer_id: licenseData.customerId,
        application_name: licenseData.applicationId,
        license_type: licenseData.license_type,
        file_path: outputPath,
        generated_by: process.env.USER || process.env.USERNAME || "CLI_USER",
        purpose: `${licenseData.license_type.toUpperCase()}_TESTING`,
      });
      console.log(
        chalk.green(
          `✅ Audit log recorded for ${licenseData.license_type} test license`
        )
      );
    }

    // แสดง Self-Contained License Information
    console.log(chalk.blue("\n🎆 Self-Contained Test License Information:"));
    console.log(chalk.gray("====================================="));
    console.log(
      chalk.white("This test license uses Dynamic Shared Key technology:")
    );
    console.log(chalk.green(`• No separate shared key management required`));
    console.log(chalk.green(`• License is self-contained and secure`));
    console.log(chalk.green(`• Unique encryption key per license`));

    // Special warnings for internal/development test licenses
    if (licenseData.license_type === "internal") {
      console.log(chalk.red("\n⚠️  INTERNAL TEST LICENSE WARNING:"));
      console.log(chalk.red("   This test license bypasses ESP32 validation"));
      console.log(chalk.red("   Only for SMC internal testing"));
      console.log(chalk.red("   Uses mock MAC address - not for production"));
    } else if (licenseData.license_type === "development") {
      console.log(chalk.yellow("\n⚠️  DEVELOPMENT TEST LICENSE WARNING:"));
      console.log(
        chalk.yellow("   This test license is for development/testing only")
      );
      console.log(
        chalk.yellow("   Uses mock MAC address - not suitable for production")
      );
    }

    console.log(chalk.white("\n📝 Test Deployment Instructions:"));
    console.log(chalk.cyan(`# Simply copy the test license file:`));
    console.log(
      chalk.gray(
        `cp ${path.basename(outputPath)} /path/to/your/app/license.lic`
      )
    );
    console.log(chalk.cyan(`# No .env file setup required!`));

    console.log(chalk.yellow("\n⚠️  Test Mode Reminder:"));
    console.log(chalk.gray("• This uses mock MAC address for testing"));
    console.log(chalk.gray("• Use without --test-mode for production"));
    console.log(
      chalk.gray("• Self-contained license system - no shared key needed")
    );

    return outputPath;
  } catch (error: any) {
    console.log(chalk.red("\n❌ Sample license generation failed:"));
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
    console.log(
      chalk.blue(`\n📄 License File Information: ${path.basename(filePath)}`)
    );
    console.log(chalk.gray("====================================="));

    // อ่านไฟล์
    const fileContent = await fs.readFile(filePath, "utf8");
    const licenseFile = JSON.parse(fileContent);

    // แสดงข้อมูล file structure
    console.log(chalk.cyan("📋 File Structure:"));
    console.log(chalk.white(`   Format Version: ${licenseFile.version}`));
    console.log(chalk.white(`   Algorithm: ${licenseFile.algorithm}`));
    console.log(chalk.white(`   Created At: ${licenseFile.created_at}`));
    console.log(chalk.white(`   File Size: ${fileContent.length} bytes`));

    // ถอดรหัสและแสดงข้อมูล license
    console.log(chalk.cyan("\n🔓 License Data:"));
    // TODO: Implement decryption display ใน Phase 4
    console.log(
      chalk.yellow(
        "   (License data decryption will be implemented in Phase 4)"
      )
    );
  } catch (error: any) {
    console.log(chalk.red("\n❌ Failed to display license info:"));
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
export async function checkLicenseFileExists(
  filePath: string
): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
