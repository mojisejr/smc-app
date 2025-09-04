# Build-Time Hardware Configuration Guide

## Overview

This guide explains how to configure, build, and deploy the SMC application for different hardware devices using the Build-Time Configuration system. Each build targets a specific hardware type, ensuring optimal performance and preventing runtime configuration errors.

## Supported Hardware Types

| Device Type | Slots | Baud Rate | Protocol | Status |
|------------|-------|-----------|----------|--------|
| DS12       | 12    | 19200     | CU12     | ✅ Ready |
| DS16       | 16    | 9600      | CU16     | 🚧 Planned |
| DS24       | 24    | 38400     | DS24     | 🚧 Future |

> **Note**: DS16 is the new naming for CU16 hardware. They are the same device with updated prefix.

## Quick Start

### 1. Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd smc-app
npm install

# Run development server for DS12
npm run dev:ds12

# Run development server for DS16
npm run dev:ds16
```

### 2. Build for Production

```bash
# Build for DS12 hardware
npm run build:ds12

# Build for DS16 hardware
npm run build:ds16

# Build for specific customer
npm run build:ds12-hospital-a
```

## Environment Configuration

### Configuration Files

Environment files are stored in the project root with the naming pattern `.env.<device-type>`:

```
project-root/
├── .env.ds12              # DS12 configuration
├── .env.ds16              # DS16 configuration  
├── .env.ds12.hospital-a   # Customer-specific DS12 config
└── .env.ds16.clinic-b     # Customer-specific DS16 config
```

### DS12 Configuration Example

```bash
# .env.ds12
SMC_DEVICE_TYPE=DS12
SMC_MAX_SLOTS=12
SMC_DEFAULT_BAUD_RATE=19200
SMC_BUILD_TARGET=ds12-production
SMC_CUSTOMER_ID=default
SMC_ENABLE_HARDWARE_PROTECTION=true
SMC_ENABLE_DEBUG_LOGGING=false
```

### DS16 Configuration Example

```bash
# .env.ds16
SMC_DEVICE_TYPE=DS16
SMC_MAX_SLOTS=16
SMC_DEFAULT_BAUD_RATE=9600
SMC_BUILD_TARGET=ds16-production
SMC_CUSTOMER_ID=default
SMC_ENABLE_HARDWARE_PROTECTION=true
SMC_ENABLE_DEBUG_LOGGING=false
```

## Environment Variables Reference

| Variable | Description | Required | Example Values |
|----------|-------------|----------|----------------|
| `SMC_DEVICE_TYPE` | Hardware device type | Yes | `DS12`, `DS16`, `DS24` |
| `SMC_MAX_SLOTS` | Number of medication slots | Yes | `12`, `16`, `24` |
| `SMC_DEFAULT_BAUD_RATE` | Serial communication baud rate | Yes | `9600`, `19200`, `38400` |
| `SMC_BUILD_TARGET` | Build target identifier | No | `production`, `staging` |
| `SMC_CUSTOMER_ID` | Customer/deployment identifier | No | `hospital-a`, `clinic-b` |
| `SMC_ENABLE_HARDWARE_PROTECTION` | Enable hardware safety features | No | `true`, `false` |
| `SMC_ENABLE_DEBUG_LOGGING` | Enable debug logging | No | `true`, `false` |

## Build Scripts Reference

### Development Scripts

```bash
# Start development server with DS12 configuration
npm run dev:ds12

# Start development server with DS16 configuration  
npm run dev:ds16
```

### Production Build Scripts

```bash
# Build for DS12 hardware
npm run build:ds12

# Build for DS16 hardware
npm run build:ds16

# Build for DS24 hardware (future)
npm run build:ds24
```

### Platform-Specific Builds

```bash
# Build DS12 for Linux
npm run build:ds12:linux

# Build DS12 for Windows
npm run build:ds12:win

# Build DS16 for Linux
npm run build:ds16:linux

