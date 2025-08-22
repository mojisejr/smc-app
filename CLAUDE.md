# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Medication Cart (SMC) - An Electron desktop application for managing automated medication dispensing hardware. Built with Electron.js + Next.js frontend and SQLite database.

**Medical Device Context**: This is safety-critical medical device software requiring strict compliance patterns for audit trails, error handling, and hardware communication protocols.

## Common Development Commands

### Development

```bash
npm run dev                    # Start development server (general)
npm run dev:ds12              # Start with DS12 device type
npm run dev:ds16              # Start with DS16 device type
```

### Testing

```bash
npm test                      # Run Jest test suite
npm run test:ds12             # Test DS12 controller specifically
npm run test:integration      # Run integration tests
npm run test:hardware         # Hardware connection tests
npm run test:coverage         # Generate coverage report
npm run test:watch            # Watch mode for development
```

### CLI Tool Testing

```bash
# Navigate to CLI directory first: cd cli/
npm run test                  # Phase 1: Foundation & Project Structure
npm run test:phase2           # Phase 2: ESP32 Communication Module
npm run test:phase3           # Phase 3: License Generation & Validation
npm run test:phase4           # Phase 4: Complete CLI Implementation
npm run test:phase5           # Phase 5: Polish & Final Testing
npm run test:all              # Run all phase tests sequentially
```

### ESP32 Deployment Tool

```bash
# Navigate to deployment tool directory first: cd esp32-deployment-tool/

# Development (Cross-Platform)
npm run dev                      # Local development server
curl http://localhost:3000/api/health  # Test API health

# Container Production
docker-compose up --build        # Container environment
```

> **📖 Complete Commands**: See `/docs/system-architecture/10-license-cli-integration.md`

### Build

```bash
npm run build                 # Build for all platforms
npm run build:ds12            # Build DS12 configuration
npm run build:ds16            # Build DS16 configuration
npm run build:linux           # Linux AppImage build
npm run build:win63           # Windows x64 build
```

### CLI Tool Build

```bash
# Navigate to CLI directory first: cd cli/
npm run build                 # Development build
npm run build:prod            # Production build (optimized, no source maps)
npm run clean                 # Clean build directory
npm run package               # Create distributable .tgz package
```

### Configuration

```bash
npm run config:ds12           # Load DS12 environment config
npm run config:ds16           # Load DS16 environment config
npm run config:validate       # Validate build configuration
```

### Validation Scripts

```bash
npm run validate:phase4-1              # Validate Phase 4.1 implementation
npm run validate:build-time            # Validate build-time configuration
npm run test:dispensing-workflow       # Test complete dispensing workflow
```

## Architecture Overview

### Core Structure (Production Implementation)

- **Main Process**: `main/` - Electron main process with BuildTimeController, unified IPC handlers, database management
- **Renderer Process**: `renderer/` - Enhanced Next.js React application with Design System and responsive grid
- **Database**: SQLite with Sequelize ORM (`db/` models) + responsive configuration storage
- **Hardware Controllers**: `main/ku-controllers/` - BuildTimeController with DS12/DS16 abstraction (DS12 production, DS16 ready)
- **Configuration**: Build-time device configuration in `config/constants/BuildConstants.ts` with dynamic UI adaptation
- **Design System**: `renderer/components/Shared/DesignSystem/` - Centralized component library with React Hook Form integration
- **CLI Tool**: `cli/` - SMC License CLI ✅ **PRODUCTION READY v1.0.0**
- **ESP32 Deployment Tool**: `esp32-deployment-tool/` - Cross-platform ESP32 deployment ✅ **TEMPLATE CONSOLIDATION COMPLETE**

### Key Components

**BuildTimeController** (`main/ku-controllers/BuildTimeController.ts`) - ✅ Production Deployed:

- Singleton factory for medical device controller management
- Handles DS12 (PRODUCTION) / DS16 (CONFIG-READY) hardware abstraction
- Critical for medical device compliance (audit trails, thread safety)
- Build-time device configuration with protocol abstraction

**Device Controllers**:

- `DS12Controller.ts` - 12-slot medication cabinet protocol
- Protocol parsers in `main/ku-controllers/protocols/`
- Legacy KU16 fallback maintained for compatibility

**Enhanced IPC Architecture** (Production):

