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
- **CLI Tool**: `cli/` - SMC License CLI ✅ **PRODUCTION READY v1.1.0 - CSV BATCH READY**
- **ESP32 Deployment Tool**: `esp32-deployment-tool/` - Cross-platform ESP32 deployment ✅ **PHASE 4.5 COMPLETE - NO EXPIRY SUPPORT**
- **ESP32 Keygen System**: License activation interface integrated in SMC desktop app ✅ **PRODUCTION READY**

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
- ไม่ใช้ code pattern ที่ซับซ้อน เน้น clean code architecture
- ตอบคำถามผมเป็นภาษาไทยเท่านั้น ยกเว้น technical term เป็นภาษาอังกฤษได้
- พยายาม commit checkpoint เมื่อจบ แต่ละ phase
- หลังจากจบแต่ละ phase ถ้ามี run dev server ให้ kill ด้วย

\*\* Shortcut Commands

คำสั่งลัดสำหรับการทำงานต่างๆ:

1. `=fcs` - คำสั่งสำหรับ update current focus file (`docs/current-focus.md`)
2. `=atc` - คำสั่งสำหรับ update architecture docs file
3. `=impl` - คำสั่งสำหรับเริ่ม implement ได้ทันที
4. `=rrr` - คำสั่งสำหรับ update retrospective file

\*\* Retrospective Workflow

เมื่อพิมพ์ `=rrr` จะทำการ update retrospective file ตามขั้นตอนดังนี้:

1. โครงสร้างไฟล์: `docs/retrospective/<folder ชื่อเดือนปี>/<file retrospective ของแต่ละวัน>`
2. การทำงาน:
   - เมื่อเริ่มต้นวันใหม่: สร้าง retrospective file ของวันนั้น
   - ระหว่างวัน: update retrospective file ของวันนั้นไปเรื่อยๆ
   - เมื่อจบวันและขึ้นวันใหม่: สร้างไฟล์ใหม่และทำงานกับไฟล์ใหม่
   - เมื่อครบเดือน: สร้าง folder ของเดือนใหม่และเขียนไฟล์ใหม่ในนั้น

3. Template ของ Retrospective File:

```markdown
# Retrospective วันที่ [วัน-เดือน-ปี]

## 1. งานที่ทำไป

- [Topic/Task 1]
  - [รายละเอียดงานย่อย]
  - [รายละเอียดงานย่อย]
- [Topic/Task 2]
  - [รายละเอียดงานย่อย]

## 2. Bug/Error ที่เกิดขึ้นและการแก้ไข

- [Bug/Error 1]
  - สาเหตุ: [อธิบายสาเหตุ]
  - วิธีแก้ไข: [อธิบายวิธีแก้ไข]
- [Bug/Error 2]
  - สาเหตุ: [อธิบายสาเหตุ]
  - วิธีแก้ไข: [อธิบายวิธีแก้ไข]

## 3. สิ่งที่ได้เรียนรู้ (Lesson Learned)

- [Lesson 1]
- [Lesson 2]
- [Lesson 3]

## 4. สิ่งสำคัญและข้อควรจำ

- [ข้อควรระวัง 1]
- [สิ่งที่ต้องจำ 2]
- [ข้อสังเกตสำคัญ 3]

## 5. หมายเหตุเพิ่มเติม (ถ้ามี)

- [หมายเหตุ 1]
- [หมายเหตุ 2]

## 6. แผนของวันพรุ่งนี้ (ถ้ามี)

- [แผนงาน 1]
- [แผนงาน 2]
- [แผนงาน 3]
```

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

\*\* Current Focus (./docs/current-focus.md)
file นี้เอาไว้ track ประเด็นสำคัญที่คุณกับผมกำลังทำกันอยู่ หรือวางแผนอะไรกันไว้ เราจะมาทบทวนกันในนี้

- คุณจะคอย update current-focus ทุกๆ 30 - 1 ชั่วโมง (ถ้าคุณพบว่า task น่าจะยาวมาก ให้ update ทุกๆ 30 นาที แต่ถ้าอาจจะเสร็จก่อน หรือไม่ยาวมากให้ update ทุกๆ ชั่วโมง) เพื่อ keep focus on what we are currently doing.
- คุณจะ optimize สิ่งที่ไม่เกี่ยวกับ current-focus ของเราออกทั้งหมดเพื่อให้ file concise และ ไม่กิน tokens
- ถ้าผมบอกให้ update current-focus คุณจะ update ให้ concise เหมือนที่คุณทำอัตโนมัติด้วย

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

**When Working with CSV Batch Processing**:

```typescript
// CLI batch processing pattern
import {
  processBatchLicenses,
  BatchOptions,
} from "@/modules/batch-license-generator";
import { CSVProcessor } from "@/modules/csv-parser";

// Process CSV from ESP32 Deployment Tool
const batchOptions: BatchOptions = {
  inputCSV: "esp32-deployments-2025-08-22.csv",
  outputDir: "./licenses/",
  updateCSV: true,
  skipExisting: true,
  expiryYears: 2, // Override CSV expiry
  verbose: true,
};

const result = await processBatchLicenses(batchOptions);
console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
```

