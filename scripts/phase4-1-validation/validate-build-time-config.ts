#!/usr/bin/env ts-node

/**
 * validate-build-time-config.ts - Build-Time Configuration Validation Script
 * 
 * PHASE 4.1 VALIDATION:
 * - Validates BuildConstants configuration system
 * - Tests environment variable driven device type selection
 * - Verifies device-specific configuration parameters
 * - Ensures build-time validation works correctly
 * 
 * MEDICAL DEVICE COMPLIANCE:
 * - Comprehensive configuration validation
 * - Audit logging for regulatory requirements
 * - Error detection and reporting
 * - Build-time safety checks
 * 
 * USAGE:
 * npm run validate:build-time
 * DEVICE_TYPE=DS12 npm run validate:build-time
 * DEVICE_TYPE=DS16 npm run validate:build-time
 */

import { BuildConstants, DeviceType } from '../../config/constants/BuildConstants';

// Test colors for console output
const Colors = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

class BuildTimeConfigValidator {
  private results: TestResult[] = [];
  private startTime: number = Date.now();

  /**
   * Run all validation tests
   */
  async runValidation(): Promise<void> {
    console.log(`${Colors.BOLD}${Colors.CYAN}Phase 4.1 Build-Time Configuration Validation${Colors.RESET}\n`);
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Test suite
    await this.testEnvironmentVariableHandling();
    await this.testDeviceConfigurationLoading();
    await this.testConfigurationValidation();
    await this.testDeviceTypeSupport();
    await this.testTimingConfiguration();
    await this.testCommandSupport();
    await this.testAuditLogging();
    await this.testErrorHandling();

    // Generate report
    this.generateReport();
  }

  /**
   * Test environment variable handling
   */
  private async testEnvironmentVariableHandling(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Environment Variable Handling...${Colors.RESET}`);

    try {
      // Test default device type (should be DS12)
      const defaultType = BuildConstants.getCurrentDeviceType();
      this.addResult({
        testName: 'Default Device Type',
        passed: defaultType === 'DS12',
        message: `Default device type should be DS12, got: ${defaultType}`
      });

      // Test environment variable override
      const originalEnv = process.env.DEVICE_TYPE;
      
      // Test DS12 explicitly
      process.env.DEVICE_TYPE = 'DS12';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS12Constants } = require('../../config/constants/BuildConstants');
      const ds12Type = DS12Constants.getCurrentDeviceType();
      
      this.addResult({
        testName: 'DS12 Environment Override',
        passed: ds12Type === 'DS12',
        message: `DS12 environment override should work, got: ${ds12Type}`
      });

      // Test DS16 explicitly
      process.env.DEVICE_TYPE = 'DS16';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS16Constants } = require('../../config/constants/BuildConstants');
      const ds16Type = DS16Constants.getCurrentDeviceType();
      
      this.addResult({
        testName: 'DS16 Environment Override',
        passed: ds16Type === 'DS16',
        message: `DS16 environment override should work, got: ${ds16Type}`
      });

      // Restore original environment
      if (originalEnv) {
        process.env.DEVICE_TYPE = originalEnv;
      } else {
        delete process.env.DEVICE_TYPE;
      }

    } catch (error) {
      this.addResult({
        testName: 'Environment Variable Handling',
        passed: false,
        message: `Error testing environment variables: ${error}`
      });
    }
  }

  /**
   * Test device configuration loading
   */
  private async testDeviceConfigurationLoading(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Device Configuration Loading...${Colors.RESET}`);

