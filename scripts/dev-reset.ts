#!/usr/bin/env node

/**
 * SMC App - Development Database Reset Script
 *
 * สำหรับ development environment:
 * 1. Reset database ทั้งหมด
 * 2. อ่าน license.lic และ sync ข้อมูล organization/customer
 * 3. เก็บ license ไว้สำหรับ testing (ไม่ลบออก)
 * 4. Setup development-friendly configurations
 *
 * Usage:
 *   npm run dev-reset --license=./test-license.lic
 *   npm run dev-reset (ใช้ env variables)
 */

import * as fs from "fs";
import * as path from "path";
import { Sequelize } from "sequelize";
import * as dotenv from "dotenv";
import { LicenseParser, LicenseParserError } from "./utils/licenseParser";

// Load environment variables
dotenv.config();

interface DevResetConfig {
  organizationName: string;
  customerName: string;
  sharedSecretKey: string;
  deviceType: string;
  licenseFile?: string;
  useLicenseData: boolean;
  keepLicense: boolean;
}

/**
 * Main development reset function
 */
async function main(): Promise<void> {
  try {
    console.log("info: Starting SMC App development database reset...");
    console.log("===============================================");

    // Parse configuration
    const config = await parseDevConfiguration();

    // Display configuration
    console.log(`info: Organization: ${config.organizationName}`);
    console.log(`info: Customer: ${config.customerName}`);
    console.log(`info: Device Type: ${config.deviceType}`);
    console.log(
      `info: License Mode: ${
        config.useLicenseData ? "License-based" : "Environment-based"
      }`
    );
    console.log(`info: Keep License: ${config.keepLicense ? "Yes" : "No"}`);
    console.log("");

    // Execute development reset steps
    await resetDevelopmentDatabase(config);
    await setupDevelopmentData(config);
    await setupDevelopmentSlots(config);

    if (config.useLicenseData && !config.keepLicense) {
      console.log("warn: License file will be kept for development testing");
    }

    console.log("");
    console.log("===============================================");
    console.log("info: Development reset completed successfully! 🚀");
    console.log("");
    console.log("info: Next steps:");
    console.log("  1. Run: npm run dev (or npm run dev:ds12/dev:ds16)");
    console.log("  2. Test application with synchronized license data");
    console.log("  3. Validate license-database consistency");
    console.log("");
  } catch (error: any) {
    console.error("\n❌ Development reset failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("  1. Check license file path and format");
    console.error("  2. Ensure .env file contains SHARED_SECRET_KEY");
    console.error("  3. Verify database permissions");
    console.error("  4. Check npm dependencies are installed");
    process.exit(1);
  }
}

/**
 * Parse development configuration from command line and environment
 */
async function parseDevConfiguration(): Promise<DevResetConfig> {
  console.log("info: Parsing development configuration...");

  // Parse command line arguments สำหรับ --license parameter
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

  let organizationName = process.env.ORGANIZATION_NAME || "SMC Medical (Dev)";
  let customerName = "DEV_CUSTOMER_001";
  let useLicenseData = false;

  // ถ้ามี --license parameter ให้อ่านข้อมูลจาก license
  if (licenseFile) {
    try {
      console.log(
        `info: License file specified for development: ${licenseFile}`
      );

      if (!fs.existsSync(licenseFile)) {
        throw new Error(`License file not found: ${licenseFile}`);
      }

      const licenseParser = new LicenseParser({ verbose: true });
      
      // For HKDF v2.0 licenses, provide sensitive data matching CLI generation
      // This allows license parsing during development reset
      const sensitiveDataForHKDF = {
        macAddress: 'AA:BB:CC:DD:EE:FF',  // Match CLI test license
        wifiSsid: 'TestWiFi_HKDF'         // Match CLI test license
      };
      
      console.log('info: Parsing license (using sensitive data for HKDF if needed)...');
      const licenseData = await licenseParser.parseLicenseFile(licenseFile, sensitiveDataForHKDF);

      // ใช้ข้อมูลจาก license
      organizationName = licenseData.organization;
      customerName = licenseData.customer;
      useLicenseData = true;

      console.log("info: Development reset will use license data");
      console.log(`info: License organization: ${organizationName}`);
      console.log(`info: License customer: ${customerName}`);

      // Check license expiry for development warning
      const licenseParser2 = new LicenseParser();
      if (licenseParser2.isLicenseExpired(licenseData)) {
        console.warn(
          "⚠️  License has expired - development testing may show expiry warnings"
        );
      }
    } catch (error: any) {
      if (error instanceof LicenseParserError) {
        console.error(`❌ License parsing failed: ${error.message}`);
        console.error(`Error code: ${error.code}`);
      } else {
        console.error(`❌ Error reading license: ${error.message}`);
      }
      throw new Error("Failed to parse license file for development reset.");
    }
  } else {
    console.log("info: No license file specified, using development defaults");
  }

  // Get shared secret key from .env
  const sharedSecretKey =
    process.env.SHARED_SECRET_KEY ||
    "SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS";

  // Get device type from environment
  const deviceType = process.env.DEVICE_TYPE || "DS12";

  const config: DevResetConfig = {
    organizationName,
    customerName,
    sharedSecretKey,
    deviceType,
    licenseFile: licenseFile || undefined,
    useLicenseData,
    keepLicense: true, // Always keep license in development
  };

  console.log("info: Development configuration parsed successfully");
  return config;
}

/**
 * Reset database สำหรับ development environment
 */
async function resetDevelopmentDatabase(
  _config: DevResetConfig
): Promise<void> {
  console.log("info: Resetting development database...");

  const dbPath = path.join(process.cwd(), "database.db");
  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );

  // Backup existing databases if they exist (dev-friendly)
  for (const currentDbPath of [dbPath, resourceDbPath]) {
    if (fs.existsSync(currentDbPath)) {
      const backupPath = `${currentDbPath}.dev-backup.${Date.now()}`;
      try {
        fs.copyFileSync(currentDbPath, backupPath);
        console.log(
          `info: Development backup created: ${path.basename(backupPath)}`
        );
      } catch (error) {
        console.warn(`warn: Could not create development backup: ${error}`);
      }

      // Remove existing database
      fs.unlinkSync(currentDbPath);
      console.log(
        `info: Removed existing database: ${path.basename(currentDbPath)}`
      );
    }
  }

  // Initialize Sequelize for database setup
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
  });

  try {
    // Ensure resources/db directory exists
    const resourceDbDir = path.dirname(resourceDbPath);
    if (!fs.existsSync(resourceDbDir)) {
      fs.mkdirSync(resourceDbDir, { recursive: true });
      console.log(`info: Created directory: ${resourceDbDir}`);
    }

    // Create tables using raw SQL (matching production schema)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        passkey TEXT
      );
    `);

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

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS Log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user VARCHAR(255),
        message TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    console.log("info: Development database schema initialized");
  } catch (error) {
    console.error("error: Development database initialization failed:", error);
    throw error;
  } finally {
    await sequelize.close();
  }

  console.log("info: Development database reset completed");
}

/**
 * Setup development data with license synchronization
 */
async function setupDevelopmentData(config: DevResetConfig): Promise<void> {
  console.log("info: Setting up development data...");

  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );

  // Initialize database connection
  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
  });

  try {
    // Development-friendly environment variables
    const maxLogCounts = parseInt(process.env.MAX_LOG_COUNTS || "1000"); // Higher for dev
    const maxUser = parseInt(process.env.MAX_USER || "50"); // Higher for dev
    const kuBaudrate = parseInt(process.env.KU_BAUDRATE || "115200");
    const indiBaudrate = parseInt(process.env.INDI_BAUDRATE || "115200");
    const kuPort = process.env.KU_PORT || "auto";
    const indiPort = process.env.INDI_PORT || "auto";
    const serviceCode = process.env.SERVICE_CODE || "SMC_DEV_2025"; // Dev service code

    // Calculate available slots based on device type
    const availableSlots = config.deviceType === "DS16" ? 15 : 12;

    // Insert development settings with license data
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
          config.organizationName,
          config.customerName,
          indiPort,
          indiBaudrate,
          config.deviceType,
        ],
      }
    );

    // Insert development users (more for testing)
    await sequelize.query(`
      INSERT INTO User (id, name, role, passkey) VALUES 
      (1, 'admin1', 'ADMIN', 'admin1'),
    `);

    // Log development setup
    const logMessage = config.useLicenseData
      ? `Development reset completed for ${config.organizationName} (Customer: ${config.customerName}) - License data synchronized`
      : `Development reset completed for ${config.organizationName} - Environment-based configuration`;

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
      `info: Development data setup completed (${availableSlots} slots, ${maxUser} max users)`
    );
  } catch (error) {
    console.error("error: Failed to setup development data:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Setup development slots with test data
 */
async function setupDevelopmentSlots(config: DevResetConfig): Promise<void> {
  console.log("info: Setting up development slots...");

  const resourceDbPath = path.join(
    process.cwd(),
    "resources",
    "db",
    "database.db"
  );

  const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: resourceDbPath,
    logging: false,
  });

  try {
    const availableSlots = config.deviceType === "DS16" ? 15 : 12;

    // Initialize slots สำหรับ development
    for (let slotId = 1; slotId <= availableSlots; slotId++) {
      // Add some test data for first few slots
      const isTestSlot = slotId <= 3;
      const testHN = isTestSlot
        ? `DEV_HN_${slotId.toString().padStart(3, "0")}`
        : null;
      const testTimestamp = isTestSlot ? Date.now() : null;

      await sequelize.query(
        `
        INSERT INTO Slot (
          slotId, hn, timestamp, occupied, opening, isActive
        ) VALUES (
          ?, ?, ?, ?, false, true
        )
      `,
        {
          replacements: [slotId, testHN, testTimestamp, isTestSlot],
        }
      );
    }

    console.log(
      `info: Development slots initialized (${availableSlots} slots with 3 test slots)`
    );
  } catch (error) {
    console.error("error: Failed to setup development slots:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Execute main function if script is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main as resetDevelopmentDatabase };
