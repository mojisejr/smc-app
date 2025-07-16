# SMC Application - KU16 to CU12 Migration Context

## 📊 Context Architecture & Token Strategy

### Master Context File (This File)

- **Size**: ~6,500 tokens
- **Purpose**: Project essence, always included in every round
- **Contains**: Overview, objectives, tech stack, round structure, business logic

### Supplement File Strategy

- **Usage**: Exactly 1 supplement file per round
- **Size**: 2,000-3,000 tokens each
- **Total Context**: ≤ 9,000 tokens per round (optimal for Claude Code)
- **Efficiency**: 68% reduction vs monolithic context

### Round-Context Mapping

```typescript
const contextMap = {
  Round1: {
    supplement: "HARDWARE-MIGRATION.md",
    focus: "CU12 Protocol Implementation & Core Migration",
  },
  Round2: {
    supplement: "API-INTEGRATION.md",
    focus: "Database Schema Updates & API Refactoring",
  },
  Round3: {
    supplement: "UI-UPDATE.md",
    focus: "UI Updates & Integration Testing",
  },
};
```

## Project Overview

**Smart Medication Cart (SMC) Application** - ระบบจัดการตู้เก็บยาอัจฉริยะสำหรับสถานพยาบาล/คลินิก ที่ต้องการ refactor จาก hardware controller KU16 (16 slots) ไปเป็น CU12 (12 slots) เพื่อปรับปรุงประสิทธิภาพและความเสถียรของระบบ

**Migration Scope**:

- Hardware protocol migration (KU16 → CU12)
- Database schema adjustment (16 → 12 slots)
- UI grid layout update (4x4 → 3x4)
- Enhanced error handling and response validation

## Learning/Business Objectives

1. **Protocol Standardization**: Migrate to industry-standard CU12 protocol for better reliability
2. **System Optimization**: Reduce slot count to 12 for improved performance and cost efficiency
3. **Enhanced Error Handling**: Implement rich error response system (ASK values 0x10-0x14)
4. **Maintainability**: Improve code structure with modular architecture and better documentation

## Tech Stack

- **Frontend/Backend Framework**: `nextjs@12.3.4` + `electron@21.3.3`
- **UI Component Library**: `daisyui@3.7.4` + `tailwindcss@3.1.8`
- **Database**: `sqlite3@5.1.6` + `sequelize@6.37.3`
- **Hardware Communication**: `serialport@12.0.0`
- **Language**: `typescript@5.1.6`
- **Build Tool**: `electron-builder@23.6.0`

## Features Required (Token-Scoped)

### Phase 1: Core Migration (Rounds 1-2)

1. **CU12 Protocol Implementation**: Complete packet format, command builder, response parser
2. **Database Schema Update**: Adjust slot models from 16 to 12 slots
3. **Core Communication Migration**: Replace KU16 class with CU12 class

### Phase 2: Integration & Testing (Round 3)

1. **UI Grid Update**: Change from 4x4 to 3x4 slot grid layout
2. **Error Handling Enhancement**: Implement ASK-based error responses
3. **Integration Testing**: End-to-end validation and performance testing

## Token-Optimized Round Structure

### Round 1: CU12 Protocol Implementation

**Context**: CLAUDE.md + HARDWARE-MIGRATION.md (~9,000 tokens)
**Tasks**:

- Task A: Create CU12 Protocol Layer (main/cu12/index.ts, main/cu12/utils/command-parser.ts)
- Task B: Migrate Core Communication (main/cu12/index.ts, main/ku16/index.ts refactor)
  **Success Criteria**:
- [ ] CU12 packet format implemented correctly
- [ ] All CU12 commands (0x80-0x8F) supported
- [ ] Response parsing with ASK validation working
- [ ] Basic unlock/status functionality operational

### Round 2: Database & API Refactoring

**Context**: CLAUDE.md + API-INTEGRATION.md (~8,500 tokens)
**Tasks**:

- Task A: Update Database Schema (db/model/slot.model.ts, db/model/setting.model.ts)
- Task B: Refactor IPC Handlers (main/ku16/ipcMain/_.ts → main/cu12/ipcMain/_.ts)
  **Success Criteria**:
