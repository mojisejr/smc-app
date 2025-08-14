# Phase 5: Database Schema Updates

**Status**: ⏸️ **PENDING**  
**Duration**: 1-2 days  
**Priority**: Medium

## Objective

Update database schema and Sequelize models to support DS12 device type, device type selection, and enhanced slot management for 12-slot configuration with proper data migration from existing legacy data.

## Prerequisites

- ✅ **Phase 1 Complete**: Protocol foundation established  
- ✅ **Phase 2 Complete**: DS12Controller implemented
- ✅ **Phase 3 Complete**: Serial communication integration
- ✅ **Phase 4 Complete**: IPC handlers refactored
- ✅ **Existing Database**: SQLite database with legacy slot data

## Current Database Analysis

### Existing Models (Reference):
```
/db/model/
├── dispensing-logs.model.ts
├── logs.model.ts
├── setting.model.ts
├── slot.model.ts
└── user.model.ts
```

### Existing Schema Review:
- **Slots**: Currently supports variable slot count
- **Settings**: Device configuration and ports
- **Logs**: General system logging
- **Dispensing Logs**: Medical operation audit trail
- **Users**: User authentication and roles

## Task Breakdown

### Task 5.1: Database Schema Analysis and Design
**Estimate**: 2-3 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending

#### Subtasks:
- [ ] Analyze current slot.model.ts structure
- [ ] Review setting.model.ts for device type support
- [ ] Assess dispensing-logs.model.ts compatibility
- [ ] Design schema changes for DS12 support
- [ ] Plan data migration strategy
- [ ] Document schema changes and rationale

#### Success Criteria:
- Current schema thoroughly analyzed and documented
- DS12 schema changes clearly defined
- Migration strategy preserves existing data
- No breaking changes to existing functionality
- Schema supports future DS16 expansion
- Medical compliance requirements maintained

#### Schema Analysis Results:
```typescript
// Current Slot Model Analysis (estimated structure)
interface CurrentSlot {
  id: number;
  slotId: number;        // 1-16 for DS16
  status: string;        // 'active', 'inactive', 'locked', 'empty'
  patientHN?: string;    // Hospital Number
  medication?: string;   // Medication details
  lastAccessed?: Date;   // Last operation timestamp
  createdAt: Date;
  updatedAt: Date;
}

// Proposed DS12 Enhancements
interface EnhancedSlot extends CurrentSlot {
  deviceType: 'DS12' | 'DS16';  // Device type association
  maxSlots: number;                       // Device-specific slot count
  hardwareAddress?: number;               // For DS12 addressing
  protocolVersion?: string;               // Protocol compatibility
}
```

### Task 5.2: Update Slot Model for Multi-Device Support
**Estimate**: 3-4 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 5.1

#### Subtasks:
- [ ] Add deviceType field to slot.model.ts
- [ ] Add maxSlots constraint validation
- [ ] Update slot validation for 12-slot DS12
- [ ] Add device-specific metadata fields
- [ ] Implement device type indexing
- [ ] Add slot range validation per device type

#### Success Criteria:
- Slot model supports multiple device types
- 12-slot validation works for DS12
- 16-slot validation preserved for DS16
- Device type properly indexed for performance
- Existing slot data remains compatible
- Slot operations respect device-specific limits

#### Enhanced Slot Model:
```typescript
// Updated slot.model.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize';

interface SlotAttributes {
  id: number;
  slotId: number;
  deviceType: 'DS12' | 'DS16';
  devicePort?: string;
  status: 'active' | 'inactive' | 'locked' | 'empty' | 'error';
  patientHN?: string;
  medication?: string;
  lastAccessed?: Date;
  hardwareAddress?: number;
  protocolVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SlotCreationAttributes extends Optional<SlotAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Slot extends Model<SlotAttributes, SlotCreationAttributes> implements SlotAttributes {
  public id!: number;
  public slotId!: number;
  public deviceType!: 'DS12' | 'DS16';
  public devicePort?: string;
  public status!: 'active' | 'inactive' | 'locked' | 'empty' | 'error';
  public patientHN?: string;
  public medication?: string;
  public lastAccessed?: Date;
  public hardwareAddress?: number;
  public protocolVersion?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Device-specific validations
  static validateSlotRange(slotId: number, deviceType: string): boolean {
    const maxSlots = deviceType === 'DS12' ? 12 : 16;
    return slotId >= 1 && slotId <= maxSlots;
  }
  
  // Get slots by device type
  static async getSlotsByDevice(deviceType: string, devicePort?: string): Promise<Slot[]> {
    const where: any = { deviceType };
    if (devicePort) where.devicePort = devicePort;
    
    return await Slot.findAll({
      where,
      order: [['slotId', 'ASC']]
    });
  }
}
```

