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

import { Command } from 'commander';
import chalk from 'chalk';
import { displayESP32Info } from './modules/esp32';
import { generateLicenseFile, generateSampleLicenseFile, displayLicenseInfo, checkLicenseFileExists } from './modules/license-generator';
import { parseLicenseFile, validateLicenseData } from './modules/encryption';
import fs from 'fs/promises';

const program = new Command();

program
  .name('smc-license')
  .description('CLI tool for generating SMC license keys with ESP32 MAC address binding')
  .version('1.0.0')
  .addHelpText('after', `
Examples:
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31"
  $ smc-license validate -f license.lic  
  $ smc-license info -f license.lic
  $ smc-license test-esp32 --ip 192.168.4.1

For detailed command help: smc-license <command> --help
`);

// Generate command - สร้าง license file
program
  .command('generate')
  .description('Generate new license file with ESP32 MAC address binding')
  .requiredOption('-o, --org <organization>', 'Organization name (e.g., "SMC Medical Corp")')
  .requiredOption('-c, --customer <customerId>', 'Customer ID (e.g., "CUST001")')
  .requiredOption('-a, --app <applicationId>', 'Application ID (e.g., "SMC_Cabinet")')
  .requiredOption('-e, --expiry <date>', 'Expiry date in YYYY-MM-DD format (e.g., "2025-12-31")')
  .option('--esp32-ip <ip>', 'ESP32 device IP address', '192.168.4.1')
  .option('--wifi-ssid <ssid>', 'WiFi SSID for ESP32 connection (optional)')
  .option('--wifi-password <password>', 'WiFi password for ESP32 connection (optional)')
  .option('--output <filename>', 'Output license filename (default: license.lic)', 'license.lic')
  .option('--test-mode', 'Generate test license without ESP32 connection (uses mock MAC)')
  .addHelpText('after', `
Examples:
  $ smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31"
  $ smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" --test-mode
  $ smc-license generate -o "Hospital ABC" -c "ABC001" -a "SMC_Pro" -e "2026-01-15" --esp32-ip "192.168.1.100"
`)
  .action(async (options) => {
    try {
      if (options.testMode) {
        console.log(chalk.yellow('🧪 Test Mode: Generating license with mock MAC address'));
        await generateSampleLicenseFile({
          org: options.org,
          customer: options.customer,
          app: options.app,
          expiry: options.expiry,
          esp32Ip: options.esp32Ip,
          wifiSsid: options.wifiSsid,
          wifiPassword: options.wifiPassword,
          output: options.output
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
          output: options.output
        });
      }
    } catch (error: any) {
      console.log(chalk.red('\n❌ License generation failed'));
      console.log(chalk.red(`Error: ${error.message}`));
      
      // แสดงคำแนะนำการแก้ไข
      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      
      if (error.message.includes('ESP32')) {
        console.log(chalk.gray('1. Check ESP32 device is powered on and connected'));
        console.log(chalk.gray('2. Verify ESP32 IP address is correct'));
        console.log(chalk.gray('3. Try using --test-mode for development/testing'));
        console.log(chalk.gray('4. Ensure ESP32 firmware includes /mac endpoint'));
      } else if (error.message.includes('date')) {
        console.log(chalk.gray('1. Use YYYY-MM-DD format for expiry date'));
        console.log(chalk.gray('2. Ensure expiry date is not in the past'));
        console.log(chalk.gray('3. Example: --expiry "2025-12-31"'));
      } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
        console.log(chalk.gray('1. Check file write permissions'));
        console.log(chalk.gray('2. Try running with elevated privileges'));
        console.log(chalk.gray('3. Ensure output directory exists'));
      } else {
        console.log(chalk.gray('1. Check all required parameters are provided'));
        console.log(chalk.gray('2. Try using --test-mode to bypass ESP32 connection'));
        console.log(chalk.gray('3. Verify network connectivity if using ESP32'));
      }
      
      process.exit(1);
    }
  });

