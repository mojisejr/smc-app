#!/usr/bin/env node

/**
 * SMC License CLI Tool
 *
 * Production-ready CLI for generating SMC license keys
 * with ESP32 MAC address binding for medical device applications.
 *
 * @version 1.0.0
 * @author SMC Development Team
 */

import { Command } from "commander";
import chalk from "chalk";
import { displayESP32Info } from "./modules/esp32";
import {
  generateLicenseFile,
  generateSampleLicenseFile,
  displayLicenseInfo,
  checkLicenseFileExists,
} from "./modules/license-generator";
import {
  parseLicenseFile,
  validateLicenseData,
  validateWiFiPassword,
} from "./modules/encryption";
import {
  processBatchLicenses,
  validateBatchOptions,
  previewBatchProcessing,
  BatchOptions
} from "./modules/batch-license-generator";
import { validateCSVFormat } from "./modules/csv-parser";
import fs from "fs/promises";

const program = new Command();

program
  .name("smc-license")
  .description(
    "CLI tool for generating SMC license keys with ESP32 MAC address binding"
  )
  .version("1.0.0")
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"
  $ smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv
  $ smc-license validate -f license.lic  
  $ smc-license info -f license.lic
  $ smc-license show-key
  $ smc-license export-env --output .env
  $ smc-license test-esp32 --ip 192.168.4.1