- `main/device-controllers/ipcMain/` - Unified device handlers with BuildTimeController integration
- Authentication: `main/auth/` - Per-operation passkey validation preserved
- Settings management: `main/setting/` - Enhanced with responsive configuration
- Audit logging: `main/logger/` - Medical-grade logging with Thai language support

### Medical Device Compliance Requirements

**Critical Patterns to Maintain**:

- All hardware operations must be logged via audit trail system
- Thai language error messages preserved exactly
- Authentication patterns unchanged (passkey validation)
- Database operations must use exact existing patterns (`Slot.update()`, `logDispensing()`)
- IPC timing maintained for medical device certification

**Thread Safety**:

- Single controller instance prevents hardware conflicts
- Graceful cleanup on shutdown via `BuildTimeController.cleanup()`
- Emergency disconnect capabilities for hardware protection

## Database Schema

SQLite database with Sequelize models in `db/model/`:

- `user.model.ts` - User authentication and roles
- `slot.model.ts` - Medication slot states and configuration
- `dispensing-logs.model.ts` - Audit trail for all dispensing operations
- `logs.model.ts` - System operation logs
- `setting.model.ts` - Application configuration

## Testing Strategy

**Coverage Requirements**:

- Global: 85% minimum (medical device standard)
- Critical components require 95-100% coverage:
  - `DS12Controller.ts`: 95% all metrics
  - `DS12ProtocolParser.ts`: 100% all metrics

**Test Style**:

- เขียน script เพื่อ test เมื่อผมสั่งเท่านั้น
- \*\*หลักๆ จะใช้วิธีการ manual testing แล้วผมเก็บ log มาเพื่อบอกคุณให้แก้ไขตามที่บอก หรือปรึกษาคุณหลังจากนั้น

## Device Configuration

**Build-Time Configuration**:

- Device type determined at build time via environment variables
- `DEVICE_TYPE=DS12` or `DEVICE_TYPE=DS16`
- Configuration files: `config/build/ds12.env`, `config/build/ds16.env`

**Hardware Communication**:

- RS485 serial communication via SerialPort library
- Protocol parsing in `main/ku-controllers/protocols/parsers/`
- Binary data handling with checksum validation

## Enhanced UI Framework (Production Implementation)

**Frontend Stack** (Enhanced Production):

- Next.js with React 18 and TypeScript
- TailwindCSS + DaisyUI component library with enhanced color system
- Framer Motion for animations
- React Hook Form for enhanced form management and validation
- **Design System Architecture**: Centralized component library (`/renderer/components/Shared/DesignSystem/`)
- **Responsive Grid System**: Hardware-aware layout adaptation

### Design System Components (Production)

**Core Components**:

```typescript
// Centralized exports from /renderer/components/Shared/DesignSystem/
export { DialogBase } from "./DialogBase"; // Flexible container with responsive layout
export { DialogHeader } from "./DialogHeader"; // Headers with progress indicators
export { StatusIndicator } from "./StatusIndicator"; // Medical-grade color-coded status display
export { DialogInput, DialogButton } from "./FormElements"; // React Hook Form integrated components
```

**Usage Pattern**:

```typescript
import {
  DialogBase,
  DialogHeader,
  DialogInput,
  DialogButton,
  StatusIndicator,
} from "@/components/Shared/DesignSystem";

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
        {...register("passkey")}
      />
      <DialogButton variant="primary" loading={isSubmitting}>
        ยืนยัน
      </DialogButton>
    </form>
  </DialogBase>
);
```

### Responsive Grid System (Production)

**Hardware-Aware Configuration**:

```typescript
// Dynamic slot configuration based on device type
const config = getDisplaySlotConfig(); // DS12: 12 slots, DS16: 15 slots
const gridConfig = getResponsiveGridConfig(); // Auto grid layout

// Grid layouts:
// DS12: 3x4 grid (grid-cols-4) with gap-6 spacing
// DS16: 3x5 grid (grid-cols-5) with gap-4 spacing
```

**Home Page Implementation**:

```typescript
// Hardware detection and UI adaptation
useEffect(() => {
  const loadConfig = async () => {
    await loadDisplaySlotConfigAsync();
    const responsiveGridConfig = getResponsiveGridConfig();
    setGridConfig(responsiveGridConfig);

    const config = getDisplaySlotConfig();
    const mockSlots = generateSlotArray(config.slotCount);
    setMockSlots(mockSlots);
  };
  loadConfig();
}, []);
```

