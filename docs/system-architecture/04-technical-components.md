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
**TypeScript Compatibility**: Buffer type casting for @types/node v18 compatibility
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

**TypeScript Buffer Handling (August 2025 Update)**:
```typescript
// DS12Controller.ts - Buffer type compatibility fix
this.serialPort.on("data", async (dataBuffer: Buffer) => {
  // Explicit type casting for @types/node v18 compatibility
  this.rawDataBuffer = Buffer.concat([this.rawDataBuffer, dataBuffer as Buffer]);
  // ... rest of data processing
});
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

#### Design System Implementation (Latest Update)

**Design System Location**: `/renderer/components/Shared/DesignSystem/`
**Purpose**: Centralized UI component library ensuring consistent design across all dialogs
**Architecture**: Modular, reusable components with TypeScript interfaces

**Core Design System Components**:
```typescript
// Design System exports
export { default as DialogBase } from './DialogBase';
export { default as DialogHeader } from './DialogHeader';
export { default as StatusIndicator } from './StatusIndicator';
export { DialogInput, DialogButton } from './FormElements';
```

**DialogBase Component**:
```typescript
interface DialogBaseProps {
  children: React.ReactNode;
  maxWidth?: string;  // Default: "max-w-[350px]"
  className?: string;
}

// Usage Pattern
<DialogBase maxWidth="max-w-[400px]">
  <DialogHeader title="Dialog Title" onClose={onClose} />
  <div className="flex flex-col p-4 gap-4">
    {/* Dialog content */}
  </div>
</DialogBase>
```

**DialogInput Component** (React Hook Form Integration):
```typescript
interface DialogInputProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder: string;
  error?: string;  // Form validation error display
}

// Enhanced with forwardRef for React Hook Form compatibility
export const DialogInput = React.forwardRef<HTMLInputElement, DialogInputProps>(({
  placeholder,
  error,
  className = "",
  ...props
}, ref) => {
  // Consistent styling with error state handling
  const baseClasses = "p-2 bg-gray-100 rounded-md text-black border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all duration-200";
  const errorClasses = error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "";
  
  return (
    <div className="flex flex-col gap-1">
      <input ref={ref} className={`${baseClasses} ${errorClasses} ${className}`} placeholder={placeholder} {...props} />
      {error && <span className="text-sm text-red-600 font-medium">{error}</span>}
    </div>
  );
});
```

**DialogButton Component** (Multi-variant with Loading States):
```typescript
interface DialogButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  icon?: string;
  children: React.ReactNode;
}

// Usage Examples
<DialogButton variant="primary" icon="✓" loading={isSubmitting}>
  ตกลง
</DialogButton>
<DialogButton variant="danger" icon="!" onClick={onEmergencyAction}>
  ปิดใช้งานช่อง
</DialogButton>
```

**StatusIndicator Component** (Enhanced Status Display):
```typescript
type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface StatusIndicatorProps {
  status: StatusType;
  message: string;
  animated?: boolean;  // Default: true
  slotNo?: number;     // Automatic slot number formatting
}

// Color-coded status with consistent design
<StatusIndicator status="error" message="เปิดอยู่" slotNo={slotNo} animated={true} />
```

#### Updated Dialog Component Integration

**Enhanced Dialog Components with Design System**:
```
Dialogs/ (All components now use Design System)
├── inputSlot.tsx (React Hook Form + DialogInput integration)
├── dispenseSlot.tsx (Enhanced form validation)
├── lockWait.tsx (StatusIndicator integration)
├── dispensingWait.tsx (Multi-step progress indicators)
├── clearOrContinue.tsx (Consistent button variants)
├── auth.tsx (Loading states and error handling)
└── newUser.tsx (Complete form system integration)
```

**React Hook Form Integration Pattern**:
```typescript
// Example from inputSlot.tsx
const { register, handleSubmit, formState: { errors } } = useForm<Inputs>();

