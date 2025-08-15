# Technical Components & Architecture Relationships

## Overview

This document provides comprehensive mapping of technical components, their relationships, and integration patterns within the Smart Medication Cart system. This documentation is critical for safe refactoring of DS12/DS16 protocols without compromising medical device functionality.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│ • React Components (Slots, Dialogs, Navigation)               │
│ • Next.js Pages (Home, Management, Settings)                  │
│ • React Hooks (State Management, Hardware Communication)      │
│ • Context Providers (Auth, Dispensing, Error)                 │
└─────────────────────────────────────────────────────────────────┘
                                  │ IPC Events
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        IPC COMMUNICATION LAYER                 │
├─────────────────────────────────────────────────────────────────┤
│ • IPC Event Handlers (Main Process)                           │
│ • Event Routing & Validation                                  │
│ • Request/Response Pattern                                     │
│ • Error Propagation & Logging                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │ Method Calls
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│ • Hardware Controllers (BuildTimeController - DS12/DS16)      │
│ • Authentication Services                                      │
│ • Database Operations (Sequelize ORM)                         │
│ • Audit Logging & Compliance                                  │
└─────────────────────────────────────────────────────────────────┘
                                  │ Serial Commands
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        HARDWARE COMMUNICATION LAYER            │
├─────────────────────────────────────────────────────────────────┤
│ • Serial Port Communication (RS485)                           │
│ • Protocol Parsers (DS12, DS16)                               │
│ • Binary Data Processing                                       │
│ • Hardware State Synchronization                              │
└─────────────────────────────────────────────────────────────────┘
                                  │ RS485/Serial
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PHYSICAL HARDWARE LAYER                 │
├─────────────────────────────────────────────────────────────────┤
│ • DS16 (16-slot medication cabinet)                           │
│ • DS12 (12-slot medication cabinet)                           │
│ • Indicator Device (Temperature/Humidity sensors)             │
│ • Electromagnetic Locks & Sensors                             │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components Detailed Analysis

### 1. Main Process Architecture

#### Entry Point: `/main/background.ts`
**Purpose**: Electron main process initialization and orchestration
**Critical Dependencies**:
- Database initialization via Sequelize
- Hardware controller instantiation (BuildTimeController, IndicatorDevice) 
- IPC handler registration
- Authentication system setup

**Architecture Pattern**: Dependency Injection
```typescript
// Main components initialized with build-time configuration
const controller = new BuildTimeController(settings, mainWindow);
const indicator = new IndicatorDevice(settings.indi_port, settings.indi_baudrate, mainWindow);
const auth = new Authentication();

// IPC handlers receive controller abstraction
unlockHandler(controller);
dispenseHandler(controller);
loginRequestHandler(mainWindow, auth);
```

**Medical Device Compliance**: All IPC handlers registered for complete audit trail

### 2. Hardware Communication Architecture

#### Production Implementation: BuildTimeController
**Device Support**: DS12 (production), DS16 (configuration-ready)
**Architecture**: Build-time protocol selection with abstract base
**Critical Methods**:
```typescript
class BuildTimeController {
  sendCheckState(): void                    // Hardware status request
  receivedCheckState(data: number[]): void  // Parse binary response  
  receivedUnlockState(data: number[]): void // Handle unlock confirmation
  slotBinParser(binArr: number[], availableSlot: number) // Binary parsing core
  decToBinArrSlot(data1: number, data2: number) // Bit manipulation
}
```

**Risk Assessment**: 
- High coupling between communication and parsing
- Hardcoded 16-slot assumptions
- Difficult to extend for DS12 support
- Binary parsing logic embedded in main class

#### New Architecture: `/main/ku-controllers/base/KuControlleBase.ts`
**Design Pattern**: Abstract Factory + Template Method
**Device Support**: Extensible for DS12, DS16, future hardware
**Architecture Benefits**:
- Protocol abstraction via Strategy pattern
- Type-safe device specifications
- Enhanced error handling
- Medical device audit logging

