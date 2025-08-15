#!/usr/bin/env ts-node

/**
 * manual-test.ts - Manual Testing Script for Phase 4.1
 * 
 * INTERACTIVE TESTING:
 * - Step-by-step manual validation
 * - User-friendly test execution
 * - Clear pass/fail indicators
 * - Actionable error messages
 * 
 * USAGE:
 * npm run test:manual
 * npx ts-node scripts/phase4-1-validation/manual-test.ts
 */

import { BuildConstants } from '../../config/constants/BuildConstants';
import { BuildTimeController } from '../../main/ku-controllers/BuildTimeController';
import * as readline from 'readline';

// Colors for better output readability
const Colors = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  MAGENTA: '\x1b[35m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

interface ManualTest {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  cleanup?: () => Promise<void>;
}

class ManualTestRunner {
  private rl: readline.Interface;
  private passedTests: number = 0;
  private failedTests: number = 0;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Run all manual tests
   */
  async runTests(): Promise<void> {
    console.log(`${Colors.BOLD}${Colors.MAGENTA}Phase 4.1 Manual Testing Suite${Colors.RESET}\n`);
    console.log(`This script will guide you through testing the Phase 4.1 implementation.`);
    console.log(`Each test will be explained before execution.\n`);

    const tests: ManualTest[] = [
      {
        id: 'config-loading',
        name: 'Configuration Loading',
        description: 'Test that BuildConstants can load device configuration',
        execute: this.testConfigurationLoading.bind(this)
      },
      {
        id: 'device-types',
        name: 'Device Type Support',
        description: 'Test DS12 and DS16 device type configurations',
        execute: this.testDeviceTypeSupport.bind(this)
      },
      {
        id: 'environment-vars',
        name: 'Environment Variable Handling',
        description: 'Test DEVICE_TYPE environment variable override',
        execute: this.testEnvironmentVariables.bind(this)
      },
      {
        id: 'build-controller',
        name: 'BuildTimeController Integration',
        description: 'Test BuildTimeController with BuildConstants integration',
        execute: this.testBuildTimeController.bind(this)
      },
      {
        id: 'timing-config',
        name: 'Timing Configuration',
        description: 'Test device-specific timing parameters',
        execute: this.testTimingConfiguration.bind(this)
      },
      {
        id: 'command-support',
        name: 'Command Support',
        description: 'Test device-specific command support validation',
        execute: this.testCommandSupport.bind(this)
      },
      {
        id: 'audit-logging',
        name: 'Audit Logging',
        description: 'Test audit trail generation and compliance features',
        execute: this.testAuditLogging.bind(this)
      },
      {
        id: 'build-scripts',
        name: 'Build Scripts',
        description: 'Test package.json build script configuration',
        execute: this.testBuildScripts.bind(this)
      }
    ];

    for (const test of tests) {
      await this.runSingleTest(test);
      console.log(''); // Add spacing between tests
    }

    await this.showSummary();
    this.rl.close();
  }

  /**
   * Run a single test with user interaction
   */
  private async runSingleTest(test: ManualTest): Promise<void> {
    console.log(`${Colors.BOLD}${Colors.CYAN}Test: ${test.name}${Colors.RESET}`);
    console.log(`Description: ${test.description}`);
    
    const shouldRun = await this.askUser('Run this test? (y/n): ');
    if (!shouldRun.toLowerCase().startsWith('y')) {
      console.log(`${Colors.YELLOW}Skipped${Colors.RESET}`);
      return;
    }

    try {
      console.log('Executing test...');
      const result = await test.execute();
      
      if (result) {
        console.log(`${Colors.GREEN}${Colors.BOLD}✓ PASSED${Colors.RESET}`);
        this.passedTests++;
      } else {
        console.log(`${Colors.RED}${Colors.BOLD}✗ FAILED${Colors.RESET}`);
        this.failedTests++;
      }

      if (test.cleanup) {
        await test.cleanup();
      }
    } catch (error) {
      console.log(`${Colors.RED}${Colors.BOLD}✗ ERROR: ${error}${Colors.RESET}`);
      this.failedTests++;
    }
  }

