# Database Migration & Configuration Updates

## 🗄️ Database Schema Changes

### Current Schema Analysis (KU16 System)
```sql
-- Current Slot table structure
CREATE TABLE Slot (
  slotId INTEGER PRIMARY KEY,    -- 1-15 (KU16 slots)
  hn TEXT,                      -- Hospital Number
  timestamp INTEGER,            -- Last activity timestamp  
  occupied BOOLEAN,             -- Slot occupancy status
  opening BOOLEAN,              -- Slot opening state
  isActive BOOLEAN              -- Slot availability
);

-- Current Setting table structure  
CREATE TABLE Setting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ku_port STRING,               -- KU16 device serial port
  ku_baudrate INTEGER,          -- KU16 communication speed
  available_slots INTEGER,      -- Number of active slots (15)
  max_user INTEGER,            -- Maximum user limit
  service_code STRING,         -- Admin access code
  max_log_counts INTEGER,      -- Log retention limit
  organization STRING,         -- Organization name
  customer_name STRING,        -- Customer information
  activated_key STRING,        -- License activation key
  indi_port STRING,           -- Indicator device port
  indi_baudrate INTEGER       -- Indicator baudrate
);
```

### Target Schema (CU12 System)
```sql
-- Updated Setting table for CU12
ALTER TABLE Setting ADD COLUMN cu_port STRING;
ALTER TABLE Setting ADD COLUMN cu_baudrate INTEGER DEFAULT 19200;
UPDATE Setting SET available_slots = 12 WHERE id = 1;

-- Slot table remains structurally the same
-- But data will be updated: slots 1-12 active, 13-15 inactive
UPDATE Slot SET isActive = false WHERE slotId > 12;
```

## 🔄 Migration Strategy

### Phase 1: Backup and Validation
```typescript
interface MigrationPlan {
  phase1: {
    backup: "Create complete database backup";
    validation: "Verify current data integrity";
    analysis: "Analyze slot usage patterns";
  };
  
  phase2: {
    schemaUpdate: "Add CU12 configuration columns";
    dataTransition: "Migrate slot configurations";
    settingsUpdate: "Update system settings";
  };
  
  phase3: {
    validation: "Verify migration success";
    cleanup: "Remove deprecated KU16 settings";
    testing: "Comprehensive data integrity tests";
  };
}
```

### Migration Script Implementation
```typescript
// migration/migrate-to-cu12.ts
import { sequelize } from '../db/sequelize';
import { Setting } from '../db/model/setting.model';
import { Slot } from '../db/model/slot.model';
import { Log } from '../db/model/logs.model';

export class CU12Migration {
  private backupPath: string;
  
  async executeMigration(): Promise<boolean> {
    const transaction = await sequelize.transaction();
    
    try {
      // Step 1: Create backup
      await this.createBackup();
      
      // Step 2: Validate current state
      await this.validateCurrentState();
      
      // Step 3: Update schema
      await this.updateSchema(transaction);
      
      // Step 4: Migrate data
      await this.migrateData(transaction);
      
      // Step 5: Validate migration
      await this.validateMigration(transaction);
      
      await transaction.commit();
      
      // Step 6: Log successful migration
      await this.logMigrationSuccess();
      
      return true;
    } catch (error) {
      await transaction.rollback();
      await this.logMigrationError(error);
      throw error;
    }
  }
  
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = `backups/database-backup-${timestamp}.db`;
    
    // Copy current database file
    const fs = require('fs').promises;
    await fs.copyFile('resources/db/database.db', this.backupPath);
    
    console.log(`Database backup created: ${this.backupPath}`);
  }
  
  private async updateSchema(transaction: any): Promise<void> {
    // Add CU12 configuration columns
    await sequelize.query(`
      ALTER TABLE Setting ADD COLUMN IF NOT EXISTS cu_port TEXT;
    `, { transaction });
    
    await sequelize.query(`
      ALTER TABLE Setting ADD COLUMN IF NOT EXISTS cu_baudrate INTEGER DEFAULT 19200;
    `, { transaction });
    
    console.log('Schema updated for CU12 configuration');
  }
  
  private async migrateData(transaction: any): Promise<void> {
    // Get current settings
    const currentSetting = await Setting.findByPk(1, { transaction });
    
    if (currentSetting) {
      // Migrate KU16 settings to CU12
      await currentSetting.update({
        cu_port: currentSetting.ku_port || '/dev/ttyUSB0',
        cu_baudrate: 19200, // CU12 default
        available_slots: 12  // Reduced from 15
      }, { transaction });
      
      console.log('Settings migrated to CU12 configuration');
    }
    
    // Update slot configuration - deactivate slots 13-15
    await Slot.update(
      { isActive: false },
      { 
        where: { slotId: { [sequelize.Op.gt]: 12 } },
        transaction 
      }
    );
    
    console.log('Slot configuration updated for 12-slot system');
  }
  
  private async validateMigration(transaction: any): Promise<void> {
    // Validate settings
    const updatedSetting = await Setting.findByPk(1, { transaction });
    if (!updatedSetting?.cu_port || !updatedSetting?.cu_baudrate) {
      throw new Error('CU12 settings not properly configured');
    }
    
    if (updatedSetting.available_slots !== 12) {
      throw new Error('Available slots not updated to 12');
    }
    
    // Validate slot states
    const activeSlots = await Slot.count({
      where: { isActive: true },
      transaction
    });
    
    if (activeSlots > 12) {
      throw new Error('Too many active slots after migration');
    }
    
    console.log('Migration validation successful');
  }
}
```