**Abstract Interface**:
```typescript
abstract class KuControllerBase {
  abstract readonly deviceType: "DS12" | "DS16";
  abstract readonly maxSlot: number;
  abstract connect(port: string, baudRate: number): Promise<boolean>;
  abstract sendCheckState(): Promise<SlotState[]>;
  abstract sendUnlock(inputSlot: UnlockRequest): Promise<void>;
  abstract slotBinParser(binArr: number[], availableSlot: number): Promise<SlotState[]>;
}
```

**State Management Enhancement**:
- Unified logging via `logOperation()` method
- IPC event emission via `emitToUI()` method
- Protected state setters with validation
- Medical device compliance preservation

### 3. Protocol Parser Architecture

#### DS12 Protocol Parser: `/main/ku-controllers/protocols/parsers/DS12ProtocolParser.ts`
**Protocol Specification**: CU12 compatible
**Data Structure**: 12 slots in 2-byte format
**Packet Format**:
```
STX(1) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(1) + SUM(1) + DATA(DATALEN)
```

**Key Implementation Features**:
- Comprehensive checksum validation
- Packet structure verification
- Command building (status, unlock, version)
- Medical device compliance logging
- Type-safe error handling via `ProtocolResponse<T>`

**Binary Parsing Logic**:
```typescript
// Slot state extraction from 2-byte data
// Byte 1: Slots 1-8 (bits 0-7)
// Byte 2: Slots 9-12 (bits 0-3, bits 4-7 unused)
```

**Critical Safety Features**:
- No exceptions thrown - all errors returned as `ProtocolResponse`
- Extensive validation before hardware operations
- Audit logging for all protocol operations
- Medical compliance error messages

#### DS16 Protocol Parser: **PLANNED IMPLEMENTATION**
**Protocol Specification**: CU16 compatible
**Data Structure**: 16 slots in 4-byte format
**Packet Format**: 7-byte response structure
```
STX + ADDR + CMD + DATA1 + DATA2 + DATA3 + DATA4 + ETX + SUM
```

**Implementation Requirements**:
- Follow DS12 patterns exactly for consistency
- Handle 16-slot vs 12-slot data differences
- Maintain same error handling depth
- Support 4-byte slot data vs 2-byte format
- Preserve medical device compliance standards

### 4. Database Layer Architecture

#### ORM: Sequelize with SQLite
**Location**: `/db/sequelize.ts`
**Models**: `/db/model/` directory

#### Core Data Models

**Slot Model** (`/db/model/slot.model.ts`):
```typescript
interface SlotData {
  slotId: number;        // Slot identifier (1-15)
  hn?: string;          // Patient Hospital Number
  timestamp?: number;    // Medication loading timestamp
  occupied: boolean;     // Medication present status
  opening: boolean;      // Unlocking operation in progress
  isActive: boolean;     // Slot available for use
}
```

**User Model** (`/db/model/user.model.ts`):
```typescript
interface UserData {
  id: number;
  name: string;
  passkey: string;       // Authentication credential
  role?: string;         // Future: Admin/Operator permissions
}
```

**Dispensing Log Model** (`/db/model/dispensing-logs.model.ts`):
```typescript
interface DispensingLogData {
  id: number;
  timestamp: number;
  userId: string;
  slotId: number;
  hn: string;
  process: string;       // unlock, dispense, error, etc.
  message: string;       // Detailed operation description
}
```

**System Log Model** (`/db/model/logs.model.ts`):
```typescript
interface LogData {
  id: number;
  user: string;
  message: string;
  timestamp: number;
}
```

**Settings Model** (`/db/model/setting.model.ts`):
```typescript
interface SettingData {
  id: number;
  ku_port: string;          // Hardware serial port
  ku_baudrate: number;      // Hardware baud rate
  indi_port: string;        // Indicator device port
  indi_baudrate: number;    // Indicator baud rate
  available_slots: number;  // Active slot count (15)
  max_log_counts: number;   // Log retention limit
}
```

### 5. IPC Communication Patterns

#### Event-Driven Architecture
**Pattern**: Request/Response with event callbacks
**Error Handling**: Standardized error response format
**Medical Compliance**: All operations logged

