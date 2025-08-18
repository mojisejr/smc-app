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

## Hardware Evolution & Current Status

### Device Evolution Timeline
```
Original → Manufacturer Change → Anti-Piracy Protection → Current Production
KU16    →       CU16         →        DS16          →    DS16 (Ready)
KU12    →       CU12         →        DS12          →    DS12 (Production)
```

### Production Status (January 2025)
- **DS12**: ✅ **PRODUCTION DEPLOYED** - BuildTimeController with complete DS12 protocol implementation
- **DS16**: 🔧 **CONFIGURATION READY** - Architecture prepared, awaiting hardware availability  
- **Legacy**: `/main/ku16/` folder preserved for reference and rollback capability
- **Architecture**: Build-time device type selection with protocol abstraction (LIVE)

## Critical System Components

### 1. Hardware Communication Layer (Production Implementation)
- **Current**: BuildTimeController deployed in production with DS12 protocol
- **Architecture**: Build-time device configuration with abstract controller pattern
- **Location**: `/main/ku-controllers/` with complete protocol abstraction
- **Protocols**: DS12 fully operational, DS16 configuration-ready for deployment
- **Communication**: RS485 serial with medical-grade error handling and audit logging
- **Legacy Preserved**: `/main/ku16/index.ts` maintained for rollback capability

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

### 3. User Interface Components (Enhanced with Design System)
- **Home Page**: `/renderer/pages/home.tsx` - 15-slot grid with real-time status indicators
- **Admin Dashboard**: `/renderer/pages/management/` - Enhanced 4-tab interface with improved UX
- **Design System**: `/renderer/components/Shared/DesignSystem/` - Centralized component library
- **Enhanced Dialogs**: React Hook Form integration with visual validation feedback
- **Status Indicators**: Color-coded feedback system for medical device compliance

### 4. State Management Pattern (Production Architecture)
Enhanced three-layer state synchronization with medical-grade consistency:
- **Database**: Persistent slot states with comprehensive audit logging (SQLite + Sequelize)
- **Main Process**: Runtime hardware state via BuildTimeController with protocol abstraction
- **Renderer Process**: Enhanced UI state with React Hook Form + Context providers + Design System

## Security & Compliance Features

### Authentication Model
- **No System Login**: Direct access to medication cart
- **Per-Operation Passkey**: Required for unlock/dispense operations
- **Admin Dashboard**: Requires authentication for management functions
- **Role-Based Access**: Admin vs operator permissions

### Enhanced Audit & Compliance (Production Features)
- **Comprehensive Logging**: Every operation logged with full context in Thai language
- **Medical-Grade Persistence**: SQLite with atomic transactions for regulatory compliance
- **Enhanced Export**: Advanced log filtering and CSV/Excel export for compliance reporting
- **Thai Language Support**: Complete localization for medical facility requirements
- **Real-time Audit Trail**: Live operation tracking with user identification and timestamps

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

## Current System Status & Next Steps

### Production Deployment Success (Phase 4.2 Complete)
✅ **DS12 Implementation**: Complete BuildTimeController production deployment  
✅ **Medical Compliance**: All regulatory requirements met and validated  
✅ **Zero Regression**: Existing functionality preserved with enhanced capabilities  
✅ **Audit Trail Integrity**: Complete logging system with Thai language support  

### DS16 Readiness (Phase 5)
🔧 **Configuration Ready**: Architecture prepared for DS16 hardware availability  
🔧 **Protocol Support**: DS16 protocol patterns established, ready for activation  
🔧 **Build-Time Selection**: Device type configuration system deployed  

### Future Enhancements
1. **DS16 Activation**: Immediate deployment when hardware becomes available
2. **Enhanced Monitoring**: Advanced hardware health monitoring features
3. **Performance Optimization**: Medical device response time improvements
4. **Extended Compliance**: Additional regulatory feature implementations

This overview documents the current production-ready system with comprehensive medical device functionality, compliance, and extensibility for future hardware support.