const onSubmit: SubmitHandler<Inputs> = (data) => {
  // Enhanced validation with proper error handling
  if (data.passkey == "") {
    toast.error("กรุณากรอกรหัสผู้ใช้");
    return;
  }
  
  if (!checkDuplicate(data.hn)) {
    toast.error("ไม่สามารถลงทะเบียนซ้ำได้");
    return;
  }
  
  unlock(slotNo, data.hn, data.passkey);
  onClose();
};

return (
  <DialogBase maxWidth="max-w-[400px]">
    <DialogHeader title={`ช่อง #${slotNo} - ลงทะเบียน`} onClose={onClose} />
    <div className="flex flex-col p-4 gap-4">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <DialogInput
          placeholder="รหัสผู้ป่วย"
          error={errors.hn ? "กรุณากรอกรหัสผู้ป่วย" : undefined}
          {...register("hn", { required: true })}
        />
        <DialogButton type="submit" variant="primary" icon="✓">ตกลง</DialogButton>
      </form>
    </div>
  </DialogBase>
);
```

#### Page-Level Components

**Home Page**: `/renderer/pages/home.tsx`
**Purpose**: Primary user interface - 15-slot medication grid
**Key Features**:
- 5x3 slot grid layout (15 slots total, slot 16 unused)
- Real-time hardware state synchronization
- Temperature and humidity display
- Enhanced modal dialog management with Design System

**Management Dashboard**: `/renderer/pages/management/index.tsx`
**Purpose**: Admin interface for system management
**Authentication**: Requires admin login with enhanced auth dialog
**Tabs**:
1. Slot Management - Activate/deactivate slots
2. User Management - Add/remove users with improved forms
3. System Settings - Hardware configuration
4. Logs Management - Audit trail export

### 5. Design System Architecture (Production Implementation)

#### Centralized Component Library
**Location**: `/renderer/components/Shared/DesignSystem/`
**Purpose**: Consistent UI/UX across all dialog components with enhanced form handling
**Implementation Status**: ✅ **PRODUCTION DEPLOYED**

#### Core Design System Components

**DialogBase.tsx** - Flexible Container Component:
```typescript
interface DialogBaseProps {
  children: React.ReactNode;
  maxWidth?: string;        // Responsive width control
  className?: string;       // Additional styling flexibility
}

// Usage: Provides consistent dialog structure with responsive behavior
<DialogBase maxWidth="max-w-[450px]" className="custom-styles">
  {/* Dialog content */}
</DialogBase>
```

**DialogHeader.tsx** - Enhanced Header Component:
```typescript
interface DialogHeaderProps {
  title: string;
  progress?: number;        // Progress indicator for multi-step processes
  onClose?: () => void;     // Optional close functionality
  variant?: 'default' | 'success' | 'error' | 'warning';
}

// Features: Progress indicators, status-based styling, consistent typography
```

**FormElements.tsx** - React Hook Form Integrated Components:
```typescript
// DialogInput - Forward ref pattern for React Hook Form
const DialogInput = React.forwardRef<HTMLInputElement, DialogInputProps>(
  ({ label, error, type = "text", ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <input 
          ref={ref}
          className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
          {...props}
        />
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    );
  }
);

// DialogButton - Enhanced button with loading states
interface DialogButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}
```

**StatusIndicator.tsx** - Medical-Grade Status Display:
```typescript
interface StatusIndicatorProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading';
  message: string;
  slotNumber?: number;      // Automatic slot number formatting
  animate?: boolean;        // Pulsing animation for active states
}

// Features:
// - Color-coded feedback (medical device standards)
// - High contrast ratios for medical environment visibility
// - Automatic Thai language formatting
// - Accessibility compliance
```

#### Design System Usage Pattern
```typescript
import { DialogBase, DialogHeader, DialogInput, DialogButton, StatusIndicator } from '@/components/Shared/DesignSystem';

