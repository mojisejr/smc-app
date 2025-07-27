import { QueryInterface, DataTypes, Transaction } from 'sequelize';
import { sequelize } from '../sequelize';
import { Setting } from '../model/setting.model';
import { Slot } from '../model/slot.model';
import { Log } from '../model/logs.model';
import fs from 'fs/promises';
import path from 'path';

export interface MigrationResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  changes: {
    settingsUpdated: boolean;
    slotsDeactivated: number;
    schemaUpdated: boolean;
  };
}

export class CU12Migration {
  private backupPath: string = '';
  private queryInterface: QueryInterface;

  constructor() {
    this.queryInterface = sequelize.getQueryInterface();
  }

  /**
   * Execute complete migration from KU16 (15-slot) to CU12 (12-slot)
   */
  async executeMigration(): Promise<MigrationResult> {
    console.log('🔄 Starting CU12 database migration...');
    
    const result: MigrationResult = {
      success: false,
      changes: {
        settingsUpdated: false,
        slotsDeactivated: 0,
        schemaUpdated: false
      }
    };

    const transaction = await sequelize.transaction();

    try {
      // Step 1: Create backup
      console.log('📦 Creating database backup...');
      result.backupPath = await this.createBackup();
      
      // Step 2: Validate current state
      console.log('🔍 Validating current database state...');
      await this.validateCurrentState();
      
      // Step 3: Update schema (add CU12 columns)
      console.log('🔧 Updating database schema...');
      await this.updateSchema(transaction);
      result.changes.schemaUpdated = true;
      
      // Step 4: Migrate configuration data
      console.log('⚙️ Migrating configuration data...');
      await this.migrateSettingsData(transaction);
      result.changes.settingsUpdated = true;
      
      // Step 5: Update slot configuration
      console.log('🎰 Updating slot configuration...');
      const deactivatedSlots = await this.migrateSlotConfiguration(transaction);
      result.changes.slotsDeactivated = deactivatedSlots;
      
      // Step 6: Validate migration
      console.log('✅ Validating migration results...');
      await this.validateMigration(transaction);
      
      await transaction.commit();
      
      // Step 7: Log successful migration
      await this.logMigrationSuccess();
      
      result.success = true;
      console.log('🎉 CU12 migration completed successfully!');
      
      return result;
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      
      result.error = error.message;
      await this.logMigrationError(error);
      
      throw error;
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  async rollbackMigration(backupPath: string): Promise<boolean> {
    try {
      console.log('🔄 Rolling back migration...');
      
      const dbPath = 'resources/db/database.db';
      await fs.copyFile(backupPath, dbPath);
      
      console.log('✅ Migration rollback completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }

  /**
   * Create database backup
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = `resources/db/backups/database-backup-${timestamp}.db`;
    
    // Ensure backup directory exists
    await fs.mkdir('resources/db/backups', { recursive: true });
    
    // Copy current database file
    const sourcePath = 'resources/db/database.db';
    await fs.copyFile(sourcePath, this.backupPath);
    
    console.log(`📦 Database backup created: ${this.backupPath}`);
    return this.backupPath;
  }

  /**
   * Validate current database state before migration
   */
  private async validateCurrentState(): Promise<void> {
    // Check if setting record exists
    const setting = await Setting.findByPk(1);
    if (!setting) {
      throw new Error('No settings record found - cannot migrate');
    }

    // Check current slot count
    const slotCount = await Slot.count();
    if (slotCount === 0) {
      console.warn('⚠️ No slot records found - will initialize during migration');
    }

    // Verify KU16 configuration exists
    if (!setting.ku_port && !setting.ku_baudrate) {
      console.warn('⚠️ No existing KU16 configuration found');
    }

    console.log(`✅ Validation passed - Found ${slotCount} slots, available_slots: ${setting.available_slots}`);
  }

  /**
   * Update database schema to add CU12 columns
   */
  private async updateSchema(transaction: Transaction): Promise<void> {
    try {
      // Check if cu_port column already exists
      const tableInfo = await this.queryInterface.describeTable('Setting');
      
      if (!tableInfo.cu_port) {
        await this.queryInterface.addColumn('Setting', 'cu_port', {
          type: DataTypes.STRING,
          allowNull: true
        }, { transaction });
        console.log('✅ Added cu_port column');
      }

      if (!tableInfo.cu_baudrate) {
        await this.queryInterface.addColumn('Setting', 'cu_baudrate', {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: 19200
        }, { transaction });
        console.log('✅ Added cu_baudrate column');
      }

      console.log('✅ Schema update completed');
    } catch (error) {
      console.error('❌ Schema update failed:', error.message);
      throw error;
    }
  }

  /**
   * Migrate settings data from KU16 to CU12
   */
  private async migrateSettingsData(transaction: Transaction): Promise<void> {
    const setting = await Setting.findByPk(1, { transaction });
    
    if (!setting) {
      throw new Error('Settings record not found');
    }

    // Migrate KU16 settings to CU12 if CU12 not already configured
    const updateData: any = {};

    if (!setting.cu_port && setting.ku_port) {
      updateData.cu_port = setting.ku_port;
      console.log(`📝 Migrating ku_port (${setting.ku_port}) to cu_port`);
    }

    if (!setting.cu_baudrate) {
      updateData.cu_baudrate = 19200; // CU12 default
      console.log('📝 Setting cu_baudrate to 19200 (CU12 default)');
    }

    // Update available slots to 12 for CU12 system
    if (setting.available_slots !== 12) {
      updateData.available_slots = 12;
      console.log(`📝 Updating available_slots from ${setting.available_slots} to 12`);
    }

    if (Object.keys(updateData).length > 0) {
      await setting.update(updateData, { transaction });
      console.log('✅ Settings data migration completed');
    } else {
      console.log('ℹ️ Settings already configured for CU12');
    }
  }

  /**
   * Update slot configuration for 12-slot system
   */
  private async migrateSlotConfiguration(transaction: Transaction): Promise<number> {
    // Ensure all 15 slots exist in database (for backward compatibility)
    const slotsToCreate = [];
    for (let slotId = 1; slotId <= 15; slotId++) {
      slotsToCreate.push({
        slotId,
        hn: '',
        timestamp: Date.now(),
        occupied: false,
        opening: false,
        isActive: slotId <= 12  // Only first 12 slots active for CU12
      });
    }

    // Use findOrCreate to avoid duplicates
    let createdCount = 0;
    for (const slotData of slotsToCreate) {
      const [slot, created] = await Slot.findOrCreate({
        where: { slotId: slotData.slotId },
        defaults: slotData,
        transaction
      });

      if (created) {
        createdCount++;
      } else if (slotData.slotId > 12 && slot.isActive) {
        // Deactivate slots 13-15 if they were previously active
        await slot.update({ isActive: false }, { transaction });
      }
    }

    // Count slots that were deactivated
    const deactivatedSlots = await Slot.count({
      where: { 
        slotId: { [sequelize.Op.gt]: 12 },
        isActive: false 
      },
      transaction
    });

    console.log(`✅ Slot configuration updated - Created: ${createdCount}, Deactivated: ${deactivatedSlots - (15 - 12)}`);
    return Math.max(0, deactivatedSlots - (15 - 12)); // Return actual deactivated count
  }

  /**
   * Validate migration results
   */
  private async validateMigration(transaction: Transaction): Promise<void> {
    // Validate settings
    const setting = await Setting.findByPk(1, { transaction });
    if (!setting) {
      throw new Error('Settings record not found after migration');
    }

    if (!setting.cu_port && !setting.ku_port) {
      throw new Error('No hardware port configuration found after migration');
    }

    if (!setting.cu_baudrate) {
      throw new Error('CU12 baudrate not configured after migration');
    }

    if (setting.available_slots !== 12) {
      throw new Error(`Available slots should be 12, found: ${setting.available_slots}`);
    }

    // Validate slot configuration
    const activeSlots = await Slot.count({
      where: { isActive: true },
      transaction
    });

    if (activeSlots > 12) {
      throw new Error(`Too many active slots after migration: ${activeSlots}`);
    }

    const totalSlots = await Slot.count({ transaction });
    if (totalSlots < 12) {
      throw new Error(`Insufficient slot records after migration: ${totalSlots}`);
    }

    console.log(`✅ Migration validation passed - Active slots: ${activeSlots}, Total slots: ${totalSlots}`);
  }

  /**
   * Log successful migration
   */
  private async logMigrationSuccess(): Promise<void> {
    await Log.create({
      user: 'system',
      message: 'CU12 database migration completed successfully - System migrated from 15-slot KU16 to 12-slot CU12'
    });
  }

  /**
   * Log migration error
   */
  private async logMigrationError(error: Error): Promise<void> {
    await Log.create({
      user: 'system',
      message: `CU12 database migration failed: ${error.message}`
    });
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    isMigrated: boolean;
    hasBackupColumns: boolean;
    slotConfiguration: {
      activeSlots: number;
      totalSlots: number;
      availableSlots: number;
    };
  }> {
    try {
      const setting = await Setting.findByPk(1);
      const activeSlots = await Slot.count({ where: { isActive: true } });
      const totalSlots = await Slot.count();

      const tableInfo = await this.queryInterface.describeTable('Setting');
      const hasBackupColumns = !!(tableInfo.cu_port && tableInfo.cu_baudrate);

      return {
        isMigrated: !!(setting?.cu_port && setting?.cu_baudrate && setting?.available_slots === 12),
        hasBackupColumns,
        slotConfiguration: {
          activeSlots,
          totalSlots,
          availableSlots: setting?.available_slots || 0
        }
      };
    } catch (error) {
      console.error('Error checking migration status:', error.message);
      return {
        isMigrated: false,
        hasBackupColumns: false,
        slotConfiguration: {
          activeSlots: 0,
          totalSlots: 0,
          availableSlots: 0
        }
      };
    }
  }
}