# Build DS16 for Windows  
npm run build:ds16:win
```

### Customer-Specific Builds

```bash
# Build for Hospital A (DS12)
npm run build:ds12-hospital-a

# Build for Clinic B (DS16)
npm run build:ds16-clinic-b
```

## Adding New Hardware Support

### Step 1: Create Controller Implementation

```typescript
// File: /main/ku-controllers/ds16/DS16Controller.ts

import { BrowserWindow } from "electron";
import { KuControllerBase } from "../base/KuControllerBase";
import { DS16ProtocolParser } from "../protocols/parsers/DS16ProtocolParser";

export class DS16Controller extends KuControllerBase {
  public readonly deviceType = "DS16" as const;
  public readonly maxSlot = 16;

  private protocolParser: DS16ProtocolParser;
  private baudRate: number = 9600; // DS16 uses CU16 protocol

  constructor(win: BrowserWindow) {
    super(win);
    this.protocolParser = new DS16ProtocolParser();
    this.resetAllStates();
    
    this.logOperation("controller-initialized", {
      deviceType: this.deviceType,
      maxSlots: this.maxSlot,
      timestamp: Date.now(),
      message: "DS16Controller initialized successfully (formerly CU16)",
    });
  }

  // Implement required methods...
  async connect(port: string, baudRate: number = 9600): Promise<boolean> {
    // DS16-specific implementation (using CU16 protocol)
  }

  // ... other methods
}
```

### Step 2: Create Protocol Parser

```typescript
// File: /main/ku-controllers/protocols/parsers/DS16ProtocolParser.ts

export class DS16ProtocolParser {
  // Implement DS16-specific protocol parsing (based on CU16 protocol)
  buildStatusRequestPacket(address: number) {
    // DS16 status request implementation
  }

  buildUnlockPacket(address: number, slotId: number) {
    // DS16 unlock command implementation
  }

  // ... other protocol methods
}
```

### Step 3: Update BuildTimeController

```typescript
// File: /main/ku-controllers/build-time/BuildTimeController.ts

import { DS16Controller } from "../ds16/DS16Controller";

export class BuildTimeController {
  static getInstance(win: BrowserWindow): HardwareController {
    switch (BuildConstants.DEVICE_TYPE) {
      case 'DS12':
        this.validateDS12Configuration();
        return new DS12Controller(win);
      
      case 'DS16':  // DS16 (formerly CU16)
        this.validateDS16Configuration();
        return new DS16Controller(win);
        
      // ... other cases
    }
  }

  private static validateDS16Configuration(): void {
    if (BuildConstants.MAX_SLOTS !== 16) {
      throw new Error("DS16 requires MAX_SLOTS=16 in build configuration");
    }
    
    // DS16 uses CU16 protocol, so validate accordingly
    if (BuildConstants.DEFAULT_BAUD_RATE !== 9600) {
      console.warn("DS16 typically uses 9600 baud rate (CU16 protocol)");
    }
  }
}
```

### Step 4: Create Environment Configuration

```bash
# Create .env.ds16 file
SMC_DEVICE_TYPE=DS16
SMC_MAX_SLOTS=16
SMC_DEFAULT_BAUD_RATE=9600
SMC_BUILD_TARGET=ds16-production
SMC_CUSTOMER_ID=default
SMC_ENABLE_HARDWARE_PROTECTION=true
SMC_ENABLE_DEBUG_LOGGING=false

