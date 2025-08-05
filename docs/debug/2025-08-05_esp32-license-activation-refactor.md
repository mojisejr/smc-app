# ESP32 License Activation System Refactor

**Date**: August 5, 2025  
**Branch**: activation-improve  
**Commit**: 3774411  

## Overview

Complete overhaul of the license activation system to implement ESP32 hardware-based validation using JWT tokens and WiFi connectivity. This refactor replaces the old simple license key system with a comprehensive hardware validation workflow.

## Problem Statement

### Previous Issues
- **Weak Security**: Simple text-based license keys without hardware binding
- **No Hardware Validation**: No verification of actual ESP32 device presence
- **Poor Error Handling**: Generic error messages without specific failure context
- **Tight Coupling**: Activation logic mixed with UI components
- **Manual Process**: No automated validation of ESP32 connectivity

### Business Requirements
- License must be tied to specific ESP32 hardware via MAC address
- Application must verify ESP32 connectivity before allowing usage
- Automatic license invalidation if hardware validation fails
- User-friendly WiFi connection workflow
- Comprehensive logging for troubleshooting

## Technical Solution

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   license.json  │───▶│ ActivationService│───▶│   ESP32 Device  │
│   (JWT Token)   │    │                  │    │ (WiFi + REST)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │ (activated_key)  │
                       └──────────────────┘
```

### Implementation Details

#### 1. License File Format
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBfc2VyaWFsIjoi..."
}
```

**JWT Payload Structure:**
```json
{
  "app_serial": "1ea89fc32721ff692ff70d36868406b7d673c9df1200b6be7313f053f58de8c3",
  "mac_address": "F4:65:0B:58:66:A4",
  "ssid": "ESP32_AP",
  "password": "password123", 
  "ip_address": "192.168.4.1",
  "exp": 1785858104,
  "iat": 1754322104
}
```

#### 2. Two-Step Activation Process

**Step 1: License Processing**
- Validate JWT signature and expiration
- Extract WiFi credentials from token
- Verify app_serial matches hardcoded constant
- Display WiFi connection instructions to user

**Step 2: Hardware Validation**
- User manually connects to ESP32 WiFi network
- Application calls ESP32 REST endpoints:
  - `GET /health` - Verify device status
  - `GET /mac` - Get actual MAC address
- Compare real MAC with license MAC
- Save validated license to database

#### 3. Comprehensive License Validation

The `validateLicense()` function now performs real-time validation:

1. **Database Check**: Verify license exists
2. **JWT Verification**: Validate signature and expiration  
3. **App Serial Check**: Compare with `APP_SERIAL` constant
4. **ESP32 Connection**: Test WiFi connectivity
5. **Health Check**: Verify ESP32 device status
6. **MAC Validation**: Compare real vs. licensed MAC address

**Critical Feature**: If ANY validation fails, the license is immediately deleted from the database, forcing reactivation.

### File Structure

```
main/
├── config/
│   └── constants.ts          # APP_SERIAL and configuration
├── errors/
│   └── activationError.ts    # Custom error handling
├── services/
│   └── activationService.ts  # Core activation logic
├── utils/
│   └── esp32Client.ts        # HTTP client for ESP32 REST API
└── license/
    ├── validator.ts          # Enhanced validation with ESP32 checks
    └── ipcMain/
        └── activate-key.ts   # Updated IPC handlers
```

### Key Classes and Functions

#### ActivationService
```typescript
class ActivationService {
  // Step 1: Process license file and return WiFi credentials
  static async processLicenseFile(filePath: string): Promise<WiFiCredentials>
  
  // Step 2: Complete activation after WiFi connection
  static async completeActivation(filePath: string): Promise<void>
}
```

#### ESP32Client
```typescript
class ESP32Client {
  // Check ESP32 device health
  async checkHealth(): Promise<ESP32HealthResponse>
  
  // Get MAC address from ESP32
  async getMacAddress(): Promise<string>
}
```

#### Enhanced Validator
```typescript
// Comprehensive validation with automatic cleanup
async function validateLicense(): Promise<boolean>

// Deletes license if validation fails
async function deleteLicenseFromDatabase(): Promise<void>
```

## Configuration

### Constants (`main/config/constants.ts`)
```typescript
// Hardcoded app serial for license validation
export const APP_SERIAL = "1ea89fc32721ff692ff70d36868406b7d673c9df1200b6be7313f053f58de8c3";

// ESP32 HTTP client settings
export const ESP32_CONFIG = {
  HTTP_TIMEOUT: 10000,  // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000     // 2 seconds between retries
};

// License validation settings
export const LICENSE_CONFIG = {
  JWT_SECRET_KEY: "38716e276a065195302edd7d5f42b599af527378...",
  TEST_MODE: false      // Set true for development
};
```

### Error Codes (`main/errors/activationError.ts`)
```typescript
enum ActivationErrorCode {
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE', 
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  HARDWARE_MISMATCH = 'HARDWARE_MISMATCH',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR'
}
```

## User Experience Flow

### 1. Initial State
- User selects `license.json` file
- System validates JWT and app_serial
- WiFi credentials displayed with clear instructions