// Consistent dialog implementation
const MyDialog = () => (
  <DialogBase maxWidth="max-w-[400px]">
    <DialogHeader title="ยืนยันการปลดล็อคช่องยา" variant="warning" />
    <StatusIndicator 
      status="info" 
      message="กรุณายืนยันรหัสผ่านเพื่อปลดล็อค"
      slotNumber={5}
    />
    <form>
      <DialogInput 
        label="รหัสผ่าน"
        type="password"
        error={formErrors.passkey}
        {...register('passkey')}
      />
      <DialogButton variant="primary" loading={isSubmitting}>
        ยืนยัน
      </DialogButton>
    </form>
  </DialogBase>
);
```

#### Enhanced Component Hierarchy

**Slot Components** (Enhanced with Design System):
```
Slot/index.tsx (Main slot container with responsive behavior)
├── empty.tsx (Empty slot display with status indicators)
├── locked.tsx (Enhanced medication-loaded slot with indicator integration)
└── Integrated Design System components for consistent UI
```

#### Enhanced Slot Component Implementation

**LockedSlot Component** (`/renderer/components/Slot/locked.tsx`):
```typescript
interface LockedSlotProps {
  slotNo: number;
  hn: string;        // Patient Hospital Number
  date: string;      // Medication loading date
  time: string;      // Medication loading time
  temp: number;      // Temperature reading
  humid: number;     // Humidity reading
}

// Enhanced features:
// - Integrated temperature and humidity indicators
// - Tooltip support for long HN display
// - Force reset functionality with confirmation dialog
// - Visual state management (background color changes)
// - Medical-grade information display with Thai language support
```

**BaseIndicator Component** (`/renderer/components/Indicators/baseIndicator.tsx`):
```typescript
interface IndicatoProps {
  title: string;
  value: number;
  unit: string;      // "*C" for temperature, "%" for humidity
  threshold: number; // Alert threshold for medical compliance
}

// Features:
// - Icon-based display (temperature/humidity icons)
// - Compact design for slot integration
// - Visual value representation with background styling
// - Medical environment optimized styling
```

#### Medical Environment Indicator System

**Environmental Monitoring Integration**:
- **Temperature Monitoring**: TbTemperatureCelsius icon with real-time values
- **Humidity Monitoring**: WiHumidity icon with percentage display  
- **Threshold Awareness**: Built-in threshold checking for medical compliance
- **Compact Design**: Optimized for slot component integration

**Usage in Locked Slots**:
```typescript
<div className="flex w-full">
  <Indicator value={temp} unit="*C" title="Temp." threshold={50} />
  <Indicator value={humid} unit="%" title="%RH" threshold={85} />
</div>
```

**Shared Components**:
```
Shared/
├── DesignSystem/ (PRODUCTION - Centralized component library)
│   ├── DialogBase.tsx (Flexible container with responsive layout)
│   ├── DialogHeader.tsx (Headers with progress indicators)
│   ├── FormElements.tsx (React Hook Form integrated components)
│   ├── StatusIndicator.tsx (Medical-grade color-coded display)
│   └── index.ts (Unified exports for consistent usage)
├── Loading.tsx (Loading animations)
├── Navbar.tsx (Navigation component)
└── Tooltip.tsx (Enhanced tooltips)
```

**Settings Components** (Enhanced with Design System):
```
Settings/
├── SlotSetting.tsx (Enhanced slot management with Design System)
├── UserSetting.tsx (Improved form validation and UX)
├── SystemSetting.tsx (Consistent configuration interface)
└── LogsSetting.tsx (Enhanced audit log viewer)
```

### 6. Responsive Slot Grid System (Production Implementation)

#### Dynamic Hardware Configuration
**Location**: `/renderer/utils/getDisplaySlotConfig.ts`
**Purpose**: Hardware-aware responsive grid layout with build-time device detection
**Implementation Status**: ✅ **PRODUCTION DEPLOYED**

#### Slot Display Configuration Interface
```typescript
interface SlotDisplayConfig {
  slotCount: number;        // DS12: 12, DS16: 15 (max displayable)
  columns: number;          // DS12: 4, DS16: 5
  rows: number;             // Both: 3 (medical device standard)
  gridClass: string;        // Tailwind CSS grid classes
  containerClass: string;   // Responsive container styling
  gapClass: string;         // Consistent spacing
}