# Note: DS16 uses CU16 protocol internally
SMC_PROTOCOL_VERSION=CU16
```

### Step 5: Add Build Scripts

```json
{
  "scripts": {
    "dev:ds16": "cp .env.ds16 .env && nextron",
    "build:ds16": "cp .env.ds16 .env && nextron build",
    "build:ds16:linux": "cp .env.ds16 .env && nextron build --linux",
    "build:ds16:win": "cp .env.ds16 .env && nextron build --win --x64",
    "test:ds16": "cp .env.ds16 .env && node scripts/test-ds16.js"
  }
}
```

## Hardware Migration Notes

### DS16 (formerly CU16) Migration

When working with DS16 hardware:

- **Protocol**: Uses CU16 protocol internally
- **Slots**: 16 medication slots
- **Baud Rate**: 9600 (CU16 standard)
- **Naming**: External name is DS16, but protocol references may still use CU16

### Code Comments for Clarity

```typescript
// DS16Controller.ts
export class DS16Controller extends KuControllerBase {
  // DS16 is the new product name for CU16 hardware
  // Protocol and communication remain CU16-based
  public readonly deviceType = "DS16" as const;
  
  constructor(win: BrowserWindow) {
    super(win);
    
    // Use CU16 protocol parser for DS16 hardware
    this.protocolParser = new DS16ProtocolParser(); // Wraps CU16 protocol
  }
}
```

## Customer-Specific Deployments

### Creating Customer Configurations

For customer-specific builds, create environment files with customer-specific settings:

```bash
# .env.ds12.hospital-a
SMC_DEVICE_TYPE=DS12
SMC_MAX_SLOTS=12
SMC_DEFAULT_BAUD_RATE=19200
SMC_BUILD_TARGET=ds12-production
SMC_CUSTOMER_ID=hospital-a
SMC_ENABLE_HARDWARE_PROTECTION=true
SMC_ENABLE_DEBUG_LOGGING=false
SMC_HOSPITAL_NAME="General Hospital A"
SMC_SUPPORT_EMAIL="support@hospital-a.com"

# .env.ds16.clinic-b  
SMC_DEVICE_TYPE=DS16
SMC_MAX_SLOTS=16
SMC_DEFAULT_BAUD_RATE=9600
SMC_BUILD_TARGET=ds16-production
SMC_CUSTOMER_ID=clinic-b
SMC_ENABLE_HARDWARE_PROTECTION=true
SMC_ENABLE_DEBUG_LOGGING=false
SMC_CLINIC_NAME="Medical Clinic B"
SMC_SUPPORT_EMAIL="support@clinic-b.com"
```

### Customer Build Process

```bash
# Add customer-specific build scripts
"build:ds12-hospital-a": "cp .env.ds12.hospital-a .env && nextron build --publish never"
"build:ds16-clinic-b": "cp .env.ds16.clinic-b .env && nextron build --publish never"

# Build for specific customers
npm run build:ds12-hospital-a
npm run build:ds16-clinic-b
```

## Testing

### Running Tests for Specific Hardware

```bash
# Test DS12 functionality
npm run test:ds12

# Test DS16 functionality
npm run test:ds16

# Run all tests
npm test
```

### Test Configuration

Tests automatically use the environment configuration from the `.env` file:

```typescript
// Test will use current environment configuration
describe('Hardware Controller Tests', () => {
  it('should initialize DS12 controller', () => {
    // When .env.ds12 is active
    const controller = BuildTimeController.getInstance(mockWindow);
    expect(controller.deviceType).toBe('DS12');
    expect(controller.maxSlot).toBe(12);
  });

  it('should initialize DS16 controller', () => {
    // When .env.ds16 is active  
    const controller = BuildTimeController.getInstance(mockWindow);
    expect(controller.deviceType).toBe('DS16');
    expect(controller.maxSlot).toBe(16);
  });
});
```

## Build Validation

The system includes comprehensive build-time validation:

### Automatic Validation

```typescript
// Validates configuration at application startup
BuildConstants.validateConfiguration();
```

### Validation Checks

- ✅ Valid device type (DS12, DS16, etc.)
- ✅ Correct slot count for device type
- ✅ Valid baud rate settings
- ✅ Required environment variables present
- ✅ Customer configuration consistency

### Error Examples

```bash
# Invalid device type
Error: Invalid DEVICE_TYPE: CU16. Use DS16 instead (CU16 renamed to DS16)

# Incorrect slot count for DS16
Error: Invalid MAX_SLOTS for DS16: 12. Expected: 16

