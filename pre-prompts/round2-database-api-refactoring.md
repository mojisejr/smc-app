# Round 2: Database & API Refactoring

**CONTEXT**: Read `CLAUDE.md` (master) + `API-INTEGRATION.md` (round-specific)  
**TOKEN BUDGET**: ~8,500 tokens (validated)

## 🎯 ROUND OBJECTIVE

Update database schema for 12 slots and refactor IPC handlers to work with CU12 protocol, ensuring data integrity and API compatibility during migration.

## 🛠 PAIRED TASKS (Context-Scoped)

### Task A: Update Database Schema

**Files**:

- `db/model/slot.model.ts`
- `db/model/setting.model.ts`
- `migration-script.ts`

**Context Focus**:

- Database schema migration from 16 to 12 slots
- New fields for CU12 (lockStatus, errorCode)
- Setting model updates for CU12 configuration
- Data migration scripts with backup strategy

**Implementation Requirements**:

1. **Slot Model Update**: Add lockStatus and errorCode fields, update slot count validation
2. **Setting Model Update**: Rename ku*\* to cu*\*, add CU12-specific settings
3. **Migration Script**: Create comprehensive migration with backup and rollback
4. **Data Preservation**: Ensure existing slot data (1-12) is preserved
5. **Schema Validation**: Verify database integrity after migration

### Task B: Refactor IPC Handlers

**Files**:

- `main/ku16/ipcMain/*.ts` → `main/cu12/ipcMain/*.ts`
- `main/cu12/ipcMain/configure.ts` (new)

**Context Focus**:

- Migrate all IPC handlers to work with CU12 protocol
- Enhanced error handling with ASK codes
- New CU12-specific configuration handlers
- API compatibility maintenance

**Implementation Requirements**:

1. **Handler Migration**: Convert all existing IPC handlers to use CU12 class
2. **Slot Validation**: Update slot ID validation (1-12 instead of 1-16)
3. **Error Enhancement**: Implement ASK-based error responses
4. **Configuration Handler**: Create new configure-cu12 handler
5. **Status Handler**: Enhanced status handler with CU12 features
6. **API Compatibility**: Maintain existing API contracts where possible

## ✅ SUCCESS CRITERIA (From Context)

- [ ] Database schema updated for 12 slots with new fields
- [ ] All IPC handlers migrated to CU12 protocol
- [ ] Data migration scripts working with backup/rollback
- [ ] API compatibility maintained for existing integrations
- [ ] Enhanced error handling with ASK codes implemented
- [ ] New CU12 configuration handlers operational
- [ ] Slot data (1-12) preserved during migration

## 📋 CONTEXT-SPECIFIC IMPLEMENTATION

### Database Schema Changes

- **Slot Model**: Add lockStatus (0=locked, 1=unlocked) and errorCode fields
- **Setting Model**: Rename ku_port→cu_port, ku_baudrate→cu_baudrate, add cu_address
- **New Settings**: unlock_time, delayed_unlock, push_door_wait
- **Slot Count**: Update validation from 16 to 12 slots

### Data Migration Strategy

- **Backup**: Create backup tables before migration
- **Slot Mapping**: Preserve existing slot data for slots 1-12
- **Default Values**: Set appropriate defaults for new fields
- **Validation**: Verify data integrity after migration

### IPC Handler Updates

- **Slot Validation**: Update slot ID range from 1-16 to 1-12
- **Protocol Conversion**: Convert slot ID to lock number (slotId - 1)
- **Error Handling**: Map ASK codes to meaningful error messages
- **Database Updates**: Update slot status in database after operations

### New CU12-Specific Handlers

- **configure-cu12**: Handle CU12 device configuration
- **get-cu12-status**: Enhanced status with device and slot information
- **set-unlock-time**: Configure unlock time settings
- **set-delayed-unlock**: Configure delayed unlock settings

## 🔧 Implementation Guidelines

### Task A Priority Order

1. **Backup Strategy**: Create backup tables and rollback procedures
2. **Schema Updates**: Add new columns to existing tables
3. **Model Updates**: Update Sequelize models with new fields
4. **Data Migration**: Migrate existing data with preservation logic
5. **Validation**: Verify data integrity and schema correctness

### Task B Priority Order

1. **Handler Analysis**: Review existing IPC handlers and dependencies
2. **Core Handlers**: Migrate unlock, status, and initialization handlers
3. **Error Handling**: Implement ASK-based error responses
4. **Configuration**: Create new CU12-specific configuration handlers
5. **Testing**: Test all handlers with CU12 protocol

### Migration Safety Requirements

- **Backup Creation**: Always create backup before schema changes
- **Rollback Plan**: Ability to restore from backup if migration fails
- **Data Validation**: Verify all data preserved correctly
- **Testing**: Test migration on development environment first

## 🚨 Critical Considerations

### Data Preservation

- **Slot Data**: Preserve HN assignments for slots 1-12
- **Logs**: Maintain dispensing logs with updated slot references
- **Settings**: Preserve existing configuration where applicable
- **Integrity**: Ensure no data loss during migration

### API Compatibility

- **Existing Contracts**: Maintain existing API response formats
- **Error Handling**: Enhance error responses without breaking changes
- **Backward Compatibility**: Support existing client integrations
- **Versioning**: Consider API versioning if breaking changes needed

### Rollback Strategy

- **Backup Tables**: Create backup before migration
- **Validation**: Verify data integrity after migration
- **Rollback Script**: Ability to restore from backup if needed
- **Testing**: Test rollback procedure before production

### Testing Requirements

- **Data Integrity**: Verify all slot data preserved correctly
- **API Compatibility**: Ensure existing API calls still work
- **Error Handling**: Test new error codes and responses
- **Performance**: Validate system performance with 12 slots

## 📊 Migration Script Structure

### Complete Migration Flow

1. **Pre-migration**: Create backup tables
2. **Schema Update**: Add new columns to existing tables
3. **Data Migration**: Migrate slot data from 16 to 12 slots
4. **Setting Migration**: Update settings for CU12 configuration
5. **Validation**: Verify data integrity and schema correctness
6. **Cleanup**: Remove backup tables if successful

### Error Handling

- **Validation Errors**: Check data integrity at each step
- **Rollback Triggers**: Automatic rollback on critical errors
- **Logging**: Comprehensive logging of migration process
- **Recovery**: Manual recovery procedures if needed

---

**Execute**: Paired Sub-Agent Pattern  
**Validate**: Manual testing against criteria  
**Commit**: Include context metadata
