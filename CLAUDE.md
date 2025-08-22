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

### ESP32 Deployment Tool (Cross-Platform Ready)

```bash
# Navigate to deployment tool directory first: cd esp32-deployment-tool/

# macOS Development (recommended for development)
npm run dev                                         # Local development with global PlatformIO
curl http://localhost:3000/api/detect              # Real ESP32 detection via local PlatformIO

# Container Development (Windows production simulation)
docker-compose up --build                          # Container mode (no USB on macOS)
curl http://localhost:3000/api/detect              # Multi-method detection (container)

# Production Deployment (Windows/Mac)
docker-compose -f docker-compose.prod.yml up -d    # Production deployment
docker-compose -f docker-compose.prod.yml down     # Stop production

# Container Health & Testing
curl http://localhost:3000/api/health              # Test container health
docker-compose exec esp32-tool pio --version       # Verify PlatformIO installation

# Cross-Platform Setup (macOS development)
pip3 install platformio                            # Install global PlatformIO
pio --version                                       # Verify: PlatformIO Core, version 6.1.18
pio device list                                     # Test ESP32 detection
```

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
- **CLI Tool**: `cli/` - SMC License CLI for ESP32-based license generation and validation ✅ **PRODUCTION READY v1.0.0**
- **ESP32 Deployment Tool**: `esp32-deployment-tool/` - Cross-platform Next.js 14 tool for ESP32 firmware deployment and customer configuration ✅ **PHASE 2+ COMPLETE - Cross-Platform Ready**

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
esp32-temp : หมายถึง hardware code ที่ใช้ deploy web server ลงใน esp32 เพื่อทำเป็น temp - serial key สำหรับผูก smc-app กับ ds
esp32-deployment-tool : หมายถึง standalone Next.js tool สำหรับ deploy firmware ลง ESP32 พร้อม customer configuration

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

**Location**: `cli/` directory

**Purpose**: Production-ready CLI tool for generating and managing SMC license keys with ESP32 MAC address binding for medical device applications.

### Key Features

- **Hardware Binding**: License keys bound to ESP32 MAC addresses for secure device authentication
- **WiFi Credentials Integration**: Encrypted WiFi SSID and password storage for automated ESP32 connection
- **AES-256-CBC Encryption**: Production-grade encryption with proper IV handling and pre-computed keys
- **Password Validation**: WiFi password strength checking with development bypass options
- **Cross-Platform Development**: macOS development with Windows production deployment
- **Development Bypass**: Automated testing without ESP32 hardware requirements on macOS
- **Medical Device Compliance**: Audit-ready logging and security patterns
- **TypeScript**: Full type safety and modern JavaScript features
- **Performance Optimized**: Startup time ~100ms, Memory usage 0.05 MB

### CLI Commands

```bash
# Generate license (production mode) - NOW REQUIRES WiFi credentials
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"

# Generate license (test mode - no ESP32 required)
smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" \
  --wifi-ssid "TEST_WIFI" --wifi-password "simple123" --test-mode --bypass-password-check

# Validate license file
smc-license validate -f license.lic

# Display license information
smc-license info -f license.lic

# Test ESP32 connection
smc-license test-esp32 --ip 192.168.4.1

# Show shared secret key for .env setup
smc-license show-key

# Export shared key to .env file
smc-license export-env --output .env
smc-license export-env --stdout
```

### Development Workflow

1. **License Generation**: Generate license.lic file with CLI tool (now includes WiFi credentials)
2. **Environment Setup**: Use `smc-license show-key` or `export-env` to configure application
3. **Development Phase**: Use `--test-mode` and `--bypass-password-check` for testing without ESP32 hardware
4. **macOS Development**: Automatic WiFi connection bypass when NODE_ENV=development
5. **Production Phase**: Full WiFi connection and ESP32 MAC address binding on Windows
6. **Application Deployment**: Copy license.lic and .env to application directory
7. **Distribution**: Use `npm run package` to create distributable .tgz file

### Architecture

