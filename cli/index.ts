#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { displayESP32Info } from './modules/esp32';

const program = new Command();

program
  .name('smc-license')
  .description('CLI tool for generating SMC license keys with ESP32 MAC address binding')
  .version('1.0.0');

// Generate command - สร้าง license file
program
  .command('generate')
  .description('Generate new license file with ESP32 MAC address binding')
  .requiredOption('-o, --org <organization>', 'Organization name')
  .requiredOption('-c, --customer <customerId>', 'Customer ID')
  .requiredOption('-a, --app <applicationId>', 'Application ID')
  .requiredOption('-e, --expiry <date>', 'Expiry date (YYYY-MM-DD)')
  .option('--esp32-ip <ip>', 'ESP32 device IP address', '192.168.4.1')
  .option('--wifi-ssid <ssid>', 'WiFi SSID for ESP32 connection')
  .option('--wifi-password <password>', 'WiFi password for ESP32 connection')
  .option('--output <filename>', 'Output license filename', 'license.lic')
  .action(async (options) => {
    console.log(chalk.blue('🔄 Generating license...'));
    console.log(chalk.gray('Organization:'), options.org);
    console.log(chalk.gray('Customer ID:'), options.customer);
    console.log(chalk.gray('Application ID:'), options.app);
    console.log(chalk.gray('Expiry Date:'), options.expiry);
    console.log(chalk.gray('ESP32 IP:'), options.esp32Ip);
    console.log(chalk.gray('Output File:'), options.output);
    
    // TODO: Implement license generation logic
    console.log(chalk.yellow('⚠️  License generation not yet implemented'));
  });

// Validate command - ตรวจสอบ license file
program
  .command('validate')
  .description('Validate existing license file')
  .requiredOption('-f, --file <filename>', 'License file to validate')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Validating license file...'));
    console.log(chalk.gray('File:'), options.file);
    
    // TODO: Implement license validation logic
    console.log(chalk.yellow('⚠️  License validation not yet implemented'));
  });

// Info command - แสดงข้อมูล license file
program
  .command('info')
  .description('Show license file information')
  .requiredOption('-f, --file <filename>', 'License file to show info')
  .action(async (options) => {
    console.log(chalk.blue('ℹ️  License file information...'));
    console.log(chalk.gray('File:'), options.file);
    
    // TODO: Implement license info display logic
    console.log(chalk.yellow('⚠️  License info display not yet implemented'));
  });

// Test command - ทดสอบการเชื่อมต่อ ESP32
program
  .command('test-esp32')
  .description('Test ESP32 connection and get MAC address')
  .option('--ip <ip>', 'ESP32 device IP address', '192.168.4.1')
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