- [ ] Database schema updated for 12 slots
- [ ] All IPC handlers migrated to CU12
- [ ] Data migration scripts working
- [ ] API compatibility maintained

### Round 3: UI Updates & Integration

**Context**: CLAUDE.md + UI-UPDATE.md (~9,000 tokens)
**Tasks**:

- Task A: Update Slot Grid UI (renderer/components/Slot/\*.tsx)
- Task B: Integration Testing & Validation (all modified files)
  **Success Criteria**:
- [ ] UI grid changed to 3x4 layout
- [ ] Slot status display working correctly
- [ ] Error messages displayed properly
- [ ] End-to-end testing passed

## Context File Dependency Map

```typescript
const fileDependencies = {
  "CLAUDE.md": {
    purpose: "Master context, project essence",
    usage: "Every round",
    tokenBudget: 6500,
    sections: ["overview", "objectives", "tech stack", "round structure"],
  },

  "HARDWARE-MIGRATION.md": {
    purpose: "CU12 protocol specifications and migration strategy",
    usage: "Round 1 (Protocol Implementation)",
    tokenBudget: 2500,
    sections: [
      "protocol differences",
      "command mapping",
      "implementation guide",
    ],
  },

  "API-INTEGRATION.md": {
    purpose: "Database and API refactoring requirements",
    usage: "Round 2 (Database & API)",
    tokenBudget: 2500,
    sections: ["schema changes", "ipc handlers", "data migration"],
  },

  "UI-UPDATE.md": {
    purpose: "UI component updates and integration testing",
    usage: "Round 3 (UI & Testing)",
    tokenBudget: 2500,
    sections: ["grid layout", "status display", "error handling"],
  },
};
```

## Token Budget Allocation

```typescript
const tokenBudgets = {
  roundContext: 9000, // Maximum per round
  masterFile: 6500, // CLAUDE.md baseline
  supplementFile: 2500, // Round-specific supplement
  safetyMargin: 500, // Buffer for Claude Code

  validation: {
    beforeRound: "Verify token count ≤ 9,000",
    duringRound: "Monitor context efficiency",
    afterRound: "Document actual token usage",
  },
};
```

## Critical Migration Considerations

### Protocol Differences

- **KU16**: 5-byte packets, channel-based addressing, simple commands
- **CU12**: 8+ byte packets, device+lock addressing, rich command set (0x80-0x8F)

### Slot Management

- **Current**: 16 slots (0-15), 4x4 grid layout
- **Target**: 12 slots (0-11), 3x4 grid layout
- **Migration**: Careful data preservation and slot mapping

### Error Handling Enhancement

- **Current**: Basic error detection
- **Target**: ASK-based responses (0x10=Success, 0x11=Failure, 0x12=Timeout, etc.)

### Timing & Configuration

- **CU12 Features**: Configurable unlock time, delayed unlock, push door wait time
- **Implementation**: Proper timing management and device initialization

## Success Metrics

### Technical Metrics

- ✅ **Protocol Compatibility**: 100% CU12 command support
- ✅ **Slot Migration**: Seamless 16→12 slot transition
- ✅ **Error Detection**: Enhanced error handling with ASK validation
- ✅ **Performance**: Maintain or improve response times
- ✅ **Data Integrity**: Zero data loss during migration

### Business Metrics

- ✅ **System Reliability**: Improved hardware communication stability
- ✅ **Maintenance Cost**: Reduced hardware complexity and cost
- ✅ **User Experience**: Maintained or improved UI responsiveness
- ✅ **Compliance**: Enhanced audit trail and error logging

## Development Constraints

### Resource Limitations

- **Developer**: Single developer maintaining entire system
- **Complexity**: Keep code maintainable and well-documented
- **Stability**: Prioritize system stability over new features

### Quality Requirements

- **Error Handling**: Comprehensive try-catch and error logging
- **Type Safety**: Full TypeScript implementation
- **Documentation**: Detailed inline comments and separate .md files
- **Testing**: Manual testing protocols for each round

### Scope Boundaries

- **Focus**: Core migration only, no additional features
- **Backward Compatibility**: Maintain existing API contracts where possible
- **Data Preservation**: Ensure no data loss during migration
