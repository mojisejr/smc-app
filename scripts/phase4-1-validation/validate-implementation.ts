#!/usr/bin/env ts-node

/**
 * validate-implementation.ts - Phase 4.1 Implementation Validation Script
 *
 * COMPREHENSIVE VALIDATION:
 * - BuildTimeController integration with BuildConstants
 * - Device-specific build script functionality
 * - Build-time vs runtime configuration consistency
 * - IPC handler compatibility testing
 * - Complete Phase 4.1 feature validation
 *
 * MEDICAL DEVICE COMPLIANCE:
 * - End-to-end configuration validation
 * - Audit trail generation and verification
 * - Error handling and recovery testing
 * - Build-time safety verification
 *
 * USAGE:
 * npm run validate:phase4-1
 * DEVICE_TYPE=DS12 npm run validate:phase4-1
 * DEVICE_TYPE=DS16 npm run validate:phase4-1
 */

import {
  BuildConstants,
  DeviceType,
} from "../../config/constants/BuildConstants";
import { BuildTimeController } from "../../main/ku-controllers/BuildTimeController";

// Test colors for console output
const Colors = {
  GREEN: "\x1b[32m",
  RED: "\x1b[31m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  MAGENTA: "\x1b[35m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

interface ValidationResult {
  category: string;
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  critical?: boolean;
}

class Phase41Validator {
  private results: ValidationResult[] = [];
  private startTime: number = Date.now();

  /**
   * Run complete Phase 4.1 validation
   */
  async runValidation(): Promise<void> {
    console.log(
      `${Colors.BOLD}${Colors.MAGENTA}Phase 4.1 Implementation Validation${Colors.RESET}\n`
    );
    console.log(
      `Build-Time Device Type Selection & BuildTimeController Integration`
    );
    console.log(`Started at: ${new Date().toISOString()}\n`);

    // Core validation suites
    await this.validateBuildConstants();
    await this.validateBuildTimeController();
    await this.validateDeviceConfiguration();
    await this.validateBuildScripts();
    await this.validateIntegration();
    await this.validateAuditCompliance();
    await this.validateErrorScenarios();

    // Generate comprehensive report
    this.generateReport();
  }

  /**
   * Validate BuildConstants functionality
   */
  private async validateBuildConstants(): Promise<void> {
    console.log(
      `${Colors.CYAN}Validating BuildConstants System...${Colors.RESET}`
    );

    try {
      // Test basic configuration loading
      const config = BuildConstants.getCurrentConfig();
      this.addResult({
        category: "BuildConstants",
        testName: "Configuration Loading",
        passed: config !== null && config.deviceType !== undefined,
        message: `BuildConstants should load device configuration`,
        details: { deviceType: config.deviceType, slotCount: config.slotCount },
        critical: true,
      });

      // Test device type consistency
      const deviceType = BuildConstants.getCurrentDeviceType();
      this.addResult({
        category: "BuildConstants",
        testName: "Device Type Consistency",
        passed: deviceType === config.deviceType,
        message: `Device type should be consistent across methods`,
        details: { configType: config.deviceType, directType: deviceType },
      });

      // Test validation system
      const isValid = BuildConstants.validateConfiguration();
      this.addResult({
        category: "BuildConstants",
        testName: "Configuration Validation",
        passed: isValid,
        message: `Configuration should pass validation`,
        critical: true,
      });

      // Test audit functionality
      const auditSummary = BuildConstants.getAuditSummary();
      this.addResult({
        category: "BuildConstants",
        testName: "Audit Summary Generation",
        passed: auditSummary.includes("BUILD CONFIGURATION AUDIT"),
        message: `Audit summary should be properly formatted`,
      });

      // Test timing configuration
      const timingConfig = BuildConstants.getTimingConfig();
      const hasValidTiming =
        timingConfig.communicationTimeout > 0 &&
        timingConfig.responseTimeout > 0;
      this.addResult({
        category: "BuildConstants",
        testName: "Timing Configuration",
        passed: hasValidTiming,
        message: `Timing parameters should be valid`,
        details: timingConfig,
      });
    } catch (error) {
      this.addResult({
        category: "BuildConstants",
        testName: "System Functionality",
        passed: false,
        message: `BuildConstants system error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate BuildTimeController functionality
   */
  private async validateBuildTimeController(): Promise<void> {
    console.log(
      `${Colors.CYAN}Validating BuildTimeController System...${Colors.RESET}`
    );

    try {
      // Test configuration integration
      const connectionStatus = BuildTimeController.getConnectionStatus();
      this.addResult({
        category: "BuildTimeController",
        testName: "Status Reporting",
        passed:
          connectionStatus !== null &&
          connectionStatus.deviceType !== undefined,
        message: `BuildTimeController should report status`,
        details: connectionStatus,
      });

      // Test device type consistency
      const controllerDeviceType = BuildTimeController.getDeviceType();
      const constantsDeviceType = BuildConstants.getCurrentDeviceType();
      this.addResult({
        category: "BuildTimeController",
        testName: "Device Type Integration",
        passed: controllerDeviceType === constantsDeviceType,
        message: `Controller and Constants should agree on device type`,
        details: {
          controller: controllerDeviceType,
          constants: constantsDeviceType,
        },
        critical: true,
      });

      // Test configuration validation
      const configValid = BuildTimeController.validateBuildConfiguration();
      this.addResult({
        category: "BuildTimeController",
        testName: "Build Configuration Validation",
        passed: configValid,
        message: `BuildTimeController should validate configuration`,
        critical: true,
      });

      // Test timing integration
      const controllerTiming = BuildTimeController.getTimingConfig();
      const constantsTiming = BuildConstants.getTimingConfig();
      const timingMatches =
        JSON.stringify(controllerTiming) === JSON.stringify(constantsTiming);
      this.addResult({
        category: "BuildTimeController",
        testName: "Timing Configuration Integration",
        passed: timingMatches,
        message: `Controller and Constants timing should match`,
        details: { controller: controllerTiming, constants: constantsTiming },
      });

      // Test command support
      const supportsUnlock = BuildTimeController.supportsCommand("UNLOCK_SLOT");
      const supportsInvalid =
        BuildTimeController.supportsCommand("INVALID_COMMAND");
      this.addResult({
        category: "BuildTimeController",
        testName: "Command Support Integration",
        passed: supportsUnlock && !supportsInvalid,
        message: `Command support should work correctly`,
        details: { unlock: supportsUnlock, invalid: supportsInvalid },
      });

      // Test build info integration
      const buildInfo = BuildTimeController.getBuildInfo();
      const hasBuildInfo =
        buildInfo.buildConfig &&
        buildInfo.runtimeStatus &&
        buildInfo.validationResults;
      this.addResult({
        category: "BuildTimeController",
        testName: "Build Info Integration",
        passed: hasBuildInfo,
        message: `Build info should be comprehensive`,
        details: Object.keys(buildInfo),
      });
    } catch (error) {
      this.addResult({
        category: "BuildTimeController",
        testName: "System Functionality",
        passed: false,
        message: `BuildTimeController system error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate device-specific configuration
   */
  private async validateDeviceConfiguration(): Promise<void> {
    console.log(
      `${Colors.CYAN}Validating Device-Specific Configuration...${Colors.RESET}`
    );

    try {
      // Test DS12 configuration
      const ds12Config = BuildConstants.getConfigByType("DS12");
      this.addResult({
        category: "Device Config",
        testName: "DS12 Configuration",
        passed: ds12Config.slotCount === 12 && ds12Config.deviceType === "DS12",
        message: `DS12 configuration should be correct`,
        details: {
          slotCount: ds12Config.slotCount,
          baudRate: ds12Config.baudRate,
        },
      });

      // Test DS16 configuration
      const ds16Config = BuildConstants.getConfigByType("DS16");
      this.addResult({
        category: "Device Config",
        testName: "DS16 Configuration",
        passed: ds16Config.slotCount === 16 && ds16Config.deviceType === "DS16",
        message: `DS16 configuration should be correct`,
        details: {
          slotCount: ds16Config.slotCount,
          baudRate: ds16Config.baudRate,
        },
      });

      // Test configuration differences
      const configurationsDiffer =
        ds12Config.slotCount !== ds16Config.slotCount ||
        ds12Config.baudRate !== ds16Config.baudRate;
      this.addResult({
        category: "Device Config",
        testName: "Configuration Differences",
        passed: configurationsDiffer,
        message: `DS12 and DS16 should have different configurations`,
        details: {
          DS12: { slots: ds12Config.slotCount, baud: ds12Config.baudRate },
          DS16: { slots: ds16Config.slotCount, baud: ds16Config.baudRate },
        },
      });

      // Test command set differences
      const ds12Commands = ds12Config.supportedCommands;
      const ds16Commands = ds16Config.supportedCommands;
      const commandsDiffer = ds12Commands.length !== ds16Commands.length;
      this.addResult({
        category: "Device Config",
        testName: "Command Set Differences",
        passed: commandsDiffer,
        message: `DS12 and DS16 should have different command sets`,
        details: {
          DS12: ds12Commands.length,
          DS16: ds16Commands.length,
        },
      });
    } catch (error) {
      this.addResult({
        category: "Device Config",
        testName: "Configuration System",
        passed: false,
        message: `Device configuration error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate build script configuration
   */
  private async validateBuildScripts(): Promise<void> {
    console.log(
      `${Colors.CYAN}Validating Build Script Configuration...${Colors.RESET}`
    );

    try {
      const fs = require("fs");
      const packageJson = JSON.parse(
        fs.readFileSync("/Users/non/dev/smc/smc-app/package.json", "utf8")
      );
      const scripts = packageJson.scripts;

      // Test device-specific build scripts
      const hasDS12Build = scripts["build:ds12"] !== undefined;
      const hasDS16Build = scripts["build:ds16"] !== undefined;
      this.addResult({
        category: "Build Scripts",
        testName: "Device-Specific Build Scripts",
        passed: hasDS12Build && hasDS16Build,
        message: `Should have device-specific build scripts`,
        details: { DS12: hasDS12Build, DS16: hasDS16Build },
      });

      // Test development scripts
      const hasDS12Dev = scripts["dev:ds12"] !== undefined;
      const hasDS16Dev = scripts["dev:ds16"] !== undefined;
      this.addResult({
        category: "Build Scripts",
        testName: "Device-Specific Dev Scripts",
        passed: hasDS12Dev && hasDS16Dev,
        message: `Should have device-specific dev scripts`,
        details: { DS12: hasDS12Dev, DS16: hasDS16Dev },
      });

      // Test configuration scripts
      const hasConfigValidate = scripts["config:validate"] !== undefined;
      const hasConfigDS12 = scripts["config:ds12"] !== undefined;
      const hasConfigDS16 = scripts["config:ds16"] !== undefined;
      this.addResult({
        category: "Build Scripts",
        testName: "Configuration Management Scripts",
        passed: hasConfigValidate && hasConfigDS12 && hasConfigDS16,
        message: `Should have configuration management scripts`,
        details: {
          validate: hasConfigValidate,
          ds12: hasConfigDS12,
          ds16: hasConfigDS16,
        },
      });

      // Test validation scripts
      const hasPhase41Validate = scripts["validate:phase4-1"] !== undefined;
      const hasBuildTimeValidate = scripts["validate:build-time"] !== undefined;
      this.addResult({
        category: "Build Scripts",
        testName: "Validation Scripts",
        passed: hasPhase41Validate && hasBuildTimeValidate,
        message: `Should have validation scripts`,
        details: {
          phase41: hasPhase41Validate,
          buildTime: hasBuildTimeValidate,
        },
      });

      // Test cross-env dependency
      const devDeps = packageJson.devDependencies;
      const hasCrossEnv = devDeps["cross-env"] !== undefined;
      this.addResult({
        category: "Build Scripts",
        testName: "Cross-Platform Environment Support",
        passed: hasCrossEnv,
        message: `Should have cross-env for cross-platform compatibility`,
        details: { version: devDeps["cross-env"] },
      });
    } catch (error) {
      this.addResult({
        category: "Build Scripts",
        testName: "Script Configuration",
        passed: false,
        message: `Build script validation error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate system integration
   */
  private async validateIntegration(): Promise<void> {
    console.log(
      `${Colors.CYAN}Validating System Integration...${Colors.RESET}`
    );

    try {
      // Test environment file existence
      const fs = require("fs");
      const ds12EnvExists = fs.existsSync(
        "/Users/non/dev/smc/smc-app/config/build/ds12.env"
      );
      const ds16EnvExists = fs.existsSync(
        "/Users/non/dev/smc/smc-app/config/build/ds16.env"
      );
      this.addResult({
        category: "Integration",
        testName: "Environment Files Exist",
        passed: ds12EnvExists && ds16EnvExists,
        message: `Device environment files should exist`,
        details: { DS12: ds12EnvExists, DS16: ds16EnvExists },
      });

      // Test configuration file contents
      if (ds12EnvExists) {
        const ds12Env = fs.readFileSync(
          "/Users/non/dev/smc/smc-app/config/build/ds12.env",
          "utf8"
        );
        const hasDS12Type = ds12Env.includes("DEVICE_TYPE=DS12");
        this.addResult({
          category: "Integration",
          testName: "DS12 Environment Content",
          passed: hasDS12Type,
          message: `DS12 environment file should contain correct device type`,
        });
      }

      if (ds16EnvExists) {
        const ds16Env = fs.readFileSync(
          "/Users/non/dev/smc/smc-app/config/build/ds16.env",
          "utf8"
        );
        const hasDS16Type = ds16Env.includes("DEVICE_TYPE=DS16");
        this.addResult({
          category: "Integration",
          testName: "DS16 Environment Content",
          passed: hasDS16Type,
          message: `DS16 environment file should contain correct device type`,
        });
      }

      // Test TypeScript compilation
      try {
        const { exec } = require("child_process");
        const util = require("util");
        const execPromise = util.promisify(exec);

        const { stderr } = await execPromise(
          "npx tsc --noEmit --project /Users/non/dev/smc/smc-app/tsconfig.json"
        );
        this.addResult({
          category: "Integration",
          testName: "TypeScript Compilation",
          passed: stderr === "",
          message: `TypeScript should compile without errors`,
          details: stderr ? { error: stderr } : null,
        });
      } catch (compileError) {
        this.addResult({
          category: "Integration",
          testName: "TypeScript Compilation",
          passed: false,
          message: `TypeScript compilation failed`,
          details: { error: compileError.message },
        });
      }
    } catch (error) {
      this.addResult({
        category: "Integration",
        testName: "System Integration",
        passed: false,
        message: `Integration validation error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate audit compliance
   */
  private async validateAuditCompliance(): Promise<void> {
    console.log(`${Colors.CYAN}Validating Audit Compliance...${Colors.RESET}`);

    try {
      // Test audit trail generation
      const auditSummary = BuildConstants.getAuditSummary();
      const hasRequiredFields = [
        "Device Type:",
        "Slot Count:",
        "Baud Rate:",
        "Build Timestamp:",
        "Validation Status:",
      ].every((field) => auditSummary.includes(field));

      this.addResult({
        category: "Audit Compliance",
        testName: "Audit Trail Completeness",
        passed: hasRequiredFields,
        message: `Audit trail should contain all required fields`,
        critical: true,
      });

      // Test build information
      const buildInfo = BuildConstants.getBuildInfo();
      const hasTimestamp =
        buildInfo.buildTimestamp &&
        !isNaN(Date.parse(buildInfo.buildTimestamp));
      this.addResult({
        category: "Audit Compliance",
        testName: "Build Timestamp Validity",
        passed: hasTimestamp,
        message: `Build timestamp should be valid ISO string`,
        details: { timestamp: buildInfo.buildTimestamp },
      });

      // Test configuration validation logging
      const isValid = buildInfo.isValid;
      this.addResult({
        category: "Audit Compliance",
        testName: "Validation Status Tracking",
        passed: typeof isValid === "boolean",
        message: `Validation status should be tracked`,
        details: { isValid },
      });

      // Test device configuration auditability
      const config = buildInfo.config;
      const hasAuditableConfig =
        config && config.deviceType && config.slotCount && config.baudRate;
      this.addResult({
        category: "Audit Compliance",
        testName: "Configuration Auditability",
        passed: Boolean(hasAuditableConfig),
        message: `Configuration should be fully auditable`,
        details: config,
      });
    } catch (error) {
      this.addResult({
        category: "Audit Compliance",
        testName: "Compliance System",
        passed: false,
        message: `Audit compliance error: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Validate error scenarios
   */
  private async validateErrorScenarios(): Promise<void> {
    console.log(`${Colors.CYAN}Validating Error Scenarios...${Colors.RESET}`);

    try {
      // Test invalid device type handling
      let invalidDeviceError = false;
      try {
        BuildConstants.getConfigByType("INVALID" as DeviceType);
      } catch (error) {
        invalidDeviceError = true;
      }
      this.addResult({
        category: "Error Handling",
        testName: "Invalid Device Type Error",
        passed: invalidDeviceError,
        message: `Should throw error for invalid device types`,
      });

      // Test configuration validation failure scenarios
      const originalEnv = process.env.DEVICE_TYPE;
      process.env.DEVICE_TYPE = "INVALID";

      let configError = false;
      try {
        delete require.cache[
          require.resolve("../../config/constants/BuildConstants")
        ];
        const {
          BuildConstants: InvalidConstants,
        } = require("../../config/constants/BuildConstants");
        InvalidConstants.getCurrentConfig();
      } catch (error) {
        configError = true;
      }

      this.addResult({
        category: "Error Handling",
        testName: "Invalid Configuration Error",
        passed: configError,
        message: `Should handle invalid configuration gracefully`,
      });

      // Restore environment
      if (originalEnv) {
        process.env.DEVICE_TYPE = originalEnv;
      } else {
        delete process.env.DEVICE_TYPE;
      }

      // Test BuildTimeController error handling
      const controllerReady = BuildTimeController.isReady();
      // Controller should not be ready without initialization
      this.addResult({
        category: "Error Handling",
        testName: "Uninitialized Controller State",
        passed: !controllerReady,
        message: `Controller should not be ready without initialization`,
      });

      const currentController = BuildTimeController.getCurrentController();
      this.addResult({
        category: "Error Handling",
        testName: "Null Controller Handling",
        passed: currentController === null,
        message: `Should return null for uninitialized controller`,
      });
    } catch (error) {
      this.addResult({
        category: "Error Handling",
        testName: "Error Scenario Testing",
        passed: false,
        message: `Error scenario validation failed: ${error}`,
        critical: true,
      });
    }
  }

  /**
   * Add validation result
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);
    const status = result.passed
      ? `${Colors.GREEN}PASS${Colors.RESET}`
      : `${Colors.RED}FAIL${Colors.RESET}`;
    const critical = result.critical
      ? ` ${Colors.YELLOW}[CRITICAL]${Colors.RESET}`
      : "";
    console.log(
      `  ${status} [${result.category}] ${result.testName}${critical}: ${result.message}`
    );

    if (result.details && process.env.VERBOSE) {
      console.log(`    Details:`, result.details);
    }
  }

  /**
   * Generate comprehensive validation report
   */
  private generateReport(): void {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const critical = this.results.filter((r) => !r.passed && r.critical).length;
    const total = this.results.length;

    // Category breakdown
    const categories = [...new Set(this.results.map((r) => r.category))];
    const categoryStats = categories.map((cat) => {
      const catResults = this.results.filter((r) => r.category === cat);
      const catPassed = catResults.filter((r) => r.passed).length;
      return { category: cat, passed: catPassed, total: catResults.length };
    });

    console.log(
      `\n${Colors.BOLD}${Colors.MAGENTA}=== PHASE 4.1 VALIDATION REPORT ===${Colors.RESET}`
    );
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${Colors.GREEN}${passed}${Colors.RESET}`);
    console.log(`Failed: ${Colors.RED}${failed}${Colors.RESET}`);
    console.log(
      `Critical Failures: ${Colors.RED}${Colors.BOLD}${critical}${Colors.RESET}`
    );
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    console.log(`\n${Colors.BOLD}Category Breakdown:${Colors.RESET}`);
    categoryStats.forEach((stat) => {
      const rate = ((stat.passed / stat.total) * 100).toFixed(1);
      const color = stat.passed === stat.total ? Colors.GREEN : Colors.YELLOW;
      console.log(
        `  ${color}${stat.category}: ${stat.passed}/${stat.total} (${rate}%)${Colors.RESET}`
      );
    });

    if (failed > 0) {
      console.log(`\n${Colors.RED}${Colors.BOLD}Failed Tests:${Colors.RESET}`);
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          const critical = r.critical
            ? ` ${Colors.YELLOW}[CRITICAL]${Colors.RESET}`
            : "";
          console.log(
            `  ${Colors.RED}- [${r.category}] ${r.testName}${critical}: ${r.message}${Colors.RESET}`
          );
        });
    }

    // Overall assessment
    let overallStatus = "PASSED";
    let statusColor = Colors.GREEN;

    if (critical > 0) {
      overallStatus = "CRITICAL FAILURE";
      statusColor = Colors.RED;
    } else if (failed > 0) {
      overallStatus = "PARTIAL FAILURE";
      statusColor = Colors.YELLOW;
    }

    console.log(
      `\n${Colors.BOLD}${statusColor}PHASE 4.1 STATUS: ${overallStatus}${Colors.RESET}`
    );

    if (overallStatus === "PASSED") {
      console.log(
        `\n${Colors.GREEN}${Colors.BOLD}✓ Phase 4.1 implementation is complete and validated!${Colors.RESET}`
      );
      console.log(
        `${Colors.GREEN}✓ Build-time device type selection is working correctly${Colors.RESET}`
      );
      console.log(
        `${Colors.GREEN}✓ BuildTimeController integration is functional${Colors.RESET}`
      );
      console.log(
        `${Colors.GREEN}✓ Device-specific configurations are properly set up${Colors.RESET}`
      );
      console.log(
        `${Colors.GREEN}✓ Build scripts and validation tools are ready${Colors.RESET}`
      );
    } else {
      console.log(
        `\n${Colors.RED}${Colors.BOLD}✗ Phase 4.1 implementation requires attention${Colors.RESET}`
      );
      if (critical > 0) {
        console.log(
          `${Colors.RED}✗ Critical issues must be resolved before deployment${Colors.RESET}`
        );
      }
    }

    console.log(`\n`);

    // Exit with error code for failures
    if (critical > 0 || failed > 0) {
      process.exit(1);
    }
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  const validator = new Phase41Validator();
  validator.runValidation().catch((error) => {
    console.error(
      `${Colors.RED}Phase 4.1 validation failed with error:${Colors.RESET}`,
      error
    );
    process.exit(1);
  });
}

export { Phase41Validator };
