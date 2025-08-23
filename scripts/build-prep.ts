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

import * as fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

interface BuildConfig {
  organizationName: string;
  sharedSecretKey: string;
  buildVersion: string;
  targetPlatform: string;
  deviceType: string;
}

/**
 * Main build preparation function
 */
async function main(): Promise<void> {
  try {
    console.log('info: Starting SMC App production build preparation...');
    console.log('======================================================');

    // Parse build configuration
    const config = await parseBuildConfiguration();
    
    // Display configuration
    console.log(`info: Organization: ${config.organizationName}`);
    console.log(`info: Device Type: ${config.deviceType}`);
    console.log(`info: Build Version: ${config.buildVersion}`);
    console.log(`info: Target Platform: ${config.targetPlatform}`);
    console.log('');

    // Execute build preparation steps
    await validateBuildSafety();
    await validateBuildEnvironment(config);
    await cleanDatabase();
    await setupOrganizationData(config);
    await cleanLicenseFiles();
    await prepareResourcesDirectory();
    await validateBuildReadiness();

    console.log('');
    console.log('======================================================');
    console.log('info: Production build preparation completed successfully! 🎉');
    console.log('');
    console.log('info: Next steps:');
    console.log('  1. Run: npm run build:ds12 (or build:ds16)');
    console.log('  2. Copy license.lic to resources/ directory');
    console.log('  3. Test license activation with SMC app');
    console.log('  4. Package and deploy to customer');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Build preparation failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check .env file contains SHARED_SECRET_KEY');
    console.error('  2. Ensure ORGANIZATION_NAME environment variable is set');
    console.error('  3. Verify database permissions and Node.js version');
    console.error('  4. Check npm dependencies are installed');
    process.exit(1);
  }
}

/**
 * Parse and validate build configuration
 */
async function parseBuildConfiguration(): Promise<BuildConfig> {
  console.log('info: Parsing build configuration...');

  // Get organization name from environment or prompt
  const organizationName = process.env.ORGANIZATION_NAME || 'SMC Medical Center';
  
  // Get shared secret key from .env
  const sharedSecretKey = process.env.SHARED_SECRET_KEY || 
    'SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS';
  
  // Get device type from environment
  const deviceType = process.env.DEVICE_TYPE || 'DS12';
  
  // Get build version from package.json
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const buildVersion = packageJson.version || '1.0.0';
  
  // Detect target platform
  const targetPlatform = process.platform === 'win32' ? 'Windows' : 
                        process.platform === 'darwin' ? 'macOS' : 'Linux';

  const config: BuildConfig = {
    organizationName,
    sharedSecretKey, 
    buildVersion,
    targetPlatform,
    deviceType
  };

  console.log('info: Build configuration parsed successfully');
  return config;
}

/**
 * Validate build environment requirements
 */
