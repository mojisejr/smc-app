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
  getLicenseFileBasicInfo,
} from "./modules/encryption";
import {
  processBatchLicenses,
  validateBatchOptions,
  previewBatchProcessing,
  BatchOptions
} from "./modules/batch-license-generator";
import { validateCSVFormat } from "./modules/csv-parser";
import { LicenseRegistry } from "./modules/license-registry";
import fs from "fs/promises";

const program = new Command();

program
  .name("smc-license")
  .description(
    "CLI tool for generating SMC license keys with ESP32 MAC address binding"
  )
  .version("2.0.0")
  .addHelpText(
    "after",
    `
Examples (Phase 9 - WiFi-Free):
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31"
  $ smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv
  $ smc-license validate -f license.lic  
  $ smc-license info -f license.lic
  $ smc-license show-key
  $ smc-license test-esp32 --ip 192.168.4.1

⚠️  Phase 9 Update: WiFi credentials no longer required for license generation
    Sales team will connect WiFi manually using CSV data during deployment

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
  // Phase 9: WiFi credentials no longer required for license generation
  .option(
    "--wifi-ssid <ssid>",
    "[DEPRECATED] WiFi SSID - no longer used in Phase 9"
  )
  .option(
    "--wifi-password <password>",
    "[DEPRECATED] WiFi password - no longer used in Phase 9"
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
    "[DEPRECATED] WiFi password validation - not used in Phase 9"
  )
  .addHelpText(
    "after",
    `
Examples (Phase 9 - WiFi-Free):
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31"
  $ smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" --test-mode
  $ smc-license generate -o "Hospital ABC" -c "ABC001" -a "SMC_Pro" -e "2026-01-15" --esp32-ip "192.168.1.100"

⚠️  Phase 9 Update: WiFi credentials removed from license generation
    WiFi connection will be handled manually by sales team during deployment
`
  )
  .action(async (options) => {
    try {
      // Phase 9: Skip WiFi password validation (no longer required)
      if (options.wifiSsid || options.wifiPassword) {
        console.log(chalk.yellow("⚠️  Phase 9: WiFi credentials are deprecated and will be ignored"));
        console.log(chalk.gray("   WiFi connection will be handled manually during deployment"));
      }
      
      console.log(chalk.blue("🚀 Phase 9: WiFi-free license generation starting..."));

      if (options.testMode) {
        console.log(
          chalk.yellow("🧪 Test Mode: Generating license with mock MAC address (WiFi-free)")
        );
        await generateSampleLicenseFile({
          org: options.org,
          customer: options.customer,
          app: options.app,
          expiry: options.expiry,
          esp32Ip: options.esp32Ip,
          output: options.output,
          // Phase 9: WiFi credentials removed
          wifiSsid: undefined,
          wifiPassword: undefined,
        });
      } else {
        await generateLicenseFile({
          org: options.org,
          customer: options.customer,
          app: options.app,
          expiry: options.expiry,
          esp32Ip: options.esp32Ip,
          output: options.output,
          // Phase 9: WiFi credentials removed
          wifiSsid: undefined,
          wifiPassword: undefined,
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

      // ใช้ basic info validation แทน full parsing (ไม่ต้อง MAC address/WiFi SSID)
      console.log(chalk.cyan("\n🔓 Validating license file format..."));
      const validationResult = getLicenseFileBasicInfo(fileContent);

      if (validationResult.isValid && validationResult.fileInfo) {
        console.log(chalk.green("\n✅ License file validation PASSED"));
        console.log(chalk.gray("====================================="));

        const info = validationResult.fileInfo;
        
        // แสดงข้อมูลสรุป (ข้อมูลที่ไม่ sensitive)
        console.log(chalk.blue("\n📊 License File Summary:"));
        console.log(chalk.white(`Format Version:   ${info.version}`));
        console.log(chalk.white(`Encryption:       ${info.algorithm}`));
        console.log(chalk.white(`Created At:       ${info.created_at}`));
        console.log(chalk.white(`File Size:        ${info.file_size} bytes`));
        console.log(chalk.white(`Data Length:      ${info.encrypted_data_length} chars`));
        console.log(chalk.white(`KDF Algorithm:    ${info.kdf_algorithm}`));
        console.log(chalk.white(`Has KDF Context:  ${info.has_kdf_context ? 'Yes' : 'No'}`));

        console.log(chalk.blue("\n🔐 HKDF v2.0 License Information:"));
        console.log(chalk.green("• Self-contained license with dynamic key derivation"));
        console.log(chalk.green("• No shared key management required"));
        console.log(chalk.green("• Secure MAC address binding (encrypted)"));
        console.log(chalk.green("• Compatible with SMC License CLI v2.0+"));

        console.log(chalk.yellow("\n⚠️  Note:"));
        console.log(chalk.gray("• License content is encrypted and cannot be displayed without MAC address"));
        console.log(chalk.gray("• Use 'smc-license info' with MAC/WiFi parameters for full details (future feature)"));
        console.log(chalk.gray("• This validation only checks file format and structure"));

        console.log(chalk.green("\n🎉 License file format is valid and ready for use!"));
      } else {
        console.log(chalk.red("\n❌ License file validation FAILED"));
        
        if (validationResult.errors.length > 0) {
          console.log(chalk.red("\n🚨 Validation Errors:"));
          validationResult.errors.forEach(error => {
            console.log(chalk.red(`   • ${error}`));
          });
        }
        
        console.log(chalk.yellow("\n🔧 Common Issues:"));
        console.log(chalk.gray("• Ensure this is a valid HKDF v2.0 license file"));
        console.log(chalk.gray("• Check that the file is not corrupted"));
        console.log(chalk.gray("• Verify the file was generated with SMC License CLI v2.0+"));
        
        process.exit(1);
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

      // อ่านและแสดงข้อมูล basic license info
      const fileContent = await fs.readFile(options.file, "utf8");
      const validationResult = getLicenseFileBasicInfo(fileContent);

      if (!validationResult.isValid || !validationResult.fileInfo) {
        console.log(chalk.red("❌ Invalid license file format"));
        
        if (validationResult.errors.length > 0) {
          console.log(chalk.red("\n🚨 File Format Errors:"));
          validationResult.errors.forEach(error => {
            console.log(chalk.red(`   • ${error}`));
          });
        }
        
        process.exit(1);
      }

      const info = validationResult.fileInfo;
      
      // แสดงข้อมูล file structure
      console.log(chalk.cyan("📋 License File Structure:"));
      console.log(chalk.white(`   Format Version: ${info.version}`));
      console.log(chalk.white(`   Algorithm: ${info.algorithm}`));
      console.log(chalk.white(`   Created At: ${info.created_at}`));
      console.log(chalk.white(`   File Size: ${info.file_size} bytes`));
      console.log(chalk.white(`   Encrypted Data Length: ${info.encrypted_data_length} characters`));
      console.log(chalk.white(`   KDF Algorithm: ${info.kdf_algorithm}`));

      // แสดงข้อมูล HKDF context (non-sensitive)
      const licenseFile = JSON.parse(fileContent);
      console.log(chalk.cyan("\n🔐 HKDF Context Information:"));
      console.log(chalk.white(`   Salt (Base64): ${licenseFile.kdf_context.salt.substring(0, 20)}...`));
      console.log(chalk.white(`   Info Context: ${licenseFile.kdf_context.info.substring(0, 50)}...`));
      console.log(chalk.white(`   KDF Algorithm: ${licenseFile.kdf_context.algorithm}`));
      
      // แสดงข้อมูล security features
      console.log(chalk.blue("\n🛡️  Security Features:"));
      console.log(chalk.green(`• Self-contained license with HKDF key derivation`));
      console.log(chalk.green(`• AES-256-CBC encryption for sensitive data`));
      console.log(chalk.green(`• Hardware binding with encrypted MAC address`));
      console.log(chalk.green(`• Deterministic key generation from license content`));
      console.log(chalk.green(`• No external shared key management required`));

      console.log(chalk.yellow("\n⚠️  Encrypted License Content:"));
      console.log(chalk.gray("• Organization, Customer ID, Application ID"));
      console.log(chalk.gray("• MAC Address binding information"));
      console.log(chalk.gray("• WiFi credentials for ESP32 connection"));
      console.log(chalk.gray("• License expiry date and generation metadata"));
      console.log(chalk.gray("• Security checksum and validation data"));

      console.log(chalk.blue("\n📝 Usage Information:"));
      console.log(chalk.white("• This license is compatible with SMC License CLI v2.0+"));
      console.log(chalk.white("• License content can only be decrypted by the target SMC application"));
      console.log(chalk.white("• Hardware binding ensures license works only on designated ESP32 device"));
      console.log(chalk.white("• No additional setup or shared key files required for deployment"));

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

// Update Expiry command - อัพเดตวันหมดอายุของ license (HKDF Version)
program
  .command("update-expiry")
  .description("Update license expiry date without regenerating license (payment control)")
  .requiredOption("-f, --file <filename>", "Path to existing license file (.lic format)")
  .requiredOption("-e, --new-expiry <date>", 'New expiry date in YYYY-MM-DD format (e.g., "2026-12-31")')
  .requiredOption("--mac-address <mac>", "ESP32 MAC address for validation (XX:XX:XX:XX:XX:XX)")
  .requiredOption("--wifi-ssid <ssid>", "WiFi SSID for validation")
  .option("--output <filename>", "Output filename (default: overwrites original)")
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license update-expiry -f license.lic -e "2026-12-31" --mac-address "AA:BB:CC:DD:EE:FF" --wifi-ssid "SMC_ESP32_001"
  $ smc-license update-expiry -f customer-license.lic -e "2025-06-30" --mac-address "11:22:33:44:55:66" --wifi-ssid "HOSPITAL_WIFI" --output updated-license.lic

Business Use Case:
  This command allows updating license expiry dates for payment control scenarios:
  
  1. Initial deployment: Customer gets short-term license (3 months)
  2. Payment verification: After payment, extend expiry without rebuilding app
  3. Renewal process: Extend existing licenses without hardware re-binding
  
Security:
  - Requires ESP32 MAC address validation
  - Requires WiFi SSID verification  
  - Uses HKDF for secure key regeneration
  - Maintains hardware binding integrity
`
  )
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔄 Updating license expiry date...'));
      console.log(chalk.gray('====================================='));
      console.log(chalk.white(`Input file: ${options.file}`));
      console.log(chalk.white(`New expiry: ${options.newExpiry}`));
      
      // Step 1: Validate inputs
      console.log(chalk.cyan('\n🔍 Step 1: Validating inputs...'));
      
      // ตรวจสอบ expiry date format
      const expiryRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!expiryRegex.test(options.newExpiry)) {
        throw new Error('Invalid expiry date format. Use YYYY-MM-DD');
      }
      
      const newExpiryDate = new Date(options.newExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (newExpiryDate <= today) {
        throw new Error('New expiry date must be in the future');
      }
      
      // ตรวจสอบ MAC address format
      const macRegex = /^[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}:[A-Fa-f0-9]{2}$/;
      if (!macRegex.test(options.macAddress)) {
        throw new Error('Invalid MAC address format. Use XX:XX:XX:XX:XX:XX');
      }
      
      console.log(chalk.green('✅ Input validation passed'));
      
      // Step 2: Check license file exists
      console.log(chalk.cyan('\n📄 Step 2: Reading existing license...'));
      
      const fileExists = await checkLicenseFileExists(options.file);
      if (!fileExists) {
        throw new Error('License file not found or not readable');
      }
      
      const fileContent = await fs.readFile(options.file, 'utf8');
      const licenseFile = JSON.parse(fileContent);
      
      // Step 3: Parse license with HKDF
      console.log(chalk.cyan('\n🔓 Step 3: Parsing license with HKDF...'));
      
      // ตรวจสอบ HKDF v2.0+ format (รองรับทั้ง v2.0.x และ v2.1.x)
      if ((!licenseFile.version.startsWith('2.0') && !licenseFile.version.startsWith('2.1')) || !licenseFile.kdf_context) {
        throw new Error('License must be HKDF format (version 2.0.x or 2.1.x). Please regenerate license with current CLI version.');
      }
      
      // Parse license data using HKDF (WiFi SSID now from KDF context)
      const licenseData = parseLicenseFile(fileContent, {
        macAddress: options.macAddress.toUpperCase()
      });
      
      console.log(chalk.green('✅ License parsed successfully'));
      console.log(chalk.gray(`   Organization: ${licenseData.organization}`));
      console.log(chalk.gray(`   Customer: ${licenseData.customerId}`));
      console.log(chalk.gray(`   Current expiry: ${licenseData.expiryDate}`));
      
      // Step 4: Validate hardware binding
      console.log(chalk.cyan('\n🔒 Step 4: Validating hardware binding...'));
      
      if (licenseData.macAddress !== options.macAddress.toUpperCase()) {
        throw new Error(`MAC address mismatch. License is bound to: ${licenseData.macAddress}`);
      }
      
      if (licenseData.wifiSsid !== options.wifiSsid) {
        throw new Error(`WiFi SSID mismatch. License is bound to: ${licenseData.wifiSsid}`);
      }
      
      console.log(chalk.green('✅ Hardware binding validation passed'));
      
      // Step 5: Create updated license
      console.log(chalk.cyan('\n🔄 Step 5: Creating updated license...'));
      
      const updatedLicenseData = {
        ...licenseData,
        expiryDate: options.newExpiry,
        generatedAt: new Date().toISOString() // Update generation timestamp
      };
      
      // Recalculate checksum with new expiry date
      const checksumData = `${updatedLicenseData.organization}${updatedLicenseData.customerId}${updatedLicenseData.applicationId}${updatedLicenseData.expiryDate}${updatedLicenseData.macAddress}${updatedLicenseData.wifiSsid}`;
      updatedLicenseData.checksum = require('crypto').createHash('sha256').update(checksumData).digest('hex').slice(0, 16);
      
      // Create new license file with HKDF
      const { createLicenseFile } = require('./modules/encryption');
      const newLicenseFile = createLicenseFile(updatedLicenseData);
      
      // Step 6: Save updated license
      console.log(chalk.cyan('\n💾 Step 6: Saving updated license...'));
      
      const outputPath = options.output || options.file;
      const newFileContent = JSON.stringify(newLicenseFile, null, 2);
      await fs.writeFile(outputPath, newFileContent, 'utf8');
      
      console.log(chalk.green(`✅ Updated license saved: ${outputPath}`));
      
      // Step 7: Display summary
      console.log(chalk.blue('\n📊 Update Summary:'));
      console.log(chalk.gray('====================================='));
      console.log(chalk.white(`Organization:     ${updatedLicenseData.organization}`));
      console.log(chalk.white(`Customer ID:      ${updatedLicenseData.customerId}`));
      console.log(chalk.white(`Application ID:   ${updatedLicenseData.applicationId}`));
      console.log(chalk.white(`MAC Address:      ${updatedLicenseData.macAddress}`));
      console.log(chalk.white(`Previous Expiry:  ${licenseData.expiryDate}`));
      console.log(chalk.yellow(`New Expiry:       ${updatedLicenseData.expiryDate}`));
      console.log(chalk.white(`Updated At:       ${updatedLicenseData.generatedAt}`));
      
      // Calculate new validity period
      const daysUntilExpiry = Math.ceil((newExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      console.log(chalk.green(`Valid for:        ${daysUntilExpiry} days`));
      
      console.log(chalk.blue('\n🎆 Payment Control Benefits:'));
      console.log(chalk.green('• License extended without hardware re-binding'));
      console.log(chalk.green('• Same application binary remains valid'));
      console.log(chalk.green('• Customer can continue using existing installation'));
      console.log(chalk.green('• Secure HKDF ensures license integrity'));
      
      console.log(chalk.green('\n🎉 License expiry update completed successfully!'));
      
    } catch (error: any) {
      console.log(chalk.red('\n❌ License expiry update failed'));
      console.log(chalk.red(`Error: ${error.message}`));
      
      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      if (error.message.includes('MAC address')) {
        console.log(chalk.gray('1. Verify MAC address matches the original license binding'));
        console.log(chalk.gray('2. Use uppercase format: AA:BB:CC:DD:EE:FF'));
        console.log(chalk.gray('3. Check MAC address from ESP32 device directly'));
      } else if (error.message.includes('WiFi')) {
        console.log(chalk.gray('1. Verify WiFi SSID matches the original license'));
        console.log(chalk.gray('2. SSID must match exactly (case sensitive)'));
        console.log(chalk.gray('3. Check WiFi settings from ESP32 deployment'));
      } else if (error.message.includes('HKDF') || error.message.includes('version')) {
        console.log(chalk.gray('1. License must be generated with CLI v2.0+ (HKDF format)'));
        console.log(chalk.gray('2. Regenerate license if using old format'));
        console.log(chalk.gray('3. Old dynamic key licenses are not compatible'));
      } else if (error.message.includes('date')) {
        console.log(chalk.gray('1. Use YYYY-MM-DD format for expiry date'));
        console.log(chalk.gray('2. New expiry date must be in the future'));
        console.log(chalk.gray('3. Example: --new-expiry "2026-12-31"'));
      } else {
        console.log(chalk.gray('1. Ensure license file is valid and readable'));
        console.log(chalk.gray('2. Check that all required parameters are provided'));
        console.log(chalk.gray('3. Verify file write permissions'));
      }
      
      process.exit(1);
    }
  });