For detailed command help: smc-license <command> --help
`
  );

// Generate command - สร้าง license file
program
  .command("generate")
  .description("Generate new license file with ESP32 MAC address binding")
  .requiredOption(
    "-o, --org <organization>",
    'Organization name (e.g., "SMC Medical Corp")'
  )
  .requiredOption(
    "-c, --customer <customerId>",
    'Customer ID (e.g., "CUST001")'
  )
  .requiredOption(
    "-a, --app <applicationId>",
    'Application ID (e.g., "SMC_Cabinet")'
  )
  .requiredOption(
    "-e, --expiry <date>",
    'Expiry date in YYYY-MM-DD format (e.g., "2025-12-31")'
  )
  .requiredOption(
    "--wifi-ssid <ssid>",
    "WiFi SSID for ESP32 connection (REQUIRED)"
  )
  .requiredOption(
    "--wifi-password <password>",
    "WiFi password for ESP32 connection (REQUIRED)"
  )
  .option("--esp32-ip <ip>", "ESP32 device IP address", "192.168.4.1")
  .option(
    "--output <filename>",
    "Output license filename (default: license.lic)",
    "license.lic"
  )
  .option(
    "--test-mode",
    "Generate test license without ESP32 connection (uses mock MAC)"
  )
  .option(
    "--bypass-password-check",
    "Bypass WiFi password strength validation (development only)"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"
  $ smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" --wifi-ssid "TEST_WIFI" --wifi-password "simple123" --test-mode --bypass-password-check
  $ smc-license generate -o "Hospital ABC" -c "ABC001" -a "SMC_Pro" -e "2026-01-15" --wifi-ssid "HOSPITAL_ESP32" --wifi-password "HospitalSecure2024" --esp32-ip "192.168.1.100"
`
  )
  .action(async (options) => {
    try {
      // Step 1: ตรวจสอบ WiFi password strength
      console.log(chalk.blue("🔐 Validating WiFi password..."));
      const passwordValidation = validateWiFiPassword(
        options.wifiPassword,
        options.bypassPasswordCheck
      );

      // แสดงผล validation
      if (passwordValidation.errors.length > 0) {
        console.log(chalk.red("❌ WiFi password validation failed:"));
        passwordValidation.errors.forEach((error) => {
          console.log(chalk.red(`   • ${error}`));
        });
        throw new Error("WiFi password does not meet security requirements");
      }

      if (passwordValidation.warnings.length > 0) {
        console.log(chalk.yellow("⚠️  WiFi password warnings:"));
        passwordValidation.warnings.forEach((warning) => {
          console.log(chalk.yellow(`   • ${warning}`));
        });
      }

      console.log(
        chalk.green(
          `✅ WiFi password strength: ${passwordValidation.strength.toUpperCase()}`
        )
      );

      if (options.testMode) {
        console.log(
          chalk.yellow("🧪 Test Mode: Generating license with mock MAC address")
        );
        await generateSampleLicenseFile({
          org: options.org,
          customer: options.customer,
          app: options.app,
          expiry: options.expiry,
          esp32Ip: options.esp32Ip,
          wifiSsid: options.wifiSsid,
          wifiPassword: options.wifiPassword,
          output: options.output,
        });
      } else {
        await generateLicenseFile({
          org: options.org,
          customer: options.customer,
          app: options.app,
          expiry: options.expiry,
          esp32Ip: options.esp32Ip,
          wifiSsid: options.wifiSsid,
          wifiPassword: options.wifiPassword,
          output: options.output,
        });
      }
    } catch (error: any) {
      console.log(chalk.red("\n❌ License generation failed"));
      console.log(chalk.red(`Error: ${error.message}`));

      // แสดงคำแนะนำการแก้ไข
      console.log(chalk.yellow("\n🔧 Troubleshooting:"));

      if (error.message.includes("WiFi password")) {
        console.log(
          chalk.gray(
            "1. Use stronger passwords (8+ characters, mixed case, numbers, symbols)"
          )
        );
        console.log(
          chalk.gray("2. Add --bypass-password-check for development/testing")
        );
        console.log(
          chalk.gray(
            '3. Avoid common passwords like "password", "123456", etc.'
          )
        );
        console.log(chalk.gray('4. Example strong password: "SMC_Secure123!"'));
      } else if (error.message.includes("ESP32")) {
        console.log(
          chalk.gray("1. Check ESP32 device is powered on and connected")
        );
        console.log(chalk.gray("2. Verify ESP32 IP address is correct"));
        console.log(
          chalk.gray("3. Try using --test-mode for development/testing")
        );
        console.log(
          chalk.gray("4. Ensure ESP32 firmware includes /mac endpoint")
        );
      } else if (error.message.includes("date")) {
        console.log(chalk.gray("1. Use YYYY-MM-DD format for expiry date"));
        console.log(chalk.gray("2. Ensure expiry date is not in the past"));
        console.log(chalk.gray('3. Example: --expiry "2025-12-31"'));
      } else if (
        error.message.includes("permission") ||
        error.message.includes("EACCES")
      ) {
        console.log(chalk.gray("1. Check file write permissions"));
        console.log(chalk.gray("2. Try running with elevated privileges"));
        console.log(chalk.gray("3. Ensure output directory exists"));
      } else {
        console.log(
          chalk.gray("1. Check all required parameters are provided")
        );
        console.log(
          chalk.gray("2. Try using --test-mode to bypass ESP32 connection")
        );
        console.log(
          chalk.gray("3. Verify network connectivity if using ESP32")
        );
      }

      process.exit(1);
    }
  });

