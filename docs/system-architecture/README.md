# Smart Medication Cart (SMC) System Architecture Reference Guide

## Documentation File Index

This README serves as your **navigation hub** for the complete system architecture documentation. Each section below provides quick summaries with **direct links to detailed documentation files**.

### 📋 Complete Documentation Files
```
/docs/system-architecture/
├── README.md                    # This navigation hub (you are here)
├── 01-system-overview.md        # Comprehensive system architecture details
├── 02-hardware-evolution.md     # Hardware specifications and protocol comparisons  
├── 03-user-workflow.md          # Medical workflows and user experience details
├── 04-technical-components.md   # Detailed technical implementation guides
├── 05-data-flow-patterns.md     # Database operations and state management
├── 06-security-compliance.md    # Medical device security and audit requirements
├── 07-protocol-specifications.md # Complete DS12/DS16 protocol documentation
├── 08-testing-strategy.md       # Testing frameworks and quality assurance
├── 09-migration-roadmap.md      # Implementation phases and deployment plans
└── 10-license-cli-integration.md # SMC License CLI Tool (v1.0.0) integration specs
```

## Quick Start for Agents

This document serves as the **definitive navigation guide** for all agents working on the DS12/DS16 refactoring project. Find what you need quickly:

### Agent-Specific Documentation Routes