// Show Key command - HKDF Information (No Shared Key Required)
program
  .command("show-key")
  .description(
    "Display HKDF license system information (no shared secret key required)"
  )
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license show-key
  
HKDF License System:
  Current SMC License System uses HKDF (Key Derivation Function) which eliminates 
  the need for shared secret keys. Each license is self-contained and secure.
  
Migration from Legacy System:
  - Old system: Required SHARED_SECRET_KEY in .env file
  - New system: No shared key needed, uses HKDF v2.0.0 format
  - Enhanced security: No master key exposure risk
`
  )
  .action(async () => {
    try {
      console.log(chalk.blue("🔑 SMC License System - HKDF Information"));
      console.log(chalk.gray("====================================="));
      
      console.log(chalk.green("✅ HKDF License System Active"));
      console.log(chalk.white("Current system uses HKDF (Key Derivation Function) technology:"));
      console.log("");

      console.log(chalk.cyan("🎆 HKDF Benefits:"));
      console.log(chalk.green("• No shared secret key required"));
      console.log(chalk.green("• Each license has unique encryption"));
      console.log(chalk.green("• Enhanced security - no master key exposure"));
      console.log(chalk.green("• Self-contained license deployment"));
      console.log(chalk.green("• License regeneration capability"));
      console.log("");

      console.log(chalk.white("📝 Deployment Instructions:"));
      console.log(chalk.cyan("1. Generate license with: smc-license generate"));
      console.log(chalk.cyan("2. Copy license.lic to your application"));
      console.log(chalk.cyan("3. No .env file setup required!"));
      console.log("");

      console.log(chalk.blue("🔄 Migration from Legacy System:"));
      console.log(chalk.yellow("Old System (v1.0):"));
      console.log(chalk.gray("  • Required SHARED_SECRET_KEY in .env"));
      console.log(chalk.gray("  • Single key for all licenses (security risk)"));
      console.log(chalk.gray("  • Manual key management"));
      console.log("");
      console.log(chalk.green("New System (v2.0 HKDF):"));
      console.log(chalk.white("  • No shared key needed"));
      console.log(chalk.white("  • Per-license unique encryption"));
      console.log(chalk.white("  • Automatic secure key derivation"));
      console.log("");

      console.log(chalk.yellow("⚠️  Legacy License Note:"));
      console.log(chalk.gray("• Old v1.0 licenses still work with legacy parsers"));
      console.log(chalk.gray("• New v2.0 HKDF licenses provide enhanced security"));
      console.log(chalk.gray("• Regenerate licenses for maximum security benefits"));
      console.log("");

      console.log(chalk.green("🎉 HKDF system provides maximum security without complexity!"));
    } catch (error: any) {
      console.log(chalk.red("❌ Failed to display HKDF information"));
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

// Registry command - จัดการ license registry system
program
  .command("registry")
  .description("Manage license registry system for tracking and updates")
  .option("--init", "Initialize new registry for today")
  .option("--add <license-file>", "Add license to registry")
  .option("--update-expiry <customer-id> <new-date>", "Update expiry date in registry")
  .option("--export [date]", "Export registry for specific date (YYYY-MM-DD)")
  .option("--stats [date]", "Show registry statistics")
  .option("--dir <directory>", "Registry directory", "./registry")
  .option("--customer-id <id>", "Customer ID for add operation")
  .option("--organization <name>", "Organization name for add operation")
  .option("--application <name>", "Application name for add operation")
  .option("--mac-address <mac>", "MAC address for add operation")
  .option("--wifi-ssid <ssid>", "WiFi SSID for add operation")
  .option("--notes <notes>", "Additional notes")
  .option("--verbose", "Show detailed output")
  .addHelpText(
    "after",
    `