interface ResponsiveGridConfig {
  containerClass: string;   // Main container layout
  gridClass: string;        // CSS Grid configuration
  gapClass: string;         // Grid gap spacing
}
```

#### Hardware Detection and Grid Generation
```typescript
// Automatic hardware detection from BuildTimeController
export const getDisplaySlotConfig = (): SlotDisplayConfig => {
  const deviceConfig = BuildConstants.getCurrentConfig();
  
  switch (deviceConfig.deviceType) {
    case DeviceType.DS12:
      return {
        slotCount: 12,
        columns: 4,
        rows: 3,
        gridClass: 'grid-cols-4',
        containerClass: 'h-full place-content-center place-items-center px-8 py-8',
        gapClass: 'gap-6'
      };
    
    case DeviceType.DS16:
      return {
        slotCount: 15,          // Max displayable (16th slot reserved)
        columns: 5,
        rows: 3,
        gridClass: 'grid-cols-5',
        containerClass: 'h-full place-content-center place-items-center px-6 py-6',
        gapClass: 'gap-4'       // Slightly tighter spacing for 5 columns
      };
  }
};

// Responsive grid configuration for different screen sizes
export const getResponsiveGridConfig = (): ResponsiveGridConfig => {
  const config = getDisplaySlotConfig();
  return {
    containerClass: config.containerClass,
    gridClass: `grid ${config.gridClass}`,
    gapClass: config.gapClass
  };
};

// Slot array generation with hardware awareness
export const generateSlotArray = (slotCount: number): IPayload[] => {
  return Array.from({ length: slotCount }, (_, index) => ({
    slotId: index + 1,
    hn: null,
    occupied: false,
    opening: false,
    isActive: true
  }));
};
```

#### Home Page Responsive Implementation
**Location**: `/renderer/pages/home.tsx`

```typescript
function Home() {
  const { slots } = useKuStates();
  const [gridConfig, setGridConfig] = useState<ResponsiveGridConfig>({
    containerClass: 'h-full place-content-center place-items-center px-8 py-8',
    gridClass: 'grid grid-cols-4',
    gapClass: 'gap-6'
  });

  // Load device configuration on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        await loadDisplaySlotConfigAsync();  // Load from database
        const responsiveGridConfig = getResponsiveGridConfig();
        setGridConfig(responsiveGridConfig);
        
        // Generate mock slots for hardware compatibility
        const config = getDisplaySlotConfig();
        const mockSlots = generateSlotArray(config.slotCount);
        setMockSlots(mockSlots);
        
      } catch (error) {
        console.error('Failed to load slot configuration:', error);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Render responsive grid
  return (
    <div className={gridConfig.containerClass}>
      <div className={`${gridConfig.gridClass} ${gridConfig.gapClass}`}>
        {mockSlots.map((slot, index) => (
          <Slot 
            key={slot.slotId}
            slotData={slot}
            // Hardware-specific features
            showAdvanced={slot.infrared !== undefined} // DS16-specific
          />
        ))}
      </div>
    </div>
  );
}
```

#### Medical Device Grid Standards
- **Fixed 3-Row Layout**: Medical device standard for consistent operator experience
- **Variable Column Count**: DS12 (4 columns), DS16 (5 columns) based on hardware
- **Maximum 15 Displayable Slots**: 16th slot reserved for system operations
- **Consistent Spacing**: Optimized for touch interaction in medical environments
- **Hardware-Agnostic UI**: Same user workflow regardless of underlying hardware

#### Database Integration
```typescript
// Configuration persistence in database
interface SettingData {
  available_slots: number;  // Loaded from hardware configuration
  grid_layout: string;      // Serialized layout configuration
  device_type: string;      // DS12 | DS16 for build-time selection
}

