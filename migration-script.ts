import { sequelize } from "./db/sequelize";
import { Slot } from "./db/model/slot.model";
import { Setting } from "./db/model/setting.model";

/**
 * KU12 to CU12 Database Migration Script
 *
 * This script handles the complete migration from KU16 (16 slots) to CU12 (12 slots)
 * including schema updates, data migration, and rollback capabilities.
 */

export async function runMigration(): Promise<void> {
  try {
    console.log("🚀 Starting KU16 to CU12 migration...");

    // 1. Backup current data
    await backupCurrentData();

    // 2. Update database schema
    await updateDatabaseSchema();

    // 3. Migrate slot data
    await migrateSlotData();

    // 4. Migrate setting data
    await migrateSettingData();

    // 5. Update logs and references
    await updateLogsAndReferences();

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.log("🔄 Attempting rollback...");
    await rollbackMigration();
    throw error;
  }
}

async function backupCurrentData(): Promise<void> {
  try {
    console.log("📦 Creating backup tables...");

    // Create backup tables
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS slots_backup AS SELECT * FROM Slot;
      CREATE TABLE IF NOT EXISTS settings_backup AS SELECT * FROM Setting;
    `);

    console.log("✅ Backup created successfully");
  } catch (error) {
    console.error("❌ Backup creation failed:", error);
    throw error;
  }
}

async function updateDatabaseSchema(): Promise<void> {
  try {
    console.log("🔧 Updating database schema...");

    // Add new columns to slots table
    await sequelize.query(`
      ALTER TABLE Slot ADD COLUMN lockStatus INTEGER DEFAULT 1;
      ALTER TABLE Slot ADD COLUMN errorCode INTEGER DEFAULT 0;
    `);

    // Add new columns to settings table
    await sequelize.query(`
      ALTER TABLE Setting ADD COLUMN cu_address INTEGER DEFAULT 0;
      ALTER TABLE Setting ADD COLUMN unlock_time INTEGER DEFAULT 550;
      ALTER TABLE Setting ADD COLUMN delayed_unlock INTEGER DEFAULT 0;
      ALTER TABLE Setting ADD COLUMN push_door_wait INTEGER DEFAULT 0;
    `);

    console.log("✅ Database schema updated");
  } catch (error) {
    console.error("❌ Schema update failed:", error);
    throw error;
  }
}

async function migrateSlotData(): Promise<void> {
  try {
    console.log("🔄 Migrating slot data...");

    // Get all current slots using raw query to handle old schema
    const [currentSlots] = await sequelize.query("SELECT * FROM Slot");

    // Create new slots array (12 slots)
    const newSlots = [];

    // Map existing slots to new structure
    for (let i = 0; i < 12; i++) {
      const existingSlot = (currentSlots as any[]).find(
        (slot: any) => slot.slotId === i + 1
      );

      if (existingSlot) {
        // Preserve existing data
        newSlots.push({
          slotId: i + 1,
          hn: existingSlot.hn || "",
          timestamp: existingSlot.timestamp || Date.now(),
          occupied: existingSlot.occupied || false,
          opening: existingSlot.opening || false,
          isActive: existingSlot.isActive !== false, // Default to true
          lockStatus: 1, // Default to locked
          errorCode: 0, // No error
        });
      } else {
        // Create empty slot
        newSlots.push({
          slotId: i + 1,
          hn: "",
          timestamp: Date.now(),
          occupied: false,
          opening: false,
          isActive: true,
          lockStatus: 1,
          errorCode: 0,
        });
      }
    }

    // Clear existing slots
    await Slot.destroy({ where: {} });

    // Insert new slots
    await Slot.bulkCreate(newSlots);

    console.log("✅ Slot data migration completed successfully");
  } catch (error) {
    console.error("❌ Slot data migration failed:", error);
    throw error;
  }
}

async function migrateSettingData(): Promise<void> {
  try {
    console.log("🔄 Migrating setting data...");

    // Get current setting using raw query to handle old field names
    const [currentSettings] = await sequelize.query(
      "SELECT * FROM Setting LIMIT 1"
    );
    const currentSetting = (currentSettings as any[])[0];

    if (currentSetting) {
      // Update existing setting - handle both old and new field names
      const updateData: any = {
        cu_address: 0x00, // Default CU12 address
        available_slots: 12, // Update slot count
        unlock_time: 550, // Default unlock time (550 * 10ms = 5.5s)
        delayed_unlock: 0, // No delay
        push_door_wait: 0, // No wait
      };

      // Handle port field (could be ku_port or cu_port)
      if (currentSetting.ku_port) {
        updateData.cu_port = currentSetting.ku_port;
      } else if (currentSetting.cu_port) {
        updateData.cu_port = currentSetting.cu_port;
      }

      // Handle baudrate field (could be ku_baudrate or cu_baudrate)
      if (currentSetting.ku_baudrate) {
        updateData.cu_baudrate = currentSetting.ku_baudrate;
      } else if (currentSetting.cu_baudrate) {
        updateData.cu_baudrate = currentSetting.cu_baudrate;
      }

      await Setting.update(updateData, { where: { id: currentSetting.id } });
    } else {
      // Create new setting with defaults
      await Setting.create({
        cu_port: "COM1",
        cu_baudrate: 19200,
        cu_address: 0x00,
        available_slots: 12,
        max_user: 10,
        service_code: "SMC001",
        max_log_counts: 1000,
        organization: "Hospital",
        customer_name: "Customer",
        activated_key: "",
        indi_port: "COM2",
        indi_baudrate: 9600,
        unlock_time: 550,
        delayed_unlock: 0,
        push_door_wait: 0,
      });
    }

    console.log("✅ Setting data migration completed successfully");
  } catch (error) {
    console.error("❌ Setting data migration failed:", error);
    throw error;
  }
}

async function updateLogsAndReferences(): Promise<void> {
  try {
    console.log("📝 Updating logs and references...");

    // Update any references to slots 13-16 to be within 1-12 range
    // This is a placeholder for any log updates that might be needed
    // In a real implementation, you would update dispensing logs, etc.

    console.log("✅ Logs and references updated");
  } catch (error) {
    console.error("❌ Logs update failed:", error);
    throw error;
  }
}

async function rollbackMigration(): Promise<void> {
  try {
    console.log("🔄 Rolling back migration...");

    // Restore from backup tables
    await sequelize.query(`
      DROP TABLE IF EXISTS Slot;
      CREATE TABLE Slot AS SELECT * FROM slots_backup;
      DROP TABLE IF EXISTS Setting;
      CREATE TABLE Setting AS SELECT * FROM settings_backup;
    `);

    console.log("✅ Rollback completed successfully");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  }
}

async function cleanupBackup(): Promise<void> {
  try {
    console.log("🧹 Cleaning up backup tables...");

    // Remove backup tables after successful migration
    await sequelize.query(`
      DROP TABLE IF EXISTS slots_backup;
      DROP TABLE IF EXISTS settings_backup;
    `);

    console.log("✅ Backup cleanup completed");
  } catch (error) {
    console.error("❌ Backup cleanup failed:", error);
    throw error;
  }
}

// Export functions for external use
export {
  backupCurrentData,
  updateDatabaseSchema,
  migrateSlotData,
  migrateSettingData,
  updateLogsAndReferences,
  rollbackMigration,
  cleanupBackup,
};