// Validate command - ตรวจสอบ license file
program
  .command('validate')
  .description('Validate existing license file format, integrity, and expiry')
  .requiredOption('-f, --file <filename>', 'Path to license file (.lic format)')
  .addHelpText('after', `
Examples:
  $ smc-license validate -f license.lic
  $ smc-license validate -f /path/to/customer-license.lic
  $ smc-license validate --file "Hospital ABC License.lic"
`)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Validating license file...'));
      console.log(chalk.gray('====================================='));
      console.log(chalk.white(`File: ${options.file}`));
      
      // ตรวจสอบว่าไฟล์มีอยู่
      const fileExists = await checkLicenseFileExists(options.file);
      if (!fileExists) {
        console.log(chalk.red('❌ License file not found or not readable'));
        process.exit(1);
      }
      
      // อ่านไฟล์
      console.log(chalk.cyan('\n📖 Reading license file...'));
      const fileContent = await fs.readFile(options.file, 'utf8');
      
      // Parse และ validate license
      console.log(chalk.cyan('\n🔓 Parsing and validating license data...'));
      const licenseData = parseLicenseFile(fileContent);
      
      // ตรวจสอบความถูกต้อง
      const isValid = validateLicenseData(licenseData);
      
      if (isValid) {
        console.log(chalk.green('\n✅ License validation PASSED'));
        console.log(chalk.gray('====================================='));
        
        // แสดงข้อมูลสรุป
        console.log(chalk.blue('\n📊 License Summary:'));
        console.log(chalk.white(`Organization:     ${licenseData.organization}`));
        console.log(chalk.white(`Customer ID:      ${licenseData.customerId}`));
        console.log(chalk.white(`Application ID:   ${licenseData.applicationId}`));
        console.log(chalk.white(`MAC Address:      ${licenseData.macAddress}`));
        console.log(chalk.white(`Generated At:     ${licenseData.generatedAt}`));
        console.log(chalk.white(`Expires On:       ${licenseData.expiryDate}`));
        console.log(chalk.white(`Version:          ${licenseData.version}`));
        console.log(chalk.white(`Checksum:         ${licenseData.checksum}`));
        
        // คำนวณจำนวนวันที่เหลือ
        const expiryDate = new Date(licenseData.expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry > 0) {
          console.log(chalk.green(`Valid for:        ${daysUntilExpiry} days`));
        } else {
          console.log(chalk.red(`Status:           EXPIRED (${Math.abs(daysUntilExpiry)} days ago)`));
        }
        
        console.log(chalk.green('\n🎉 License is valid and ready for use!'));
      }
      
    } catch (error: any) {
      console.log(chalk.red('\n❌ License validation FAILED'));
      console.log(chalk.red(`Error: ${error.message}`));
      
      // แสดงคำแนะนำการแก้ไข
      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      console.log(chalk.gray('1. Ensure the license file is not corrupted'));
      console.log(chalk.gray('2. Check that the file is a valid .lic format'));
      console.log(chalk.gray('3. Verify the license hasn\'t expired'));
      console.log(chalk.gray('4. Make sure you have the correct license file'));
      
      process.exit(1);
    }
  });