### Task 5.3: Update Settings Model for Device Management
**Estimate**: 2-3 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 5.1

#### Subtasks:
- [ ] Add deviceType to setting.model.ts
- [ ] Add device capability configuration
- [ ] Update port selection with device association
- [ ] Add device-specific protocol settings
- [ ] Implement device configuration validation
- [ ] Add device migration settings

#### Success Criteria:
- Settings model supports device type selection
- Device capabilities properly configured
- Port settings associated with device types
- Protocol settings device-specific
- Configuration validation prevents invalid setups
- Migration settings track upgrade progress

#### Enhanced Settings Model:
```typescript
// Updated setting.model.ts additions
interface DeviceSettings {
  deviceType: 'DS12' | 'DS16';
  selectedPort: string;
  baudRate: number;
  maxSlots: number;
  protocolVersion: string;
  hardwareAddress?: number;
  capabilities: string[];  // JSON array of device capabilities
  lastConnected?: Date;
  migrationCompleted?: boolean;
}

// New device configuration methods
class Setting extends Model {
  // ... existing properties ...
  
  static async getDeviceConfiguration(): Promise<DeviceSettings | null> {
    const setting = await Setting.findOne({
      where: { key: 'device_configuration' }
    });
    
    return setting ? JSON.parse(setting.value) : null;
  }
  
  static async updateDeviceConfiguration(config: DeviceSettings): Promise<void> {
    await Setting.upsert({
      key: 'device_configuration',
      value: JSON.stringify(config)
    });
  }
}
```

### Task 5.4: Create Data Migration Scripts
**Estimate**: 3-4 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 5.1, 5.2, 5.3

#### Subtasks:
- [ ] Create legacy to DS12 slot migration script
- [ ] Implement device type detection and assignment
- [ ] Add data integrity validation
- [ ] Create rollback migration capability
- [ ] Add migration progress tracking
- [ ] Test migration with production data copies

#### Success Criteria:
- Existing legacy slots migrated to proper device type
- No data loss during migration
- Migration can be rolled back if needed
- Progress tracking provides user feedback
- Data integrity maintained throughout process
- Migration tested with various data scenarios

#### Migration Implementation:
```typescript
// migrations/001-add-device-type-support.ts
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add new columns to slots table
  await queryInterface.addColumn('Slots', 'deviceType', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'LEGACY'  // Default existing data to legacy type
  });
  
  await queryInterface.addColumn('Slots', 'devicePort', {
    type: DataTypes.STRING,
    allowNull: true
  });
  
  await queryInterface.addColumn('Slots', 'hardwareAddress', {
    type: DataTypes.INTEGER,
    allowNull: true
  });
  
  // Migrate existing slot data
  await migrateExistingSlots();
  
  // Update settings with device configuration
  await migrateDeviceSettings();
}

async function migrateExistingSlots(): Promise<void> {
  // Get current port setting
  const currentPort = await getCurrentPortSetting();
  
  // Update all existing slots with legacy device type and current port
  await queryInterface.bulkUpdate('Slots', {
    deviceType: 'LEGACY',
    devicePort: currentPort
  }, {});
  
  console.log('Successfully migrated existing slots to legacy device type');
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Rollback migration
  await queryInterface.removeColumn('Slots', 'deviceType');
  await queryInterface.removeColumn('Slots', 'devicePort');
  await queryInterface.removeColumn('Slots', 'hardwareAddress');
  
  console.log('Rolled back device type migration');
}
```

### Task 5.5: Update Dispensing Logs for Device Tracking
**Estimate**: 2-3 hours  
**Priority**: Medium  
**Status**: ⏸️ Pending  
**Dependencies**: Task 5.1, 5.2

#### Subtasks:
- [ ] Add deviceType to dispensing-logs.model.ts
- [ ] Add device-specific operation tracking
- [ ] Update audit trail with device information
- [ ] Add protocol version tracking
- [ ] Implement device operation analytics
- [ ] Update compliance reporting

#### Success Criteria:
- Dispensing logs track device type for all operations
- Audit trail includes device-specific information
- Protocol version tracked for compliance
- Analytics support device comparison
- Compliance reporting includes device details
- Historical data analysis by device type possible

