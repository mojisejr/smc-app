# Smart Medication Cart (SMC) - CU12 Refactor Project

## 📊 Context Architecture & Token Strategy

### Master Context File (This File)
- **Size**: ~6,500 tokens
- **Purpose**: Project refactor essence, always included in every round
- **Contains**: Refactor overview, objectives, hardware changes, round structure

### Supplement File Strategy  
- **Usage**: Exactly 1 supplement file per round
- **Size**: 2,000-3,000 tokens each
- **Total Context**: ≤ 10,000 tokens per round (optimized for Claude Code)
- **Efficiency**: Focused context for specific refactor aspects

### Round-Context Mapping
```typescript
const contextMap = {
  Round1: { supplement: "hardware-cu12.md", focus: "CU12 Protocol Implementation" },
  Round2: { supplement: "hardware-integration.md", focus: "Device Communication & Testing" },
  Round3: { supplement: "database-migration.md", focus: "Schema & Configuration Updates" },
  Round4: { supplement: "ui-adaptation.md", focus: "12-Slot Layout & Components" },
  Round5: { supplement: "integration-testing.md", focus: "End-to-end Testing" },
  Round6: { supplement: "quality-assurance.md", focus: "Code Review & Documentation" }
};
```

## 🎯 Refactor Overview

### Current State (KU16 System)
- **Hardware**: KU16 device with 15 medication slots
- **Layout**: 5x3 slot grid on home page
- **Communication**: Custom KU16 serial protocol
- **Database**: 15-slot configuration in Slot table
- **Settings**: ku_port, ku_baudrate configuration

### Target State (CU12 System)
- **Hardware**: CU12 device with 12 medication slots  
- **Layout**: 4x3 or 3x4 slot grid layout
- **Communication**: CU12 RS-485 protocol (19200 baudrate default)
- **Database**: 12-slot configuration, updated schema
- **Settings**: cu_port, cu_baudrate configuration

## 🔄 Refactor Objectives

### Primary Objectives
1. **Hardware Migration**: Complete transition from KU16 to CU12 protocol
2. **Slot Reduction**: Reduce from 15 to 12 medication slots
3. **Protocol Compatibility**: Implement CU12 communication protocol
4. **UI Adaptation**: Redesign interface for 12-slot layout
5. **Data Integrity**: Maintain all existing features and data

### Technical Learning Goals
1. Master hardware protocol migration patterns
2. Understand modular refactor strategies
3. Learn systematic testing approaches for hardware changes
4. Practice database migration with minimal downtime

## 🛠 Technical Stack (Unchanged)
- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Electron Main Process, Node.js
- **Database**: SQLite with Sequelize ORM
- **Hardware Interface**: Serial Communication (SerialPort) → RS-485
- **UI Framework**: TailwindCSS, DaisyUI
- **State Management**: React Context API

## 📋 Key Changes Required

### 1. Hardware Layer Changes
```typescript
// From KU16 Protocol
const ku16Commands = {
  getStatus: "custom_ku16_protocol",
  unlock: "custom_ku16_unlock",
  communication: "serial_port"
};

// To CU12 Protocol  
const cu12Commands = {
  getStatus: "0x80", // Get lock hook status
  unlock: "0x81",   // Unlock command
  communication: "rs485_protocol"
};
```

### 2. Database Schema Updates
```sql
-- Current Slot Configuration
UPDATE Setting SET available_slots = 12 WHERE id = 1;
UPDATE Setting SET ku_port = NULL, ku_baudrate = NULL;
ALTER TABLE Setting ADD COLUMN cu_port STRING;
ALTER TABLE Setting ADD COLUMN cu_baudrate INTEGER DEFAULT 19200;

-- Slot Table (no structural changes needed, just data)
-- Slots 1-12 remain active, 13-15 become inactive
```

### 3. UI Layout Changes
```typescript
// From 15-slot grid (5x3)
const currentLayout = {
  columns: 5,
  rows: 3,
  totalSlots: 15
};

// To 12-slot grid (4x3 or 3x4)
const newLayout = {
  columns: 4,
  rows: 3,
  totalSlots: 12
};
```

## 🔄 Round Structure

### Round 1: CU12 Protocol Implementation
**Context**: CLAUDE.md + hardware-cu12.md (~9,500 tokens)
**Focus**: Implement core CU12 communication protocol
**Files**: `main/cu12/`, `main/hardware/`, protocol handlers
**Success Criteria**: 
- CU12 protocol commands working
- Basic device communication established
- Unit tests passing for protocol layer

### Round 2: Hardware Integration & Adaptive Smart State Management  
**Context**: CLAUDE.md + hardware-integration.md (~9,000 tokens)
**Focus**: Adaptive state management for 24/7 stability with resource efficiency
**Files**: Smart state manager, optimized IPC handlers, failure detection
**Success Criteria**:
- Adaptive monitoring with idle/active/operation modes
- Resource efficiency: <5% CPU idle, <15% during operations
- 24/7 stability with intelligent failure detection and recovery