// Async configuration loading
export const loadDisplaySlotConfigAsync = async (): Promise<void> => {
  try {
    const settings = await ipcRenderer.invoke('get-setting');
    // Configuration is automatically applied to UI rendering
    debugSlotConfiguration(settings);
  } catch (error) {
    console.error('Error loading display slot configuration:', error);
    throw error;
  }
};
```

#### Design Token System and Tailwind Configuration

**Updated Tailwind Configuration**: `/renderer/tailwind.config.js`
**Purpose**: Standardized color system supporting status indicators and consistent theming

**Enhanced Color Palette**:
```javascript
module.exports = {
  theme: {
    colors: {
      // Core colors for medical device interface
      white: colors.white,
      gray: colors.gray,
      blue: colors.blue,
      red: colors.red,      // NEW - Error states, danger actions
      green: colors.green,  // NEW - Success states, completed actions
      yellow: colors.yellow, // NEW - Warning states, attention needed
      black: colors.black,   // NEW - High contrast text
      
      // Custom medical interface colors
      bg_1: "#F9FFFF",      // Primary background (light blue tint)
      bg_2: "#F3F3F3",      // Secondary background (neutral gray)
      text_1: "#615858",    // Primary text color (warm gray)
    },
  },
};
```

**Design Token Usage in Components**:
```typescript
// Status-based color mapping in StatusIndicator
const getStatusStyles = () => {
  switch (status) {
    case 'success':
      return {
        bg: 'bg-green-50',     // Light green background
        border: 'border-green-200',
        text: 'text-green-700',
        dot: 'bg-green-500'    // Solid green indicator
      };
    case 'error':
      return {
        bg: 'bg-red-50',       // Light red background
        border: 'border-red-200',
        text: 'text-red-700',
        dot: 'bg-red-500'      // Solid red indicator
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50',    // Light yellow background
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        dot: 'bg-yellow-500'   // Solid yellow indicator
      };
  }
};
```

**Button Variant Color System**:
```typescript
// DialogButton variant styling
const getVariantClasses = () => {
  switch (variant) {
    case "primary":
      return "bg-blue-500 hover:bg-blue-600 text-white";    // Medical blue theme
    case "secondary":
      return "bg-gray-100 hover:bg-gray-200 text-gray-700"; // Neutral actions
    case "danger":
      return "bg-red-500 hover:bg-red-600 text-white";      // Emergency/danger actions
  }
};
```

**Form Input Error States**:
```typescript
// DialogInput error styling integration
const baseClasses = "p-2 bg-gray-100 rounded-md text-black border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const errorClasses = error 
  ? "border-red-500 focus:border-red-500 focus:ring-red-500"  // Red error state
  : "";
```

**Medical Device Accessibility**:
- High contrast ratios for medical environment visibility
- Color-blind friendly status indication (shape + color)
- Consistent hover states for touch screen compatibility
- Loading states with clear visual feedback

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

## TypeScript Development Configuration (August 2025 Update)

### TypeScript Compiler Configuration
**Location**: `/tsconfig.json`  
**Target**: ES2020 with CommonJS modules  
**Node.js Types**: @types/node ^18.11.18

**Key Configuration Settings**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"]
  }
}
```

### Buffer Type Compatibility Issues
**Issue**: @types/node v18 introduces stricter Buffer type checking with TypeScript 5.1.6  
**Symptoms**: `TS2345` errors when passing `Buffer` to `Buffer.concat()`  
**Root Cause**: Type incompatibility between `Buffer` and `Uint8Array<ArrayBufferLike>`

**Resolution Pattern**:
```typescript
// Before: Type error with @types/node v18
this.rawDataBuffer = Buffer.concat([this.rawDataBuffer, dataBuffer]);

// After: Explicit type casting for compatibility
this.rawDataBuffer = Buffer.concat([this.rawDataBuffer, dataBuffer as Buffer]);
```

**Applied Fixes**:
- **DS12Controller.ts**: Line 1249 - Serial port data buffer concatenation
- **Future Controllers**: Apply same pattern for DS16Controller implementation

### Development Environment Considerations
**TypeScript Version**: 5.1.6  
**Node.js Types**: Version 18 compatibility layer  
**Compilation Strategy**: Explicit type casting for Buffer operations  
**Testing**: `npx tsc --noEmit` for type checking without build