#### Enhanced Dispensing Logs:
```typescript
// Updated dispensing-logs.model.ts additions
interface DispensingLogAttributes {
  // ... existing attributes ...
  deviceType: 'DS12' | 'DS16';
  devicePort?: string;
  protocolVersion?: string;
  hardwareAddress?: number;
  operationDuration?: number;  // milliseconds
  errorCode?: string;
  recoveryAttempts?: number;
}

class DispensingLog extends Model<DispensingLogAttributes> {
  // ... existing implementation ...
  
  // Device-specific analytics
  static async getOperationsByDevice(
    deviceType: string,
    startDate: Date,
    endDate: Date
  ): Promise<DispensingLog[]> {
    return await DispensingLog.findAll({
      where: {
        deviceType,
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  }
  
  // Performance analytics by device
  static async getPerformanceMetrics(deviceType: string): Promise<any> {
    return await DispensingLog.findAll({
      where: { deviceType },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('operationDuration')), 'avgDuration'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOperations'],
        [sequelize.fn('COUNT', sequelize.col('errorCode')), 'errorCount']
      ],
      raw: true
    });
  }
}
```

### Task 5.6: Create Database Testing and Validation
**Estimate**: 2-3 hours  
**Priority**: Medium  
**Status**: ⏸️ Pending  
**Dependencies**: All implementation tasks

#### Subtasks:
- [ ] Create database model unit tests
- [ ] Test migration scripts with sample data
- [ ] Validate data integrity after migration
- [ ] Test device type switching scenarios
- [ ] Create performance tests for queries
- [ ] Add database backup and restore testing

#### Success Criteria:
- All model changes thoroughly tested
- Migration scripts validated with real data
- Data integrity maintained across all operations
- Device switching doesn't corrupt data
- Query performance acceptable for UI responsiveness
- Backup/restore procedures work correctly

## Testing Strategy

### Unit Testing
- Model validation and constraints
- Migration script functionality
- Data integrity checks
- Query performance testing

### Integration Testing
- Database operations with DS12Controller
- Migration from real legacy data
- Device type switching scenarios
- Concurrent operation handling

### Performance Testing
- Query response times
- Migration execution time
- Concurrent access patterns
- Database growth impact

## Risk Mitigation

### High-Risk Areas
1. **Data Migration**: Potential data loss during legacy to DS12 migration
   - **Mitigation**: Complete backup, rollback capability, testing with copies
2. **Schema Changes**: Breaking existing functionality
   - **Mitigation**: Backward compatibility, staged migration, comprehensive testing
3. **Performance Impact**: New fields affecting query performance
   - **Mitigation**: Proper indexing, query optimization, performance testing

### Known Challenges
1. **Production Data Migration**: Varies greatly by installation
2. **Concurrent Access**: Migration while system is running
3. **Storage Constraints**: Additional fields increasing database size

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Migration Success Rate | 100% | Test with production data copies |
| Query Performance | <100ms | Database query benchmarking |
| Data Integrity | 100% | Validation script verification |
| Storage Overhead | <20% increase | Database size monitoring |
| Migration Time | <5 minutes | Timed migration execution |

## Phase 5 Deliverables

### Primary Deliverables
- **Updated Database Models**: DS12-compatible Sequelize models
- **Migration Scripts**: Safe legacy to DS12 data migration
- **Database Documentation**: Schema changes and rationale

### Supporting Deliverables
- **Test Suite**: Database operation testing
- **Migration Guide**: Step-by-step migration procedures
- **Performance Benchmarks**: Database performance metrics

## Next Phase Preparation

Upon completion of Phase 5, the following will be ready for Phase 6:

1. **Multi-Device Database**: Support for DS12 and DS16 data
2. **Migration Framework**: Proven data migration procedures
3. **Enhanced Logging**: Device-specific operation tracking
4. **Performance Baseline**: Database performance metrics

## File Locations

| Component | File Path | Status |
|-----------|-----------|---------|
| Updated Slot Model | `/db/model/slot.model.ts` | ⏸️ Pending |
| Enhanced Settings | `/db/model/setting.model.ts` | ⏸️ Pending |
| Updated Dispensing Logs | `/db/model/dispensing-logs.model.ts` | ⏸️ Pending |
| Migration Scripts | `/db/migrations/001-device-type-support.ts` | ⏸️ Pending |
| Database Tests | `/tests/database/models.test.ts` | ⏸️ Pending |

---

**Phase 5 provides the data foundation that enables device type management and ensures data integrity across the transition from legacy to DS12.**