### 2. WiFi Connection
```
📶 การเชื่อมต่อ WiFi

ชื่อเครือข่าย (SSID): ESP32_AP
รหัสผ่าน: password123
IP Address: 192.168.4.1

📋 ขั้นตอนการเชื่อมต่อ:
1. เชื่อมต่อ WiFi ของคุณกับเครือข่าย ESP32_AP
2. ใช้รหัสผ่าน: password123
3. เมื่อเชื่อมต่อสำเร็จแล้ว กดปุ่ม "ยืนยันการเชื่อมต่อ"
```

### 3. Hardware Validation
- System automatically connects to ESP32
- Validates device health and MAC address
- Shows success message and redirects to main app

## Debug Logging

Comprehensive logging throughout activation flow:

### License Processing
```
🚀 [DEBUG] Starting license file processing...
📁 [DEBUG] File path: /path/to/license.json
📖 [DEBUG] Step 1: Reading license file...
🔍 [DEBUG] Step 2: Parsing JSON and extracting JWT...
🔓 [DEBUG] Step 3: Verifying and decoding JWT...
🔒 [DEBUG] Step 4: Validating app_serial...
```

### ESP32 Validation
```
🌐 [DEBUG] _validateESP32Hardware: Starting ESP32 validation...
📡 [DEBUG] Target IP: 192.168.4.1
🏥 [DEBUG] Step 1: Checking ESP32 health...
🔍 [DEBUG] Step 2: Getting MAC address from ESP32...
🔍 [DEBUG] Step 3: Comparing MAC addresses...
```

### License Validation
```
🔍 [DEBUG] validateLicense: Starting comprehensive license validation...
📂 [DEBUG] validateLicense: Fetching license from database...
🔒 [DEBUG] validateLicense: Verifying JWT signature...
🔑 [DEBUG] validateLicense: Checking app_serial...
🌐 [DEBUG] validateLicense: Validating ESP32 connection...
```

## Security Features

### 1. JWT-Based Authentication
- Cryptographic signatures prevent tampering
- Expiration timestamps enforce license periods
- Secret key validation ensures authenticity

### 2. Hardware Binding
- App serial ties license to specific application
- MAC address binds license to physical ESP32 device
- Real-time connectivity verification

### 3. Automatic Cleanup
- Invalid licenses immediately deleted from database
- Forces reactivation on any validation failure
- Prevents bypass attempts

### 4. Network Security  
- HTTPS-ready ESP32 client implementation
- Timeout and retry mechanisms prevent hanging
- Graceful error handling for network failures

## Testing and Development

### Test Mode
Set `LICENSE_CONFIG.TEST_MODE = true` to:
- Skip JWT signature verification
- Skip ESP32 hardware validation
- Enable development without actual hardware

### Debug Features
- Comprehensive console logging with emoji indicators
- Step-by-step validation process visibility
- Clear error messages with specific failure reasons
- Network request/response logging

## Performance Considerations

### HTTP Client Optimization
- Connection pooling for ESP32 requests
- Configurable timeouts (10s default)
- Retry logic with exponential backoff
- Parallel validation where possible

### Database Efficiency
- Single database query for license retrieval
- Efficient license cleanup with direct SQL updates
- Minimal database round trips

## Error Handling

### Network Failures
- ESP32 unreachable: Delete license, force reactivation
- Timeout errors: Retry with exponential backoff
- Connection refused: Clear error messages for user

### License Issues
- Invalid JWT: Immediate deletion and reactivation prompt
- Expired token: Clear expiration message
- MAC mismatch: Hardware-specific error guidance

### User Experience
- No technical jargon in user-facing messages
- Clear instructions for each step
- Fallback redirect even if validation fails

## Migration Notes

### Breaking Changes
- Old text-based license keys no longer supported
- New JWT format required for all activations
- ESP32 hardware now mandatory for validation

### Backward Compatibility
- Legacy IPC handler maintained during transition
- Database schema unchanged (activated_key field reused)
- Existing error handling patterns preserved

## Future Enhancements

### Planned Improvements
1. **Automatic WiFi Connection**: OS-specific WiFi management
2. **License Renewal**: Automatic token refresh mechanism  
3. **Multi-Device Support**: Single license for multiple ESP32s
4. **Cloud Validation**: Optional server-side verification
5. **Offline Mode**: Grace period for temporary disconnections

### Monitoring Considerations
- License validation frequency metrics
- ESP32 connectivity success rates
- Error pattern analysis
- Performance timing measurements

## Deployment

### Production Checklist
- [ ] Set `TEST_MODE = false` in constants
- [ ] Update `JWT_SECRET_KEY` with production value
- [ ] Verify `APP_SERIAL` matches intended hardware
- [ ] Test with actual ESP32 device
- [ ] Validate error handling scenarios

### Environment Variables
```bash
NODE_ENV=production
JWT_SECRET_KEY="production-secret-key"
SKIP_JWT_VALIDATION=false
```

## Conclusion

This refactor establishes a robust, secure, and user-friendly license activation system that ensures both software authenticity and hardware presence. The comprehensive validation and automatic cleanup mechanisms provide strong security while maintaining excellent user experience through clear instructions and helpful error messages.

The modular architecture supports future enhancements while the extensive debugging capabilities ensure maintainability and troubleshootability in production environments.