**When Working with No Expiry Licenses**:

```typescript
// ESP32 Deployment Tool - No Expiry Pattern
const handleNoExpiryChange = (checked: boolean) => {
  setFormData((prev) => ({
    ...prev,
    noExpiry: checked,
    expiryDate: checked ? "" : calculateDefaultExpiry(),
  }));
};

// CLI Parser - No Expiry Detection
if (!obj.expiryDate || obj.expiryDate.trim() === "") {
  expiryDate = "2099-12-31"; // Far future for permanent
  noExpiry = true;
} else {
  expiryDate = obj.expiryDate;
}

// Display Logic - Show permanent status
console.log(
  `Expiry: ${record.noExpiry ? "No expiry (permanent)" : record.expiryDate}`
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

**When Working with ESP32 Keygen System**:

```typescript
// License activation interface pattern (activate-key.tsx)
import { useESP32License } from "@/hooks/useESP32License";

const ESP32LicenseActivation = () => {
  const { activateLicense, loading, error } = useESP32License();

  const handleActivation = async (licenseFile: File) => {
    try {
      await activateLicense(licenseFile);
      // Automatic WiFi connection using license credentials
      // MAC address validation against ESP32 hardware
      // Thai language success/error messages
    } catch (error) {
      // Medical-grade error handling with recovery suggestions
    }
  };
};

// Development mode bypass pattern
if (process.env.NODE_ENV === "development") {
  console.log("[ESP32] Development mode: Using mock MAC address validation");
  return mockActivationSuccess();
}

// Production mode with real ESP32 communication (Enhanced August 2025)
const macAddress = await esp32Client.getMACAddress();
if (macAddress !== licenseData.hardware_binding.mac_address) {
  throw new Error("Hardware binding validation failed");
}

// ESP32 API Parsing with Backward Compatibility (August 2025 Update)
const parseESP32Response = (responseData: any) => {
  // Support both legacy and current ESP32 API formats
  const macFromResponse = responseData.mac_address || responseData.mac;

  if (!macFromResponse) {
    console.error(
      "debug: ESP32 Response:",
      JSON.stringify(responseData, null, 2)
    );
    throw new Error(
      "ESP32 response missing MAC address (checked both mac and mac_address fields)"
    );
  }

  return macFromResponse.toUpperCase();
};

// macOS WiFi Connection Strategy (Manual User-Guided)
if (process.platform === "darwin") {
  console.log("📶 Manual WiFi connection required for macOS");
  // Show instructions to user for manual ESP32 network connection
  // Enhanced retry mechanism: 3 attempts with extended 7-second timeout
}
```

**Critical Compliance Notes**:

- Never modify audit logging patterns without understanding medical device requirements
- Preserve exact Thai language strings in error messages
- Maintain database operation patterns exactly as implemented
- Test hardware communication thoroughly with actual devices when possible
- Follow established IPC response timing patterns

**Production Migration Status** (✅ COMPLETED):

- **Phase 4.2+ COMPLETE**: DS12 production deployment with BuildTimeController
- **Enhanced Features**: Design System + Responsive Grid + React Hook Form integration
- **ESP32 Keygen System**: Complete license activation interface with hardware binding validation
- **DS16 Ready**: Configuration-ready architecture for immediate DS16 deployment
- **Legacy Preserved**: KU16 code maintained for reference and rollback capability
- **Protocol Abstraction**: Complete migration from direct hardware calls to controller pattern

## SMC License CLI Tool (✅ PRODUCTION READY v1.1.0 - CSV BATCH READY)

> **📖 Complete Details**: See `/docs/system-architecture/10-license-cli-integration.md`

**Location**: `cli/` directory  
**Purpose**: ESP32-based license generation with hardware binding and CSV batch processing

### Key Features

- **Hardware Binding**: ESP32 MAC address authentication
- **AES-256-CBC Encryption**: Medical-grade security
- **Cross-Platform**: macOS development, Windows production
- **Performance**: ~100ms startup, 0.05MB memory
- **🆕 CSV Batch Processing**: Complete Sales → Developer → Delivery workflow
- **🆕 No Expiry Support**: Permanent licenses with 2099-12-31 date handling

### Essential Commands

#### Individual License Generation

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

#### 🆕 CSV Batch Processing (Phase 4.5)

```bash
# Process CSV from ESP32 Deployment Tool
smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv

# Batch with custom expiry settings
smc-license batch --input daily-batch.csv --expiry-years 2 --skip-existing

# No expiry (permanent) licenses
smc-license batch --input permanent-licenses.csv --no-expiry --update-csv

# Dry run validation
smc-license batch --input test-batch.csv --dry-run --verbose

