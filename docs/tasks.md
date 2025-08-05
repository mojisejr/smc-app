# ESP32 License Activation Implementation Tasks

## Overview
Implement the correct ESP32-based license activation flow that validates hardware through WiFi connection and REST API calls.

## Current Problems with Implementation
1. **Incorrect Hardware Validation**: Currently using local hardware ID instead of ESP32 MAC address validation
2. **Missing WiFi Connection**: No WiFi connection logic to ESP32 AP
3. **Missing REST API Client**: No HTTP client for ESP32 endpoints
4. **Wrong app_serial Validation**: Using dynamic hardware ID instead of hardcoded app_serial

## Correct License Activation Flow

### Step 1: License File Processing ✅ (Already implemented)
- Read `license.json` file containing `{ token: "jwt-token" }`
- Parse and extract JWT token
- Verify JWT signature and decode payload to get:
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

### Step 2: App Serial Validation 🔄 (Needs fixing)
- **Current Issue**: Using dynamic `getHardwareId()` 
- **Required Fix**: Compare `payload.app_serial` with hardcoded `APP_SERIAL` constant
- **Implementation**: Define `APP_SERIAL` at build time in config/constants

### Step 3: WiFi Connection to ESP32 🆕 (Not implemented)
- Connect to ESP32 WiFi AP using `ssid` and `password` from license
- Handle WiFi connection failures gracefully
- Verify connection established before proceeding

### Step 4: ESP32 Health Check 🆕 (Not implemented) 
- Call `GET /health` endpoint on ESP32 at `ip_address`
- Expected response:
  ```json
  {
    "server": {
      "status": "healthy",
      "uptime_ms": 9455086,
      "connected_clients": 1
    },
    "info": {
      "device": "ESP32",
      "mac_address": "F4:65:0B:58:66:A4",
      "ap_ip": "192.168.4.1", 
      "ap_ssid": "ESP32_AP"
    }
  }
  ```
- Validate server status is "healthy"

### Step 5: ESP32 MAC Address Verification 🆕 (Not implemented)
- Call `GET /mac` endpoint on ESP32
- Expected response: `{"mac_address":"F4:65:0B:58:66:A4"}`
- Compare real MAC address with `payload.mac_address`
- Only proceed if MAC addresses match exactly

### Step 6: Save License ✅ (Already implemented)
- Save validated JWT token to database
- Update activation status

## Implementation Tasks

### High Priority Tasks

1. **Update ActivationService Hardware Validation**
   - Remove `getHardwareId()` usage
   - Replace with hardcoded `APP_SERIAL` comparison
   - Update `_validateHardware()` method

2. **Create WiFi Connection Utilities** 
   - Implement WiFi connection functions for ESP32 AP
   - Handle connection timeouts and failures
   - Create utility functions in `main/utils/wifi.ts`

3. **Create ESP32 REST API Client**
   - HTTP client for ESP32 endpoints
   - Implement `/health` endpoint call
   - Implement `/mac` endpoint call
   - Handle HTTP errors and timeouts
   - Create client in `main/utils/esp32Client.ts`

4. **Implement ESP32 Hardware Validation Workflow**
   - Update `ActivationService._validateHardware()` method
   - Add WiFi connection step
   - Add health check step  
   - Add MAC address verification step
   - Proper error handling for each step

### Medium Priority Tasks

5. **Add Comprehensive Error Handling**
   - WiFi connection failure errors
   - ESP32 unreachable errors
   - Invalid ESP32 responses
   - Network timeout errors
   - Update `ActivationErrorCode` enum

6. **Create Build-Time Constants**
   - Define hardcoded `APP_SERIAL` constant
   - Add to build configuration
   - Ensure it's available at runtime

### Low Priority Tasks

7. **Testing & Validation**
   - Test complete flow with actual ESP32 hardware
   - Test error scenarios (wrong WiFi, unreachable ESP32, wrong MAC)
   - Integration testing

## Questions & Clarifications Needed

1. **APP_SERIAL**: Should this be hardcoded in the source code or loaded from environment/config?

2. **WiFi Implementation**: Should we use Node.js WiFi libraries or system commands for WiFi connection?

3. **Connection Timeouts**: What timeout values should we use for WiFi connection and HTTP requests?

4. **Error Recovery**: Should the system automatically retry failed connections or require user intervention?

5. **Multiple ESP32 Support**: Does the system need to support multiple ESP32 devices or just one?

6. **Platform Support**: Do we need WiFi connection support for Windows/Linux/macOS or just specific platforms?

## Files to Modify

- `main/services/activationService.ts` - Update validation logic
- `main/utils/wifi.ts` - New WiFi utilities (to be created)
- `main/utils/esp32Client.ts` - New ESP32 HTTP client (to be created)  
- `main/errors/activationError.ts` - Add new error codes
- `main/config/constants.ts` - Add APP_SERIAL constant (to be created)
- `package.json` - Add HTTP client dependencies if needed

## Dependencies Needed

- HTTP client library (axios already installed ✅)
- WiFi management library (need to research platform-specific options)
- Network utilities for connection management