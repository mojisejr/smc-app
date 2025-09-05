#!/usr/bin/env node

/**
 * SMC App - Production Build Preparation Script
 *
 * เตรียมการสำหรับ production build:
 * 1. อ่าน SHARED_SECRET_KEY จาก .env
 * 2. Clean + Reset ฐานข้อมูล
 * 3. ตั้งค่า Organization data
 * 4. Validate build environment
 * 5. Prepare resources directory
 *
 * Usage:
 *   npm run build-prep
 *   ORGANIZATION_NAME="SMC Medical" npm run build-prep
 *   cross-env DEVICE_TYPE=DS12 npm run build-prep
 */

import * as fs from "fs";
import * as path from "path";
import { Sequelize } from "sequelize";
import { exec } from "child_process";
import { promisify } from "util";
import * as dotenv from "dotenv";
import {
  LicenseParser,
  LicenseData,
  LicenseParserError,
} from "./utils/licenseParser";
import { runtimeLogger } from "../main/logger/runtime-logger";

// Load environment variables
dotenv.config();

// Database lock detection and retry utility
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a database lock error
      const isLockError = 
        error.message?.includes('database is locked') ||
        error.message?.includes('SQLITE_BUSY') ||
        error.code === 'SQLITE_BUSY';
      
      if (isLockError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(`warn: Database lock detected in ${operationName}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        
        await runtimeLogger({
          user: "system",
          message: `Database lock detected during ${operationName}, retrying`,
          logType: "warning",
          component: "build-prep",
          level: "warn",
          metadata: {
            operation: operationName,
            attempt,
            maxRetries,
            delay,
            error: error.message
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's not a lock error or we've exhausted retries, throw the error
      throw error;
    }
  }
  
  throw lastError!;
}

const execAsync = promisify(exec);

interface BuildConfig {
  organizationName: string;
  customerName: string;
  sharedSecretKey: string;
  buildVersion: string;
  targetPlatform: string;
  deviceType: string;
  licenseFile?: string;
  useLicenseData: boolean;
  licenseType?: "production" | "internal" | "development";
  isInternalBuild: boolean;
}

/**
 * Main build preparation function
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  try {
    await runtimeLogger({
      user: "system",
      message: "Build preparation started",
      logType: "build",
      component: "build-prep",
      level: "info",
      metadata: {
        operation: "main",
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version
      }
    });
    
    console.log("info: Starting SMC App production build preparation...");
    console.log("======================================================");

    // Parse build configuration
    const config = await parseBuildConfiguration();

    // Display configuration
    console.log(`info: Organization: ${config.organizationName}`);
    console.log(`info: Customer: ${config.customerName}`);
    console.log(`info: Device Type: ${config.deviceType}`);
    console.log(`info: Build Version: ${config.buildVersion}`);
    console.log(`info: Target Platform: ${config.targetPlatform}`);
    console.log(
      `info: License Mode: ${
        config.useLicenseData ? "License-based" : "Environment-based"
      }`
    );
    console.log(`info: License Type: ${config.licenseType || "production"}`);
    console.log(
      `info: Internal Build: ${config.isInternalBuild ? "YES" : "NO"}`
    );
    console.log("");

    // Execute build preparation steps
    await validateBuildSafety(config);
    await validateBuildEnvironment(config);
    await cleanDatabase();
    await setupOrganizationData(config);
    await cleanLicenseFiles();
    await prepareResourcesDirectory();
    await validateBuildReadiness();

    console.log("");
    console.log("======================================================");
    const duration = Date.now() - startTime;
    
    await runtimeLogger({
      user: "system",
      message: "Build preparation completed successfully",
      logType: "build",
      component: "build-prep",
      level: "info",
      metadata: {
        operation: "main",
        duration: `${duration}ms`,
        organizationName: config.organizationName,
        deviceType: config.deviceType,
        licenseType: config.licenseType,
        isInternalBuild: config.isInternalBuild,
        useLicenseData: config.useLicenseData
      }
    });
    
    console.log(
      "info: Production build preparation completed successfully! 🎉"
    );
    console.log("");
    console.log("info: Next steps:");

    if (config.isInternalBuild) {
      console.log("  🏢 INTERNAL BUILD INSTRUCTIONS:");
      console.log(
        "  1. Run: npm run build:internal:ds12 (or build:internal:ds16)"
      );
      console.log("  2. Application will bypass ESP32 hardware validation");
      console.log(
        "  3. Deploy internally without customer license restrictions"
      );
      console.log("  4. Monitor audit logs for internal license usage");
      console.log("");
      console.log(
        `info: Internal build (${config.licenseType}) - ESP32 validation bypassed`
      );
    } else if (config.useLicenseData) {
      console.log("  📦 PRODUCTION BUILD WITH LICENSE:");
      console.log("  1. Run: npm run build:ds12 (or build:ds16)");
      console.log(
        "  2. Package application (database already contains license data)"
      );
      console.log("  3. Copy license.lic separately for deployment");
      console.log("  4. Deploy to customer with license validation");
      console.log("");
      console.log(
        "info: License-based build: Database synchronized with license data"
      );
    } else {
      console.log("  🏭 STANDARD PRODUCTION BUILD:");
      console.log("  1. Run: npm run build:ds12 (or build:ds16)");
      console.log("  2. Copy license.lic to resources/ directory");
      console.log("  3. Test license activation with SMC app");
      console.log("  4. Package and deploy to customer");
    }
    console.log("");
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    await runtimeLogger({
      user: "system",
      message: "Build preparation failed",
      logType: "error",
      component: "build-prep",
      level: "error",
      metadata: {
        operation: "main",
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        platform: process.platform,
        nodeVersion: process.version
      }
    });
    
    console.error("\n❌ Build preparation failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("  1. Check .env file contains SHARED_SECRET_KEY");
    console.error("  2. Ensure ORGANIZATION_NAME environment variable is set");
    console.error("  3. Verify database permissions and Node.js version");
    console.error("  4. Check npm dependencies are installed");
    process.exit(1);
  }
}

/**
 * Parse and validate build configuration
 */
async function parseBuildConfiguration(): Promise<BuildConfig> {
  console.log("info: Parsing build configuration...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting build configuration parsing",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "parseBuildConfiguration",
      args: process.argv.slice(2)
    }
  });

  // Parse command line arguments for license file
  const args = process.argv.slice(2);
  let licenseFile: string | null = null;

  // Check for --license=file format
  const licenseArg = args.find((arg) => arg.startsWith("--license="));
  if (licenseArg) {
    licenseFile = licenseArg.split("=")[1];
  } else {
    // Check for --license file format
    const licenseIndex = args.indexOf("--license");
    if (licenseIndex !== -1 && licenseIndex + 1 < args.length) {
      licenseFile = args[licenseIndex + 1];
    }
  }

  let organizationName = process.env.ORGANIZATION_NAME || "SMC Medical Center";
  let customerName = "CUSTOMER_ID_PLACEHOLDER";
  let useLicenseData = false;
  let licenseType: "production" | "internal" | "development" | undefined;
  let isInternalBuild = false;

  // ถ้ามี --license parameter ให้อ่านข้อมูลจาก license
  if (licenseFile) {
    try {
      console.log(`info: License file specified: ${licenseFile}`);

      const licenseParser = new LicenseParser({ verbose: true });

      // For HKDF v2.0 licenses, provide sensitive data matching CLI generation
      // This allows license parsing during build-prep process
      const sensitiveDataForHKDF = {
        macAddress: "AA:BB:CC:DD:EE:FF", // Match CLI test license
        wifiSsid: "TestWiFi_HKDF", // Match CLI test license
      };

      console.log(
        "info: Parsing license (using sensitive data for HKDF if needed)..."
      );
      const licenseData = await licenseParser.parseLicenseFile(
        licenseFile,
        sensitiveDataForHKDF
      );

      // ใช้ข้อมูลจาก license แทน environment variables
      organizationName = licenseData.organization;
      customerName = licenseData.customer;
      licenseType = (licenseData as any).license_type || "production";
      isInternalBuild =
        licenseType === "internal" || licenseType === "development";
      useLicenseData = true;

      console.log("info: Using organization data from license file");
      console.log(`info: License organization: ${organizationName}`);
      console.log(`info: License customer: ${customerName}`);
      console.log(`info: License type: ${licenseType}`);

      if (isInternalBuild) {
        console.log(
          `info: Internal/Development license detected - ESP32 validation will be bypassed`
        );
      }
    } catch (error: any) {
      if (error instanceof LicenseParserError) {
        console.error(`❌ License parsing failed: ${error.message}`);
        console.error(`Error code: ${error.code}`);
      } else {
        console.error(`❌ Unexpected error reading license: ${error.message}`);
      }
      throw new Error(
        "Failed to parse license file. Build preparation aborted."
      );
    }
  } else {
    // Auto-detect license file in resources folder
    const resourcesLicenseFile = path.join(process.cwd(), "resources", "license.lic");
    
    if (fs.existsSync(resourcesLicenseFile)) {
      console.log("info: Auto-detected license file in resources folder");
      licenseFile = resourcesLicenseFile;
      
      try {
        console.log(`info: Auto-detected license file: ${licenseFile}`);

        const licenseParser = new LicenseParser({ verbose: true });

        // For HKDF v2.0 licenses, provide sensitive data matching CLI generation
        const sensitiveDataForHKDF = {
          macAddress: "AA:BB:CC:DD:EE:FF", // Match CLI test license
          wifiSsid: "TestWiFi_HKDF", // Match CLI test license
        };

        console.log(
          "info: Parsing auto-detected license (using sensitive data for HKDF if needed)..."
        );
        const licenseData = await licenseParser.parseLicenseFile(
          licenseFile,
          sensitiveDataForHKDF
        );

        // ใช้ข้อมูลจาก license แทน environment variables
        organizationName = licenseData.organization;
        customerName = licenseData.customer;
        licenseType = (licenseData as any).license_type || "production";
        isInternalBuild =
          licenseType === "internal" || licenseType === "development";
        useLicenseData = true;

        console.log("info: Using organization data from auto-detected license file");
        console.log(`info: License organization: ${organizationName}`);
        console.log(`info: License customer: ${customerName}`);
        console.log(`info: License type: ${licenseType}`);
        
        if (isInternalBuild) {
          console.log(
            `info: Internal license detected - ESP32 validation will be bypassed`
          );
        }
      } catch (error: any) {
        console.warn(`⚠️  Failed to parse auto-detected license file: ${error.message}`);
        console.log("info: Falling back to environment variables");
        // Fall back to environment variables if license parsing fails
      }
    }
    
    if (!useLicenseData) {
      console.log("info: No license file specified or auto-detected, using environment variables");
      // Check for internal build flag from environment
      const buildType = process.env.BUILD_TYPE;
      if (buildType === "internal" || buildType === "development") {
        licenseType = buildType as "internal" | "development";
        isInternalBuild = true;
        console.log(
          `info: Internal build mode detected from BUILD_TYPE=${buildType}`
        );
      }
    }
  }

  // Get shared secret key from .env
  const sharedSecretKey =
    process.env.SHARED_SECRET_KEY ||
    "SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS";

  // Get device type from environment
  const deviceType = process.env.DEVICE_TYPE || "DS12";

  // Get build version from package.json
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const buildVersion = packageJson.version || "1.0.0";

  // Detect target platform
  const targetPlatform =
    process.platform === "win32"
      ? "Windows"
      : process.platform === "darwin"
      ? "macOS"
      : "Linux";

  const config: BuildConfig = {
    organizationName,
    customerName,
    sharedSecretKey,
    buildVersion,
    targetPlatform,
    deviceType,
    licenseFile: licenseFile || undefined,
    useLicenseData,
    licenseType,
    isInternalBuild,
  };

  await runtimeLogger({
    user: "system",
    message: "Build configuration parsed successfully",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "parseBuildConfiguration",
      organizationName: config.organizationName,
      deviceType: config.deviceType,
      licenseType: config.licenseType,
      isInternalBuild: config.isInternalBuild,
      useLicenseData: config.useLicenseData
    }
  });
  
  console.log("info: Build configuration parsed successfully");
  return config;
}

/**
 * Validate build environment requirements
 */
async function validateBuildEnvironment(config: BuildConfig): Promise<void> {
  console.log("info: Validating build environment...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting build environment validation",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildEnvironment",
      nodeVersion: process.version,
      platform: process.platform
    }
  });

  // Check SHARED_SECRET_KEY
  if (!config.sharedSecretKey || config.sharedSecretKey.length < 32) {
    throw new Error("SHARED_SECRET_KEY must be at least 32 characters long");
  }

  // Check organization name
  if (!config.organizationName || config.organizationName.trim().length === 0) {
    throw new Error("ORGANIZATION_NAME is required for production build");
  }

  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`info: Node.js version: ${nodeVersion}`);

  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
  if (majorVersion < 16) {
    console.warn(
      `warn: Node.js ${nodeVersion} may not be compatible. Recommended: v16+`
    );
  }

  // Check npm packages
  try {
    await execAsync("npm list --production --silent");
    console.log("info: Production dependencies verified");
  } catch (error) {
    console.warn("warn: Some npm packages may be missing - continuing...");
  }

  // Check TypeScript compilation
  try {
    await execAsync("npx tsc --noEmit");
    console.log("info: TypeScript compilation check passed");
  } catch (error) {
    console.warn(
      "warn: TypeScript compilation issues detected - continuing..."
    );
  }

  await runtimeLogger({
    user: "system",
    message: "Build environment validation completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildEnvironment",
      nodeVersion: process.version,
      majorVersion: parseInt(process.version.slice(1).split(".")[0])
    }
  });
  
  console.log("info: Build environment validation completed");
}

/**
 * Clean and reset database for production
 */
async function cleanDatabase(): Promise<void> {
  console.log("info: Cleaning and resetting database...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting database cleanup",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "cleanDatabase"
    }
  });

  const dbPath = path.join(process.cwd(), "database.db");
  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );

  // Remove existing databases if they exist
  for (const currentDbPath of [dbPath, resourceDbPath]) {
    if (fs.existsSync(currentDbPath)) {
      fs.unlinkSync(currentDbPath);
      console.log(`info: Removed existing database: ${currentDbPath}`);
    }
  }

  // Initialize Sequelize for database setup with connection pooling
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /SQLITE_BUSY/,
        /database is locked/
      ],
      max: 3
    }
  });

  try {
    // Ensure resources/db directory exists
    const resourceDbDir = path.dirname(resourceDbPath);
    if (!fs.existsSync(resourceDbDir)) {
      fs.mkdirSync(resourceDbDir, { recursive: true });
      console.log(`info: Created directory: ${resourceDbDir}`);
    }

    // Create tables using raw SQL (matching Sequelize models) with retry logic
    await executeWithRetry(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS User (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user',
          passkey TEXT
        );
      `);
    }, "create User table");

    await executeWithRetry(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS Setting (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ku_port VARCHAR(255),
          ku_baudrate INTEGER,
          available_slots INTEGER,
          max_user INTEGER,
          service_code VARCHAR(255),
          max_log_counts INTEGER,
          organization VARCHAR(255),
          customer_name VARCHAR(255),
          activated_key VARCHAR(255),
          indi_port VARCHAR(255),
          indi_baudrate INTEGER,
          device_type VARCHAR(50) DEFAULT 'DS12'
        );
      `);
    }, "create Setting table");

    await executeWithRetry(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS Slot (
          slotId INTEGER PRIMARY KEY,
          hn TEXT,
          timestamp INTEGER,
          occupied BOOLEAN DEFAULT false,
          opening BOOLEAN DEFAULT false,
          isActive BOOLEAN DEFAULT true
        );
      `);
    }, "create Slot table");

    await executeWithRetry(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS Log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user VARCHAR(255),
          message TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }, "create Log table");

    await executeWithRetry(async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS DispensingLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER,
          userId INTEGER,
          slotId INTEGER,
          hn TEXT,
          process TEXT,
          message TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }, "create DispensingLog table");

    console.log("info: Database schema initialized");
  } catch (error) {
    console.error("error: Database initialization failed:", error);
    throw error;
  } finally {
    await executeWithRetry(
      () => sequelize.close(),
      "close database connection"
    );
  }

  await runtimeLogger({
    user: "system",
    message: "Database cleanup completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "cleanDatabase"
    }
  });
  
  console.log("info: Database cleanup completed");
}

