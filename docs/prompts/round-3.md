# Round 3: Database Schema & Configuration Migration

**CONTEXT**: Please read the following context files thoroughly:

1. `docs/context/CLAUDE.md` (Master Context - CU12 Refactor Overview)
2. `docs/context/supplements/database-migration.md` (Database Schema & Migration Specifications)

**ROUND OBJECTIVE**:
Migrate database schema and configuration system from 15-slot KU16 to 12-slot CU12. Update all database models, create migration scripts, and ensure data integrity while maintaining backwards compatibility for existing installations.

**PAIRED TASKS**:

- **Task A: Database Schema Migration**
  - Update Slot model to support 12 slots (slot numbers 1-12)
  - Modify Setting model for CU12 hardware configuration
  - Create database migration scripts for existing installations
  - Update seed data and default configurations
  - Files: `lib/database/migrations/`, `lib/database/models/Slot.ts`, `lib/database/models/Setting.ts`

- **Task B: Configuration System Update**
  - Update hardware configuration defaults for CU12
  - Migrate slot mapping and validation logic
  - Update configuration validation for 12-slot system
  - Create configuration compatibility layer
  - Files: `lib/config/`, `lib/utils/validation.ts`, `config/default.json`

**SUCCESS CRITERIA**:

- [ ] Database successfully migrates from 15-slot to 12-slot configuration
- [ ] All existing slot data preserved during migration (slots 1-12)
- [ ] Excess slot data (13-15) properly handled or archived
- [ ] Configuration validation works for 12-slot system
- [ ] Migration scripts are reversible (rollback capability)
- [ ] No data loss during migration process
- [ ] All database tests pass after migration
- [ ] Configuration defaults match CU12 specifications

**IMPLEMENTATION NOTES**:
- Preserve existing dispensing logs during migration
- Archive slots 13-15 data instead of deleting
- Ensure slot numbering consistency (1-12)
- Update default port settings for CU12 (19200 baud)
- Maintain user preferences and system settings

**TESTING APPROACH**:
- Create test database with 15-slot data
- Validate migration accuracy and data integrity
- Test rollback scenarios
- Verify configuration validation rules
- Test with various existing database states

**REFERENCE FILES**:
- Current PRD: `docs/PRD.md` (Database Schema)
- Database Models: `lib/database/models/` (Current Schema)
- Page Documentation: `docs/pages/06_slot-management-page.md` (Slot Operations)
- Config Files: `config/default.json` (Current Configuration)