async function validateBuildEnvironment(config: BuildConfig): Promise<void> {
  console.log('info: Validating build environment...');

  // Check SHARED_SECRET_KEY
  if (!config.sharedSecretKey || config.sharedSecretKey.length < 32) {
    throw new Error('SHARED_SECRET_KEY must be at least 32 characters long');
  }

  // Check organization name
  if (!config.organizationName || config.organizationName.trim().length === 0) {
    throw new Error('ORGANIZATION_NAME is required for production build');
  }

  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`info: Node.js version: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    console.warn(`warn: Node.js ${nodeVersion} may not be compatible. Recommended: v16+`);
  }

  // Check npm packages
  try {
    await execAsync('npm list --production --silent');
    console.log('info: Production dependencies verified');
  } catch (error) {
    console.warn('warn: Some npm packages may be missing - continuing...');
  }

  // Check TypeScript compilation
  try {
    await execAsync('npx tsc --noEmit');
    console.log('info: TypeScript compilation check passed');
  } catch (error) {
    console.warn('warn: TypeScript compilation issues detected - continuing...');
  }

  console.log('info: Build environment validation completed');
}

/**
 * Clean and reset database for production
 */
async function cleanDatabase(): Promise<void> {
  console.log('info: Cleaning and resetting database...');

  const dbPath = path.join(process.cwd(), 'database.db');
  const resourceDbPath = path.join(process.cwd(), 'resources', 'db', 'database.db');
  
  // Backup existing databases if they exist
  for (const currentDbPath of [dbPath, resourceDbPath]) {
    if (fs.existsSync(currentDbPath)) {
      const backupPath = `${currentDbPath}.backup.${Date.now()}`;
      fs.copyFileSync(currentDbPath, backupPath);
      console.log(`info: Database backed up: ${backupPath}`);
      
      // Remove existing database
      fs.unlinkSync(currentDbPath);
      console.log(`info: Removed existing database: ${currentDbPath}`);
    }
  }

  // Initialize Sequelize for database setup
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: resourceDbPath,
    logging: false
  });

  try {
    // Ensure resources/db directory exists
    const resourceDbDir = path.dirname(resourceDbPath);
    if (!fs.existsSync(resourceDbDir)) {
      fs.mkdirSync(resourceDbDir, { recursive: true });
      console.log(`info: Created directory: ${resourceDbDir}`);
    }

    // Create tables using raw SQL (matching Sequelize models)
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

    console.log('info: Database schema initialized');

  } catch (error) {
    console.error('error: Database initialization failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }

  console.log('info: Database cleanup completed');
}

/**
 * Setup organization data and default settings
 */
async function setupOrganizationData(config: BuildConfig): Promise<void> {
  console.log('info: Setting up organization data...');

  const resourceDbPath = path.join(process.cwd(), 'resources', 'db', 'database.db');
  
  // Initialize database connection
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: resourceDbPath,
    logging: false
  });

  try {
    // Get environment variables for configuration
    const maxLogCounts = parseInt(process.env.MAX_LOG_COUNTS || '500');
    const maxUser = parseInt(process.env.MAX_USER || '20');
    const kuBaudrate = parseInt(process.env.KU_BAUDRATE || '115200');
    const indiBaudrate = parseInt(process.env.INDI_BAUDRATE || '115200');
    const kuPort = process.env.KU_PORT || 'auto';
    const indiPort = process.env.INDI_PORT || 'auto';
    const serviceCode = process.env.SERVICE_CODE || 'SMC2025';
    
    // Calculate available slots based on device type
    const availableSlots = config.deviceType === 'DS16' ? 15 : 12;

    // Insert default settings record with complete configuration
    await sequelize.query(`
      INSERT INTO Setting (
        id, ku_port, ku_baudrate, available_slots, max_user, service_code,
        max_log_counts, organization, customer_name, activated_key,
        indi_port, indi_baudrate, device_type
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, 'CUSTOMER_ID_PLACEHOLDER', NULL,
        ?, ?, ?
      )
    `, {
      replacements: [
        kuPort, kuBaudrate, availableSlots, maxUser, serviceCode,
        maxLogCounts, config.organizationName,
        indiPort, indiBaudrate, config.deviceType
      ]
    });

    // Insert default admin user  
    await sequelize.query(`
      INSERT INTO User (
        id, name, role, passkey
      ) VALUES (
        1, 'admin1', 'admin', 'admin1'
      )
    `);

    // Initialize default slots for device type
    for (let slotId = 1; slotId <= availableSlots; slotId++) {
      await sequelize.query(`
        INSERT INTO Slot (
          slotId, hn, timestamp, occupied, opening, isActive
        ) VALUES (
          ?, NULL, NULL, false, false, true
        )
      `, {
        replacements: [slotId]
      });
    }

    // Log setup completion
    await sequelize.query(`
      INSERT INTO Log (
        user, message, createdAt
      ) VALUES (
        'system', ?, datetime('now')
      )
    `, {
      replacements: [`Production build preparation completed for ${config.organizationName}`]
    });

    console.log(`info: Organization data setup completed (${availableSlots} slots initialized)`);
    
  } catch (error) {
    console.error('error: Failed to setup organization data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

/**
 * Prepare resources directory structure
 */
async function prepareResourcesDirectory(): Promise<void> {
  console.log('info: Preparing resources directory...');

  const resourcesDir = path.join(process.cwd(), 'resources');
  
  // Create resources directory if not exists
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
    console.log('info: Created resources directory');
  }

  // Create license placeholder
  const licensePlaceholder = path.join(resourcesDir, 'license-placeholder.txt');
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
    console.log('info: Created license placeholder');
  }

  // Create build info file
  const buildInfoPath = path.join(resourcesDir, 'build-info.json');
  const buildInfo = {
    buildDate: new Date().toISOString(),
    buildVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    deviceType: process.env.DEVICE_TYPE || 'DS12',
    platform: process.platform,
    nodeVersion: process.version,
    organizationSetup: true,
    databaseInitialized: true
  };
  
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  console.log('info: Created build info file');

  console.log('info: Resources directory preparation completed');
}

/**
 * Validate build readiness before proceeding
 */
async function validateBuildReadiness(): Promise<void> {
  console.log('info: Validating build readiness...');

  // Check database exists and has correct structure
  const resourceDbPath = path.join(process.cwd(), 'resources', 'db', 'database.db');
  if (!fs.existsSync(resourceDbPath)) {
    throw new Error('Database not found at expected location');
  }

  // Check database has required tables
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: resourceDbPath,
    logging: false
  });

  try {
    const [results] = await sequelize.query(`
      SELECT name FROM sqlite_master WHERE type='table' 
      AND name IN ('User', 'Setting', 'Slot', 'Log', 'DispensingLog')
    `) as any[][];

    const tableNames = results.map((row: any) => row.name);
    const requiredTables = ['User', 'Setting', 'Slot', 'Log', 'DispensingLog'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));

    if (missingTables.length > 0) {
      throw new Error(`Missing database tables: ${missingTables.join(', ')}`);
    }

    console.log('info: Database structure validation passed');

    // Check organization data exists
    const [orgResult] = await sequelize.query(`
      SELECT organization FROM Setting WHERE id = 1
    `) as any[][];

    if (orgResult.length === 0) {
      throw new Error('Organization data not found in database');
    }

    console.log(`info: Organization data verified: ${orgResult[0].organization}`);

  } catch (error) {
    console.error('error: Database validation failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }

  // Check resources directory structure
  const resourcesDir = path.join(process.cwd(), 'resources');
  const requiredPaths = [
    path.join(resourcesDir, 'db', 'database.db'),
    path.join(resourcesDir, 'license-placeholder.txt'),
    path.join(resourcesDir, 'build-info.json')
  ];

  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required resource not found: ${requiredPath}`);
    }
  }

  console.log('info: Resources directory validation passed');
  console.log('info: Build readiness validation completed ✅');
}