## Risk Assessment for Component Changes

### High-Risk Components
1. **Binary Protocol Parsers**: Critical for hardware communication integrity
2. **Database State Management**: Essential for medical audit compliance
3. **IPC Event Handlers**: Core business logic execution
4. **Authentication System**: Security and access control
5. **TypeScript Buffer Operations**: Hardware communication data integrity

### Medium-Risk Components
1. **React Components**: User interface - can be refactored with tests
2. **Utility Functions**: Helper methods with clear interfaces
3. **Configuration Management**: Settings with validation
4. **TypeScript Configuration**: Compiler settings affecting type safety

### Low-Risk Components
1. **Styling and Layout**: CSS and component presentation
2. **Documentation**: System documentation and comments
3. **Development Tools**: Build and deployment scripts

## ESP32 Configuration & Management System

### ESP32 Integration Architecture
**Location**: `esp32-deployment-tool/` directory  
**Purpose**: Cross-platform ESP32 deployment tool with template management and license integration  
**Technology Stack**: Next.js 14 + PlatformIO + ESP32 Arduino Framework + REST API + Container Support

### ESP32 Hardware Layer
**Location**: `smc-key-temp/` directory  
**Purpose**: Hardware provisioning and environmental monitoring for SMC License CLI integration  
**Technology Stack**: PlatformIO + ESP32 Arduino Framework + REST API

### ESP32 Deployment Tool Architecture (✅ PRODUCTION READY)
```
esp32-deployment-tool/
├── templates/
│   ├── main.cpp.template        # ESP32 firmware template
│   └── platformio.ini.template  # PlatformIO config template
├── src/app/api/                 # 7 API endpoints for deployment workflow
├── src/components/
│   └── CustomerForm.tsx         # Enhanced form with no-expiry checkbox
├── exports/                     # JSON + CSV output with license tracking
└── next.config.js               # Next.js 14 configuration
```

### ESP32 Hardware Project Structure
```
smc-key-temp/
├── platformio.ini              # PlatformIO project configuration
├── src/main.cpp                # ESP32 firmware (WiFi AP + REST API server)
├── docs/DHT22.md              # DHT22 sensor integration documentation  
└── lib/                        # Auto-managed ESP32 libraries
```

### Core ESP32 Components

#### 1. WiFi Access Point Management
**Implementation**: ESP32 creates secure WiFi network for configuration
```cpp
// WiFi AP Configuration (from main.cpp)
const char* ssid = "ESP32_AP";
const char* password = "password123";
IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// Medical device network isolation
WiFi.mode(WIFI_AP);
WiFi.softAPConfig(local_ip, gateway, subnet);
WiFi.softAP(ssid, password);
```

#### 2. REST API Server Architecture
**Framework**: ESPAsyncWebServer for non-blocking HTTP handling  
**Medical Compliance**: CORS enabled for secure cross-origin communication

**API Endpoints Implementation**:
```cpp
// MAC Address Retrieval (License Binding)
server.on("/mac", HTTP_GET, [](AsyncWebServerRequest *request){
  String macAddress = WiFi.macAddress();
  JsonDocument doc;
  doc["mac_address"] = macAddress;
  String jsonString;
  serializeJson(doc, jsonString);
  request->send(200, "application/json", jsonString);
});

// Health Monitoring (System Status)
server.on("/health", HTTP_GET, [](AsyncWebServerRequest *request){
  JsonDocument doc;
  doc["server"]["status"] = "healthy";
  doc["server"]["uptime_ms"] = millis();
  doc["server"]["connected_clients"] = WiFi.softAPgetStationNum();
  doc["info"]["device"] = "ESP32";
  doc["info"]["mac_address"] = WiFi.macAddress();
  doc["info"]["ap_ip"] = WiFi.softAPIP().toString();
  doc["info"]["ap_ssid"] = ssid;
  // JSON serialization and response
});

// Environmental Monitoring (Medical Compliance)
server.on("/temp", HTTP_GET, [](AsyncWebServerRequest *request){
  float temperature = getMockTemperature(); // Real DHT22 integration available
  JsonDocument doc;
  doc["sensor"] = "mock";  // "DHT22" when real sensor connected
  doc["temperature_c"] = temperature;
  doc["timestamp"] = millis();
  // Optional: doc["humidity_percent"] = humidity; (DHT22)
});
```