### Round 3: Database & Configuration Migration
**Context**: CLAUDE.md + database-migration.md (~8,500 tokens)
**Focus**: Update database schema and system configuration
**Files**: Database models, migration scripts, settings management
**Success Criteria**:
- 12-slot configuration active
- CU12 settings properly stored
- Data migration completed without loss

### Round 4: UI/UX Adaptation
**Context**: CLAUDE.md + ui-adaptation.md (~9,000 tokens)
**Focus**: Redesign UI for 12-slot layout
**Files**: Home page, slot components, grid layout, responsive design
**Success Criteria**:
- 12-slot grid layout implemented
- Responsive design maintained
- All UI interactions working properly

### Round 5: Integration Testing
**Context**: CLAUDE.md + integration-testing.md (~8,500 tokens)
**Focus**: End-to-end system testing and validation
**Files**: Test suites, integration tests, user flow validation
**Success Criteria**:
- Complete user workflows tested
- Hardware communication verified
- Performance requirements met

### Round 6: Quality Assurance
**Context**: CLAUDE.md + quality-assurance.md (~8,000 tokens)
**Focus**: Code review, optimization, and documentation
**Files**: Code cleanup, documentation updates, final testing
**Success Criteria**:
- Code quality standards met
- Documentation updated
- System ready for production

## 🔗 Project References

### Essential Context Files
- **Current PRD**: `/docs/PRD.md` - Complete project specifications
- **CU12 Documentation**: `/docs/CU12.md` - Hardware protocol reference
- **Page Documentation**: `/docs/pages/` - Detailed page specifications
- **V3 Workflow**: `/docs/v3.md` - Development methodology reference
- **V4 Workflow**: `/docs/v4.md` - Automation patterns reference

### Architecture Dependencies
```typescript
const projectDependencies = {
  "PRD.md": {
    purpose: "Complete system specifications",
    relevance: "Business logic and feature requirements",
    sections: ["Database Schema", "User Journey", "Hardware Interface"]
  },
  
  "CU12.md": {
    purpose: "Hardware protocol specifications", 
    relevance: "Technical implementation details",
    sections: ["Protocol Commands", "Communication Format", "Error Codes"]
  },
  
  "pages/*.md": {
    purpose: "Page-level implementation details",
    relevance: "UI/UX changes and database interactions",
    focus: ["home-page.md", "settings-page.md", "management-page.md"]
  }
};
```

## 🎯 Success Metrics

### Technical Success Indicators
- ✅ **Protocol Compatibility**: All CU12 commands working correctly
- ✅ **Slot Management**: 12-slot system fully functional  
- ✅ **Data Integrity**: No data loss during migration
- ✅ **Resource Efficiency**: CPU usage <5% idle, <15% during operations
- ✅ **24/7 Stability**: No memory leaks or performance degradation
- ✅ **Adaptive Monitoring**: Smart state management with mode switching

### Code Quality Indicators
- ✅ **Maintainability**: Clear separation between CU12 and application logic
- ✅ **Testability**: Comprehensive test coverage for new protocol
- ✅ **Documentation**: Updated technical documentation
- ✅ **Consistency**: Following existing project patterns

### User Experience Indicators  
- ✅ **Functionality**: All existing features work with CU12
- ✅ **Usability**: No degradation in user interface
- ✅ **Reliability**: Stable operation under normal usage
- ✅ **Performance**: Responsive UI and hardware operations

## 🚨 Critical Considerations

### Backward Compatibility
- **Database**: Ensure existing data remains intact
- **Settings**: Graceful migration from KU16 to CU12 settings
- **Logs**: Preserve all historical dispensing logs
- **Users**: No impact on user accounts and permissions

### Risk Mitigation
- **Incremental Changes**: Small, testable changes per round
- **Rollback Strategy**: Ability to revert to KU16 if needed
- **Data Backup**: Complete backup before migration
- **Testing**: Extensive testing at each round

### Performance Requirements
- **Hardware Communication**: ≤ 3 seconds response time
- **UI Responsiveness**: ≤ 500ms for user interactions  
- **Database Operations**: ≤ 1 second for queries
- **Slot Operations**: ≤ 2 seconds for unlock/lock cycles
- **Resource Usage**: <5% CPU idle, <15% during operations
- **Memory Efficiency**: No memory leaks in 24/7 operation
- **Mode Switching**: <100ms transition between idle/active/operation states

---

**Project**: Smart Medication Cart CU12 Refactor  
**Methodology**: Hybrid V3/V4 Workflow with Token Optimization  
**Target**: Production-ready CU12 system with 12-slot configuration