- **Entry Point**: `cli/index.ts` - Commander.js-based CLI with comprehensive help
- **Modules**:
  - `modules/esp32.ts` - ESP32 communication with progress indicators and retry logic
  - `modules/encryption.ts` - AES-256-CBC encryption with performance optimization
  - `modules/license-generator.ts` - License file generation and validation
- **Types**: `types/index.ts` - Complete TypeScript definitions
- **Testing**: Comprehensive test suites for all 5 development phases

### Production Readiness

- ✅ **All Tests Passing**: 13/13 comprehensive tests pass
- ✅ **Performance Validated**: Startup time, memory usage, and encryption performance optimized
- ✅ **Documentation Complete**: Full README.md with usage examples and troubleshooting
- ✅ **Error Handling**: Context-aware error messages with troubleshooting guides
- ✅ **Security**: Medical-grade encryption and hardware binding
- ✅ **Build System**: Production-optimized builds and packaging

### Application License System Integration

**License Activation Flow** (Production Implementation):

1. Application startup checks license activation status via `isSystemActivated()`
2. If not activated, automatically redirects to `/activate-key` page
3. Activation page performs 8-step validation process with real-time progress
4. Upon success, application redirects to main interface (`/home`)

**Key Application Components**:

- `main/license/validator.ts` - Core license validation and database flag management
- `main/license/file-manager.ts` - License.lic file parsing with AES-256-CBC decryption and WiFi extraction
- `main/license/esp32-client.ts` - ESP32 WiFi connection and MAC address validation with development bypass
- `main/license/wifi-manager.ts` - Cross-platform WiFi management with macOS development bypass
- `main/utils/environment.ts` - Environment detection for development vs production behavior
- `renderer/pages/activate-key.tsx` - Modern step-by-step activation UI with Design System

**Environment Configuration**:

```bash
# Required in application .env file:
SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS

# Development vs Production behavior:
NODE_ENV=development   # macOS development: enables WiFi bypass
NODE_ENV=production    # Windows production: full WiFi functionality

# Optional ESP32 configuration:
SMC_ESP32_DEFAULT_IP=192.168.4.1
SMC_LICENSE_FILE_PATH=license.lic
```

**Integration Commands**:

```bash
# Setup application environment:
smc-license show-key >> .env
cp license.lic /path/to/app/

# Development testing (macOS with WiFi bypass):
NODE_ENV=development npm run dev  # Bypasses WiFi connection automatically

# Production testing (Windows with full WiFi):
NODE_ENV=production npm run dev   # Full ESP32 WiFi connection and validation
```

## ESP32 Deployment Tool (✅ PHASE 3 COMPLETE - CSV Export Enhancement)

**Location**: `esp32-deployment-tool/` directory

**Purpose**: Cross-platform Next.js 14 application for deploying custom firmware to ESP32 devices with customer-specific configuration. Implements hybrid development strategy: macOS local development + Windows container production.

### Current Status (August 22, 2025)