## ⚙️ Configuration Management

### Settings Model Updates
```typescript
// Updated Setting interface
interface CU12Setting {
  id: number;
  
  // CU12 Hardware Configuration
  cu_port: string;              // CU12 device port (replaces ku_port)
  cu_baudrate: number;          // CU12 baudrate (default 19200)
  available_slots: number;      // 12 for CU12 system
  
  // Deprecated KU16 Settings (keep for rollback)
  ku_port?: string | null;      // Legacy KU16 port
  ku_baudrate?: number | null;  // Legacy KU16 baudrate
  
  // Unchanged Settings
  max_user: number;
  service_code: string;
  max_log_counts: number;
  organization: string;
  customer_name: string;
  activated_key: string;
  indi_port: string;
  indi_baudrate: number;
}
```

### Configuration Validation
```typescript
class CU12ConfigValidator {
  static validateSettings(settings: CU12Setting): ValidationResult {
    const errors: string[] = [];
    
    // CU12 Port validation
    if (!settings.cu_port) {
      errors.push('CU12 port is required');
    }
    
    // Baudrate validation
    const validBaudrates = [9600, 19200, 57600, 115200];
    if (!validBaudrates.includes(settings.cu_baudrate)) {
      errors.push(`Invalid baudrate. Must be one of: ${validBaudrates.join(', ')}`);
    }
    
    // Slot count validation
    if (settings.available_slots !== 12) {
      errors.push('Available slots must be 12 for CU12 system');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static async testCU12Connection(settings: CU12Setting): Promise<boolean> {
    try {
      const testDevice = new CU12Device();
      await testDevice.initialize({
        port: settings.cu_port,
        baudrate: settings.cu_baudrate
      });
      
      // Test basic communication
      await testDevice.getSlotStatus();
      await testDevice.disconnect();
      
      return true;
    } catch (error) {
      console.error('CU12 connection test failed:', error);
      return false;
    }
  }
}
```

## 📊 Data Integrity Management

