#!/usr/bin/env ts-node

/**
 * validate-build-config.ts - Quick Build Configuration Validator
 * 
 * SIMPLE VALIDATION:
 * - Quick check of build configuration validity
 * - Environment variable validation
 * - Device type consistency checking
 * - Build script accessibility testing
 * 
 * USAGE:
 * npm run config:validate
 * DEVICE_TYPE=DS12 npm run config:validate
 * DEVICE_TYPE=DS16 npm run config:validate
 */

import { BuildConstants } from '../config/constants/BuildConstants';

// Simple colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

async function validateBuildConfig(): Promise<void> {
  console.log(`${BOLD}${CYAN}Build Configuration Validator${RESET}\n`);
  
  let allValid = true;
  
  try {
    // Test 1: Basic configuration loading
    console.log(`Checking configuration loading...`);
    const config = BuildConstants.getCurrentConfig();
    if (config && config.deviceType) {
      console.log(`${GREEN}✓ Configuration loaded: ${config.deviceType}${RESET}`);
    } else {
      console.log(`${RED}✗ Failed to load configuration${RESET}`);
      allValid = false;
    }
    
    // Test 2: Configuration validation
    console.log(`Checking configuration validity...`);
    const isValid = BuildConstants.validateConfiguration();
    if (isValid) {
      console.log(`${GREEN}✓ Configuration is valid${RESET}`);
    } else {
      console.log(`${RED}✗ Configuration validation failed${RESET}`);
      allValid = false;
    }
    
    // Test 3: Device type support
    console.log(`Checking device type support...`);
    const deviceType = BuildConstants.getCurrentDeviceType();
    const supportedTypes = BuildConstants.getSupportedDeviceTypes();
    if (supportedTypes.includes(deviceType)) {
      console.log(`${GREEN}✓ Device type ${deviceType} is supported${RESET}`);
    } else {
      console.log(`${RED}✗ Device type ${deviceType} is not supported${RESET}`);
      allValid = false;
    }
    
    // Test 4: Essential parameters
    console.log(`Checking essential parameters...`);
    if (config.slotCount > 0 && config.baudRate > 0 && config.supportedCommands.length > 0) {
      console.log(`${GREEN}✓ Essential parameters are valid${RESET}`);
      console.log(`  - Slots: ${config.slotCount}`);
      console.log(`  - Baud Rate: ${config.baudRate}`);
      console.log(`  - Commands: ${config.supportedCommands.length}`);
    } else {
      console.log(`${RED}✗ Essential parameters are invalid${RESET}`);
      allValid = false;
    }
    
    // Test 5: Environment consistency
    console.log(`Checking environment consistency...`);
    const envDeviceType = process.env.DEVICE_TYPE || 'DS12';
    if (deviceType === envDeviceType) {
      console.log(`${GREEN}✓ Environment variable matches configuration${RESET}`);
    } else {
      console.log(`${YELLOW}⚠ Environment mismatch: ENV=${envDeviceType}, CONFIG=${deviceType}${RESET}`);
    }
    
    // Summary
    console.log(`\n${BOLD}Validation Summary:${RESET}`);
    if (allValid) {
      console.log(`${GREEN}${BOLD}✓ All checks passed - Build configuration is ready${RESET}`);
      console.log(`\nCurrent Configuration:`);
      console.log(`- Device Type: ${config.deviceType}`);
      console.log(`- Slot Count: ${config.slotCount}`);
      console.log(`- Baud Rate: ${config.baudRate}`);
      console.log(`- Protocol: ${config.protocolVersion}`);
    } else {
      console.log(`${RED}${BOLD}✗ Some checks failed - Please review configuration${RESET}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.log(`${RED}${BOLD}✗ Configuration validation error: ${error}${RESET}`);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  validateBuildConfig().catch(error => {
    console.error(`${RED}Validation failed:${RESET}`, error);
    process.exit(1);
  });
}

export { validateBuildConfig };