// Batch command - ประมวลผล CSV batch licenses
program
  .command('batch')
  .description('Process multiple licenses from CSV file generated by ESP32 Deployment Tool')
  .requiredOption('--input <csvFile>', 'Input CSV file from ESP32 Deployment Tool')
  .option('--output-dir <dir>', 'Output directory for license files (default: same as CSV location)')
  .option('--update-csv', 'Update CSV file with processing status', false)
  .option('--skip-existing', 'Skip records where license file already exists', false)
  .option('--expiry-days <days>', 'Set expiry X days from now (overrides CSV expiry)', (val) => parseInt(val))
  .option('--expiry-months <months>', 'Set expiry X months from now (overrides CSV expiry)', (val) => parseInt(val))
  .option('--expiry-years <years>', 'Set expiry X years from now (overrides CSV expiry)', (val) => parseInt(val))
  .option('--no-expiry', 'Set license to never expire (overrides CSV expiry)')
  .option('--dry-run', 'Validate CSV and show what would be processed without generating licenses')
  .option('--preview', 'Preview batch processing statistics without processing')
  .option('--verbose', 'Show detailed processing information')
  .addHelpText('after', `
Examples:
  $ smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv
  $ smc-license batch --input daily-deployments.csv --expiry-years 2 --skip-existing
  $ smc-license batch --input batch.csv --output-dir ./licenses/ --dry-run
  $ smc-license batch --input deployments.csv --no-expiry --verbose
  $ smc-license batch --input test.csv --preview

CSV Format:
  The CSV file should contain columns: timestamp, organization, customer_id, application_name,
  wifi_ssid, wifi_password, mac_address, ip_address, expiry_date, license_status
  
  Generated by ESP32 Deployment Tool with format: esp32-deployments-YYYY-MM-DD.csv

Processing Flow:
  1. Sales team generates CSV using ESP32 Deployment Tool
  2. Developer runs batch command to process pending records
  3. CLI generates licenses and updates CSV status
  4. Delivery team gets CSV + license files for customer deployment
`)
  .action(async (options) => {
    try {
      console.log(chalk.blue('📄 Starting CSV batch processing...'));
      console.log(chalk.gray(`Input CSV: ${options.input}`));

      // Step 1: Validate input file exists
      try {
        await fs.access(options.input);
      } catch {
        throw new Error(`CSV file not found: ${options.input}`);
      }

      // Step 2: Preview mode
      if (options.preview) {
        console.log(chalk.cyan('\n👀 Preview Mode: Analyzing CSV file...'));
        const preview = await previewBatchProcessing(options.input);
        
        console.log(chalk.blue('\n📊 Batch Processing Preview:'));
        console.log(chalk.gray('====================================='));
        console.log(chalk.white(`Total records: ${preview.totalRecords}`));
        console.log(chalk.yellow(`Pending records: ${preview.pendingRecords}`));
        console.log(chalk.green(`Completed records: ${preview.stats.completed}`));
        console.log(chalk.red(`Failed records: ${preview.stats.failed}`));
        console.log(chalk.gray(`Skipped records: ${preview.stats.skipped}`));

        if (preview.sampleRecords.length > 0) {
          console.log(chalk.cyan('\n📋 Sample Pending Records:'));
          preview.sampleRecords.forEach((record, index) => {
            console.log(chalk.white(`${index + 1}. ${record.customerId} - ${record.organization}`));
            console.log(chalk.gray(`   App: ${record.applicationName}, Expiry: ${record.expiryDate}`));
          });
        }

        console.log(chalk.blue('\n✅ Preview completed! Use without --preview to process.'));
        return;
      }

      // Step 3: Validate CSV format
      console.log(chalk.cyan('\n🔍 Validating CSV format...'));
      const csvValidation = await validateCSVFormat(options.input);
      
      if (!csvValidation.valid) {
        console.log(chalk.red('\n❌ CSV format validation failed:'));
        csvValidation.errors.forEach(error => {
          console.log(chalk.red(`   • ${error}`));
        });
        throw new Error('Invalid CSV format');
      }

      if (csvValidation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  CSV format warnings:'));
        csvValidation.warnings.forEach(warning => {
          console.log(chalk.yellow(`   • ${warning}`));
        });
      }

      console.log(chalk.green('✅ CSV format validation passed'));

      // Step 4: Validate batch options
      const batchValidation = validateBatchOptions({
        inputCSV: options.input,
        outputDir: options.outputDir,
        updateCSV: options.updateCsv,
        skipExisting: options.skipExisting,
        expiryDays: options.expiryDays,
        expiryMonths: options.expiryMonths,
        expiryYears: options.expiryYears,
        noExpiry: options.noExpiry,
        verbose: options.verbose,
        dryRun: options.dryRun
      });

      if (!batchValidation.valid) {
        console.log(chalk.red('\n❌ Batch options validation failed:'));
        batchValidation.errors.forEach(error => {
          console.log(chalk.red(`   • ${error}`));
        });
        throw new Error('Invalid batch options');
      }

      // Step 5: Process batch licenses
      const batchOptions: BatchOptions = {
        inputCSV: require('path').resolve(options.input),
        outputDir: options.outputDir ? require('path').resolve(options.outputDir) : undefined,
        updateCSV: options.updateCsv,
        skipExisting: options.skipExisting,
        expiryDays: options.expiryDays,
        expiryMonths: options.expiryMonths,
        expiryYears: options.expiryYears,
        noExpiry: options.noExpiry,
        verbose: options.verbose,
        dryRun: options.dryRun
      };

      const result = await processBatchLicenses(batchOptions);

      // Step 6: Exit with appropriate code
      if (result.failed > 0) {
        console.log(chalk.red(`\n❌ Batch processing completed with ${result.failed} failures`));
        process.exit(1);
      } else {
        if (result.processed > 0) {
          console.log(chalk.green(`\n🎉 Successfully processed ${result.processed} licenses!`));
        }
        if (result.skipped > 0) {
          console.log(chalk.yellow(`Skipped ${result.skipped} existing licenses`));
        }
        if (options.dryRun) {
          console.log(chalk.blue('This was a dry run - no files were generated'));
        }
      }

    } catch (error: any) {
      console.log(chalk.red('\n❌ CSV batch processing failed'));
      console.log(chalk.red(`Error: ${error.message}`));

      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      if (error.message.includes('not found')) {
        console.log(chalk.gray('1. Check the CSV file path is correct'));
        console.log(chalk.gray('2. Ensure the file exists and is readable'));
        console.log(chalk.gray('3. Try using absolute file path'));
      } else if (error.message.includes('column') || error.message.includes('CSV')) {
        console.log(chalk.gray('1. Ensure CSV has all required columns'));
        console.log(chalk.gray('2. Check CSV was generated by ESP32 Deployment Tool'));
        console.log(chalk.gray('3. Verify CSV header format matches expected format'));
        console.log(chalk.gray('4. Use --preview to check CSV structure'));
      } else if (error.message.includes('expiry')) {
        console.log(chalk.gray('1. Only specify one expiry option at a time'));
        console.log(chalk.gray('2. Use valid values for days (1-3650), months (1-120), years (1-10)'));
        console.log(chalk.gray('3. Check that CSV expiry dates are in YYYY-MM-DD format'));
      } else {
        console.log(chalk.gray('1. Try using --dry-run to validate CSV format'));
        console.log(chalk.gray('2. Use --verbose flag for detailed error information'));
        console.log(chalk.gray('3. Check file permissions for input and output directories'));
        console.log(chalk.gray('4. Use --preview to analyze CSV without processing'));
      }

      process.exit(1);
    }
  });