- ✅ **Phase 3 Complete**: CSV Export Enhancement implemented successfully
- ✅ **Cross-Platform Ready**: Both Windows `npm run dev` and macOS development working
- ✅ **Dual Export System**: JSON (individual) + CSV (daily batch) files operational
- ✅ **macOS Development**: Local PlatformIO + real ESP32 detection working
- ✅ **Windows Development**: `npm run dev` works with Desktop export to `C:\Users\[user]\Desktop\esp32-exports\`
- ✅ **Container Production**: Docker container stable and ready for production deployment
- ✅ **Complete API Implementation**: 7/7 endpoints operational with platform detection
- ✅ **Cross-Platform Detection**: API automatically switches between local/container modes
- ✅ **Template System Complete**: AM2302 sensor integration with WiFi auto-generation
- ✅ **PlatformIO Integration**: Both local and containerized workflows operational
- ✅ **JSON + CSV Export**: Desktop export with CLI-compatible format and daily batch processing
- ✅ **Development Workflow**: Verified end-to-end on macOS with real hardware
- ✅ **macOS Development Mode**: MAC extraction without ESP32 WiFi connection required
- ✅ **Phase 3 Complete**: CSV export enhancement for sales team workflow optimization

### Key Features (Phase 3 Complete)

- **Cross-Platform Development**: macOS local development + Windows native development + Container production ✅
- **Windows Native Support**: `npm run dev` works directly on Windows with Desktop export ✅
- **macOS Development Mode**: Environment detection automatically uses deployment log data instead of ESP32 HTTP API ✅
- **Environment-Aware APIs**: `/api/extract` automatically switches between local development and container production modes ✅
- **Hybrid Detection Strategy**: Local PlatformIO (macOS) + container multi-method (Windows) ✅
- **Complete Deployment Workflow**: Form → Device → Deploy → Extract → Export JSON + CSV ✅
- **Template System**: AM2302 sensor integration with customer-specific firmware generation ✅
- **WiFi Auto-Generation**: Deterministic SSID/Password algorithm based on customer ID ✅
- **Dual PlatformIO Integration**: Local installation + containerized build workflows ✅
- **MAC Address Extraction**: Retry mechanism with ESP32 communication ✅
- **Dual Export System**: JSON (individual) + CSV (daily batch) exported to Desktop ✅
- **CSV Export Enhancement**: Daily batch CSV files with date rollover and append mode ✅
- **Platform-Aware Detection**: Automatic switching between detection methods ✅
- **Real-Time Progress**: Live deployment tracking with error handling ✅
- **Sales Team Workflow**: Daily CSV files ready for CLI batch processing ✅

### Technical Stack

- **Cross-Platform Architecture**: Hybrid local development + container production strategy
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with responsive design patterns
- **Hardware Integration**: 
  - macOS: Global PlatformIO CLI for real ESP32 device detection
  - Container: PlatformIO CLI with multi-method ESP32 detection fallbacks
- **Platform Detection**: Automatic switching between `darwin` (local) and `linux` (container) modes
- **API Layer**: Next.js API routes with cross-platform detection logic and retry mechanisms
- **Development**: Hot reload, ESLint, TypeScript strict mode
- **Production**: Optimized Docker images with health checks and USB device mapping

### Project Structure

```
esp32-deployment-tool/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Thai language support
│   │   ├── page.tsx           # Main application with integrated workflow
│   │   └── api/detect/route.ts # ESP32 device detection API
│   ├── components/
│   │   ├── CustomerForm.tsx    # Customer input form with validation
│   │   └── DeviceList.tsx      # ESP32 device selection interface
│   └── types/
│       └── index.ts           # TypeScript definitions for all interfaces
├── package.json               # Next.js 14 dependencies and scripts
└── README.md                  # Phase 1 documentation and testing guide
```

### Development Workflow

1. **Customer Data Collection**: 3-field form with Thai validation (organization, customer ID, application name)
2. **ESP32 Device Detection**: Auto-discover connected ESP32 devices via PlatformIO
3. **Device Selection**: Visual interface for choosing target ESP32 device
4. **Deployment Preparation**: State management for complete workflow setup
5. **Ready for Phase 2**: Foundation established for firmware generation and upload

### Implementation History & Phase Status

**Docker Implementation Complete (January 18, 2025):**
- ✅ Multi-stage Dockerfile: Node.js + PlatformIO + Python virtual environment
- ✅ Fixed: Python externally-managed environment error with virtual env
- ✅ Fixed: Next.js build errors (TypeScript + missing devDependencies)
- ✅ Fixed: "next: not found" error with production dependencies in runtime stage
- ✅ Container Health: Next.js app runs successfully in Docker container
- ⚠️ USB Mapping Issue: ESP32 devices not detected in container (requires troubleshooting)

**Phase Development Status:**
- ✅ **Phase 1 Complete - Docker Operational**: Container working, web interface accessible
- 🔄 **Phase 1.1 Pending**: USB device mapping for ESP32 detection in container 
- 📋 **Phase 2 Ready**: Core deployment features awaiting USB fix
- 🔄 **Phase 3 Planned**: Enhanced error handling, UI polish, monitoring and optimization

**Current Development Status (August 21, 2025):**
- ✅ Phase 2+ Complete: Cross-platform development fully operational
- ✅ macOS Development: Complete workflow working with real ESP32 hardware
- ✅ Container Production: Docker environment ready for Windows deployment  
- ✅ MAC Extraction: Intelligent switching between development log parsing and production HTTP API
- ✅ Cross-Platform API Detection: Environment-aware endpoint behavior
- ✅ Complete Integration: JSON export compatible with SMC License CLI

### Integration with SMC Ecosystem

**CLI Tool Integration** (Planned Phase 2-3):
```bash
# Deployment tool generates JSON files for CLI consumption
esp32-deployment-tool → customer-BGK001-2025-01-18.json → smc-license generate