  /**
   * Test configuration loading
   */
  private async testConfigurationLoading(): Promise<boolean> {
    try {
      const config = BuildConstants.getCurrentConfig();
      console.log(`Current device type: ${config.deviceType}`);
      console.log(`Slot count: ${config.slotCount}`);
      console.log(`Baud rate: ${config.baudRate}`);
      console.log(`Protocol version: ${config.protocolVersion}`);
      
      const isValid = config.deviceType && config.slotCount > 0 && config.baudRate > 0;
      if (isValid) {
        console.log(`${Colors.GREEN}Configuration loaded successfully${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Configuration incomplete or invalid${Colors.RESET}`);
      }
      
      return isValid;
    } catch (error) {
      console.log(`${Colors.RED}Error loading configuration: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test device type support
   */
  private async testDeviceTypeSupport(): Promise<boolean> {
    try {
      const ds12Config = BuildConstants.getConfigByType('DS12');
      const ds16Config = BuildConstants.getConfigByType('DS16');
      
      console.log(`DS12 Configuration:`);
      console.log(`  - Slots: ${ds12Config.slotCount}`);
      console.log(`  - Baud Rate: ${ds12Config.baudRate}`);
      console.log(`  - Commands: ${ds12Config.supportedCommands.length}`);
      
      console.log(`DS16 Configuration:`);
      console.log(`  - Slots: ${ds16Config.slotCount}`);
      console.log(`  - Baud Rate: ${ds16Config.baudRate}`);
      console.log(`  - Commands: ${ds16Config.supportedCommands.length}`);
      
      const ds12Valid = ds12Config.deviceType === 'DS12' && ds12Config.slotCount === 12;
      const ds16Valid = ds16Config.deviceType === 'DS16' && ds16Config.slotCount === 16;
      const configsDiffer = ds12Config.slotCount !== ds16Config.slotCount;
      
      const result = ds12Valid && ds16Valid && configsDiffer;
      if (result) {
        console.log(`${Colors.GREEN}Both device types configured correctly${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Device type configurations are invalid${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing device types: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test environment variable handling
   */
  private async testEnvironmentVariables(): Promise<boolean> {
    try {
      const originalEnv = process.env.DEVICE_TYPE;
      
      // Test DS12
      console.log('Testing DEVICE_TYPE=DS12...');
      process.env.DEVICE_TYPE = 'DS12';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS12Constants } = require('../../config/constants/BuildConstants');
      const ds12Type = DS12Constants.getCurrentDeviceType();
      console.log(`Result: ${ds12Type}`);
      
      // Test DS16
      console.log('Testing DEVICE_TYPE=DS16...');
      process.env.DEVICE_TYPE = 'DS16';
      delete require.cache[require.resolve('../../config/constants/BuildConstants')];
      const { BuildConstants: DS16Constants } = require('../../config/constants/BuildConstants');
      const ds16Type = DS16Constants.getCurrentDeviceType();
      console.log(`Result: ${ds16Type}`);
      
      // Restore
      if (originalEnv) {
        process.env.DEVICE_TYPE = originalEnv;
      } else {
        delete process.env.DEVICE_TYPE;
      }
      
      const result = ds12Type === 'DS12' && ds16Type === 'DS16';
      if (result) {
        console.log(`${Colors.GREEN}Environment variable override works correctly${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Environment variable override failed${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing environment variables: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test BuildTimeController integration
   */
  private async testBuildTimeController(): Promise<boolean> {
    try {
      const deviceType = BuildTimeController.getDeviceType();
      const connectionStatus = BuildTimeController.getConnectionStatus();
      const buildInfo = BuildTimeController.getBuildInfo();
      const isValidConfig = BuildTimeController.validateBuildConfiguration();
      
      console.log(`Controller device type: ${deviceType}`);
      console.log(`Configuration valid: ${isValidConfig}`);
      console.log(`Build info available: ${buildInfo ? 'Yes' : 'No'}`);
      console.log(`Connection status available: ${connectionStatus ? 'Yes' : 'No'}`);
      
      const result = deviceType && isValidConfig && buildInfo && connectionStatus !== null;
      if (result) {
        console.log(`${Colors.GREEN}BuildTimeController integration working${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}BuildTimeController integration failed${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing BuildTimeController: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test timing configuration
   */
  private async testTimingConfiguration(): Promise<boolean> {
    try {
      const timing = BuildConstants.getTimingConfig();
      const controllerTiming = BuildTimeController.getTimingConfig();
      
      console.log(`Communication timeout: ${timing.communicationTimeout}ms`);
      console.log(`Operation delay: ${timing.operationDelay}ms`);
      console.log(`Response timeout: ${timing.responseTimeout}ms`);
      console.log(`Retry interval: ${timing.retryInterval}ms`);
      
      const timingValid = timing.communicationTimeout > 0 && 
                         timing.operationDelay >= 0 && 
                         timing.responseTimeout > 0 && 
                         timing.retryInterval > 0;
      
      const timingMatches = JSON.stringify(timing) === JSON.stringify(controllerTiming);
      
      const result = timingValid && timingMatches;
      if (result) {
        console.log(`${Colors.GREEN}Timing configuration is valid and consistent${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Timing configuration has issues${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing timing configuration: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test command support
   */
  private async testCommandSupport(): Promise<boolean> {
    try {
      const basicCommands = ['UNLOCK_SLOT', 'LOCK_SLOT', 'CHECK_STATE', 'GET_STATUS'];
      const supportResults = basicCommands.map(cmd => ({
        command: cmd,
        supported: BuildConstants.supportsCommand(cmd)
      }));
      
      console.log('Command support test:');
      supportResults.forEach(result => {
        const status = result.supported ? `${Colors.GREEN}✓${Colors.RESET}` : `${Colors.RED}✗${Colors.RESET}`;
        console.log(`  ${status} ${result.command}`);
      });
      
      const invalidSupported = BuildConstants.supportsCommand('INVALID_COMMAND');
      console.log(`Invalid command rejected: ${invalidSupported ? `${Colors.RED}No${Colors.RESET}` : `${Colors.GREEN}Yes${Colors.RESET}`}`);
      
      const allBasicSupported = supportResults.every(r => r.supported);
      const result = allBasicSupported && !invalidSupported;
      
      if (result) {
        console.log(`${Colors.GREEN}Command support validation working correctly${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Command support validation failed${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing command support: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test audit logging
   */
  private async testAuditLogging(): Promise<boolean> {
    try {
      const auditSummary = BuildConstants.getAuditSummary();
      const buildInfo = BuildConstants.getBuildInfo();
      
      console.log('Audit summary contains:');
      const requiredFields = [
        'Device Type:',
        'Slot Count:',
        'Baud Rate:',
        'Build Timestamp:',
        'Validation Status:'
      ];
      
      const fieldResults = requiredFields.map(field => ({
        field,
        present: auditSummary.includes(field)
      }));
      
      fieldResults.forEach(result => {
        const status = result.present ? `${Colors.GREEN}✓${Colors.RESET}` : `${Colors.RED}✗${Colors.RESET}`;
        console.log(`  ${status} ${result.field}`);
      });
      
      const hasValidTimestamp = buildInfo.buildTimestamp && !isNaN(Date.parse(buildInfo.buildTimestamp));
      console.log(`Valid timestamp: ${hasValidTimestamp ? `${Colors.GREEN}Yes${Colors.RESET}` : `${Colors.RED}No${Colors.RESET}`}`);
      
      const allFieldsPresent = fieldResults.every(r => r.present);
      const result = allFieldsPresent && hasValidTimestamp;
      
      if (result) {
        console.log(`${Colors.GREEN}Audit logging is complete and valid${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Audit logging is incomplete${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing audit logging: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Test build scripts
   */
  private async testBuildScripts(): Promise<boolean> {
    try {
      const fs = require('fs');
      const packageJson = JSON.parse(fs.readFileSync('/Users/non/dev/smc/smc-app/package.json', 'utf8'));
      const scripts = packageJson.scripts;
      
      const requiredScripts = [
        'build:ds12',
        'build:ds16',
        'dev:ds12',
        'dev:ds16',
        'config:validate',
        'validate:phase4-1',
        'validate:build-time'
      ];
      
      console.log('Build script availability:');
      const scriptResults = requiredScripts.map(script => ({
        script,
        available: scripts[script] !== undefined
      }));
      
      scriptResults.forEach(result => {
        const status = result.available ? `${Colors.GREEN}✓${Colors.RESET}` : `${Colors.RED}✗${Colors.RESET}`;
        console.log(`  ${status} ${result.script}`);
      });
      
      const crossEnvAvailable = packageJson.devDependencies['cross-env'] !== undefined;
      console.log(`Cross-env dependency: ${crossEnvAvailable ? `${Colors.GREEN}✓${Colors.RESET}` : `${Colors.RED}✗${Colors.RESET}`}`);
      
      const allScriptsAvailable = scriptResults.every(r => r.available);
      const result = allScriptsAvailable && crossEnvAvailable;
      
      if (result) {
        console.log(`${Colors.GREEN}Build scripts are properly configured${Colors.RESET}`);
      } else {
        console.log(`${Colors.RED}Build script configuration is incomplete${Colors.RESET}`);
      }
      
      return result;
    } catch (error) {
      console.log(`${Colors.RED}Error testing build scripts: ${error}${Colors.RESET}`);
      return false;
    }
  }

  /**
   * Show test summary
   */
  private async showSummary(): Promise<void> {
    const total = this.passedTests + this.failedTests;
    const successRate = total > 0 ? ((this.passedTests / total) * 100).toFixed(1) : '0.0';
    
    console.log(`${Colors.BOLD}${Colors.CYAN}=== TEST SUMMARY ===${Colors.RESET}`);
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${Colors.GREEN}${this.passedTests}${Colors.RESET}`);
    console.log(`Failed: ${Colors.RED}${this.failedTests}${Colors.RESET}`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (this.failedTests === 0) {
      console.log(`\n${Colors.GREEN}${Colors.BOLD}🎉 All tests passed! Phase 4.1 is working correctly.${Colors.RESET}`);
    } else {
      console.log(`\n${Colors.YELLOW}${Colors.BOLD}⚠️  Some tests failed. Please review the issues above.${Colors.RESET}`);
    }
  }

  /**
   * Ask user for input
   */
  private async askUser(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }
}

// Run manual tests if script is executed directly
if (require.main === module) {
  const runner = new ManualTestRunner();
  runner.runTests().catch(error => {
    console.error(`${Colors.RED}Manual test failed:${Colors.RESET}`, error);
    process.exit(1);
  });
}

export { ManualTestRunner };