// Validate command - ตรวจสอบ license file
program
  .command("validate")
  .description("Validate existing license file format, integrity, and expiry")
  .requiredOption("-f, --file <filename>", "Path to license file (.lic format)")
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license validate -f license.lic
  $ smc-license validate -f /path/to/customer-license.lic
  $ smc-license validate --file "Hospital ABC License.lic"
`
  )
  .action(async (options) => {
    try {
      console.log(chalk.blue("🔍 Validating license file..."));
      console.log(chalk.gray("====================================="));
      console.log(chalk.white(`File: ${options.file}`));

      // ตรวจสอบว่าไฟล์มีอยู่
      const fileExists = await checkLicenseFileExists(options.file);
      if (!fileExists) {
        console.log(chalk.red("❌ License file not found or not readable"));
        process.exit(1);
      }

      // อ่านไฟล์
      console.log(chalk.cyan("\n📖 Reading license file..."));
      const fileContent = await fs.readFile(options.file, "utf8");

      // Parse และ validate license
      console.log(chalk.cyan("\n🔓 Parsing and validating license data..."));
      const licenseData = parseLicenseFile(fileContent);

      // ตรวจสอบความถูกต้อง
      const isValid = validateLicenseData(licenseData);

      if (isValid) {
        console.log(chalk.green("\n✅ License validation PASSED"));
        console.log(chalk.gray("====================================="));

        // แสดงข้อมูลสรุป
        console.log(chalk.blue("\n📊 License Summary:"));
        console.log(
          chalk.white(`Organization:     ${licenseData.organization}`)
        );
        console.log(chalk.white(`Customer ID:      ${licenseData.customerId}`));
        console.log(
          chalk.white(`Application ID:   ${licenseData.applicationId}`)
        );
        console.log(chalk.white(`MAC Address:      ${licenseData.macAddress}`));
        console.log(
          chalk.white(`Generated At:     ${licenseData.generatedAt}`)
        );
        console.log(chalk.white(`Expires On:       ${licenseData.expiryDate}`));
        console.log(chalk.white(`Version:          ${licenseData.version}`));
        console.log(chalk.white(`Checksum:         ${licenseData.checksum}`));

        // คำนวณจำนวนวันที่เหลือ
        const expiryDate = new Date(licenseData.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry > 0) {
          console.log(chalk.green(`Valid for:        ${daysUntilExpiry} days`));
        } else {
          console.log(
            chalk.red(
              `Status:           EXPIRED (${Math.abs(
                daysUntilExpiry
              )} days ago)`
            )
          );
        }

        console.log(chalk.green("\n🎉 License is valid and ready for use!"));
      }
    } catch (error: any) {
      console.log(chalk.red("\n❌ License validation FAILED"));
      console.log(chalk.red(`Error: ${error.message}`));

      // แสดงคำแนะนำการแก้ไข
      console.log(chalk.yellow("\n🔧 Troubleshooting:"));
      console.log(chalk.gray("1. Ensure the license file is not corrupted"));
      console.log(chalk.gray("2. Check that the file is a valid .lic format"));
      console.log(chalk.gray("3. Verify the license hasn't expired"));
      console.log(chalk.gray("4. Make sure you have the correct license file"));

      process.exit(1);
    }
  });

// Info command - แสดงข้อมูล license file
program
  .command("info")
  .description("Display detailed information about license file contents")
  .requiredOption("-f, --file <filename>", "Path to license file (.lic format)")
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license info -f license.lic
  $ smc-license info -f /path/to/customer-license.lic
  $ smc-license info --file "Hospital ABC License.lic"
`
  )
  .action(async (options) => {
    try {
      console.log(chalk.blue("ℹ️  License file information..."));
      console.log(chalk.gray("====================================="));

      // ตรวจสอบว่าไฟล์มีอยู่
      const fileExists = await checkLicenseFileExists(options.file);
      if (!fileExists) {
        console.log(chalk.red("❌ License file not found or not readable"));
        process.exit(1);
      }

      // ใช้ฟังก์ชัน displayLicenseInfo ที่มีอยู่แล้ว
      await displayLicenseInfo(options.file);

      // เพิ่มส่วนแสดง decrypted data
      console.log(chalk.cyan("\n🔓 Decrypted License Data:"));
      const fileContent = await fs.readFile(options.file, "utf8");
      const licenseData = parseLicenseFile(fileContent);

      console.log(
        chalk.white(`   Organization:     ${licenseData.organization}`)
      );
      console.log(
        chalk.white(`   Customer ID:      ${licenseData.customerId}`)
      );
      console.log(
        chalk.white(`   Application ID:   ${licenseData.applicationId}`)
      );
      console.log(
        chalk.white(`   MAC Address:      ${licenseData.macAddress}`)
      );
      console.log(
        chalk.white(`   Generated At:     ${licenseData.generatedAt}`)
      );
      console.log(
        chalk.white(`   Expires On:       ${licenseData.expiryDate}`)
      );
      console.log(chalk.white(`   Version:          ${licenseData.version}`));
      console.log(chalk.white(`   Checksum:         ${licenseData.checksum}`));

      // คำนวณข้อมูลเพิ่มเติม
      const expiryDate = new Date(licenseData.expiryDate);
      const generatedDate = new Date(licenseData.generatedAt);
      const today = new Date();

      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceGenerated = Math.ceil(
        (today.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalValidDays = Math.ceil(
        (expiryDate.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(chalk.cyan("\n📅 Date Information:"));
      console.log(
        chalk.white(`   Days since generated: ${daysSinceGenerated} days`)
      );
      console.log(
        chalk.white(`   Total valid period:  ${totalValidDays} days`)
      );

      if (daysUntilExpiry > 0) {
        console.log(
          chalk.green(`   Days until expiry:    ${daysUntilExpiry} days`)
        );
        console.log(chalk.green(`   Status:               VALID`));
      } else {
        console.log(
          chalk.red(
            `   Days since expired:   ${Math.abs(daysUntilExpiry)} days`
          )
        );
        console.log(chalk.red(`   Status:               EXPIRED`));
      }

      // MAC Address binding information
      console.log(chalk.cyan("\n🔒 Hardware Binding:"));
      console.log(
        chalk.white(`   Bound MAC Address:    ${licenseData.macAddress}`)
      );
      console.log(
        chalk.gray(
          "   This license will only work with the specific ESP32 device"
        )
      );
      console.log(chalk.gray("   that has this MAC address."));

      console.log(chalk.blue("\n✅ License information display complete!"));
    } catch (error: any) {
      console.log(chalk.red("\n❌ Failed to display license information"));
      console.log(chalk.red(`Error: ${error.message}`));

      console.log(chalk.yellow("\n🔧 Troubleshooting:"));
      console.log(
        chalk.gray("1. Ensure the license file exists and is readable")
      );
      console.log(chalk.gray("2. Check that the file is a valid .lic format"));
      console.log(chalk.gray("3. Verify the file is not corrupted"));

      process.exit(1);
    }
  });

// Test command - ทดสอบการเชื่อมต่อ ESP32
program
  .command("test-esp32")
  .description("Test ESP32 device connection and retrieve MAC address")
  .option(
    "--ip <ip>",
    "ESP32 device IP address (default: 192.168.4.1)",
    "192.168.4.1"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license test-esp32
  $ smc-license test-esp32 --ip 192.168.1.100
  $ smc-license test-esp32 --ip 10.0.0.150

Note: ESP32 device must be running and accessible via HTTP on the specified IP address.
The device should respond to GET /mac endpoint with MAC address information.
`
  )
  .action(async (options) => {
    try {
      await displayESP32Info(options.ip);
    } catch (error: any) {
      console.log(chalk.red("❌ ESP32 test failed:", error.message));
      process.exit(1);
    }
  });

// Show Key command - แสดง shared secret key
program
  .command("show-key")
  .description(
    "Display the shared secret key for application .env configuration"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license show-key
  
Usage:
  Use this command to view the shared secret key that must be added to your 
  application's .env file for license decryption. Copy the displayed key 
  exactly as shown.
  
Security Note:
  Keep this key confidential and never commit .env files to version control.
`
  )
  .action(async () => {
    try {
      console.log(chalk.blue("🔑 SMC License System - Shared Secret Key"));
      console.log(chalk.gray("====================================="));
      console.log(chalk.white("Add this to your application .env file:"));
      console.log("");
      console.log(
        chalk.green(
          `SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS`
        )
      );
      console.log("");

      console.log(chalk.white("📝 Quick Commands:"));
      console.log(
        chalk.cyan(
          `echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" >> .env`
        )
      );
      console.log(chalk.gray("# Or use: smc-license export-env --output .env"));
      console.log("");

      console.log(chalk.yellow("⚠️  Security Notes:"));
      console.log(chalk.gray("• Keep the SHARED_SECRET_KEY confidential"));
      console.log(chalk.gray("• Never commit .env files to version control"));
      console.log(
        chalk.gray("• Both license.lic and .env are required for activation")
      );
      console.log(
        chalk.gray(
          "• This key must match between CLI generation and application"
        )
      );
      console.log("");

      console.log(chalk.blue("✅ Shared key display complete!"));
    } catch (error: any) {
      console.log(chalk.red("❌ Failed to display shared key"));
      console.log(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Export ENV command - สร้าง .env file หรือ append key เข้าไป
program
  .command("export-env")
  .description("Export shared secret key to .env file format")
  .option("--output <filename>", "Output .env filename (default: .env)", ".env")
  .option(
    "--append",
    "Append to existing .env file instead of overwriting",
    false
  )
  .option("--stdout", "Print to stdout instead of writing to file", false)
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license export-env
  $ smc-license export-env --output .env.production
  $ smc-license export-env --append --output .env
  $ smc-license export-env --stdout

Usage:
  This command creates or updates .env file with the shared secret key required
  for SMC license system. Use --append to add to existing file, or --stdout 
  to display the key without writing to file.
`
  )
  .action(async (options) => {
    try {
      //KEY LINE ตรงนี้ เรา สร้าง แบบ random ทุกครั้งที่ gen key ที่มีข้อมูล input เปลี่ยนแปลง เช่น ถ้าเป็นข้อมูลบริษัทเติมจะได้ keyline เดิม แต่ถ้าเปล่ี่ยนนิดเดียว keyline ก็เปลี่ยนเลย
      //เพื่อที่จะไม่ต้อง manual add
      const keyLine =
        "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS";
      const comment =
        "# SMC License System - Shared Secret Key for license decryption";
      const warning =
        "# WARNING: Keep this key confidential - do not commit to version control";
      const envContent = `${comment}\n${warning}\n${keyLine}\n`;

      if (options.stdout) {
        // แสดงผลทาง stdout
        console.log(chalk.blue("🔑 .env file content:"));
        console.log(chalk.gray("====================================="));
        console.log(envContent.trim());
        console.log(chalk.gray("====================================="));
        console.log(chalk.green("✅ Environment variables displayed!"));
        return;
      }

      const outputPath = options.output;
      console.log(chalk.blue(`📝 Exporting shared key to: ${outputPath}`));

      if (options.append) {
        // Append mode - เพิ่มเข้าไปในไฟล์ที่มีอยู่
        console.log(chalk.cyan("🔄 Append mode: Adding to existing file..."));

        try {
          // ตรวจสอบว่าไฟล์มี SHARED_SECRET_KEY อยู่แล้วหรือไม่
          const existingContent = await fs.readFile(outputPath, "utf8");

          if (existingContent.includes("SHARED_SECRET_KEY")) {
            console.log(
              chalk.yellow("⚠️  SHARED_SECRET_KEY already exists in file")
            );
            console.log(
              chalk.gray("   No changes made. Use --force to overwrite.")
            );
            return;
          }

          // เพิ่มเข้าไปท้ายไฟล์
          const newContent = existingContent + "\n" + envContent;
          await fs.writeFile(outputPath, newContent, "utf8");
        } catch (error: any) {
          if (error.code === "ENOENT") {
            // ไฟล์ไม่มี สร้างใหม่
            await fs.writeFile(outputPath, envContent, "utf8");
          } else {
            throw error;
          }
        }
      } else {
        // Overwrite mode - เขียนทับไฟล์
        console.log(chalk.cyan("📄 Creating new .env file..."));
        await fs.writeFile(outputPath, envContent, "utf8");
      }

      console.log(chalk.green(`✅ Shared key exported to: ${outputPath}`));
      console.log(
        chalk.gray(`   Mode: ${options.append ? "append" : "overwrite"}`)
      );
      console.log("");

      console.log(chalk.white("📋 File contains:"));
      console.log(
        chalk.gray(`   SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_...`)
      );
      console.log("");

      console.log(chalk.yellow("⚠️  Next Steps:"));
      console.log(
        chalk.gray(
          "1. Copy your license.lic file to your application directory"
        )
      );
      console.log(
        chalk.gray("2. Make sure your application loads this .env file")
      );
      console.log(chalk.gray("3. Never commit .env files to version control"));
    } catch (error: any) {
      console.log(chalk.red("❌ Failed to export environment variables"));
      console.log(chalk.red(`Error: ${error.message}`));

      console.log(chalk.yellow("\n🔧 Troubleshooting:"));
      console.log(chalk.gray("1. Check file write permissions"));
      console.log(chalk.gray("2. Ensure output directory exists"));
      console.log(
        chalk.gray("3. Try using --stdout to display without writing")
      );

      process.exit(1);
    }
  });

// Handle errors และ show help เมื่อไม่มี command
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name(),
});

program.on("command:*", () => {
  console.log(chalk.red(`❌ Invalid command: ${program.args.join(" ")}`));
  console.log(chalk.gray("See --help for a list of available commands."));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help หาก run โดยไม่มี arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