# Complete workflow
cd esp32-deployment-tool && npm run dev  # Deploy firmware
# → JSON file exported to Desktop
cd ../cli && smc-license generate --import-json ~/Desktop/customer-BGK001-2025-01-18.json
```

**Hardware Integration**:
- Uses `smc-key-temp/` ESP32 firmware templates for deployment
- Generates customer-specific configuration files
- Binds license data to ESP32 MAC addresses

### Development Commands

```bash
# Cross-Platform Development Setup
cd esp32-deployment-tool/

# macOS Development (Recommended for active development)
pip3 install platformio                            # Install global PlatformIO
npm run dev                                         # Local Next.js with real ESP32 detection
curl http://localhost:3000/api/detect              # Test real ESP32 hardware detection
# Expected: {"success": true, "devices": [ESP32], "detection_method": "macOS local PlatformIO"}
# Complete Workflow: Form → Device → Deploy → Extract (no WiFi connection needed) → Export JSON + CSV

# Windows Development (Native support)
npm install                                         # Install dependencies
npm run dev                                         # Local Next.js development
curl http://localhost:3000/api/detect              # Test ESP32 detection
# Expected: {"success": true, "devices": [], "detection_method": "Windows local"}
# Export Location: C:\Users\[user]\Desktop\esp32-exports\
# Complete Workflow: Form → Device → Deploy → Extract → Export JSON + CSV

# Container Development (Production simulation)
docker-compose up --build                          # Container environment
curl http://localhost:3000/api/detect              # Test container multi-method detection  
# Expected: {"success": true, "devices": [], "detection_method": "container multi-method"}

# Container Management
docker-compose down                                 # Stop development container
docker-compose exec esp32-tool pio --version       # Verify container PlatformIO
curl http://localhost:3000/api/health               # Check container health

# Production Deployment (Windows/Linux)
docker-compose -f docker-compose.prod.yml up -d    # Deploy production container
docker-compose -f docker-compose.prod.yml logs -f  # Monitor production logs
```

### Production Ready Status (✅ Phase 3 Complete - Cross-Platform + CSV Export)

**Cross-Platform Implementation (100% Complete)**:
- ✅ **Hybrid Strategy**: macOS local development + Windows native + container production
- ✅ **Windows Native Support**: `npm run dev` works directly on Windows with PlatformIO
- ✅ **Platform Detection**: Automatic switching between local/container modes
- ✅ **7 API Endpoints**: /detect, /generate, /deploy, /extract, /export, /health, /sensor
- ✅ **Real Hardware Support**: Local PlatformIO working with actual ESP32 devices
- ✅ **Container Operational**: Docker environment stable and ready for production
- ✅ **Template System**: main.cpp.template with AM2302 sensor + WiFi credentials
- ✅ **WiFi Generation**: Deterministic algorithm SMC_ESP32_{ID} + password
- ✅ **Dual PlatformIO**: Both local installation and containerized workflows
- ✅ **MAC Extraction**: Retry mechanism with ESP32 communication
- ✅ **Dual Export System**: JSON (individual) + CSV (daily batch) export to Desktop
- ✅ **CSV Export Features**: Date rollover, append mode, field escaping
- ✅ **Complete UI**: End-to-end workflow with real-time progress
- ✅ **Sales Team Ready**: Daily CSV files for CLI batch processing workflow

**Technical Architecture**:
- ✅ **Cross-Platform API**: `/api/detect` with platform-aware logic
- ✅ **TypeScript**: Full type safety across all components
- ✅ **Error Handling**: Comprehensive with cross-platform troubleshooting
- ✅ **Development Workflow**: Verified on macOS with real ESP32 hardware
- ✅ **Container Ready**: Windows production deployment prepared
- ✅ **Volume Mapping**: /app/exports → host Desktop for JSON files
- ✅ **Health Monitoring**: Container health checks operational

**Production Deployment Ready**:
- ✅ **SMC License CLI**: JSON format compatible for import
- ✅ **ESP32 Hardware**: Template ready for deployment
- ✅ **Customer Workflow**: Organization → Customer ID → Application Name
- ✅ **Cross-Platform**: macOS development → Windows production seamless

## ESP32 Configuration & Deployment System

**Location**: `smc-key-temp/` directory

**Purpose**: ESP32-based hardware configuration system for SMC License CLI integration. Provides REST API server for hardware binding, MAC address retrieval, and environmental monitoring.

### ESP32 Hardware Integration

#### ESP32 REST API Server Features

- **WiFi Access Point**: "ESP32_AP" with password "password123"
- **API Endpoints**:
  - `/mac` - Returns ESP32 MAC address for license binding
  - `/health` - Server status and hardware information
  - `/temp` - Environmental monitoring (temperature/humidity via DHT22)
- **Medical Device Compliance**: Environmental monitoring for medication storage standards

#### Development Commands

```bash
# Navigate to ESP32 project directory
cd smc-key-temp/