# Missing environment variable
Error: Required environment variable SMC_DEVICE_TYPE is not set.
```

## Deployment

### Build Output

Each build produces hardware-specific artifacts:

```
dist/
├── smc-app-ds12-v1.0.0-linux-x64.AppImage
├── smc-app-ds12-v1.0.0-win-x64.exe
├── smc-app-ds16-v1.0.0-linux-x64.AppImage
└── smc-app-ds16-v1.0.0-win-x64.exe
```

### Deployment Verification

Verify deployed builds contain correct configuration:

```bash
# Check build information in deployed application
grep -r "DEVICE_TYPE" dist/
grep -r "MAX_SLOTS" dist/

# Should see DS16, not CU16
grep -r "DS16" dist/
```

## Troubleshooting

### Common Issues

**Issue**: Build fails with "DEVICE_TYPE not specified"
```bash
Solution: Ensure .env file exists and contains SMC_DEVICE_TYPE
Check: ls -la .env*
```

**Issue**: CU16 reference in logs
```bash
Solution: This is expected - DS16 uses CU16 protocol internally
Action: No action needed, this is by design
```

**Issue**: Wrong device type at runtime
```bash
Solution: Verify correct build script was used
Check: npm run build:ds16  # not npm run build:ds12
```

**Issue**: Hardware connection fails on DS16
```bash
Solution: Verify DS16 hardware settings
Check: SMC_DEFAULT_BAUD_RATE=9600 (not 19200 like DS12)
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# In .env file
SMC_ENABLE_DEBUG_LOGGING=true
```

### Build Information

Check build configuration at runtime:

```typescript
const buildInfo = BuildTimeController.getBuildInfo();
console.log('Build Info:', buildInfo);
// Output: { deviceType: 'DS16', maxSlots: 16, ... }
```

## Best Practices

### 1. Environment File Management

- ✅ Use DS16 instead of CU16 in configuration files
- ✅ Keep `.env.*` files in version control
- ✅ Use descriptive names (`.env.ds16.clinic-b`)
- ✅ Document customer-specific settings
- ❌ Don't use deprecated CU16 naming

### 2. Build Script Organization

- ✅ Use DS16 consistently in script names
- ✅ Group related scripts together
- ✅ Include platform variants
- ✅ Add customer-specific scripts

### 3. Code Documentation

- ✅ Document DS16/CU16 relationship in comments
- ✅ Explain protocol compatibility
- ✅ Note hardware naming conventions
- ✅ Keep migration notes updated

### 4. Testing Strategy

- ✅ Test DS16 as separate device type
- ✅ Validate DS16 build configurations
- ✅ Test protocol compatibility
- ✅ Verify customer-specific DS16 builds

## Migration Guide

### From CU16 to DS16 Naming

If you have existing CU16 references:

1. **Update Environment Files**: Rename `.env.cu16` to `.env.ds16`
2. **Update Build Scripts**: Change `build:cu16` to `build:ds16`
3. **Update Configuration**: Set `SMC_DEVICE_TYPE=DS16`
4. **Keep Protocol Logic**: CU16 protocol code remains unchanged
5. **Update Documentation**: Use DS16 in user-facing materials

### Backward Compatibility

The build-time system maintains compatibility with:
- ✅ Existing DS12Controller implementation
- ✅ CU16 protocol implementation (now used by DS16)
- ✅ Database schema
- ✅ IPC communication patterns

## Support

For additional support:
- 📖 Check `/docs/phases/phase-4-ipc-handlers.md` for technical details
- 🧪 Run test suite: `npm test`
- 🔍 Enable debug logging: `SMC_ENABLE_DEBUG_LOGGING=true`
- 📝 Check build logs for validation errors
- 💡 Remember: DS16 = CU16 hardware with updated naming

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Compatible With**: SMC Application v2.0.0+  
**Hardware Support**: DS12 ✅, DS16 (formerly CU16) 🚧, DS24 🚧