**Key Pages & Components** (Enhanced Production UI):

- `renderer/pages/home.tsx` - Responsive slot grid with hardware-aware layout (DS12: 3x4, DS16: 3x5)
- `renderer/pages/management/` - Admin dashboard with Design System integration
- `renderer/pages/setting.tsx` - System configuration with enhanced form validation
- `renderer/pages/logs.tsx` - Audit trail viewer with improved Thai language support
- `renderer/utils/getDisplaySlotConfig.ts` - Dynamic hardware configuration utility

**Enhanced Slot Components** (Production):

- `renderer/components/Slot/locked.tsx` - Enhanced medication slots with environmental monitoring
- `renderer/components/Indicators/baseIndicator.tsx` - Compact temperature/humidity display for medical compliance

## Development Guidelines

\*\* My Descriptions
\*\* I'm a Thai solo Developer with intermediate level of development skill

- เขียน code โดยการใช้ code pattern ที่ง่ายต่อการเข้าใจ และมีประสิทธิภาพ เหมาะสำหรับ solo dev
- โค้ดที่มีความยากและซับซ้อน ต้อง comment ขั้นตอนการทำงานต่างๆ ให้ชัดเจน
- ไม่ใช้ code pattern ที่ซับซ้อน
- ตอบคำถามผมเป็นภาษาไทยเท่านั้น ยกเว้น technical term เป็นภาษาอังกฤษได้
- พยายาม commit checkpoint เมื่อจบ แต่ละ phase
- หลังจากจบแต่ละ phase ถ้ามี run dev server ให้ kill ด้วย

\*\* When you need to write console.log

- ผมต้องการให้แบ่ง category เป็นดังนี้
  - log ที่ใช้ debug เพื่อค้นหา error ใช้ prefix ว่า debug
  - log ที่แสดง process การทำงาน ใช้ prefix ว่า info
  - log ที่เป็น error log ใช้ prefix ว่า error
- เขียน log เมื่อจำเป็นเท่านั้น ไม่เขียนจนรก

\*\* ชื่อเรียกส่วนต่างๆที่ผมจะใช้เรียกเวลาคุณกับคุณ
smc-app : หมายถึง SMC application หลักที่เราสร้างด้วย Nextronjs
ds : หมายถึง hardware ที่เชื่อมต่อกับ smc-app ของเรา
cli : หมายถึง key-gen cli
esp32-dev-tool : หมายถึง standalone Next.js tool สำหรับ deploy firmware ลง ESP32 พร้อม customer configuration (รวม template management แล้ว)

**When Working with Hardware Controllers** (Production Pattern):

```typescript
// Always use BuildTimeController for device access (Production)
const controller = BuildTimeController.getCurrentController();
if (!controller) {
  // Handle disconnected state same as legacy KU16
  return;
}

// Use controller methods that match KU16 API
await controller.sendUnlock(payload);
controller.sendCheckState();
const isConnected = controller.isConnected();
```

**When Working with Design System Components**:

```typescript
// Import from centralized Design System
import {
  DialogBase,
  DialogHeader,
  StatusIndicator,
  DialogInput,
  DialogButton,
} from "@/components/Shared/DesignSystem";

// Use consistent component patterns
const MyComponent = () => (
  <DialogBase maxWidth="max-w-[400px]">
    <DialogHeader title="ข้อความภาษาไทย" variant="success" />
    <StatusIndicator status="info" message="สถานะการทำงาน" />
    <DialogButton variant="primary">ปุ่มยืนยัน</DialogButton>
  </DialogBase>
);
```

**When Working with Responsive Grid**:

```typescript
// Use hardware-aware configuration
import {
  getDisplaySlotConfig,
  getResponsiveGridConfig,
} from "@/utils/getDisplaySlotConfig";

const MyGridComponent = () => {
  const config = getDisplaySlotConfig(); // Auto-detect DS12/DS16
  const gridConfig = getResponsiveGridConfig();

  return (
    <div className={gridConfig.containerClass}>
      <div className={`${gridConfig.gridClass} ${gridConfig.gapClass}`}>
        {slots.map((slot) => (
          <Slot key={slot.slotId} slotData={slot} />
        ))}
      </div>
    </div>
  );
};
```

**When Working with Slot Components and Indicators**:

