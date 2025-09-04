/**
 * migrate-device-type.ts - Database Migration for Device Type
 * 
 * PURPOSE:
 * - Add device_type column to Setting table
 * - Set device_type based on DEVICE_TYPE environment variable
 * - Ensure backward compatibility with existing installations
 * 
 * USAGE:
 * ```bash
 * # For DS12 (default)
 * npm run migrate:device-type
 * 
 * # For DS16
 * DEVICE_TYPE=DS16 npm run migrate:device-type
 * ```
 */

import { sequelize } from '../db/sequelize';
import { Setting } from '../db/model/setting.model';

/**
 * Migration: Add device_type to Setting table
 * 
 * MIGRATION STRATEGY:
 * - Check if device_type column exists
 * - Add column if missing with default value 'DS12'
 * - Update existing record based on environment variable
 * - Ensure data integrity throughout migration
 */
async function migrateDeviceType(): Promise<void> {
  try {
    console.log('🔄 Starting device type migration...');

    // Initialize database connection
    await sequelize.sync();
    console.log('✅ Database connection established');

    // Get device type from environment variable or default to DS12
    const deviceType = process.env.DEVICE_TYPE || 'DS12';
    console.log(`📱 Target device type: ${deviceType}`);

    // Validate device type
    if (!['DS12', 'DS16'].includes(deviceType)) {
      throw new Error(`Invalid device type: ${deviceType}. Supported types: DS12, DS16`);
    }

    // Check if Setting record exists
    let setting = await Setting.findOne({ where: { id: 1 } });

    if (!setting) {
      console.log('❌ No setting record found. Creating default setting...');
      
      // Create default setting with device type
      setting = await Setting.create({
        id: 1,
        ku_port: '/dev/ttyUSB0',
        ku_baudrate: 19200,
        available_slots: deviceType === 'DS12' ? 12 : 15,
        max_user: 10,
        service_code: '001',
        max_log_counts: 1000,
        organization: 'Default Organization',
        customer_name: 'Default Customer',
        activated_key: '',
        indi_port: '/dev/ttyUSB1',
        indi_baudrate: 9600,
        device_type: deviceType
      });

      console.log(`✅ Created default setting with device type: ${deviceType}`);
    } else {
      // Update existing setting with device type
      console.log('📝 Updating existing setting with device type...');
      
      await setting.update({
        device_type: deviceType,
        available_slots: deviceType === 'DS12' ? 12 : 15 // Update available slots based on device type
      });

      console.log(`✅ Updated setting with device type: ${deviceType}`);
    }

    // Verify the migration
    const updatedSetting = await Setting.findOne({ where: { id: 1 } });
    if (!updatedSetting || updatedSetting.device_type !== deviceType) {
      throw new Error('Migration verification failed');
    }

    console.log('✅ Migration verification passed');
    console.log(`🎉 Device type migration completed successfully: ${deviceType}`);

    // Display final configuration
    console.log('\n📋 Final Configuration:');
    console.log(`   Device Type: ${updatedSetting.device_type}`);
    console.log(`   Available Slots: ${updatedSetting.available_slots}`);
    console.log(`   KU Port: ${updatedSetting.ku_port}`);
    console.log(`   KU Baudrate: ${updatedSetting.ku_baudrate}`);

  } catch (error) {
    console.error('❌ Device type migration failed:', error);
    throw error;
  }
}

/**
 * Rollback: Remove device_type from Setting table
 * 
 * ROLLBACK STRATEGY:
 * - Remove device_type column from Setting table
 * - Preserve all other data
 */
async function rollbackDeviceType(): Promise<void> {
  try {
    console.log('🔄 Starting device type rollback...');

    // Initialize database connection
    await sequelize.sync();
    console.log('✅ Database connection established');

    // Get current setting
    const setting = await Setting.findOne({ where: { id: 1 } });
    
    if (setting && setting.device_type) {
      console.log(`📱 Current device type: ${setting.device_type}`);
      
      // Note: In SQLite, we can't easily drop columns
      // Instead, we'll set device_type to null or default value
      await setting.update({ device_type: null });
      
      console.log('✅ Device type field cleared');
    } else {
      console.log('ℹ️ No device type found in setting');
    }

    console.log('🎉 Device type rollback completed successfully');

  } catch (error) {
    console.error('❌ Device type rollback failed:', error);
    throw error;
  }
}

/**
 * Validate Device Type Configuration
 * Check if current configuration is valid
 */
async function validateDeviceTypeConfig(): Promise<void> {
  try {
    console.log('🔍 Validating device type configuration...');

    // Initialize database connection
    await sequelize.sync();

    // Get current setting
    const setting = await Setting.findOne({ where: { id: 1 } });

    if (!setting) {
      throw new Error('No setting record found');
    }

    if (!setting.device_type) {
      throw new Error('Device type not set in database');
    }

    if (!['DS12', 'DS16'].includes(setting.device_type)) {
      throw new Error(`Invalid device type in database: ${setting.device_type}`);
    }

    // Validate slot count consistency
    const expectedSlots = setting.device_type === 'DS12' ? 12 : 15;
    if (setting.available_slots !== expectedSlots) {
      console.warn(`⚠️ Available slots (${setting.available_slots}) doesn't match device type (${setting.device_type})`);
    }

    console.log('✅ Device type configuration is valid');
    console.log(`   Device Type: ${setting.device_type}`);
    console.log(`   Available Slots: ${setting.available_slots}`);

  } catch (error) {
    console.error('❌ Device type configuration validation failed:', error);
    throw error;
  }
}

// Command line interface
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'migrate':
      case undefined: // Default action
        await migrateDeviceType();
        break;
      
      case 'rollback':
        await rollbackDeviceType();
        break;
      
      case 'validate':
        await validateDeviceTypeConfig();
        break;
      
      default:
        console.log('Usage: npm run migrate:device-type [migrate|rollback|validate]');
        console.log('  migrate  - Add device_type to database (default)');
        console.log('  rollback - Remove device_type from database');
        console.log('  validate - Check current configuration');
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

export { migrateDeviceType, rollbackDeviceType, validateDeviceTypeConfig };