/**
 * Setup organization data and default settings
 * Priority: License data > Environment variables > Defaults
 */
async function setupOrganizationData(config: BuildConfig): Promise<void> {
  console.log("info: Setting up organization data...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting organization data setup",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "setupOrganizationData",
      organizationName: config.organizationName,
      customerName: config.customerName,
      useLicenseData: config.useLicenseData
    }
  });

  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );

  // Initialize database connection with connection pooling
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /SQLITE_BUSY/,
        /database is locked/
      ],
      max: 3
    }
  });

  try {
    // Get environment variables for configuration
    const maxLogCounts = parseInt(process.env.MAX_LOG_COUNTS || "500");
    const maxUser = parseInt(process.env.MAX_USER || "20");
    const kuBaudrate = parseInt(process.env.KU_BAUDRATE || "115200");
    const indiBaudrate = parseInt(process.env.INDI_BAUDRATE || "115200");
    const kuPort = process.env.KU_PORT || "auto";
    const indiPort = process.env.INDI_PORT || "auto";
    const serviceCode = process.env.SERVICE_CODE || "SMC2025";

    // Calculate available slots based on device type
    const availableSlots = config.deviceType === "DS16" ? 15 : 12;

    // Determine organization and customer data with priority:
    // 1. License data (if available and valid)
    // 2. Environment variables
    // 3. Fallback defaults
    let finalOrganizationName = config.organizationName;
    let finalCustomerName = config.customerName;
    
    if (config.useLicenseData) {
      console.log("info: Using organization data from license file");
      console.log(`info: License organization: ${finalOrganizationName}`);
      console.log(`info: License customer: ${finalCustomerName}`);
      console.log(`info: License type: ${config.licenseType || "production"}`);
    } else {
      console.log("info: Using organization data from environment variables");
      // Ensure we don't use placeholder values in production
      if (finalOrganizationName === "PLACEHOLDER_ORG" || finalOrganizationName === "") {
        finalOrganizationName = process.env.ORGANIZATION_NAME || "SMC Medical Center";
        console.log(`info: Replaced placeholder organization with: ${finalOrganizationName}`);
      }
      if (finalCustomerName === "PLACEHOLDER_CUSTOMER" || finalCustomerName === "") {
        finalCustomerName = process.env.CUSTOMER_NAME || "DEFAULT_CUSTOMER";
        console.log(`info: Replaced placeholder customer with: ${finalCustomerName}`);
      }
    }

    // Insert default settings record with complete configuration
    await sequelize.query(
      `
      INSERT INTO Setting (
        id, ku_port, ku_baudrate, available_slots, max_user, service_code,
        max_log_counts, organization, customer_name, activated_key,
        indi_port, indi_baudrate, device_type
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, ?, NULL,
        ?, ?, ?
      )
    `,
      {
        replacements: [
          kuPort,
          kuBaudrate,
          availableSlots,
          maxUser,
          serviceCode,
          maxLogCounts,
          finalOrganizationName,
          finalCustomerName,
          indiPort,
          indiBaudrate,
          config.deviceType,
        ],
      }
    );

    // Insert default admin user
    await sequelize.query(`
      INSERT INTO User (
        id, name, role, passkey
      ) VALUES (
        1, 'admin1', 'ADMIN', 'admin1'
      );
    `);

    // Initialize default slots for device type
    for (let slotId = 1; slotId <= availableSlots; slotId++) {
      await sequelize.query(
        `
        INSERT INTO Slot (
          slotId, hn, timestamp, occupied, opening, isActive
        ) VALUES (
          ?, NULL, NULL, false, false, true
        )
      `,
        {
          replacements: [slotId],
        }
      );
    }

    // Log setup completion with license information
    const logMessage = config.useLicenseData
      ? `Production build preparation completed for ${config.organizationName} (Customer: ${config.customerName}) - License-based configuration`
      : `Production build preparation completed for ${config.organizationName} - Environment-based configuration`;

    await sequelize.query(
      `
      INSERT INTO Log (
        user, message, createdAt
      ) VALUES (
        'system', ?, datetime('now')
      )
    `,
      {
        replacements: [logMessage],
      }
    );

    console.log(
      `info: Organization data setup completed (${availableSlots} slots initialized)`
    );
  } catch (error) {
    await runtimeLogger({
      user: "system",
      message: "Failed to setup organization data",
      logType: "error",
      component: "build-prep",
      level: "error",
      metadata: {
        operation: "setupOrganizationData",
        error: error instanceof Error ? error.message : String(error),
        organizationName: config.organizationName
      }
    });
    
    console.error("error: Failed to setup organization data:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
  
  await runtimeLogger({
    user: "system",
    message: "Organization data setup completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "setupOrganizationData",
      organizationName: config.organizationName
    }
  });
}