#### Critical IPC Handlers

**Hardware Operations**:
- `unlock-req` → `/main/ku16/ipcMain/unlock.ts` → Hardware unlock
- `dispense` → `/main/ku16/ipcMain/dispensing.ts` → Medication dispense
- `check-locked-back` → `/main/ku16/ipcMain/checkLockedBack.ts` → State verification
- `init` → `/main/ku16/ipcMain/init.ts` → Hardware initialization

**Authentication Operations**:
- `login-req` → `/main/auth/ipcMain/login.ts` → Admin authentication
- `logout` → `/main/auth/ipcMain/logout.ts` → Session termination

**System Management**:
- `get-setting` → `/main/setting/ipcMain/getSetting.ts` → Configuration retrieval
- `update-setting` → `/main/setting/ipcMain/updateSetting.ts` → Configuration changes

**IPC Event Flow Pattern**:
```typescript
// 1. Renderer sends request
ipcRenderer.invoke('unlock-req', { slotId, hn, passkey });

// 2. Main process validates and executes
ipcMain.handle('unlock-req', async (event, data) => {
  const result = await ku16.unlock(data);
  return result;
});

// 3. Main process emits progress events
mainWindow.webContents.send('unlocking', { slotId, status: 'in-progress' });

// 4. Renderer listens for updates
ipcRenderer.on('unlocking', (event, data) => {
  updateUIState(data);
});
```

### 6. Frontend Component Architecture

#### Page-Level Components

**Home Page**: `/renderer/pages/home.tsx`
**Purpose**: Primary user interface - 15-slot medication grid
**Key Features**:
- 5x3 slot grid layout (15 slots total, slot 16 unused)
- Real-time hardware state synchronization
- Temperature and humidity display
- Modal dialog management

**Management Dashboard**: `/renderer/pages/management/index.tsx`
**Purpose**: Admin interface for system management
**Authentication**: Requires admin login
**Tabs**:
1. Slot Management - Activate/deactivate slots
2. User Management - Add/remove users
3. System Settings - Hardware configuration
4. Logs Management - Audit trail export

#### Component Hierarchy

**Slot Components**:
```
Slot/index.tsx (Main slot container)
├── empty.tsx (Empty slot display)
├── locked.tsx (Medication-loaded slot display)
└── Modal integration for interactions
```

**Dialog Components**:
```
Dialogs/
├── inputSlot.tsx (Medication assignment input)
├── dispenseSlot.tsx (Patient verification dialog)
├── lockWait.tsx (Hardware operation wait screen)
├── dispensingWait.tsx (Medication pickup wait screen)
├── clearOrContinue.tsx (Post-dispense options)
├── auth.tsx (Admin authentication)
└── newUser.tsx (User creation dialog)
```

**Settings Components**:
```
Settings/
├── SlotSetting.tsx (Slot management interface)
├── UserSetting.tsx (User management interface)
├── SystemSetting.tsx (Hardware configuration)
└── LogsSetting.tsx (Audit log viewer)
```

#### React Hooks for State Management

**Hardware State Hook**: `/renderer/hooks/useKuStates.ts`
```typescript
export const useKuStates = () => {
  const [slots, setSlots] = useState<IPayload[]>([]);
  const [canDispense, setCanDispense] = useState<boolean>(false);
  
  const get = () => {
    ipcRenderer.invoke("init", { init: true });
  };
  
  return { slots, get, canDispense };
};
```

**Unlock Operation Hook**: `/renderer/hooks/useUnlock.ts`
**Purpose**: Manages slot unlock workflow
**State Management**: Opening modal, hardware communication, error handling

**Dispense Operation Hook**: `/renderer/hooks/useDispense.ts`
**Purpose**: Manages medication dispensing workflow  
**Business Logic**: Patient verification, dispense confirmation, post-dispense decisions

**Indicator Data Hook**: `/renderer/hooks/useIndicator.ts`
**Purpose**: Temperature and humidity monitoring
**Data Flow**: Real-time sensor data from indicator device

#### Context Providers