#### 3. Environmental Monitoring Integration
**Hardware**: DHT22 Temperature/Humidity Sensor (Optional)  
**Medical Purpose**: Medication storage environmental compliance  
**Implementation Status**: Template code available in `docs/DHT22.md`

**DHT22 Integration Pattern**:
```cpp
#include <DHT.h>
#include <DHT_U.h>

#define DHTPIN 4        // GPIO pin for sensor data
#define DHTTYPE DHT22   // DHT 22 (AM2302)

DHT_Unified dht(DHTPIN, DHTTYPE);

// Real sensor data retrieval
sensors_event_t event;
dht.temperature().getEvent(&event);
if (!isnan(event.temperature)) {
  temperature = event.temperature;
  // Medical compliance: Log temperature for audit trail
}
```

### ESP32 Development Workflow Integration

#### PlatformIO Build System
**Configuration File**: `platformio.ini`
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps = 
    mathieucarbou/ESP Async WebServer@^3.0.6
    bblanchon/ArduinoJson@^7.4.2
```

**Build Commands Integration**:
```bash
# Navigate to ESP32 project
cd smc-key-temp/

# Development workflow
pio run                    # Build firmware
pio run --target upload    # Deploy to ESP32 hardware
pio device list           # Detect ESP32 devices
pio device monitor        # Serial debugging output
```

#### Template-Based Configuration System (Future Enhancement)
**Purpose**: Dynamic ESP32 firmware generation for different deployments  
**Architecture**: Template engine for `main.cpp` generation

**Configuration Template Pattern**:
```typescript
interface ESP32Config {
  wifiSSID: string;
  wifiPassword: string;
  deviceIP: string;
  dht22Enabled: boolean;
  dht22Pin: number;
  temperatureThreshold: number;
  humidityThreshold: number;
}