# Custom output directory
smc-license batch --input batch.csv --output-dir ./licenses/ --update-csv
```

## ESP32 Deployment Tool (✅ PHASE 4.5 COMPLETE - NO EXPIRY SUPPORT)

**Location**: `esp32-deployment-tool/` directory
**Purpose**: Cross-platform Next.js 14 tool for ESP32 firmware deployment with integrated template management and no-expiry license support

### Current Status (August 22, 2025)

- ✅ **Template Consolidation Complete**: ESP32 templates now managed from single location
- ✅ **Phase 3 Complete**: CSV Export Enhancement + Template Management
- ✅ **Phase 4.5 Complete**: No-expiry functionality with checkbox UI
- ✅ **Cross-Platform Ready**: Windows/macOS/Container development
- ✅ **Template System**: `templates/main.cpp.template` + `templates/platformio.ini.template`
- ✅ **Dual Export System**: JSON + CSV with sales team workflow
- ✅ **No Expiry Support**: Permanent licenses via checkbox interface
- ✅ **Production Ready**: End-to-end deployment verified with CLI batch processing

### Key Features

- **Cross-Platform**: macOS/Windows development + Docker production
- **Template Management**: Unified template system in `templates/` directory
- **Export System**: JSON (individual) + CSV (daily batch)
- **Complete Workflow**: Form → Device → Deploy → Extract → Export
- **🆕 No Expiry Interface**: Checkbox for permanent licenses with conditional date input
- **🆕 CLI Integration**: Direct CSV export for `smc-license batch` command

> **📖 Complete Details**: See `/docs/system-architecture/10-license-cli-integration.md`

### Project Structure

```
esp32-deployment-tool/
├── templates/
│   ├── main.cpp.template        # ESP32 firmware template
│   └── platformio.ini.template  # PlatformIO config template
├── src/app/api/                 # 7 API endpoints
├── src/components/
│   └── CustomerForm.tsx         # Enhanced with no-expiry checkbox
└── exports/                     # JSON + CSV output with license tracking
```

### 🆕 No Expiry License Workflow

#### UI Pattern - Checkbox with Conditional Input

```typescript
// CustomerForm.tsx implementation pattern
const [formData, setFormData] = useState<CustomerInfo>({
  organization: "",
  customerId: "",
  applicationName: "",
  expiryDate: calculateDefaultExpiry(),
  noExpiry: false, // New checkbox state
});

// Checkbox UI with conditional date input
<label className="flex items-center space-x-2">
  <input
    type="checkbox"
    checked={formData.noExpiry}
    onChange={(e) =>
      setFormData((prev) => ({
        ...prev,
        noExpiry: e.target.checked,
        expiryDate: e.target.checked ? "" : calculateDefaultExpiry(),
      }))
    }
  />
  <span>ไม่มีวันหมดอายุ (Permanent License)</span>
</label>;

{
  !formData.noExpiry && (
    <input
      type="date"
      value={formData.expiryDate}
      onChange={(e) =>
        setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))
      }
      min={new Date().toISOString().split("T")[0]}
    />
  );
}
```

#### Data Flow Pattern

```
UI Checkbox Checked → expiryDate: "" (empty) → CSV Export → CLI Parser → 2099-12-31 + noExpiry flag → Display: "No expiry (permanent)"
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
- **Current Focus & Implementation Status**: `/docs/current-focus.md` 🔥 **READ THIS FIRST**
- CLI Tool Documentation: `cli/README.md`
- ESP32 Hardware Guide: `smc-key-temp/docs/DHT22.md`
- Phase 4.5 Implementation: `docs/phases/phase4-cli-enhancement.md`

## Current Focus & Implementation Status

> **📖 Latest Implementation Details**: Always check `/docs/current-focus.md` for:
>
> - ✅ Recently completed features and fixes
> - 🔄 Current development focus and priorities
> - 🧪 Testing results and validation status
> - 📋 Next implementation phases and planning
>
> This document is updated after each major implementation milestone and contains the most current technical status, testing results, and development priorities.

\*\*Complete Sales → Developer → Delivery Workflow (Phase 4.5 + ESP32 Keygen System)

```bash
# 1. Sales Team: ESP32 Deployment Tool
cd esp32-deployment-tool/
npm run dev  # Deploy ESP32 with checkbox for no-expiry
# → Generates: esp32-deployments-2025-08-22.csv

# 2. Developer: CLI Batch Processing
cd cli/
smc-license batch --input ../esp32-deployment-tool/exports/esp32-deployments-2025-08-22.csv --update-csv
# → Generates: BGK001-license.lic, BGK002-license.lic, etc.
# → Updates: CSV with license_status="completed"

# 3. Delivery: Package and Deploy
# → Copy: Updated CSV + License files + SMC App
# → Deploy: to customer sites with ESP32 binding verification

# 4. Customer Site: ESP32 Keygen System Activation
cd smc-app/
# SMC App automatically detects license file on startup
# ESP32 Keygen System shows Thai language activation interface
# Hardware binding validation with MAC address check
# WiFi auto-connection using encrypted credentials from license
# Application grants access after successful validation
```
