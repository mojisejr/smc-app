# Smart Medication Cart (SMC) - System Architecture Overview

## Document Purpose

This document provides comprehensive system understanding for safe refactoring of DS12/DS16 protocols without compromising medical device functionality.

## System Identity

**Application Name**: Smart Medication Cart (รถเข็นจ่ายยาอัตโนมัติ)
**Version**: 1.0.0
**Technology Stack**: Electron.js + Next.js + Sequelize + SQLite
**Target Platform**: Desktop application for medication dispensing hardware

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                │
├─────────────────────────────────────────────────────────┤
│ • Hardware Controllers (KU16, DS12, DS16)              │
│ • Serial Communication (RS485)                         │
│ • Database Management (SQLite + Sequelize)             │
│ • IPC Event Handlers                                   │
│ • Authentication & Authorization                        │
│ • Audit Logging System                                 │
└─────────────────────────────────────────────────────────┘
                            │ IPC
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Electron Renderer Process              │
├─────────────────────────────────────────────────────────┤
│ • Next.js Application (React + TypeScript)             │
│ • Home Page - 15 Slot Grid Interface                   │
│ • Admin Management Dashboard                           │
│ • Modal Dialogs & User Interactions                   │
│ • Real-time Hardware Status Updates                   │
└─────────────────────────────────────────────────────────┘
                            │ RS485/Serial
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 Hardware Layer                         │
├─────────────────────────────────────────────────────────┤
│ • DS16 (16-slot device, CU16-compatible)              │
│ • DS12 (12-slot device, CU12-compatible)              │
│ • Indicator Device (Temperature/Humidity sensors)      │
│ • Lock Mechanisms & State Detection                   │
└─────────────────────────────────────────────────────────┘
```

## System Purpose & Business Context

### Medical Device Workflow
The Smart Medication Cart automates medication storage and dispensing for healthcare facilities:

1. **Medication Loading**: Healthcare staff unlock empty slots, load medication, close slots
2. **Patient Dispensing**: Staff verify patient HN, dispense medication via hardware unlock
3. **Audit Trail**: All operations logged for regulatory compliance
4. **Environmental Monitoring**: Temperature and humidity tracking for medication safety

### Key Business Rules
- **No Login Required**: Uses passkey verification per operation for quick access
- **Manual State Confirmation**: User confirms slot closure to preserve system resources
- **Comprehensive Logging**: All unlock/dispense operations tracked with user ID, HN, timestamps
- **Emergency Controls**: Admin can deactivate malfunctioning slots
- **15 Active Slots**: Hardware supports 16 but only 15 used operationally

## Hardware Evolution & Naming

### Historical Device Names
```
Original → Manufacturer Change → Rebranding Protection
KU16    →       CU16         →        DS16
KU12    →       CU12         →        DS12
```

### Current Hardware Support
- **DS16**: 16-slot device (evolved from CU16/KU16 protocols)
- **DS12**: 12-slot device (evolved from CU12 protocols)  
- **Legacy**: `/main/ku16/` folder contains tightly-coupled CU16 implementation
- **New Architecture**: `/main/ku-controllers/` with abstract base class and protocol parsers

## Critical System Components

### 1. Hardware Communication Layer
- **File**: `/main/ku16/index.ts` (legacy KU16 class)
- **File**: `/main/ku-controllers/base/KuControlleBase.ts` (new abstract base)
- **File**: `/main/ku-controllers/protocols/parsers/DS12ProtocolParser.ts`
- **Protocols**: RS485 serial communication with checksum validation

### 2. Database Schema
```sql
-- Slot state management
Slot: { slotId, hn, timestamp, occupied, opening, isActive }

-- User authentication 
User: { id, name, passkey, role }

-- Audit logging
DispensingLog: { id, timestamp, userId, slotId, hn, process, message }
Logs: { id, user, message, timestamp }
```

### 3. User Interface Components
- **Home Page**: `/renderer/pages/home.tsx` - 15-slot grid display
- **Admin Dashboard**: `/renderer/pages/management/` - Behind authentication
- **Slot Component**: `/renderer/components/Slot/index.tsx` - Individual slot UI
- **Modal System**: Input dialogs, wait screens, confirmation dialogs

### 4. State Management Pattern
The system maintains state across three layers:
- **Database**: Persistent slot states (SQLite)
- **Main Process**: Runtime hardware state (KU16 class properties)
- **Renderer Process**: UI state (React hooks + contexts)

## Security & Compliance Features

### Authentication Model
- **No System Login**: Direct access to medication cart
- **Per-Operation Passkey**: Required for unlock/dispense operations
- **Admin Dashboard**: Requires authentication for management functions
- **Role-Based Access**: Admin vs operator permissions

### Audit & Compliance
- **Comprehensive Logging**: Every operation logged with user, timestamp, slot, HN
- **Database Persistence**: SQLite storage for regulatory audit trails
- **Export Functionality**: Logs can be exported for compliance reporting
- **Medical Device Standards**: Designed for healthcare regulatory requirements

## Risk Assessment for Refactoring

### High-Risk Areas
1. **Protocol Parsing**: Binary data interpretation for DS12/DS16
2. **Checksum Validation**: Critical for RS485 communication integrity
3. **State Synchronization**: Database ↔ Hardware ↔ UI state management
4. **Audit Logging**: Must preserve medical compliance requirements

### Safe Refactoring Zones
1. **UI Components**: React components can be safely modernized
2. **IPC Handlers**: Event handlers have clear interfaces
3. **Database Queries**: Sequelize ORM provides abstraction
4. **Utility Functions**: Helper methods for data transformation

## Next Steps for DS12/DS16 Implementation

1. **Phase 1**: Complete comprehensive documentation of current system
2. **Phase 2**: Implement DS12ProtocolParser following existing patterns
3. **Phase 3**: Create DS16ProtocolParser with 16-slot support
4. **Phase 4**: Integrate parsers with KuControllerBase abstract class
5. **Phase 5**: Test with hardware simulation and real devices
6. **Phase 6**: Gradual migration from legacy KU16 implementation

This overview provides the foundation for safe, informed refactoring while preserving medical device functionality and compliance requirements.