/**
 * Prepare resources directory structure
 */
async function prepareResourcesDirectory(): Promise<void> {
  console.log("info: Preparing resources directory...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting resources directory preparation",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "prepareResourcesDirectory"
    }
  });

  const resourcesDir = path.join(process.cwd(), "resources");

  // Create resources directory if not exists
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
    console.log("info: Created resources directory");
  }

  // Create license placeholder
  const licensePlaceholder = path.join(resourcesDir, "license-placeholder.txt");
  if (!fs.existsSync(licensePlaceholder)) {
    const placeholderContent = `SMC License Placeholder
========================

This file indicates where license.lic should be placed.

Production Deployment Steps:
1. Generate license.lic using: smc-license generate [options]
2. Copy license.lic to this resources/ directory  
3. Replace this placeholder file
4. Test license activation with SMC application

License File Requirements:
- File name: license.lic (exact case)
- Format: AES-256-CBC encrypted JSON
- Contains: organization, customer, MAC address, expiry date
- Generated by: SMC License CLI tool

For support contact: SMC Development Team
Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(licensePlaceholder, placeholderContent);
    console.log("info: Created license placeholder");
  }

  // Create build info file
  const buildInfoPath = path.join(resourcesDir, "build-info.json");

  // Get build configuration from environment or passed config
  const buildType = process.env.BUILD_TYPE;
  const isInternalBuild =
    buildType === "internal" || buildType === "development";

  const buildInfo = {
    buildDate: new Date().toISOString(),
    buildVersion: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
    deviceType: process.env.DEVICE_TYPE || "DS12",
    platform: process.platform,
    nodeVersion: process.version,
    organizationSetup: true,
    databaseInitialized: true,
    licenseType: buildType || "production",
    isInternalBuild: isInternalBuild,
    buildMode: isInternalBuild ? "internal" : "production",
    esp32ValidationBypass: isInternalBuild,
  };

  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  console.log("info: Created build info file");

  // Inject environment variables for production build
  await injectEnvironmentVariables(buildInfo);

  await runtimeLogger({
    user: "system",
    message: "Resources directory preparation completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "prepareResourcesDirectory"
    }
  });
  
  console.log("info: Resources directory preparation completed");
}

/**
 * Inject environment variables for production build
 */
async function injectEnvironmentVariables(buildInfo: any): Promise<void> {
  console.log("info: Injecting environment variables for production build...");

  // Create environment variables file for production build
  const envVarsPath = path.join(process.cwd(), "resources", "env-vars.json");

  const envVars = {
    SMC_LICENSE_BYPASS_MODE: buildInfo.isInternalBuild ? "true" : "false",
    BUILD_TYPE: buildInfo.licenseType,
    SMC_DEV_REAL_HARDWARE: process.env.SMC_DEV_REAL_HARDWARE || "false",
    NODE_ENV: "production",
    DEVICE_TYPE: buildInfo.deviceType,
    ESP32_VALIDATION_BYPASS: buildInfo.esp32ValidationBypass ? "true" : "false",
  };

  fs.writeFileSync(envVarsPath, JSON.stringify(envVars, null, 2));
  console.log("info: Environment variables injected successfully");

  // Log the injected variables for verification
  console.log("info: Injected environment variables:");
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });
}

/**
 * Validate build readiness before proceeding
 */
async function validateBuildReadiness(): Promise<void> {
  console.log("info: Validating build readiness...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting build readiness validation",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildReadiness"
    }
  });

  // Check database exists and has correct structure
  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );
  if (!fs.existsSync(resourceDbPath)) {
    throw new Error("Database not found at expected location");
  }

  // Check database has required tables
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
    pool: {
      max: 1,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /SQLITE_BUSY/,
        /database is locked/
      ],
      max: 3
    }
  });

  try {
    const [results] = (await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table' 
      AND name IN ('User', 'Setting', 'Slot', 'Log', 'DispensingLog')
    `)) as any[][];

    const tableNames = results.map((row: any) => row.name);
    const requiredTables = ["User", "Setting", "Slot", "Log", "DispensingLog"];
    const missingTables = requiredTables.filter(
      (table) => !tableNames.includes(table)
    );

    if (missingTables.length > 0) {
      throw new Error(`Missing database tables: ${missingTables.join(", ")}`);
    }

    console.log("info: Database structure validation passed");

    // Check organization data exists
    const [orgResult] = (await sequelize.query(`
      SELECT organization FROM Setting WHERE id = 1
    `)) as any[][];

    if (orgResult.length === 0) {
      throw new Error("Organization data not found in database");
    }

    console.log(
      `info: Organization data verified: ${orgResult[0].organization}`
    );
  } catch (error) {
    console.error("error: Database validation failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }

  // Check resources directory structure
  const resourcesDir = path.join(process.cwd(), "resources");
  const requiredPaths = [
    path.join(resourcesDir, "db", "database.db"),
    path.join(resourcesDir, "license-placeholder.txt"),
    path.join(resourcesDir, "build-info.json"),
  ];

  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required resource not found: ${requiredPath}`);
    }
  }

  await runtimeLogger({
    user: "system",
    message: "Build readiness validation completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildReadiness"
    }
  });
  
  console.log("info: Resources directory validation passed");
  console.log("info: Build readiness validation completed ✅");
}

// ===========================================
// PHASE 4.2: BUILD SAFETY & LICENSE CLEANUP
// ===========================================

/**
 * Validate build safety - ตรวจสอบ environment flags ก่อน production build
 */
async function validateBuildSafety(config?: BuildConfig): Promise<void> {
  console.log("info: Validating build safety...");
  
  const isInternalBuild = config?.isInternalBuild || false;
  const licenseType = config?.licenseType || "production";
  
  await runtimeLogger({
    user: "system",
    message: "Starting build safety validation",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildSafety",
      isInternalBuild,
      licenseType,
      bypassMode: process.env.SMC_LICENSE_BYPASS_MODE,
      realHardware: process.env.SMC_DEV_REAL_HARDWARE
    }
  });

  // For internal/development builds, allow more flexibility
  if (isInternalBuild) {
    console.log(`info: Internal/Development build detected (${licenseType})`);
    console.log("info: Relaxed safety checks for internal deployment");

    if (process.env.SMC_LICENSE_BYPASS_MODE === "true") {
      console.warn("⚠️  Internal build with SMC_LICENSE_BYPASS_MODE=true");
      console.warn("   This is acceptable for internal/development builds");
    }

    if (process.env.SMC_DEV_REAL_HARDWARE === "true") {
      console.log(
        "info: SMC_DEV_REAL_HARDWARE=true is acceptable for internal builds"
      );
    }

    await runtimeLogger({
      user: "system",
      message: "Internal build safety validation passed",
      logType: "build",
      component: "build-prep",
      level: "info",
      metadata: {
        operation: "validateBuildSafety",
        licenseType,
        bypassMode: process.env.SMC_LICENSE_BYPASS_MODE
      }
    });
    
    console.log("info: Internal build safety validation passed");
    return;
  }

  // Strict safety checks for production builds
  console.log(
    "info: Production build detected - applying strict safety checks"
  );

  // ตรวจสอบ bypass flags ที่อาจทำให้ production build ไม่ปลอดภัย
  if (process.env.SMC_LICENSE_BYPASS_MODE === "true") {
    console.error(
      "❌ Cannot build production with SMC_LICENSE_BYPASS_MODE=true"
    );
    console.error(
      "   This would create a production build that bypasses license validation"
    );
    console.error("   Please set SMC_LICENSE_BYPASS_MODE=false in .env file");
    console.error(
      "   For internal builds, use BUILD_TYPE=internal or --license with internal license"
    );
    throw new Error("Production build blocked - bypass mode detected");
  }

  if (process.env.SMC_DEV_REAL_HARDWARE === "true") {
    console.warn(
      "⚠️  Production build with SMC_DEV_REAL_HARDWARE=true detected"
    );
    console.warn("   This is usually intended for development only");
    console.warn(
      "   Consider setting SMC_DEV_REAL_HARDWARE=false for production"
    );
    console.warn("   Continuing build in 3 seconds...");

    // ให้เวลา developer อ่านและตัดสินใจ
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  await runtimeLogger({
    user: "system",
    message: "Production build safety validation passed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "validateBuildSafety",
      licenseType: "production",
      bypassMode: process.env.SMC_LICENSE_BYPASS_MODE,
      realHardware: process.env.SMC_DEV_REAL_HARDWARE
    }
  });
  
  console.log("info: Production build safety validation passed");
}

/**
 * Clean license files from build - ลบ license.lic files จากทุกที่ก่อน build
 */
async function cleanLicenseFiles(): Promise<void> {
  console.log("info: Cleaning license files from build...");
  
  await runtimeLogger({
    user: "system",
    message: "Starting license file cleanup",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "cleanLicenseFiles"
    }
  });

  const licenseFiles = [
    path.join(process.cwd(), "resources", "license.lic"),
    path.join(process.cwd(), "license.lic"),
    path.join(process.cwd(), "dist", "license.lic"),
    path.join(process.cwd(), "app", "license.lic"),
    path.join(process.cwd(), "build", "license.lic"),
  ];

  let removedCount = 0;

  for (const licenseFile of licenseFiles) {
    if (fs.existsSync(licenseFile)) {
      try {
        fs.unlinkSync(licenseFile);
        console.log(`info: Removed license file: ${licenseFile}`);
        removedCount++;
      } catch (error) {
        console.warn(
          `warn: Could not remove license file: ${licenseFile} - ${error}`
        );
      }
    }
  }

  if (removedCount === 0) {
    console.log("info: No license files found to clean");
  } else {
    console.log(`info: Cleaned ${removedCount} license file(s)`);
  }

  await runtimeLogger({
    user: "system",
    message: "License file cleanup completed",
    logType: "build",
    component: "build-prep",
    level: "info",
    metadata: {
      operation: "cleanLicenseFiles",
      removedCount
    }
  });
  
  console.log("info: License file cleanup completed");
  console.log("info: Production build will NOT include license.lic file");
  console.log("info: License must be provided separately during deployment");
}

// Execute main function if script is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main as prepareBuild };