// ===========================================
// PHASE 4.2: BUILD SAFETY & LICENSE CLEANUP
// ===========================================

/**
 * Validate build safety - ตรวจสอบ environment flags ก่อน production build
 */
async function validateBuildSafety(): Promise<void> {
  console.log('info: Validating build safety...');
  
  // ตรวจสอบ bypass flags ที่อาจทำให้ production build ไม่ปลอดภัย
  if (process.env.SMC_LICENSE_BYPASS_MODE === 'true') {
    console.error('❌ Cannot build production with SMC_LICENSE_BYPASS_MODE=true');
    console.error('   This would create a production build that bypasses license validation');
    console.error('   Please set SMC_LICENSE_BYPASS_MODE=false in .env file');
    throw new Error('Production build blocked - bypass mode detected');
  }
  
  if (process.env.SMC_DEV_REAL_HARDWARE === 'true') {
    console.warn('⚠️  Production build with SMC_DEV_REAL_HARDWARE=true detected');
    console.warn('   This is usually intended for development only');
    console.warn('   Consider setting SMC_DEV_REAL_HARDWARE=false for production');
    console.warn('   Continuing build in 3 seconds...');
    
    // ให้เวลา developer อ่านและตัดสินใจ
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('info: Build safety validation passed');
}

/**
 * Clean license files from build - ลบ license.lic files จากทุกที่ก่อน build
 */
async function cleanLicenseFiles(): Promise<void> {
  console.log('info: Cleaning license files from build...');
  
  const licenseFiles = [
    path.join(process.cwd(), 'resources', 'license.lic'),
    path.join(process.cwd(), 'license.lic'),
    path.join(process.cwd(), 'dist', 'license.lic'),
    path.join(process.cwd(), 'app', 'license.lic'),
    path.join(process.cwd(), 'build', 'license.lic')
  ];
  
  let removedCount = 0;
  
  for (const licenseFile of licenseFiles) {
    if (fs.existsSync(licenseFile)) {
      try {
        fs.unlinkSync(licenseFile);
        console.log(`info: Removed license file: ${licenseFile}`);
        removedCount++;
      } catch (error) {
        console.warn(`warn: Could not remove license file: ${licenseFile} - ${error}`);
      }
    }
  }
  
  if (removedCount === 0) {
    console.log('info: No license files found to clean');
  } else {
    console.log(`info: Cleaned ${removedCount} license file(s)`);
  }
  
  console.log('info: License file cleanup completed');
  console.log('info: Production build will NOT include license.lic file');
  console.log('info: License must be provided separately during deployment');
}

// Execute main function if script is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as prepareBuild };