// Info command - แสดงข้อมูล license file
program
  .command('info')
  .description('Display detailed information about license file contents')
  .requiredOption('-f, --file <filename>', 'Path to license file (.lic format)')
  .addHelpText('after', `
Examples:
  $ smc-license info -f license.lic
  $ smc-license info -f /path/to/customer-license.lic
  $ smc-license info --file "Hospital ABC License.lic"
`)
  .action(async (options) => {
    try {
      console.log(chalk.blue('ℹ️  License file information...'));
      console.log(chalk.gray('====================================='));
      
      // ตรวจสอบว่าไฟล์มีอยู่
      const fileExists = await checkLicenseFileExists(options.file);
      if (!fileExists) {
        console.log(chalk.red('❌ License file not found or not readable'));
        process.exit(1);
      }
      
      // ใช้ฟังก์ชัน displayLicenseInfo ที่มีอยู่แล้ว
      await displayLicenseInfo(options.file);
      
      // เพิ่มส่วนแสดง decrypted data
      console.log(chalk.cyan('\n🔓 Decrypted License Data:'));
      const fileContent = await fs.readFile(options.file, 'utf8');
      const licenseData = parseLicenseFile(fileContent);
      
      console.log(chalk.white(`   Organization:     ${licenseData.organization}`));
      console.log(chalk.white(`   Customer ID:      ${licenseData.customerId}`));
      console.log(chalk.white(`   Application ID:   ${licenseData.applicationId}`));
      console.log(chalk.white(`   MAC Address:      ${licenseData.macAddress}`));
      console.log(chalk.white(`   Generated At:     ${licenseData.generatedAt}`));
      console.log(chalk.white(`   Expires On:       ${licenseData.expiryDate}`));
      console.log(chalk.white(`   Version:          ${licenseData.version}`));
      console.log(chalk.white(`   Checksum:         ${licenseData.checksum}`));
      
      // คำนวณข้อมูลเพิ่มเติม
      const expiryDate = new Date(licenseData.expiryDate);
      const generatedDate = new Date(licenseData.generatedAt);
      const today = new Date();
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceGenerated = Math.ceil((today.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalValidDays = Math.ceil((expiryDate.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(chalk.cyan('\n📅 Date Information:'));
      console.log(chalk.white(`   Days since generated: ${daysSinceGenerated} days`));
      console.log(chalk.white(`   Total valid period:  ${totalValidDays} days`));
      
      if (daysUntilExpiry > 0) {
        console.log(chalk.green(`   Days until expiry:    ${daysUntilExpiry} days`));
        console.log(chalk.green(`   Status:               VALID`));
      } else {
        console.log(chalk.red(`   Days since expired:   ${Math.abs(daysUntilExpiry)} days`));
        console.log(chalk.red(`   Status:               EXPIRED`));
      }
      
      // MAC Address binding information
      console.log(chalk.cyan('\n🔒 Hardware Binding:'));
      console.log(chalk.white(`   Bound MAC Address:    ${licenseData.macAddress}`));
      console.log(chalk.gray('   This license will only work with the specific ESP32 device'));
      console.log(chalk.gray('   that has this MAC address.'));
      
      console.log(chalk.blue('\n✅ License information display complete!'));
      
    } catch (error: any) {
      console.log(chalk.red('\n❌ Failed to display license information'));
      console.log(chalk.red(`Error: ${error.message}`));
      
      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      console.log(chalk.gray('1. Ensure the license file exists and is readable'));
      console.log(chalk.gray('2. Check that the file is a valid .lic format'));
      console.log(chalk.gray('3. Verify the file is not corrupted'));
      
      process.exit(1);
    }
  });

// Test command - ทดสอบการเชื่อมต่อ ESP32
program
  .command('test-esp32')
  .description('Test ESP32 device connection and retrieve MAC address')
  .option('--ip <ip>', 'ESP32 device IP address (default: 192.168.4.1)', '192.168.4.1')
  .addHelpText('after', `
Examples:
  $ smc-license test-esp32
  $ smc-license test-esp32 --ip 192.168.1.100
  $ smc-license test-esp32 --ip 10.0.0.150

Note: ESP32 device must be running and accessible via HTTP on the specified IP address.
The device should respond to GET /mac endpoint with MAC address information.
`)
  .action(async (options) => {
    try {
      await displayESP32Info(options.ip);
    } catch (error: any) {
      console.log(chalk.red('❌ ESP32 test failed:', error.message));
      process.exit(1);
    }
  });

// Handle errors และ show help เมื่อไม่มี command
program.configureHelp({
  sortSubcommands: true,
  subcommandTerm: (cmd) => cmd.name()
});

program.on('command:*', () => {
  console.log(chalk.red(`❌ Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.gray('See --help for a list of available commands.'));
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help หาก run โดยไม่มี arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}