    try {
      // Test current config loading
      const config = BuildConstants.getCurrentConfig();
      
      this.addResult({
        testName: 'Current Config Loading',
        passed: config !== null && config !== undefined,
        message: `Current configuration should load successfully`,
        details: { deviceType: config.deviceType, slotCount: config.slotCount }
      });

      // Test DS12 config specifically
      const ds12Config = BuildConstants.getConfigByType('DS12');
      
      this.addResult({
        testName: 'DS12 Configuration',
        passed: ds12Config.deviceType === 'DS12' && ds12Config.slotCount === 12,
        message: `DS12 config should have correct parameters`,
        details: ds12Config
      });

      // Test DS16 config specifically
      const ds16Config = BuildConstants.getConfigByType('DS16');
      
      this.addResult({
        testName: 'DS16 Configuration',
        passed: ds16Config.deviceType === 'DS16' && ds16Config.slotCount === 16,
        message: `DS16 config should have correct parameters`,
        details: ds16Config
      });

      // Test supported device types
      const supportedTypes = BuildConstants.getSupportedDeviceTypes();
      
      this.addResult({
        testName: 'Supported Device Types',
        passed: supportedTypes.includes('DS12') && supportedTypes.includes('DS16'),
        message: `Should support DS12 and DS16 device types`,
        details: supportedTypes
      });

    } catch (error) {
      this.addResult({
        testName: 'Device Configuration Loading',
        passed: false,
        message: `Error loading device configurations: ${error}`
      });
    }
  }

  /**
   * Test configuration validation
   */
  private async testConfigurationValidation(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Configuration Validation...${Colors.RESET}`);

    try {
      // Test current configuration validation
      const isValid = BuildConstants.validateConfiguration();
      
      this.addResult({
        testName: 'Current Configuration Validation',
        passed: isValid,
        message: `Current configuration should be valid`
      });

      // Test valid device type checking
      const isDS12Valid = BuildConstants.isValidDeviceType('DS12');
      const isDS16Valid = BuildConstants.isValidDeviceType('DS16');
      const isInvalidValid = BuildConstants.isValidDeviceType('INVALID');
      
      this.addResult({
        testName: 'Device Type Validation',
        passed: isDS12Valid && isDS16Valid && !isInvalidValid,
        message: `Should correctly validate device types`,
        details: { DS12: isDS12Valid, DS16: isDS16Valid, INVALID: isInvalidValid }
      });

    } catch (error) {
      this.addResult({
        testName: 'Configuration Validation',
        passed: false,
        message: `Error validating configuration: ${error}`
      });
    }
  }

  /**
   * Test device type support
   */
  private async testDeviceTypeSupport(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Device Type Support...${Colors.RESET}`);

    try {
      const config = BuildConstants.getCurrentConfig();
      
      // Test slot count validation
      const validSlotCount = config.slotCount > 0 && config.slotCount <= 32;
      
      this.addResult({
        testName: 'Slot Count Validation',
        passed: validSlotCount,
        message: `Slot count should be between 1 and 32, got: ${config.slotCount}`
      });

      // Test baud rate validation
      const validBaudRates = [9600, 19200, 38400, 57600, 115200];
      const validBaudRate = validBaudRates.includes(config.baudRate);
      
      this.addResult({
        testName: 'Baud Rate Validation',
        passed: validBaudRate,
        message: `Baud rate should be valid, got: ${config.baudRate}`
      });

      // Test protocol version
      const hasProtocolVersion = config.protocolVersion && config.protocolVersion.length > 0;
      
      this.addResult({
        testName: 'Protocol Version',
        passed: hasProtocolVersion,
        message: `Protocol version should be defined, got: ${config.protocolVersion}`
      });

    } catch (error) {
      this.addResult({
        testName: 'Device Type Support',
        passed: false,
        message: `Error testing device type support: ${error}`
      });
    }
  }

  /**
   * Test timing configuration
   */
  private async testTimingConfiguration(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Timing Configuration...${Colors.RESET}`);

    try {
      const timingConfig = BuildConstants.getTimingConfig();
      
      // Test timing parameters exist
      const hasAllTimingParams = 
        timingConfig.communicationTimeout > 0 &&
        timingConfig.operationDelay >= 0 &&
        timingConfig.responseTimeout > 0 &&
        timingConfig.retryInterval > 0;
      
      this.addResult({
        testName: 'Timing Parameters',
        passed: hasAllTimingParams,
        message: `All timing parameters should be positive`,
        details: timingConfig
      });

      // Test device-specific timing differences
      const originalEnv = process.env.DEVICE_TYPE;
      
      process.env.DEVICE_TYPE = 'DS12';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS12Constants } = require('../../config/constants/BuildConstants');
      const ds12Timing = DS12Constants.getTimingConfig();
      
      process.env.DEVICE_TYPE = 'DS16';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS16Constants } = require('../../config/constants/BuildConstants');
      const ds16Timing = DS16Constants.getTimingConfig();
      
      const timingDiffers = 
        ds12Timing.operationDelay !== ds16Timing.operationDelay ||
        ds12Timing.responseTimeout !== ds16Timing.responseTimeout;
      
      this.addResult({
        testName: 'Device-Specific Timing',
        passed: timingDiffers,
        message: `DS12 and DS16 should have different timing parameters`,
        details: { DS12: ds12Timing, DS16: ds16Timing }
      });

      // Restore environment
      if (originalEnv) {
        process.env.DEVICE_TYPE = originalEnv;
      } else {
        delete process.env.DEVICE_TYPE;
      }

    } catch (error) {
      this.addResult({
        testName: 'Timing Configuration',
        passed: false,
        message: `Error testing timing configuration: ${error}`
      });
    }
  }

  /**
   * Test command support
   */
  private async testCommandSupport(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Command Support...${Colors.RESET}`);

    try {
      // Test basic commands
      const basicCommands = ['UNLOCK_SLOT', 'LOCK_SLOT', 'CHECK_STATE', 'GET_STATUS'];
      const basicSupported = basicCommands.every(cmd => BuildConstants.supportsCommand(cmd));
      
      this.addResult({
        testName: 'Basic Command Support',
        passed: basicSupported,
        message: `Basic commands should be supported by all devices`,
        details: basicCommands
      });

      // Test unsupported command
      const unsupportedCommand = BuildConstants.supportsCommand('INVALID_COMMAND');
      
      this.addResult({
        testName: 'Invalid Command Rejection',
        passed: !unsupportedCommand,
        message: `Invalid commands should not be supported`
      });

    } catch (error) {
      this.addResult({
        testName: 'Command Support',
        passed: false,
        message: `Error testing command support: ${error}`
      });
    }
  }

  /**
   * Test audit logging
   */
  private async testAuditLogging(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Audit Logging...${Colors.RESET}`);

    try {
      // Test build info generation
      const buildInfo = BuildConstants.getBuildInfo();
      
      const hasBuildInfo = 
        buildInfo.deviceType &&
        buildInfo.config &&
        buildInfo.buildTimestamp &&
        typeof buildInfo.isValid === 'boolean';
      
      this.addResult({
        testName: 'Build Info Generation',
        passed: hasBuildInfo,
        message: `Build info should be comprehensive`,
        details: buildInfo
      });

      // Test audit summary generation
      const auditSummary = BuildConstants.getAuditSummary();
      
      const hasAuditData = 
        auditSummary.includes('CONFIGURATION AUDIT') &&
        auditSummary.includes('Device Type:') &&
        auditSummary.includes('Build Timestamp:');
      
      this.addResult({
        testName: 'Audit Summary Generation',
        passed: hasAuditData,
        message: `Audit summary should contain required fields`
      });

    } catch (error) {
      this.addResult({
        testName: 'Audit Logging',
        passed: false,
        message: `Error testing audit logging: ${error}`
      });
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    console.log(`${Colors.BLUE}Testing Error Handling...${Colors.RESET}`);

    try {
      // Test invalid device type handling
      let errorThrown = false;
      try {
        BuildConstants.getConfigByType('INVALID' as DeviceType);
      } catch (error) {
        errorThrown = true;
      }
      
      this.addResult({
        testName: 'Invalid Device Type Error',
        passed: errorThrown,
        message: `Should throw error for invalid device types`
      });

      // Test configuration validation with invalid environment
      const originalEnv = process.env.DEVICE_TYPE;
      process.env.DEVICE_TYPE = 'INVALID';
      
      let configErrorThrown = false;
      try {
        delete require.cache[require.resolve('../../config/constants/BuildConstants')];
        const { BuildConstants: InvalidConstants } = require('../../config/constants/BuildConstants');
        InvalidConstants.getCurrentConfig();
      } catch (error) {
        configErrorThrown = true;
      }
      
      this.addResult({
        testName: 'Invalid Environment Error',
        passed: configErrorThrown,
        message: `Should throw error for invalid environment configuration`
      });

      // Restore environment
      if (originalEnv) {
        process.env.DEVICE_TYPE = originalEnv;
      } else {
        delete process.env.DEVICE_TYPE;
      }

    } catch (error) {
      this.addResult({
        testName: 'Error Handling',
        passed: false,
        message: `Error testing error handling: ${error}`
      });
    }
  }

  /**
   * Add test result
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
    const status = result.passed ? `${Colors.GREEN}PASS${Colors.RESET}` : `${Colors.RED}FAIL${Colors.RESET}`;
    console.log(`  ${status} ${result.testName}: ${result.message}`);
    
    if (result.details && process.env.VERBOSE) {
      console.log(`    Details:`, result.details);
    }
  }

  /**
   * Generate validation report
   */
  private generateReport(): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`\n${Colors.BOLD}${Colors.CYAN}=== VALIDATION REPORT ===${Colors.RESET}`);
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${Colors.GREEN}${passed}${Colors.RESET}`);
    console.log(`Failed: ${Colors.RED}${failed}${Colors.RESET}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log(`\n${Colors.RED}${Colors.BOLD}Failed Tests:${Colors.RESET}`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.message}`);
        });
    }
    
    const overallStatus = failed === 0 ? 'PASSED' : 'FAILED';
    const statusColor = failed === 0 ? Colors.GREEN : Colors.RED;
    
    console.log(`\n${Colors.BOLD}${statusColor}OVERALL: ${overallStatus}${Colors.RESET}\n`);
    
    // Exit with error code if tests failed
    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new BuildTimeConfigValidator();
  validator.runValidation().catch(error => {
    console.error(`${Colors.RED}Validation failed with error:${Colors.RESET}`, error);
    process.exit(1);
  });
}

export { BuildTimeConfigValidator };