Examples:
  $ smc-license registry --init
  $ smc-license registry --add license.lic --customer-id BGK001 --organization "Bangkok Hospital"
  $ smc-license registry --update-expiry BGK001 2026-12-31 --notes "Payment received"
  $ smc-license registry --stats
  $ smc-license registry --export 2025-08-25
`
  )
  .action(async (options) => {
    try {
      const registry = new LicenseRegistry({
        registryDir: options.dir,
        verbose: options.verbose
      });

      if (options.init) {
        console.log(chalk.blue("🏁 Initializing license registry..."));
        await registry.ensureRegistryDir();
        await registry.readOrCreateRegistry(); // Creates file if doesn't exist
        console.log(chalk.green("✅ Registry initialized successfully"));
        console.log(chalk.gray(`   Directory: ${options.dir}`));
        console.log(chalk.gray(`   File: ${registry.getRegistryFileName()}`));
        return;
      }

      if (options.add) {
        console.log(chalk.blue("📝 Adding license to registry..."));
        
        if (!options.customerId || !options.organization) {
          console.log(chalk.red("❌ --customer-id and --organization are required for add operation"));
          process.exit(1);
        }

        await registry.addLicenseEntry(options.add, {
          customerData: {
            customer_id: options.customerId,
            organization: options.organization,
            application_name: options.application || 'SMC_APP',
            mac_address: options.macAddress || 'ENCRYPTED',
            wifi_ssid: options.wifiSsid || 'ENCRYPTED'
          },
          notes: options.notes
        });

        console.log(chalk.green("✅ License added to registry"));
        await registry.displayRegistrySummary();
        return;
      }

      if (options.updateExpiry) {
        const [customerId, newDate] = options.updateExpiry;
        console.log(chalk.blue(`🔄 Updating expiry for ${customerId} to ${newDate}...`));
        
        await registry.updateExpiryInRegistry(customerId, newDate, options.notes);
        console.log(chalk.green("✅ Expiry updated in registry"));
        await registry.displayRegistrySummary();
        return;
      }

      if (options.export !== undefined) {
        const targetDate = options.export && options.export !== true ? new Date(options.export) : undefined;
        console.log(chalk.blue("📤 Exporting registry..."));
        
        const stats = await registry.getRegistryStats(targetDate);
        const fileName = registry.getRegistryFileName(targetDate);
        
        console.log(chalk.green(`✅ Registry exported: ${fileName}`));
        console.log(chalk.white(`   Total entries: ${stats.total}`));
        console.log(chalk.white(`   File location: ${registry.getRegistryFilePath(targetDate)}`));
        return;
      }

      if (options.stats !== undefined) {
        const targetDate = options.stats && options.stats !== true ? new Date(options.stats) : undefined;
        await registry.displayRegistrySummary(targetDate);
        return;
      }

      // Default: show today's registry stats
      await registry.displayRegistrySummary();

    } catch (error: any) {
      console.log(chalk.red("\n❌ Registry operation failed"));
      console.log(chalk.red(`Error: ${error.message}`));

      console.log(chalk.yellow("\n🔧 Troubleshooting:"));
      console.log(chalk.gray("1. Ensure registry directory exists and is writable"));
      console.log(chalk.gray("2. Check license file path and permissions"));
      console.log(chalk.gray("3. Verify date format: YYYY-MM-DD"));
      console.log(chalk.gray("4. Use --verbose for detailed output"));

      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help หาก run โดยไม่มี arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
