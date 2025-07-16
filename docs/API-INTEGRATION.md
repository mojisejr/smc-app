# API-INTEGRATION.md - Database & API Refactoring

## 🎯 Round 2 Implementation Priorities

### Database Schema Migration Strategy

**Current State**: 16 slots (0-15) in 4x4 grid layout
**Target State**: 12 slots (0-11) in 3x4 grid layout

### Slot Model Updates

```typescript
// Current Slot Model (KU16)
interface Slot {
  slotId: number; // 1-16 (16 slots)
  hn: string; // Hospital Number
  timestamp: number; // Last update timestamp
  occupied: boolean; // Slot occupied status
  opening: boolean; // Slot opening status
  isActive: boolean; // Slot active status
}

// Updated Slot Model (CU12)
interface Slot {
  slotId: number; // 1-12 (12 slots)
  hn: string; // Hospital Number
  timestamp: number; // Last update timestamp
  occupied: boolean; // Slot occupied status
  opening: boolean; // Slot opening status
  isActive: boolean; // Slot active status
  // New fields for CU12
  lockStatus: number; // Lock status (0=locked, 1=unlocked)
  errorCode: number; // Error code from ASK response
}
```

### Setting Model Updates

```typescript
// Current Setting Model
interface Setting {
  ku_port: string; // KU16 port
  ku_baudrate: number; // KU16 baudrate
  available_slots: number; // 16 slots
  max_user: number;
  service_code: string;
  max_log_counts: number;
  organization: string;
  customer_name: string;
  activated_key: string;
  indi_port: string;
  indi_baudrate: number;
}

// Updated Setting Model
interface Setting {
  cu_port: string; // CU12 port (renamed)
  cu_baudrate: number; // CU12 baudrate (renamed)
  cu_address: number; // CU12 device address (new)
  available_slots: number; // 12 slots (updated)
  max_user: number;
  service_code: string;
  max_log_counts: number;
  organization: string;
  customer_name: string;
  activated_key: string;
  indi_port: string;
  indi_baudrate: number;
  // CU12 specific settings
  unlock_time: number; // Unlock time in 10ms units (default: 550)
  delayed_unlock: number; // Delayed unlock time in seconds
  push_door_wait: number; // Push door wait time in seconds
}
```

## 🔄 Data Migration Strategy

### Slot Data Migration

```typescript
// Migration script for slot data
async function migrateSlotData(): Promise<void> {
  try {
    // Get all current slots
    const currentSlots = await Slot.findAll();

    // Create new slots array (12 slots)
    const newSlots = [];

    // Map existing slots to new structure
    for (let i = 0; i < 12; i++) {
      const existingSlot = currentSlots.find((slot) => slot.slotId === i + 1);

      if (existingSlot) {
        // Preserve existing data
        newSlots.push({
          slotId: i + 1,
          hn: existingSlot.hn,
          timestamp: existingSlot.timestamp,
          occupied: existingSlot.occupied,
          opening: existingSlot.opening,
          isActive: existingSlot.isActive,
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

    console.log("Slot data migration completed successfully");
  } catch (error) {
    console.error("Slot data migration failed:", error);
    throw error;
  }
}
```

### Setting Data Migration

```typescript
// Migration script for settings
async function migrateSettingData(): Promise<void> {
  try {
    const currentSetting = await Setting.findOne();

    if (currentSetting) {
      // Update existing setting
      await currentSetting.update({
        cu_port: currentSetting.ku_port, // Rename port
        cu_baudrate: currentSetting.ku_baudrate, // Rename baudrate
        cu_address: 0x00, // Default CU12 address
        available_slots: 12, // Update slot count
        unlock_time: 550, // Default unlock time (550 * 10ms = 5.5s)
        delayed_unlock: 0, // No delay
        push_door_wait: 0, // No wait
      });
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

    console.log("Setting data migration completed successfully");
  } catch (error) {
    console.error("Setting data migration failed:", error);
    throw error;
  }
}
```

## 🔌 IPC Handler Migration

### Current IPC Structure (KU16)

```
main/ku16/ipcMain/
├── checkLockedBack.ts
├── deactivate-admin.ts
├── deactivate.ts
├── deactivateAll.ts
├── dispensing-continue.ts
├── dispensing.ts
├── forceReset.ts
├── getPortList.ts
├── init.ts
├── reactivate-admin.ts
├── reactiveAll.ts
├── reset.ts
└── unlock.ts
```

### Target IPC Structure (CU12)

```
main/cu12/ipcMain/
├── checkLockedBack.ts
├── deactivate-admin.ts
├── deactivate.ts
├── deactivateAll.ts
├── dispensing-continue.ts
├── dispensing.ts
├── forceReset.ts
├── getPortList.ts
├── init.ts
├── reactivate-admin.ts
├── reactiveAll.ts
├── reset.ts
├── unlock.ts
└── configure.ts (new - CU12 specific)
```

### IPC Handler Migration Pattern