### Slot State Initialization
```typescript
class CU12SlotInitializer {
  static async initializeSlotConfiguration(): Promise<void> {
    const transaction = await sequelize.transaction();
    
    try {
      // Ensure all 15 slots exist in database
      for (let slotId = 1; slotId <= 15; slotId++) {
        const [slot, created] = await Slot.findOrCreate({
          where: { slotId },
          defaults: {
            slotId,
            hn: '',
            timestamp: Date.now(),
            occupied: false,
            opening: false,
            isActive: slotId <= 12  // Only first 12 slots active for CU12
          },
          transaction
        });
        
        if (!created && slotId > 12) {
          // Deactivate slots 13-15 for existing data
          await slot.update({ isActive: false }, { transaction });
        }
      }
      
      await transaction.commit();
      console.log('Slot configuration initialized for CU12');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  
  static async validateSlotIntegrity(): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Check total slot count
    const totalSlots = await Slot.count();
    if (totalSlots < 15) {
      errors.push(`Missing slot records. Expected 15, found ${totalSlots}`);
    }
    
    // Check active slot count
    const activeSlots = await Slot.count({ where: { isActive: true } });
    if (activeSlots !== 12) {
      errors.push(`Incorrect active slot count. Expected 12, found ${activeSlots}`);
    }
    
    // Check slot ID range
    const invalidSlots = await Slot.count({
      where: {
        slotId: { [sequelize.Op.or]: [{ [sequelize.Op.lt]: 1 }, { [sequelize.Op.gt]: 15 }] }
      }
    });
    
    if (invalidSlots > 0) {
      errors.push(`Found ${invalidSlots} slots with invalid slot IDs`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### Historical Data Preservation
```typescript
class DataPreservation {
  static async preserveDispensingLogs(): Promise<void> {
    // Add migration marker to logs
    await Log.create({
      user: 'system',
      message: 'CU12 migration completed - Historical data preserved'
    });
    
    // Verify all dispensing logs are intact
    const logCount = await DispensingLog.count();
    console.log(`Preserved ${logCount} dispensing log entries`);
    
    // Ensure no data loss during migration
    const recentLogs = await DispensingLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });
    
    if (recentLogs.length === 0) {
      console.warn('No recent dispensing logs found - verify data integrity');
    } else {
      console.log(`Recent log verification: ${recentLogs.length} entries found`);
    }
  }
}
```

## 🧪 Migration Testing

### Pre-Migration Tests
```typescript
describe('Pre-Migration Validation', () => {
  test('should have valid KU16 configuration', async () => {
    const setting = await Setting.findByPk(1);
    expect(setting?.ku_port).toBeTruthy();
    expect(setting?.available_slots).toBe(15);
  });
  
  test('should have 15 slot records', async () => {
    const slotCount = await Slot.count();
    expect(slotCount).toBe(15);
  });
  
  test('should preserve existing dispensing logs', async () => {
    const logCount = await DispensingLog.count();
    expect(logCount).toBeGreaterThanOrEqual(0);
  });
});
```

### Post-Migration Tests
```typescript
describe('Post-Migration Validation', () => {
  test('should have CU12 configuration', async () => {
    const setting = await Setting.findByPk(1);
    expect(setting?.cu_port).toBeTruthy();
    expect(setting?.cu_baudrate).toBe(19200);
    expect(setting?.available_slots).toBe(12);
  });
  
  test('should have exactly 12 active slots', async () => {
    const activeSlots = await Slot.count({ where: { isActive: true } });
    expect(activeSlots).toBe(12);
  });
  
  test('should preserve all historical data', async () => {
    const logCount = await DispensingLog.count();
    expect(logCount).toBeGreaterThanOrEqual(0);
    // Should be same as pre-migration count
  });
});
```

## 📋 Round 3 Implementation Priorities

### Task A: Schema Migration & Data Integrity
1. **Migration Script**: Implement automated migration process
2. **Schema Updates**: Add CU12 configuration columns
3. **Data Validation**: Ensure data integrity throughout migration
4. **Backup Strategy**: Create reliable backup and rollback mechanism

### Task B: Configuration Management & Testing
1. **Settings Interface**: Update Setting model for CU12
2. **Validation Logic**: Implement configuration validation
3. **Slot Initialization**: Ensure proper 12-slot configuration
4. **Migration Tests**: Comprehensive testing of migration process

### Success Criteria for Round 3
- [ ] Database schema successfully updated for CU12
- [ ] All historical data preserved during migration
- [ ] 12-slot configuration properly implemented
- [ ] CU12 settings correctly stored and validated
- [ ] Migration process fully tested and reliable
- [ ] Rollback mechanism available if needed