- **@agent-electron-native-integrator**: 
  - **Quick Reference**: [Hardware Communication](#hardware-communication) and [IPC Patterns](#ipc-communication-patterns)
  - **Detailed Files**: `/docs/system-architecture/02-hardware-evolution.md`, `/docs/system-architecture/07-protocol-specifications.md`

- **@agent-nextjs-ui-advisor**: 
  - **Quick Reference**: [UI Components](#ui-components-architecture), [Design System](#design-system-architecture) and [Enhanced UX Patterns](#enhanced-user-experience-patterns)
  - **Detailed Files**: `/docs/system-architecture/03-user-workflow.md`, `/docs/system-architecture/04-technical-components.md`, `/docs/system-architecture/05-data-flow-patterns.md`

- **@agent-sequelize-database-manager**: 
  - **Quick Reference**: [Database Schema](#database-schema) and [Data Flow](#data-flow-patterns)
  - **Detailed Files**: `/docs/system-architecture/05-data-flow-patterns.md`, `/docs/system-architecture/06-security-compliance.md`

- **@agent-code-quality-coach**: 
  - **Quick Reference**: [Testing Strategy](#testing-strategy) and [Security Framework](#security-compliance)
  - **Detailed Files**: `/docs/system-architecture/08-testing-strategy.md`, `/docs/system-architecture/06-security-compliance.md`

- **@agent-project-architect**: 
  - **Quick Reference**: [Migration Roadmap](#migration-roadmap) and [System Overview](#system-overview)
  - **Detailed Files**: `/docs/system-architecture/01-system-overview.md`, `/docs/system-architecture/09-migration-roadmap.md`

### Topic-to-File Quick Lookup Table

| **Topic** | **Quick Reference Section** | **Detailed Documentation File** | **Cross-References** |
|-----------|----------------------------|----------------------------------|---------------------|
| **System Architecture Overview** | [System Overview](#system-overview) | `01-system-overview.md` | Hardware specs (02), Migration (09) |
| **Hardware Protocols** | [Hardware Evolution](#hardware-evolution--protocol-support) | `02-hardware-evolution.md` | Technical components (04), Protocol specs (07) |
| **Medical Workflows** | See detailed file only | `03-user-workflow.md` | UI Components (04), Security (06) |
| **Component Implementation** | [UI Components](#ui-components-architecture) | `04-technical-components.md` | User workflows (03), Data flow (05) |
| **Design System & UI Components** | [Design System Architecture](#design-system-architecture) | `04-technical-components.md` (Design System Section) | Data flow (05), User workflows (03) |
| **Form Handling & Validation** | [Design System Architecture](#design-system-architecture) | `04-technical-components.md`, `05-data-flow-patterns.md` | Enhanced UX patterns |
| **Database & State Management** | [Database Schema](#database-schema), [Data Flow](#data-flow-patterns) | `05-data-flow-patterns.md` | Security (06), Technical components (04) |
| **Enhanced User Experience** | See detailed file only | `05-data-flow-patterns.md` (Enhanced UX Section) | Design System (04), User workflows (03) |
| **Security & Audit Trail** | [Security & Compliance](#security--compliance) | `06-security-compliance.md` | Data flow (05), User workflows (03) |
| **Protocol Specifications** | [Protocol Quick Reference](#hardware-evolution--protocol-support) | `07-protocol-specifications.md` | Hardware evolution (02), Testing (08) |
| **Testing & Quality** | [Testing Strategy](#testing-strategy) | `08-testing-strategy.md` | Protocol specs (07), Migration (09) |
| **Migration Planning** | [Migration Roadmap](#migration-roadmap) | `09-migration-roadmap.md` | System overview (01), Testing (08) |

---

## System Overview

> **📖 For Complete Details**: See `/docs/system-architecture/01-system-overview.md`
> **🔗 Related Files**: `02-hardware-evolution.md`, `09-migration-roadmap.md`

**Application**: Smart Medication Cart (รถเข็นจ่ายยาอัตโนมัติ)
**Technology**: Electron.js + Next.js + Sequelize + SQLite
**Purpose**: Medical device for automated medication dispensing with full audit compliance

### Current Architecture Status
- **Production**: Legacy KU16 protocol (16-slot, monolithic implementation)
- **Development**: DS12 protocol implemented, DS16 protocol in progress
- **Migration Goal**: Abstract controller architecture supporting both DS12 (12-slot) and DS16 (16-slot)

### Critical Business Rules
- **No System Login**: Per-operation passkey authentication for fast medical access
- **Manual Confirmation**: User confirms slot closures (resource optimization)
- **Full Audit Trail**: Every operation logged for regulatory compliance
- **15 Active Slots**: Hardware supports 16 but only 15 used operationally
- **Medical Compliance**: Designed for healthcare facility regulatory requirements

---

## Hardware Evolution & Protocol Support

> **📖 For Complete Details**: See `/docs/system-architecture/02-hardware-evolution.md`
> **🔗 Related Files**: `07-protocol-specifications.md`, `04-technical-components.md`

### Device Evolution Timeline
```
Original → Manufacturer Change → Anti-Piracy Protection
KU16    →       CU16         →        DS16  (16-slot)
KU12    →       CU12         →        DS12  (12-slot)
```

### Protocol Specifications Quick Reference

#### DS12 Protocol (12-Slot Device)
- **Baud Rate**: 19200
- **Packet Format**: `STX(1) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(1) + SUM(1) + DATA(DATALEN)`
- **Data Encoding**: 2-byte slot states (Byte 1: Slots 1-8, Byte 2: Slots 9-12)
- **Key Commands**: `0x80` (Status), `0x81` (Unlock), `0x82` (Set unlock time)
- **Implementation Status**: ✅ Complete with comprehensive testing

#### DS16 Protocol (16-Slot Device) 
- **Baud Rate**: 115200 (higher speed than DS12)
- **Packet Format**: `STX(1) + ADDR(1) + CMD(1) + [DATA(2-5)] + ETX(1) + SUM(1)`
- **Data Encoding**: 4-byte format (DATA1-2: lock states, DATA3-4: infrared detection)
- **Key Commands**: `0x30` (Status), `0x31` (Unlock), `0x32` (Get all status)
- **Implementation Status**: 🚧 In Progress - Protocol parser needed

### Hardware Communication Implementation
```typescript
// Current Implementation Paths
/main/ku16/index.ts              // Legacy KU16 (production)
/main/ku-controllers/base/       // New abstract base class
/main/ku-controllers/protocols/  // Protocol parsers (DS12 complete)

// Key Classes for Integration
export abstract class KuControllerBase {
  abstract readonly deviceType: "DS12" | "DS16";
  abstract readonly maxSlot: number;
  abstract sendCheckState(): Promise<SlotState[]>;
  abstract sendUnlock(request: UnlockRequest): Promise<void>;
}

// DS12 Implementation (Complete)
export class DS12ProtocolParser implements IProtocolParser {
  parseSlotStates(response: number[]): ProtocolResponse<SlotState[]>
  buildStatusRequestPacket(address: number): ProtocolResponse<number[]>
  buildUnlockCommand(slotId: number, address: number): ProtocolResponse<number[]>
}

// DS16 Implementation (Needed)
export class DS16ProtocolParser implements IProtocolParser {
  // TODO: Follow DS12 patterns exactly
  // Must handle 16-slot vs 12-slot differences
  // Support infrared detection (DS16-specific feature)
}
```

---

## Database Schema

> **📖 For Complete Details**: See `/docs/system-architecture/05-data-flow-patterns.md`
> **🔗 Related Files**: `06-security-compliance.md`, `04-technical-components.md`

### Core Models
```typescript
// Slot State Management
interface SlotData {
  slotId: number;        // 1-15 (slot 16 unused in UI)
  hn?: string;          // Patient Hospital Number
  timestamp?: number;    // Medication loading time
  occupied: boolean;     // Medication present
  opening: boolean;      // Operation in progress
  isActive: boolean;     // Admin can deactivate malfunctioning slots
}

// User Authentication
interface UserData {
  id: number;
  name: string;
  passkey: string;       // Per-operation authentication
  role?: string;         // Admin vs Operator
}

// Medical Audit Trail
interface DispensingLogData {
  id: number;
  timestamp: number;
  userId: string;
  slotId: number;
  hn: string;
  process: 'unlock' | 'dispense-continue' | 'dispense-end' | 
           'unlock-error' | 'dispense-error' | 'deactivate';
  message: string;       // Thai language descriptions
}

// System Configuration
interface SettingData {
  id: number;
  ku_port: string;          // Hardware serial port
  ku_baudrate: number;      // Communication speed
  indi_port: string;        // Temperature/humidity sensor port
  available_slots: number;  // 15 (max displayable)
  max_log_counts: number;   // Audit log retention limit
}
```

### Database Operations Patterns
```typescript
// Atomic Medical Operations
export const atomicSlotUpdate = async (slotId: number, operation: string, data: any) => {
  const transaction = await sequelize.transaction();
  try {
    // 1. Update slot state
    await Slot.update(data, { where: { slotId }, transaction });
    
    // 2. Log operation (medical compliance)
    await DispensingLog.create({
      slotId, operation, ...auditData
    }, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Medical Compliance Queries
export const getAuditTrailForPatient = async (hn: string) => {
  return await DispensingLog.findAll({
    where: { hn },
    include: [{ model: User, attributes: ['name'] }],
    order: [['timestamp', 'DESC']]
  });
};
```

---

## IPC Communication Patterns

> **📖 For Complete Details**: See `/docs/system-architecture/04-technical-components.md`
> **🔗 Related Files**: `02-hardware-evolution.md`, `05-data-flow-patterns.md`

### Event-Driven Architecture
```typescript
// Request/Response Pattern for Hardware Operations
"unlock-req" → validation → hardware command → "unlocking" event
"dispense" → authentication → unlock → "dispensing" event  
"check-locked-back" → hardware check → state update → UI refresh

// Critical IPC Handlers (Device-Agnostic Migration Target)
ipcMain.handle('unlock-req', async (event, payload) => {
  const controller = await getDeviceController(); // Factory pattern
  return await controller.unlock(payload);
});

ipcMain.handle('init', async () => {
  const controller = await getDeviceController();
  const states = await controller.sendCheckState();
  return { slots: states, canDispense: true };
});

// Error Handling Pattern
ipcMain.handle('operation', async (event, payload) => {
  try {
    const result = await executeOperation(payload);
    await logMedicalOperation('success', payload, result);
    return { success: true, data: result };
  } catch (error) {
    await logMedicalOperation('error', payload, error);
    return { success: false, error: error.message };
  }
});
```

---

## Design System Architecture

> **📖 For Complete Details**: See `/docs/system-architecture/04-technical-components.md` (Design System Section)
> **🔗 Related Files**: `05-data-flow-patterns.md` (Enhanced UX Patterns), `03-user-workflow.md`

**Centralized Component Library**: `/renderer/components/Shared/DesignSystem/`
**Purpose**: Consistent UI/UX across all dialog components with enhanced form handling
**Recent Implementation**: Complete refactoring of dialog components with React Hook Form integration

### Core Design System Components
```typescript
// Centralized exports for consistent usage
export { default as DialogBase } from './DialogBase';        // Container with flexible layout
export { default as DialogHeader } from './DialogHeader';    // Headers with progress indicators  
export { default as StatusIndicator } from './StatusIndicator'; // Color-coded status display
export { DialogInput, DialogButton } from './FormElements';  // Enhanced form components
```

### Enhanced Form Integration
- **React Hook Form**: Complete integration with forwardRef pattern for validation
- **Error Handling**: Visual error states with Thai language feedback
- **Loading States**: Integrated loading animations with disabled states during operations
- **Validation**: Client-side validation with server-side error propagation

### Design Token System
```javascript
// Updated Tailwind configuration with medical device color system
colors: {
  red: colors.red,      // Error states, danger actions
  green: colors.green,  // Success states, completed actions  
  yellow: colors.yellow, // Warning states, attention needed
  black: colors.black,   // High contrast text for medical environments
}
```

### Status Indicator Enhancements
- **Color-coded feedback**: Success (green), Error (red), Warning (yellow), Info (blue)
- **Animation support**: Pulsing indicators for active states
- **Slot integration**: Automatic slot number formatting
- **Accessibility**: High contrast ratios for medical environment visibility

---

## UI Components Architecture

> **📖 For Complete Details**: See `/docs/system-architecture/04-technical-components.md`
> **🔗 Related Files**: `03-user-workflow.md`, `05-data-flow-patterns.md`

### Component Hierarchy
```
src/renderer/
├── pages/
│   ├── home.tsx                    # Main 15-slot grid interface
│   └── management/
│       └── index.tsx               # Admin dashboard (4 tabs)
├── components/
│   ├── Slot/
│   │   ├── index.tsx              # Main slot container
│   │   ├── empty.tsx              # Empty slot display
│   │   └── locked.tsx             # Medication-loaded display
│   ├── Dialogs/
│   │   ├── inputSlot.tsx          # Medication assignment
│   │   ├── dispenseSlot.tsx       # Patient verification
│   │   ├── lockWait.tsx           # Hardware operation wait
│   │   ├── dispensingWait.tsx     # Medication pickup wait
│   │   └── clearOrContinue.tsx    # Post-dispense decision
│   └── Settings/                  # Admin management components
├── hooks/
│   ├── useKuStates.ts            # Hardware state management
│   ├── useUnlock.ts              # Unlock workflow
│   └── useDispense.ts            # Dispensing workflow
└── contexts/
    ├── appContext.tsx            # Global application state
    └── dispensingContext.tsx     # Workflow state management
```

### State Management Patterns
```typescript
// Hardware State Hook (Protocol-Agnostic)
export const useKuStates = () => {
  const [slots, setSlots] = useState<IPayload[]>([]);
  const [canDispense, setCanDispense] = useState<boolean>(false);
  
  const get = () => {
    ipcRenderer.invoke("init", { init: true });
  };
  
  // Listen for hardware updates
  useEffect(() => {
    ipcRenderer.on('init-res', (event, data) => {
      setSlots(data.slots || []);
      setCanDispense(data.canDispense || false);
    });
  }, []);
  
  return { slots, get, canDispense };
};

// Unlock Operation Hook
export const useUnlock = () => {
  const unlock = async (slotId: number, hn: string, passkey: string) => {
    const result = await ipcRenderer.invoke('unlock-req', {
      slotId, hn, passkey, timestamp: Date.now()
    });
    
    if (!result.success) {
      toast.error(result.error);
    }
  };
  
  return { unlock };
};
```

### Protocol-Agnostic UI Considerations
```typescript
// Component should work with both DS12 (12 slots) and DS16 (16 slots)
const SlotGrid = ({ slots }) => {
  // Display maximum 15 slots regardless of hardware capability
  const displaySlots = slots.slice(0, 15);
  
  return (
    <div className="grid grid-cols-5 gap-4">
      {displaySlots.map((slot, index) => (
        <Slot 
          key={slot.slotId} 
          slotData={slot}
          // DS16-specific features conditionally displayed
          showInfrared={slot.infrared !== undefined}
        />
      ))}
    </div>
  );
};
```

---

## Data Flow Patterns

> **📖 For Complete Details**: See `/docs/system-architecture/05-data-flow-patterns.md`
> **🔗 Related Files**: `04-technical-components.md`, `06-security-compliance.md`

### Three-Layer State Synchronization
```
Database (SQLite) ↔ Business Logic (Main Process) ↔ UI (React)
     ↓                      ↓                           ↓
Persistent State     Runtime Hardware State     Component State
Slot records         KU16 class properties      useState/Context
Audit logs           Operation flags             Modal visibility
User data            Connection status           Form data
```

### Critical State Transitions
```typescript
// Medication Loading Flow
// Empty → Opening → Occupied
{ slotId: 1, hn: null, occupied: false, opening: false }
{ slotId: 1, hn: "HN123", occupied: false, opening: true }    // Unlocking
{ slotId: 1, hn: "HN123", occupied: true, opening: false }    // Loaded

// Medication Dispensing Flow  
// Occupied → Opening → Continue/Clear
{ slotId: 1, hn: "HN123", occupied: true, opening: false }
{ slotId: 1, hn: "HN123", occupied: true, opening: true }     // Dispensing
// User Choice:
{ slotId: 1, hn: "HN123", occupied: true, opening: false }    // Continue (multi-dose)
{ slotId: 1, hn: null, occupied: false, opening: false }      // Clear (complete)
```

### Error Propagation Pattern
```typescript
Hardware Error → Protocol Parser → Business Logic → IPC Response → UI Display

// Example Implementation
try {
  const response = await serialPort.write(command);
  const parsed = protocolParser.parse(response);
  await updateDatabase(parsed);
  return { success: true, data: parsed };
} catch (error) {
  await logMedicalError(error);
  return { success: false, error: getLocalizedMessage(error) };
}
```

---

## Security & Compliance

> **📖 For Complete Details**: See `/docs/system-architecture/06-security-compliance.md`
> **🔗 Related Files**: `05-data-flow-patterns.md`, `03-user-workflow.md`

### Medical Device Security Standards
- **Per-Operation Authentication**: Passkey required for each critical operation
- **Role-Based Access Control**: Admin vs Operator permissions  
- **Comprehensive Audit Trail**: Every operation logged with full context
- **Input Validation**: XSS prevention, medical data format validation
- **Hardware Communication Security**: Binary packet validation, checksum verification

### Authentication Patterns
```typescript
// Per-Operation Authentication (No System Login)
const authenticateOperation = async (passkey: string, operation: string) => {
  const user = await User.findOne({ where: { passkey } });
  if (!user) {
    await auditFailedAuth(passkey, operation);
    throw new Error('ไม่พบผู้ใช้งาน'); // Thai: User not found
  }
  
  if (!hasPermission(user.role, operation)) {
    await auditUnauthorizedAccess(user.id, operation);
    throw new Error('ไม่มีสิทธิ์ในการดำเนินการ'); // Thai: No permission
  }
  
  return user;
};

// Medical Compliance Audit Logging
const auditMedicalOperation = async (
  operation: string,
  user: UserData,
  patient: { hn: string },
  slot: { slotId: number },
  result: 'success' | 'failure'
) => {
  await DispensingLog.create({
    userId: user.id,
    hn: patient.hn,
    slotId: slot.slotId,
    process: result === 'success' ? operation : `${operation}-error`,
    message: generateThaiAuditMessage(operation, user, patient, slot, result),
    timestamp: Date.now()
  });
};
```

### Security Risk Areas for Migration
- **High Risk**: Protocol parsing, binary data handling, authentication flow
- **Medium Risk**: IPC communication, database transactions, configuration management  
- **Low Risk**: UI styling, documentation, development tools

---

## Testing Strategy

> **📖 For Complete Details**: See `/docs/system-architecture/08-testing-strategy.md`
> **🔗 Related Files**: `07-protocol-specifications.md`, `09-migration-roadmap.md`

### Risk-Based Testing Coverage
- **High Risk (100% coverage)**: Protocol parsers, hardware communication, authentication, database operations, audit logging
- **Medium Risk (90% coverage)**: IPC handlers, UI state management, configuration, error handling
- **Low Risk (80% coverage)**: UI styling, documentation, performance optimizations

### Critical Test Categories
```typescript
// Protocol Parser Unit Tests (DS16 Needed)
describe("DS16ProtocolParser", () => {
  it("should parse 16-slot 4-byte response correctly", () => {
    const ds16Response = [0x02, 0x00, 0x30, 0xFF, 0x0F, 0x00, 0x00, 0x03, 0x47];
    const result = parser.parseSlotStates(ds16Response);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(16);
    // Validate infrared detection parsing
    expect(result.data[0].infrared).toBeDefined();
  });
});

// Integration Tests
describe("Protocol Factory Integration", () => {
  it("should create appropriate controller for device type", () => {
    const ds12 = ControllerFactory.create(DeviceType.DS12);
    const ds16 = ControllerFactory.create(DeviceType.DS16);
    
    expect(ds12.maxSlot).toBe(12);
    expect(ds16.maxSlot).toBe(16);
  });
});

// End-to-End Medical Workflow Tests
describe("Complete Medication Workflow", () => {
  it("should complete unlock → load → dispense cycle with audit trail", async () => {
    // Test complete workflow with both DS12 and DS16
  });
});
```

### Hardware Simulation Testing
```typescript
// Mock hardware for testing without physical devices
export class HardwareSimulator {
  simulateDS16StatusResponse(): number[] {
    // Generate realistic DS16 response with configurable slot states
  }
  
  simulateHardwareFailure(type: 'timeout' | 'malfunction'): number[] {
    // Test error handling scenarios
  }
}
```

---

## Migration Roadmap

> **📖 For Complete Details**: See `/docs/system-architecture/09-migration-roadmap.md`
> **🔗 Related Files**: `01-system-overview.md`, `08-testing-strategy.md`

### Current Status: Phase 4 Complete - Production Ready
- ✅ **Phase 1 Complete**: System documentation, DS12 implementation, testing strategy
- ✅ **Phase 2 Complete**: DS12 protocol implementation and validation
- ✅ **Phase 3 Complete**: IPC handler migration, BuildTimeController implementation
- ✅ **Phase 4 Complete**: DS12 production deployment successful
- 🔧 **Phase 5 Ready**: DS16 configuration prepared for future hardware availability

### Current Implementation Status
✅ **DS12 Production System**
   - Complete DS12 protocol implementation in production
   - BuildTimeController architecture deployed
   - All medical compliance requirements met
   - Comprehensive testing and validation complete

🔧 **DS16 Configuration Ready**
   - BuildTimeController supports DS16 protocol
   - Configuration ready for hardware availability
   - Architecture prepared for easy DS16 activation
   - No development work required for DS16 enablement

### Migration Success Criteria
- ✅ Zero functionality regression from current system
- ✅ DS12 protocol fully operational in production
- 🔧 DS16 protocol configuration-ready for future deployment
- ✅ Complete audit trail continuity maintained
- ✅ Medical device compliance preserved
- ✅ Production deployment successful with rollback capability

---

## Implementation Code Snippets

### DS16 Protocol Parser Template (Agent Implementation Needed)
```typescript
// /main/ku-controllers/protocols/parsers/DS16ProtocolParser.ts
export class DS16ProtocolParser implements IProtocolParser {
  readonly deviceType = DeviceType.DS16;
  private readonly STX_MARKER = 0x02;
  private readonly ETX_MARKER = 0x03;

  // TODO: Implement following DS12 patterns exactly
  validatePacketStructure(packet: number[]): ProtocolResponse<boolean> {
    // Validate 7-byte DS16 response format
    // Must match DS12 error handling depth
  }

  parseSlotStates(response: number[]): ProtocolResponse<SlotState[]> {
    // Parse 4-byte DS16 data format:
    // DATA1: Slots 1-8 lock states, DATA2: Slots 9-16 lock states
    // DATA3: Slots 1-8 infrared, DATA4: Slots 9-16 infrared
  }

  buildStatusRequestPacket(address: number): ProtocolResponse<number[]> {
    // DS16: [STX, ADDR, CMD(0x30), ETX, SUM]
    // Simpler than DS12 packet structure
  }

  buildUnlockCommand(slotId: number, address: number): ProtocolResponse<number[]> {
    // Validate slotId range 1-16 (vs DS12's 1-12)
    // DS16: [STX, ADDR, CMD(0x31), SLOT, ETX, SUM]
  }
}
```

### Controller Factory Pattern  
```typescript
// /main/ku-controllers/ControllerFactory.ts
export class ControllerFactory {
  static async createController(deviceType: DeviceType, config: any): Promise<KuControllerBase> {
    switch (deviceType) {
      case DeviceType.DS12:
        return new DS12Controller(config.window, config);
      case DeviceType.DS16:
        return new DS16Controller(config.window, config); // TODO: Implement
      default:
        throw new Error(`Unsupported device type: ${deviceType}`);
    }
  }
}

// Usage in background.ts
const deviceConfig = await loadDeviceConfiguration();
const controller = await ControllerFactory.createController(
  deviceConfig.type, 
  { ...deviceConfig, window: mainWindow }
);
```

### IPC Handler Migration Pattern
```typescript
// Device-agnostic IPC handlers
const createUniversalHandler = (operation: string) => {
  return async (event: IpcMainEvent, payload: any) => {
    try {
      const controller = await getCurrentController();
      const result = await controller[operation](payload);
      await auditMedicalOperation(operation, payload, result);
      return { success: true, data: result };
    } catch (error) {
      await auditMedicalError(operation, payload, error);
      return { success: false, error: getLocalizedMessage(error) };
    }
  };
};

// Replace existing handlers
ipcMain.handle('unlock-req', createUniversalHandler('unlock'));
ipcMain.handle('dispense', createUniversalHandler('dispense'));
```

---

## Quick Reference Commands

### Development Commands
```bash
# Run protocol-specific tests
npm run test:ds12          # DS12 protocol tests
npm run test:ds16          # DS16 protocol tests (when implemented)

# Run integration tests  
npm run test:integration   # Cross-protocol testing
npm run test:hardware      # Hardware simulation tests

# Medical compliance validation
npm run test:compliance    # Audit trail and security tests
npm run test:performance   # Medical device performance standards
```

### File Locations Quick Access
```bash
# Legacy Implementation (Production)
/main/ku16/index.ts                                    # Legacy KU16 class

# New Architecture (Development)
/main/ku-controllers/base/KuControllerBase.ts         # Abstract base
/main/ku-controllers/protocols/parsers/DS12ProtocolParser.ts  # Complete
/main/ku-controllers/protocols/parsers/DS16ProtocolParser.ts  # TODO

# Database Models
/db/model/slot.model.ts                               # Slot state management
/db/model/dispensing-logs.model.ts                    # Medical audit trail

# UI Components
/renderer/components/Slot/index.tsx                   # Main slot component
/renderer/pages/home.tsx                              # 15-slot grid interface
/renderer/hooks/useKuStates.ts                        # Hardware state hook

# IPC Handlers
/main/ku16/ipcMain/unlock.ts                          # Legacy unlock handler
/main/ku16/ipcMain/dispensing.ts                      # Legacy dispense handler
```

---

## 📁 Comprehensive Documentation File Reference Guide

### File-by-File Content Summary

| **File** | **Primary Content** | **Key Sections** | **Target Audience** | **Dependencies** |
|----------|-------------------|------------------|-------------------|------------------|
| **`01-system-overview.md`** | Complete architecture overview | System topology, tech stack, business requirements | All agents, project managers | None (entry point) |
| **`02-hardware-evolution.md`** | Hardware specs and protocol evolution | Device timelines, communication protocols, hardware constraints | @agent-electron-native-integrator | 07-protocol-specifications.md |
| **`03-user-workflow.md`** | Medical workflows and UX patterns | Medication workflows, user interactions, Thai language UI | @agent-nextjs-ui-advisor | 04-technical-components.md, 06-security-compliance.md |
| **`04-technical-components.md`** | Implementation details and code structure | React components, Electron IPC, code patterns | @agent-nextjs-ui-advisor, @agent-electron-native-integrator | 03-user-workflow.md, 05-data-flow-patterns.md |
| **`05-data-flow-patterns.md`** | Database operations and state management | Sequelize models, data synchronization, atomic operations | @agent-sequelize-database-manager | 06-security-compliance.md, 04-technical-components.md |
| **`06-security-compliance.md`** | Security protocols and medical compliance | Authentication, audit trails, medical device standards | @agent-code-quality-coach, @agent-sequelize-database-manager | 05-data-flow-patterns.md, 03-user-workflow.md |
| **`07-protocol-specifications.md`** | Complete DS12/DS16 protocol documentation | Binary protocols, packet structure, command sets | @agent-electron-native-integrator | 02-hardware-evolution.md, 08-testing-strategy.md |
| **`08-testing-strategy.md`** | Testing frameworks and quality assurance | Unit tests, integration tests, hardware simulation | @agent-code-quality-coach | 07-protocol-specifications.md, 09-migration-roadmap.md |
| **`09-migration-roadmap.md`** | Implementation phases and deployment plans | Project phases, timelines, deployment strategies | @agent-project-architect | 01-system-overview.md, 08-testing-strategy.md |
| **`10-license-cli-integration.md`** | SMC License CLI Tool integration specifications | ESP32 hardware binding, encryption, CLI commands | All agents (security integration) | 01-system-overview.md, 06-security-compliance.md |

### When to Read Which File

#### 🚀 **Getting Started (New Team Members)**
1. **First**: Read `01-system-overview.md` for complete system understanding
2. **Second**: Read your agent-specific files based on role
3. **Third**: Review related cross-reference files for context

#### 🔧 **Implementation Work**
- **Starting Hardware Work**: `02-hardware-evolution.md` → `07-protocol-specifications.md` → `08-testing-strategy.md`
- **Starting UI Work**: `03-user-workflow.md` → `04-technical-components.md` → `05-data-flow-patterns.md`
- **Starting Database Work**: `05-data-flow-patterns.md` → `06-security-compliance.md` → `08-testing-strategy.md`

#### 🐛 **Troubleshooting & Debugging**
- **Hardware Issues**: `07-protocol-specifications.md`, `02-hardware-evolution.md`
- **UI/UX Issues**: `03-user-workflow.md`, `04-technical-components.md`
- **Data Issues**: `05-data-flow-patterns.md`, `06-security-compliance.md`
- **Testing Issues**: `08-testing-strategy.md`

#### 📋 **Planning & Architecture**
- **Project Planning**: `09-migration-roadmap.md`, `01-system-overview.md`
- **Technical Decisions**: `04-technical-components.md`, `02-hardware-evolution.md`
- **Compliance & Security**: `06-security-compliance.md`

### File Update Status & Maintenance

| **File** | **Last Major Update** | **Update Frequency** | **Maintenance Notes** |
|----------|---------------------|---------------------|---------------------|
| `README.md` | Current | As needed | Navigation hub - update when adding new docs |
| `01-system-overview.md` | Phase 1 | Quarterly | Update with major architectural changes |
| `02-hardware-evolution.md` | Phase 1 | When new protocols added | Hardware-specific updates |
| `03-user-workflow.md` | Phase 1 | UI/UX changes | Update with workflow modifications |
| `04-technical-components.md` | Phase 1 | Code structure changes | Technical implementation updates |
| `05-data-flow-patterns.md` | Phase 1 | Database changes | Data model and flow updates |
| `06-security-compliance.md` | Phase 1 | Security reviews | Compliance requirement updates |
| `07-protocol-specifications.md` | Ongoing | Protocol implementations | DS16 completion pending |
| `08-testing-strategy.md` | Phase 1 | Test framework changes | Testing approach updates |
| `09-migration-roadmap.md` | Weekly | Project progression | Phase completion updates |

---

## Agent-Specific Implementation Priorities

### @agent-electron-native-integrator
**Primary Focus**: DS16 protocol implementation and hardware communication
**Key Files**: `/main/ku-controllers/protocols/parsers/DS16ProtocolParser.ts`
**Implementation Requirements**:
- Follow DS12 implementation patterns exactly
- Handle 16-slot data parsing vs DS12's 12-slot
- Support infrared detection (DS16-specific)
- Maintain medical device error handling standards
- Implement comprehensive unit tests

### @agent-nextjs-ui-advisor  
**Primary Focus**: Protocol-agnostic UI components and state management
**Key Files**: UI components, hooks, and contexts
**Implementation Requirements**:
- Ensure components work with both 12 and 16-slot configurations
- Maintain existing Thai language UI text
- Preserve medical workflow user experience  
- Handle DS16 infrared detection display
- Test responsive design with variable slot counts

### @agent-sequelize-database-manager
**Primary Focus**: Database operations and audit trail integrity
**Key Files**: Database models, migration scripts, audit logging
**Implementation Requirements**:
- Preserve existing audit log format exactly
- Ensure atomic operations for medical compliance
- Handle concurrent slot operations safely
- Implement data validation for medical standards
- Maintain database performance under load

### @agent-code-quality-coach
**Primary Focus**: Testing strategy and code quality validation
**Key Files**: Test suites, quality gates, performance benchmarks
**Implementation Requirements**:
- Implement DS16 protocol parser test suite
- Create hardware simulation testing framework
- Validate medical device compliance requirements
- Ensure >95% test coverage for critical components
- Performance benchmarking for medical device standards

### @agent-project-architect
**Primary Focus**: Migration coordination and architecture validation
**Key Files**: Architecture documentation, migration roadmap
**Implementation Requirements**:
- Coordinate DS16 implementation across all agents
- Validate architectural consistency with medical device standards
- Plan production deployment strategy with zero downtime
- Ensure medical compliance throughout migration
- Document architectural decisions and patterns

---

## Medical Device Compliance Checklist

- [ ] **Audit Trail Integrity**: Every operation logged with full context
- [ ] **Authentication Security**: Per-operation passkey validation preserved
- [ ] **Data Integrity**: Zero data loss during protocol migration
- [ ] **Error Handling**: Medical-grade error recovery and logging
- [ ] **Performance Standards**: <100ms response time for critical operations
- [ ] **Hardware Communication**: Checksum validation and binary data integrity
- [ ] **User Safety**: Emergency slot deactivation capabilities maintained
- [ ] **Regulatory Compliance**: Thai language support and medical audit formats

This comprehensive reference guide provides all agents with the context needed for safe, efficient implementation of DS12/DS16 protocol support while maintaining medical device standards and regulatory compliance.

---

## 🔗 Quick File Access Commands

### For Agents Using Command Line
```bash
# Navigate to documentation directory
cd /docs/system-architecture/

# Quick read commands (use absolute paths)
cat /docs/system-architecture/01-system-overview.md
cat /docs/system-architecture/02-hardware-evolution.md  
cat /docs/system-architecture/03-user-workflow.md
cat /docs/system-architecture/04-technical-components.md
cat /docs/system-architecture/05-data-flow-patterns.md
cat /docs/system-architecture/06-security-compliance.md
cat /docs/system-architecture/07-protocol-specifications.md
cat /docs/system-architecture/08-testing-strategy.md
cat /docs/system-architecture/09-migration-roadmap.md

# Open multiple files for comparison
code /docs/system-architecture/02-hardware-evolution.md /docs/system-architecture/07-protocol-specifications.md
```

### Documentation File Sizes (Estimated)
- **`README.md`**: ~50KB (this navigation hub)
- **`01-system-overview.md`**: ~30-40KB (comprehensive overview)
- **`02-hardware-evolution.md`**: ~25-35KB (hardware specifications)  
- **`03-user-workflow.md`**: ~20-30KB (user experience patterns)
- **`04-technical-components.md`**: ~40-50KB (implementation details)
- **`05-data-flow-patterns.md`**: ~30-40KB (database and state management)
- **`06-security-compliance.md`**: ~25-35KB (security protocols)
- **`07-protocol-specifications.md`**: ~35-45KB (protocol documentation)
- **`08-testing-strategy.md`**: ~30-40KB (testing frameworks)
- **`09-migration-roadmap.md`**: ~20-30KB (implementation phases)

**Total Documentation Suite**: ~300-400KB of comprehensive technical documentation

---

> **📌 Navigation Tip**: This README.md serves as your **master index**. Bookmark this file and use the file reference tables above to quickly locate exactly what you need without reading through entire documents unnecessarily.