```typescript
// Example: unlock.ts migration
// Current KU16 implementation
ipcMain.handle("unlock-slot", async (event, slotId: number) => {
  try {
    const result = await ku16.unlock(slotId);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// New CU12 implementation
ipcMain.handle("unlock-slot", async (event, slotId: number) => {
  try {
    // Validate slot ID for CU12 (1-12)
    if (slotId < 1 || slotId > 12) {
      throw new Error("Invalid slot ID. CU12 supports slots 1-12 only.");
    }

    // Convert slot ID to lock number (0-11)
    const locknum = slotId - 1;

    const result = await cu12.unlock(locknum);

    // Update slot status in database
    await Slot.update(
      {
        opening: true,
        timestamp: Date.now(),
        lockStatus: 0, // Unlocked
      },
      { where: { slotId } }
    );

    return { success: true, data: result };
  } catch (error) {
    // Enhanced error handling with ASK codes
    const errorMessage = error.message || "Unknown error occurred";
    return {
      success: false,
      error: errorMessage,
      errorCode: error.errorCode || 0,
    };
  }
});
```

### New CU12-Specific IPC Handlers

```typescript
// configure.ts - CU12 configuration handler
ipcMain.handle(
  "configure-cu12",
  async (
    event,
    config: {
      unlockTime?: number;
      delayedUnlock?: number;
      pushDoorWait?: number;
      baudRate?: number;
      address?: number;
    }
  ) => {
    try {
      const setting = await Setting.findOne();
      if (!setting) {
        throw new Error("Settings not found");
      }

      // Update unlock time if provided
      if (config.unlockTime !== undefined) {
        await cu12.setUnlockTime(config.unlockTime);
        await setting.update({ unlock_time: config.unlockTime });
      }

      // Update delayed unlock if provided
      if (config.delayedUnlock !== undefined) {
        const data = Buffer.alloc(1);
        data[0] = config.delayedUnlock;
        await cu12.sendCommand(
          buildCommand(setting.cu_address, 0x0c, 0x84, data)
        );
        await setting.update({ delayed_unlock: config.delayedUnlock });
      }

      // Update push door wait if provided
      if (config.pushDoorWait !== undefined) {
        const data = Buffer.alloc(1);
        data[0] = config.pushDoorWait;
        await cu12.sendCommand(
          buildCommand(setting.cu_address, 0x0c, 0x85, data)
        );
        await setting.update({ push_door_wait: config.pushDoorWait });
      }

      return { success: true, message: "CU12 configuration updated" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);

// get-cu12-status.ts - Enhanced status handler
ipcMain.handle("get-cu12-status", async (event) => {
  try {
    const setting = await Setting.findOne();
    if (!setting) {
      throw new Error("Settings not found");
    }

    // Get device status
    const deviceStatus = await cu12.getStatus();

    // Get all slots status
    const slots = await Slot.findAll({
      where: { isActive: true },
      order: [["slotId", "ASC"]],
    });

    return {
      success: true,
      data: {
        deviceStatus,
        slots: slots.map((slot) => ({
          slotId: slot.slotId,
          hn: slot.hn,
          occupied: slot.occupied,
          opening: slot.opening,
          lockStatus: slot.lockStatus,
          errorCode: slot.errorCode,
          timestamp: slot.timestamp,
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## 🔄 Database Migration Scripts

### Complete Migration Script

```typescript
// migration-script.ts
import { sequelize } from "../db/sequelize";
import { Slot, Setting } from "../db/model";

export async function runMigration(): Promise<void> {
  try {
    console.log("Starting KU16 to CU12 migration...");

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

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    // Rollback logic here
    throw error;
  }
}

async function backupCurrentData(): Promise<void> {
  // Create backup tables
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS slots_backup AS SELECT * FROM slots;
    CREATE TABLE IF NOT EXISTS settings_backup AS SELECT * FROM settings;
  `);
  console.log("Backup created successfully");
}

async function updateDatabaseSchema(): Promise<void> {
  // Add new columns to slots table
  await sequelize.query(`
    ALTER TABLE slots ADD COLUMN lockStatus INTEGER DEFAULT 1;
    ALTER TABLE slots ADD COLUMN errorCode INTEGER DEFAULT 0;
  `);

  // Add new columns to settings table
  await sequelize.query(`
    ALTER TABLE settings ADD COLUMN cu_address INTEGER DEFAULT 0;
    ALTER TABLE settings ADD COLUMN unlock_time INTEGER DEFAULT 550;
    ALTER TABLE settings ADD COLUMN delayed_unlock INTEGER DEFAULT 0;
    ALTER TABLE settings ADD COLUMN push_door_wait INTEGER DEFAULT 0;
  `);

  console.log("Database schema updated");
}
```

## ⚠️ Migration Considerations

### Data Preservation

- **Slot Data**: Preserve HN assignments for slots 1-12
- **Logs**: Maintain dispensing logs with updated slot references
- **Settings**: Preserve existing configuration where applicable

### Rollback Strategy

- **Backup Tables**: Create backup before migration
- **Validation**: Verify data integrity after migration
- **Rollback Script**: Ability to restore from backup if needed

### Testing Requirements

- **Data Integrity**: Verify all slot data preserved correctly
- **API Compatibility**: Ensure existing API calls still work
- **Error Handling**: Test new error codes and responses
- **Performance**: Validate system performance with 12 slots