```typescript
// Enhanced slot components with environmental monitoring
import LockedSlot from '@/components/Slot/locked';
import Indicator from '@/components/Indicators/baseIndicator';

// Usage in locked slot with environmental data
<LockedSlot
  slotNo={slotData.slotId}
  hn={slotData.hn}
  date="2025-01-18"
  time="14:30"
  temp={25}      // Temperature in Celsius
  humid={65}     // Humidity percentage
/>

// Standalone indicator usage for environmental monitoring
<Indicator
  value={temp}
  unit="*C"
  title="Temperature"
  threshold={50}    // Medical compliance threshold
/>

<Indicator
  value={humid}
  unit="%"
  title="Humidity"
  threshold={85}    // Medical compliance threshold
/>
```

**Critical Compliance Notes**:

- Never modify audit logging patterns without understanding medical device requirements
- Preserve exact Thai language strings in error messages
- Maintain database operation patterns exactly as implemented
- Test hardware communication thoroughly with actual devices when possible
- Follow established IPC response timing patterns

**Production Migration Status** (✅ COMPLETED):

- **Phase 4.2 COMPLETE**: DS12 production deployment with BuildTimeController
- **Enhanced Features**: Design System + Responsive Grid + React Hook Form integration
- **DS16 Ready**: Configuration-ready architecture for immediate DS16 deployment
- **Legacy Preserved**: KU16 code maintained for reference and rollback capability
- **Protocol Abstraction**: Complete migration from direct hardware calls to controller pattern

## SMC License CLI Tool (✅ PRODUCTION READY v1.0.0)

> **📖 Complete Details**: See `/docs/system-architecture/10-license-cli-integration.md`

**Location**: `cli/` directory  
**Purpose**: ESP32-based license generation with hardware binding

### Key Features
- **Hardware Binding**: ESP32 MAC address authentication
- **AES-256-CBC Encryption**: Medical-grade security
- **Cross-Platform**: macOS development, Windows production
- **Performance**: ~100ms startup, 0.05MB memory

### Essential Commands

```bash
# Generate license with WiFi credentials
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"

# Development mode (no ESP32 required)
smc-license generate --test-mode --bypass-password-check

# Validate and show license info
smc-license validate -f license.lic
smc-license info -f license.lic
```

## ESP32 Deployment Tool (✅ PHASE 3 COMPLETE - Template Consolidation)

**Location**: `esp32-deployment-tool/` directory
**Purpose**: Cross-platform Next.js 14 tool for ESP32 firmware deployment with integrated template management

### Current Status (August 22, 2025)
- ✅ **Template Consolidation Complete**: ESP32 templates now managed from single location
- ✅ **Phase 3 Complete**: CSV Export Enhancement + Template Management
- ✅ **Cross-Platform Ready**: Windows/macOS/Container development
- ✅ **Template System**: `templates/main.cpp.template` + `templates/platformio.ini.template`
- ✅ **Dual Export System**: JSON + CSV with sales team workflow
- ✅ **Production Ready**: End-to-end deployment verified

### Key Features
- **Cross-Platform**: macOS/Windows development + Docker production
- **Template Management**: Unified template system in `templates/` directory
- **Export System**: JSON (individual) + CSV (daily batch)
- **Complete Workflow**: Form → Device → Deploy → Extract → Export

> **📖 Complete Details**: See `/docs/system-architecture/10-license-cli-integration.md`

### Project Structure
```
esp32-deployment-tool/
├── templates/
│   ├── main.cpp.template        # ESP32 firmware template
│   └── platformio.ini.template  # PlatformIO config template
├── src/app/api/                 # 7 API endpoints
└── exports/                     # JSON + CSV output
```




## ESP32 Hardware Integration

> **📖 Complete Details**: See `/docs/system-architecture/10-license-cli-integration.md`

**Purpose**: ESP32-based license binding and environmental monitoring for medical device compliance

### Quick Integration
- **Templates**: Managed in `esp32-deployment-tool/templates/`
- **API Endpoints**: `/mac`, `/health`, `/temp` for license binding
- **Hardware Binding**: MAC address authentication for medical device security

\*\*Important Document Resources

- Project Architecture documentation files : /docs/system-architecture
- CLI Tool Documentation: `cli/README.md`
- ESP32 Hardware Guide: `smc-key-temp/docs/DHT22.md`