// Template generation for custom deployments
export const generateESP32Firmware = (config: ESP32Config): string => {
  return `
    const char* ssid = "${config.wifiSSID}";
    const char* password = "${config.wifiPassword}";
    IPAddress local_ip(${config.deviceIP.split('.').join(', ')});
    ${config.dht22Enabled ? `#define DHTPIN ${config.dht22Pin}` : '// DHT22 disabled'}
    // Generated firmware template
  `;
};
```

### ESP32 License CLI Integration Workflow

#### Hardware Binding Process
```
1. ESP32 boots → Creates WiFi AP "ESP32_AP"
2. CLI connects → HTTP GET /mac
3. MAC retrieved → License generation with binding
4. License stored → Application activation with ESP32 verification
5. Ongoing monitoring → Environmental data via /temp endpoint
```

#### Cross-Platform Development Support
**Development Mode**: Mock ESP32 responses for testing
```typescript
// Development bypass (from SMC License CLI)
if (process.env.NODE_ENV === 'development') {
  return {
    mac_address: "DEV:TEST:MAC:ADDR",  // Mock MAC for testing
    server: { status: "healthy" },
    temperature_c: 25.0
  };
}
```

**Production Mode**: Real ESP32 HTTP communication
```typescript
// Production ESP32 communication
const response = await fetch('http://192.168.4.1/mac');
const macData = await response.json();
// Real MAC address binding for license security
```

### Medical Device Compliance Features

#### Environmental Monitoring Standards
- **Temperature Range**: Configurable thresholds for medication storage
- **Humidity Control**: Medical facility compliance tracking
- **Data Logging**: Integration with SMC audit trail system
- **Alert System**: Threshold violation notifications

#### Security Considerations
- **Network Isolation**: ESP32 creates isolated WiFi network
- **MAC Address Binding**: Hardware-based license security
- **CORS Configuration**: Secure cross-origin communication
- **Input Validation**: JSON response sanitization

### ESP32 Keygen System UI Architecture (✅ PRODUCTION READY)

#### License Activation Interface
**Location**: `/renderer/pages/activate-key.tsx`  
**Purpose**: Hardware-based license activation with ESP32 integration  
**Features**: Thai language UI, WiFi auto-connection, hardware binding validation

#### ESP32 Configuration Interface (Deployment Tool)
**Location**: Standalone Next.js application in `esp32-deployment-tool/`  
**Purpose**: Cross-platform ESP32 firmware deployment and management

**Component Architecture**:
```typescript
interface ESP32ConfigPageProps {
  devices: ESP32Device[];        // Detected ESP32 devices
  templates: FirmwareTemplate[]; // Configuration templates
  deploymentStatus: DeploymentStatus;
}

// Planned components
export const ESP32DeviceList: React.FC = () => {
  // Auto-detect ESP32 devices via serial port scanning
};

export const FirmwareBuilder: React.FC = () => {
  // Template-based firmware configuration UI
};

export const DeploymentManager: React.FC = () => {
  // PlatformIO integration for automated deployment
};
```

#### IPC Integration for ESP32 Management
**Planned IPC Handlers**:
```typescript
// ESP32 device detection
ipcMain.handle('esp32:detect-devices', async () => {
  // Serial port scanning for ESP32 boards
});

// Firmware build and upload
ipcMain.handle('esp32:deploy-firmware', async (event, config) => {
  // PlatformIO CLI integration
  // Template generation → Build → Upload workflow
});

// ESP32 monitoring
ipcMain.handle('esp32:get-status', async (event, deviceIP) => {
  // HTTP requests to ESP32 REST API
});
```

### Risk Assessment for ESP32 Integration

#### Low-Risk Components
1. **ESP32 REST API**: Standard HTTP endpoints with JSON responses
2. **PlatformIO Integration**: Established embedded development workflow
3. **Template System**: Code generation with validation
4. **Development Tooling**: Build automation and device detection

#### Medium-Risk Components  
1. **Hardware Communication**: Serial port management and device detection
2. **Firmware Deployment**: Automated upload with error handling
3. **Network Configuration**: Cross-platform WiFi management with enhanced detection patterns

#### WiFi Connection Platform Strategy (August 2025 Update)
**Issue**: Cross-platform WiFi connection and detection inconsistencies.

**Platform-Specific WiFi Strategies**:
- **Windows**: Auto WiFi connection via `netsh wlan` commands ✅
- **macOS**: Manual WiFi connection strategy (USER-GUIDED) ✅
- **Linux**: Auto WiFi connection via `nmcli` commands ✅

**macOS WiFi Detection Enhancement**:
```typescript
// Enhanced macOS WiFi detection with multiple patterns
case 'darwin':
  // Pattern 1: "Current Wi-Fi Network: NetworkName"
  let macMatch = output.match(/Current Wi-Fi Network:\s*(.+)/);
  
  // Pattern 2: "Wi-Fi Network: NetworkName" 
  if (!macMatch) {
    macMatch = output.match(/Wi-Fi Network:\s*(.+)/);
  }
  
  // Pattern 3: Direct network name output
  if (!macMatch && !output.includes('You are not associated')) {
    return output.trim();
  }
```

**Connection Validation Improvements**:
- Retry mechanism: 3 attempts with 2-second intervals
- Extended timeout: 7 seconds (macOS WiFi connection delay)
- Enhanced logging for debugging platform-specific issues

#### High-Risk Components
1. **License Integration**: ESP32 MAC address binding security
2. **Environmental Monitoring**: Medical compliance data integrity
3. **Production Deployment**: Real hardware dependency management

This technical component analysis provides the comprehensive understanding needed for safe refactoring of the Smart Medication Cart system while preserving medical device functionality, security, and compliance requirements, now enhanced with ESP32 configuration and deployment capabilities.