# PlatformIO Development
pio run                          # Build ESP32 firmware
pio run --target upload          # Upload firmware to ESP32
pio device list                  # List available ESP32 devices
pio device monitor              # Serial monitor for debugging
```

#### Hardware Configuration Workflow

**1. ESP32 Setup:**

```bash
cd smc-key-temp/
pio run --target upload         # Deploy firmware
pio device monitor              # Verify ESP32 startup
```

**2. License Generation Integration:**

```bash
# Generate license with ESP32 MAC address binding
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"

# Test ESP32 connectivity
smc-license test-esp32 --ip 192.168.4.1
```

**3. Application Integration:**

```bash
# Application automatically connects to ESP32 during license activation
# MAC address retrieved from http://192.168.4.1/mac
# Environmental data from http://192.168.4.1/temp
```

### ESP32 Project Structure

```
smc-key-temp/
├── platformio.ini              # PlatformIO configuration
├── src/main.cpp                # ESP32 firmware (WiFi AP + REST API)
├── docs/DHT22.md              # Hardware sensor integration guide
└── lib/                        # ESP32 libraries (auto-managed)
```

### ESP32 API Specification

**GET /mac Response:**

```json
{
  "mac_address": "24:6F:28:A0:12:34"
}
```

**GET /health Response:**

```json
{
  "server": {
    "status": "healthy",
    "uptime_ms": 123456,
    "connected_clients": 1
  },
  "info": {
    "device": "ESP32",
    "mac_address": "24:6F:28:A0:12:34",
    "ap_ip": "192.168.4.1",
    "ap_ssid": "ESP32_AP"
  }
}
```

**GET /temp Response:**

```json
{
  "sensor": "DHT22",
  "temperature_c": 25.42,
  "humidity_percent": 65.3,
  "timestamp": 123456789
}
```

### Hardware Requirements

**ESP32 Development Board**:

- WiFi capability for license communication
- GPIO pins for sensor integration
- USB connection for firmware upload

**Optional DHT22 Sensor**:

- Temperature and humidity monitoring
- Medical device environmental compliance
- GPIO 4 connection (configurable)

### Production Deployment Considerations

**ESP32 Configuration Management**:

- WiFi credentials embedded in firmware
- MAC address binding for security
- Environmental thresholds for medical compliance
- Automated license verification workflow

**Development vs Production**:

- Development: Mock ESP32 responses for testing
- Production: Real ESP32 hardware with license binding
- Cross-platform: Windows/macOS development support

### Future UI Development

**ESP32 Configuration Interface** (Planned):

- Auto-detect ESP32 devices
- Firmware upload interface
- Configuration template management
- Real-time monitoring dashboard

\*\*Important Document Resources

- Project Architecture documentation files : /docs/system-architecture
- CLI Tool Documentation: `cli/README.md`
- ESP32 Hardware Guide: `smc-key-temp/docs/DHT22.md`