**Application Context**: `/renderer/contexts/appContext.tsx`
**Purpose**: Global application state management
**Data**: User session, system settings, error states

**Dispensing Context**: `/renderer/contexts/dispensingContext.tsx`
**Purpose**: Workflow state for dispensing operations
**Data**: Current patient, slot selection, operation progress

**Error Context**: `/renderer/contexts/errorContext.tsx`
**Purpose**: Global error handling and user notifications
**Data**: Error messages, validation failures, system alerts

### 7. System Integration Patterns

#### State Synchronization Flow
```
Hardware Change → BuildTimeController → Database Update → IPC Event → React Hook → UI Update
```

**Example - Slot Unlock Process**:
1. User clicks slot → `inputSlot.tsx` dialog
2. User enters data → IPC `unlock-req` event
3. Main process validates → `unlock.ts` handler
4. Hardware command sent → `controller.sendUnlock()`
5. Database updated → `Slot.update({ opening: true })`
6. UI updated → `unlocking` IPC event → `lockWait.tsx` dialog
7. User confirms closure → IPC `check-locked-back` event
8. Hardware verified → Database updated → UI synchronized

#### Error Propagation Pattern
```typescript
// Hardware Error → Business Logic → IPC Response → UI Display
try {
  await ku16.unlock(data);
} catch (error) {
  await logger({ user: 'system', message: `Unlock failed: ${error}` });
  return { success: false, error: error.message };
}
```

#### Medical Device Audit Pattern
```typescript
// All operations logged with full context
await logDispensing({
  userId: user.id,
  hn: patient.hn,
  slotId: slot.id,
  process: 'unlock',
  message: `Slot ${slot.id} unlocked for patient ${patient.hn}`
});
```

## Technical Component Relationships

### Critical Dependencies

**Hardware Layer Dependencies**:
- BuildTimeController → Serial Port Communication
- BuildTimeController → Protocol Parser Abstraction
- DS12Controller → DS12ProtocolParser (planned)
- DS16Controller → DS16ProtocolParser (planned)

**Data Layer Dependencies**:
- All components → Sequelize ORM
- State management → SQLite database
- Audit logging → DispensingLog + Log models

**UI Layer Dependencies**:
- React components → IPC communication
- Hooks → Event listeners
- Context providers → Global state

**Cross-Layer Dependencies**:
- IPC handlers → Hardware controllers
- Hardware controllers → Database models
- React hooks → IPC events
- Modal dialogs → Business logic validation

### Integration Points for DS12/DS16 Migration

**Phase 1: Protocol Parser Implementation**
- Create DS16ProtocolParser following DS12 patterns
- Implement unit tests with hardware simulation
- Validate binary parsing with known test vectors

**Phase 2: Controller Integration**
- Extend KuControllerBase for DS12Controller and DS16Controller
- Implement factory pattern for controller instantiation
- Update IPC handlers to support multiple device types

**Phase 3: Configuration Management**
- Add device type selection in settings
- Update database schema for device configuration
- BuildTimeController provides protocol abstraction

**Phase 4: UI Integration**
- Update slot components for variable slot counts
- Modify hardware status displays
- Add device type indicators in management interface

**Phase 5: Legacy Migration**
- BuildTimeController maintains interface compatibility
- Gradual migration of IPC handlers
- Remove legacy implementation after validation

## Risk Assessment for Component Changes

### High-Risk Components
1. **Binary Protocol Parsers**: Critical for hardware communication integrity
2. **Database State Management**: Essential for medical audit compliance
3. **IPC Event Handlers**: Core business logic execution
4. **Authentication System**: Security and access control

### Medium-Risk Components
1. **React Components**: User interface - can be refactored with tests
2. **Utility Functions**: Helper methods with clear interfaces
3. **Configuration Management**: Settings with validation

### Low-Risk Components
1. **Styling and Layout**: CSS and component presentation
2. **Documentation**: System documentation and comments
3. **Development Tools**: Build and deployment scripts

This technical component analysis provides the comprehensive understanding needed for safe refactoring of the Smart Medication Cart system while preserving medical device functionality, security, and compliance requirements.