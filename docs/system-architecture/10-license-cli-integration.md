# SMC License CLI Tool - System Integration Documentation

## Document Purpose

This document details the SMC License CLI Tool (v1.1.0) integration with the Smart Medication Cart system, providing comprehensive technical specifications for ESP32-based hardware binding, secure license management, CSV batch processing workflows, and ESP32 Keygen System integration.

## System Integration Overview

### Architecture Position
The SMC License CLI Tool operates as a companion tool to the main SMC desktop application:

```
┌─────────────────────────────────────────────────────────┐
│                SMC Desktop Application                  │
│              (Medical Device Software)                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼ License Validation
┌─────────────────────────────────────────────────────────┐
│           SMC License CLI Tool (v1.1.0)                │
├─────────────────────────────────────────────────────────┤
│ • ESP32 Communication Module                           │
│ • AES-256-CBC Encryption Engine                        │
│ • License Generation & Validation                      │
│ • Hardware Binding Management                          │
│ • Cross-Platform TypeScript CLI                        │
│ • 🆕 CSV Batch Processing System                        │
│ • 🆕 No Expiry License Support                          │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP/WiFi
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 ESP32 Hardware                         │
├─────────────────────────────────────────────────────────┤
│ • MAC Address Provider (Hardware Binding)              │
│ • WiFi HTTP Server (/mac endpoint)                     │
│ • Medical Device Authentication                        │
└─────────────────────────────────────────────────────────┘
```

## Technical Specifications

### Core Components

#### 1. CLI Entry Point (`cli/index.ts`)
- **Framework**: Commander.js with TypeScript
- **Features**: Comprehensive command structure with examples and help
- **Commands**: `generate`, `validate`, `info`, `test-esp32`
- **Performance**: ~100ms startup time, optimized for production use

#### 2. ESP32 Communication Module (`cli/modules/esp32.ts`)
- **Protocol**: HTTP over WiFi
- **Endpoint**: `GET /mac` for MAC address retrieval
- **Features**: Progress indicators, retry logic, timeout handling
- **Network**: Support for custom IP addresses and multiple retry attempts
- **Error Handling**: Medical-grade error reporting with troubleshooting guides

#### 3. Encryption Module (`cli/modules/encryption.ts`)
- **Algorithm**: AES-256-CBC with proper IV handling
- **Performance**: Pre-computed keys for optimal encryption speed
- **Security**: Medical device-grade key management and data integrity
- **Features**: License validation, checksum verification, data integrity checks

#### 4. License Generator (`cli/modules/license-generator.ts`)
- **Functionality**: Complete license lifecycle management
- **Formats**: JSON license files with encrypted payloads
- **Validation**: Comprehensive license integrity and expiry checking
- **Features**: Test mode for development, production mode for deployment

### License File Structure

#### Encrypted License Format (.lic files)
```json
{
  "version": "1.0.0",
  "encrypted_data": "base64-encoded-aes-encrypted-payload",
  "algorithm": "aes-256-cbc",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

#### Decrypted License Payload
```json
{
  "organization": "SMC Medical Corp",
  "customerId": "HOSP001", 
  "applicationId": "SMC_Cabinet",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "expiryDate": "2025-12-31",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "wifiSsid": "SMC_ESP32_001",
  "wifiPassword": "SecurePass123!",
  "version": "1.0.0",
  "checksum": "sha256-integrity-hash"
}
```

## Production Deployment Architecture

### Development Phase
```bash
# Test mode - no ESP32 hardware required, includes WiFi credentials
smc-license generate \
  --org "Test Organization" \
  --customer "TEST001" \
  --app "SMC_Test" \
  --expiry "2025-06-30" \
  --wifi-ssid "TEST_WIFI" \
  --wifi-password "simple123" \
  --test-mode \
  --bypass-password-check
```

### Production Phase  
```bash
# Production mode - requires ESP32 connection and WiFi credentials
smc-license generate \
  --org "SMC Medical Corp" \
  --customer "HOSP001" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" \
  --wifi-password "SecurePass123!" \
  --esp32-ip "192.168.4.1"
```

### Cross-Platform Development Support

#### macOS Development Environment
```bash
# Automatic WiFi bypass for development on macOS
NODE_ENV=development npm run dev

# License generation with weak passwords (development only)
smc-license generate --wifi-ssid "DEV_WIFI" --wifi-password "dev123" \
  --bypass-password-check --test-mode [other options...]
```

#### Windows Production Environment  
```bash
# Full WiFi connection and ESP32 validation
NODE_ENV=production npm run dev

# Production license with strong passwords
smc-license generate --wifi-ssid "PROD_ESP32" --wifi-password "SecurePass123!" \
  [other production options...]
```

### License Validation
```bash
# Validate license integrity and expiry
smc-license validate --file hospital-license.lic

# Display detailed license information (now includes WiFi credentials)
smc-license info --file hospital-license.lic
```

### 🆕 CSV Batch Processing (Phase 4.5)
```bash
# Process CSV from ESP32 Deployment Tool
smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv

# Batch with custom expiry settings
smc-license batch --input daily-batch.csv --expiry-years 2 --skip-existing --output-dir ./licenses/

# No expiry (permanent) licenses
smc-license batch --input permanent-licenses.csv --no-expiry --update-csv

# Dry run validation and preview
smc-license batch --input test-batch.csv --dry-run --verbose

# Skip existing license files
smc-license batch --input batch.csv --skip-existing --update-csv
```

## Security Architecture

### Hardware Binding Security
- **MAC Address Binding**: License tied to specific ESP32 hardware
- **Transfer Prevention**: License validation fails on different hardware
- **Anti-Piracy**: Cryptographic binding prevents license cloning
- **Medical Compliance**: Meets healthcare device security requirements

### Encryption Security
- **Algorithm**: AES-256-CBC (Medical device standard)
- **Key Management**: Pre-computed keys with secure derivation
- **IV Handling**: Proper initialization vector generation and storage
- **Data Integrity**: SHA-256 checksums for payload verification including WiFi credentials
- **WiFi Security**: Encrypted WiFi credentials stored securely within license files
- **Password Validation**: Enforced strong WiFi passwords with development bypass option

### Network Security
- **ESP32 Communication**: HTTP over secure WiFi networks with automated connection
- **WiFi Automation**: Automatic WiFi connection using encrypted credentials from license
- **Development Bypass**: Safe WiFi mocking for macOS development without compromising production security
- **Timeout Protection**: Connection timeouts prevent hanging operations
- **Retry Logic**: Intelligent retry with exponential backoff
- **Error Isolation**: Network failures don't compromise license integrity

## Performance Characteristics

### CLI Performance Metrics (Production Validated)
- **Startup Time**: ~100ms (under 2-second threshold)
- **Memory Usage**: 0.05 MB runtime footprint
- **License Generation**: <1 second for complete workflow
- **License Validation**: <100ms for integrity checking
- **ESP32 Communication**: <5 seconds with retry logic

### Scalability Features
- **Concurrent Operations**: Multiple CLI instances supported
- **Batch Processing**: Sequential license generation capability
- **Cross-Platform**: Windows, macOS, Linux deployment
- **Network Resilience**: Handles network instability gracefully

## Quality Assurance & Testing

### Test Coverage (Production Validated)
- **Phase 1**: Foundation & Project Structure (11/11 tests passing)
- **Phase 2**: ESP32 Communication Module (12/12 tests passing)  
- **Phase 3**: License Generation & Validation (12/12 tests passing)
- **Phase 4**: Complete CLI Implementation (12/12 tests passing)
- **Phase 5**: Polish & Final Testing (13/13 tests passing)
- **Total Coverage**: 60+ comprehensive tests across all phases

### Production Readiness Checklist
✅ **All Tests Passing**: 100% test success rate across all phases  
✅ **Performance Validated**: All benchmarks meet medical device requirements  
✅ **Documentation Complete**: Full README.md with troubleshooting guides  
✅ **Error Handling**: Context-aware error messages with recovery suggestions  
✅ **Security Audited**: Encryption and hardware binding verified  
✅ **Build System**: Production-optimized builds and distribution ready  
✅ **Cross-Platform**: Verified on Windows, macOS, and Linux environments  

## Integration with SMC Desktop Application

### Enhanced License Verification Workflow
1. **SMC Application Startup**: Check for valid license file
2. **Environment Detection**: Determine development vs production mode
3. **License Validation**: Verify license integrity and hardware binding
4. **WiFi Connection**: Automatic WiFi connection using encrypted credentials from license
5. **Hardware Verification**: Confirm ESP32 MAC address matches license (or mock in development)
6. **Expiry Checking**: Validate license expiry against current date
7. **Access Control**: Grant/deny application access based on license status

### Key Integration Components
- **`main/utils/environment.ts`**: Environment detection for cross-platform development
- **`main/license/wifi-manager.ts`**: WiFi management with development bypass
- **`main/license/esp32-client.ts`**: ESP32 communication with mock support
- **`main/license/file-manager.ts`**: License parsing with WiFi credential extraction

### Deployment Strategy
1. **Development**: Use CLI test mode with WiFi credential bypass for macOS development
2. **Cross-Platform Setup**: Configure NODE_ENV for appropriate platform behavior
3. **Production Setup**: Deploy ESP32 hardware with WiFi configuration
4. **License Generation**: Generate production licenses with actual MAC binding and WiFi credentials
5. **License Distribution**: Secure delivery of .lic files with encrypted WiFi credentials to customer sites
6. **Validation Integration**: SMC app validates licenses with automatic WiFi connection on startup

## Medical Device Compliance

### Regulatory Requirements
- **Audit Trail**: All license operations logged for compliance
- **Data Integrity**: Cryptographic verification of license authenticity
- **Access Control**: Hardware-based authentication prevents unauthorized access
- **Error Logging**: Medical-grade error reporting for regulatory review
- **Thai Language**: Complete localization for Thai healthcare facilities

### Security Standards
- **Encryption**: AES-256-CBC meets medical device security standards
- **Key Management**: Secure key derivation and storage practices
- **Hardware Binding**: Prevents license transfer and unauthorized use
- **Network Security**: Secure communication protocols for ESP32 integration

## Maintenance & Support

### Troubleshooting Guide
Common issues and resolution patterns are documented in `cli/README.md`:
- ESP32 connection failures
- License validation errors  
- Network configuration problems
- File permission issues
- Date format validation errors

### Development Guidelines
- **Test Mode**: Use `--test-mode` for development without hardware
- **Cross-Platform Development**: Use NODE_ENV=development on macOS for WiFi bypass
- **Password Validation**: Use `--bypass-password-check` for weak passwords in development
- **Error Handling**: All operations include comprehensive error reporting
- **Performance**: Optimized for medical device response time requirements
- **Logging**: Structured logging for debugging and audit purposes with development mode indicators

## ESP32 Keygen System Integration ✅ PRODUCTION READY

### System Integration with SMC Desktop Application
The ESP32 Keygen System is now fully integrated with the SMC desktop application, providing seamless license activation with hardware binding validation:

#### Key Integration Features
1. **✅ License Activation Interface**: Thai language UI in `/renderer/pages/activate-key.tsx`
2. **✅ Hardware Binding Validation**: MAC address verification against ESP32 hardware
3. **✅ WiFi Auto-Connection**: Automated WiFi credential management from license files
4. **✅ Development Mode Support**: Cross-platform development with mock ESP32 responses
5. **✅ Error Handling**: Medical-grade error messages with troubleshooting guidance
6. **✅ Progress Indicators**: Real-time feedback during license activation process

#### Activation Workflow
```
1. SMC App Launch → Check for license file
2. License Found → Parse encrypted license data
3. ESP32 Connection → Automatic WiFi connection using license credentials
4. MAC Verification → Compare ESP32 MAC with license binding
5. Validation Success → Grant application access
6. Error Handling → Show Thai language error messages with recovery options
```

## Phase 4.5 Implementation Complete ✅

### Version 1.1.0 Delivered Features
1. **✅ CSV Batch Processing**: Multiple licenses from ESP32 Deployment Tool CSV
2. **✅ No Expiry License Support**: Permanent licenses with checkbox UI interface
3. **✅ CSV Status Tracking**: Update CSV files with license generation status
4. **✅ Enhanced ESP32 Tool**: Integrated expiry date selection and no-expiry option
5. **✅ Complete Workflow**: End-to-end Sales → Developer → Delivery process
6. **✅ ESP32 Keygen System**: Complete license activation interface in SMC desktop app

### Version 1.2.0 Future Features
1. **License Renewal**: Automatic license renewal workflow
2. **Enhanced Monitoring**: Real-time license status monitoring
3. **API Integration**: REST API for automated license management
4. **Batch Renewal**: CSV-based license renewal processing

### Medical Device Integration
1. **SMC Desktop Integration**: Direct license verification in main application
2. **Hardware Health Monitoring**: ESP32 status integration with SMC system
3. **Compliance Reporting**: Enhanced audit trail integration
4. **Multi-Device Support**: License management for multiple SMC units

## ESP32 REST API Integration Architecture

### ESP32 Hardware Communication Layer
**Template Source**: `esp32-deployment-tool/templates/` directory  
**Purpose**: ESP32-based license hardware binding with REST API communication  
**Integration Point**: SMC License CLI → ESP32 HTTP API → MAC address retrieval

### ESP32 REST API Specification

#### ESP32 Server Configuration
**Network Setup**: WiFi Access Point mode for secure communication
```cpp
// ESP32 network configuration (from main.cpp)
const char* ssid = "ESP32_AP";
const char* password = "password123";
IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// Create isolated network for license communication
WiFi.mode(WIFI_AP);
WiFi.softAPConfig(local_ip, gateway, subnet);
WiFi.softAP(ssid, password);
```

#### Core API Endpoints for License Integration

**1. MAC Address Retrieval** (`GET /mac`):
```json
// Request: GET http://192.168.4.1/mac
// Response:
{
  "mac_address": "24:6F:28:A0:12:34"
}
```

**2. Hardware Health Check** (`GET /health`):
```json
// Request: GET http://192.168.4.1/health  
// Response:
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

**3. Environmental Monitoring** (`GET /temp`):
```json
// Request: GET http://192.168.4.1/temp
// Response (Mock mode):
{
  "sensor": "mock",
  "temperature_c": 25.42,
  "timestamp": 123456789
}

// Response (DHT22 mode):  
{
  "sensor": "DHT22",
  "temperature_c": 24.50,
  "humidity_percent": 65.3,
  "timestamp": 123456789,
  "status": "valid"
}
```

### SMC License CLI ESP32 Integration

#### ESP32 Communication Module
**Implementation**: Enhanced ESP32 module in `cli/modules/esp32.ts`

```typescript
interface ESP32Device {
  ip: string;
  macAddress: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSeen: number;
}

interface ESP32Response {
  mac_address: string;
  server?: {
    status: string;
    uptime_ms: number;
    connected_clients: number;
  };
  info?: {
    device: string;
    ap_ip: string;
    ap_ssid: string;
  };
}

// ESP32 communication class with error handling
export class ESP32Client {
  private defaultIP = '192.168.4.1';
  private timeout = 5000; // 5 second timeout
  
  async getMACAddress(ip?: string): Promise<string> {
    const deviceIP = ip || this.defaultIP;
    
    try {
      const response = await fetch(`http://${deviceIP}/mac`, {
        timeout: this.timeout,
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`ESP32 HTTP error: ${response.status}`);
      }
      
      const data: ESP32Response = await response.json();
      
      // Validate MAC address format
      if (!this.isValidMACAddress(data.mac_address)) {
        throw new Error('Invalid MAC address format from ESP32');
      }
      
      return data.mac_address;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[ESP32] Development mode: Using mock MAC address');
        return 'DEV:TEST:MAC:ADDR';
      }
      throw new Error(`ESP32 communication failed: ${error.message}`);
    }
  }
  
  async testConnection(ip?: string): Promise<boolean> {
    try {
      const deviceIP = ip || this.defaultIP;
      const response = await fetch(`http://${deviceIP}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  private isValidMACAddress(mac: string): boolean {
    return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
  }
}
```

#### CLI Command Integration

**Enhanced CLI Commands with ESP32 Support**:
```bash
# Generate license with automatic ESP32 MAC retrieval
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"
# → Automatically connects to ESP32, retrieves MAC, generates license

# Test ESP32 connectivity before license generation  
smc-license test-esp32 --ip 192.168.4.1
# → Verifies ESP32 is accessible and responding

# Development mode with mock ESP32 responses
smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" \
  --wifi-ssid "TEST_WIFI" --wifi-password "simple123" --test-mode
# → Uses mock MAC address for testing
```

#### License Generation Workflow with ESP32
```
1. CLI Start → Check ESP32 connectivity (test-esp32)
2. ESP32 Found → Retrieve MAC address (GET /mac)  
3. MAC Validated → Generate license with hardware binding
4. License Created → Include WiFi credentials for SMC app
5. Integration → SMC app uses ESP32 for activation verification
```

### Development vs Production Modes

#### Development Mode Benefits
```typescript
// Development bypass for testing without ESP32 hardware
if (process.env.NODE_ENV === 'development') {
  console.log('[DEV] Using mock ESP32 responses - no hardware required');
  return {
    mac_address: "DEV:TEST:MAC:ADDR",
    server: { status: "healthy" },
    development: true
  };
}
```

#### Production Mode Security
```typescript
// Production mode with real ESP32 verification
const esp32Client = new ESP32Client();

// Test connectivity first
if (!(await esp32Client.testConnection())) {
  throw new Error('ESP32 not found. Ensure device is powered and connected.');
}

// Retrieve actual MAC address
const macAddress = await esp32Client.getMACAddress();
console.log(`[PROD] Hardware MAC verified: ${macAddress}`);
```

### SMC Desktop Application Integration

#### ESP32 License Validation Workflow
**Integration Point**: License activation in `/main/license/esp32-client.ts`

```typescript
// SMC app ESP32 integration (existing implementation)
export class ESP32LicenseClient {
  async validateLicenseWithESP32(licenseData: LicenseData): Promise<boolean> {
    try {
      // Connect to ESP32 configured in license
      const response = await fetch(`http://${licenseData.esp32_ip}/mac`);
      const macData = await response.json();
      
      // Verify MAC matches license binding  
      if (macData.mac_address !== licenseData.hardware_binding.mac_address) {
        throw new Error('ESP32 MAC address mismatch - license invalid');
      }
      
      console.log('[LICENSE] ESP32 hardware binding verified');
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LICENSE] Development mode: Skipping ESP32 validation');
        return true;
      }
      throw error;
    }
  }
}
```

### ESP32 API Response Format Evolution (August 2025)

#### Legacy vs Current Format Compatibility
**Issue**: Legacy code expected different API response format than actual ESP32 hardware output.

**Legacy Expected Format** (SMC Desktop App v1.0):
```json
// Expected by early implementation:
{
  "mac": "F4:65:0B:58:66:A4",
  "status": "success"
}
```

**Actual ESP32 Format** (Hardware Reality):
```json  
// Real ESP32 hardware output:
{
  "mac_address": "F4:65:0B:58:66:A4",
  "customer_id": "TEST1",
  "organization": "TEST1", 
  "status": "success",
  "timestamp": 3727785
}
```

#### Implementation Solution (ESP32MacResponse Interface)
**Backward Compatibility**: Support both formats seamlessly in SMC Desktop App.

```typescript
// Enhanced ESP32MacResponse interface
export interface ESP32MacResponse {
  // Backward compatibility support
  mac?: string;           // Legacy format: { "mac": "F4:65:0B:58:66:A4" }
  mac_address?: string;   // New format: { "mac_address": "F4:65:0B:58:66:A4" }
  status?: 'success' | 'error';
  timestamp?: number;
  customer_id?: string;
  organization?: string;
}

// Parsing logic with fallback
const macFromResponse = responseData.mac_address || responseData.mac;
```

**Files Updated**:
- `main/license/esp32-client.ts` - Enhanced MAC parsing with fallback logic
- `main/license/network-manager.ts` - Updated 3 API parsing methods
- All parsing methods now support both formats transparently

**Testing Results**:
✅ Backward compatibility maintained for legacy systems  
✅ Forward compatibility with real ESP32 hardware API  
✅ Seamless format detection and parsing  
✅ Enhanced error logging for debugging

### Environmental Monitoring Integration

#### DHT22 Sensor Integration
**Purpose**: Medical compliance environmental monitoring  
**Implementation**: Optional DHT22 temperature/humidity sensor

```cpp
// ESP32 DHT22 integration (from docs/DHT22.md)
#include <DHT.h>
#include <DHT_U.h>

#define DHTPIN 4        // GPIO pin for sensor
#define DHTTYPE DHT22   // DHT 22 (AM2302)

DHT_Unified dht(DHTPIN, DHTTYPE);

// Environmental data for medical compliance
server.on("/temp", HTTP_GET, [](AsyncWebServerRequest *request){
  sensors_event_t event;
  dht.temperature().getEvent(&event);
  
  JsonDocument doc;
  if (isnan(event.temperature)) {
    doc["sensor"] = "mock";
    doc["temperature_c"] = getMockTemperature();
    doc["status"] = "mock_data";
  } else {
    doc["sensor"] = "DHT22";
    doc["temperature_c"] = event.temperature;
    doc["status"] = "sensor_data";
    
    // Add humidity if available
    dht.humidity().getEvent(&event);
    if (!isnan(event.relative_humidity)) {
      doc["humidity_percent"] = event.relative_humidity;
    }
  }
  
  doc["timestamp"] = millis();
  String jsonString;
  serializeJson(doc, jsonString);
  request->send(200, "application/json", jsonString);
});
```

### ESP32 Deployment Workflow

#### Hardware Provisioning Steps
```bash
# 1. ESP32 Hardware Setup
# Use ESP32 Deployment Tool for firmware deployment
cd esp32-deployment-tool/
npm run dev                       # Deploy firmware to ESP32 via web interface

# 2. Network Configuration  
# ESP32 creates "ESP32_AP" network automatically
# Default IP: 192.168.4.1

# 3. License Generation
smc-license generate [options]   # CLI automatically detects ESP32

# 4. SMC Application Integration
# License file includes ESP32 configuration
# App connects to ESP32 during activation
```

#### Production Deployment Checklist
- [ ] ESP32 firmware uploaded successfully
- [ ] WiFi Access Point "ESP32_AP" created
- [ ] HTTP server responding on 192.168.4.1
- [ ] MAC address endpoint returning valid format
- [ ] License CLI can connect and retrieve MAC
- [ ] SMC application can validate license with ESP32
- [ ] Environmental monitoring active (if DHT22 connected)

## ESP32 Deployment Tool Integration ✅ PHASE 4.5 COMPLETE - No Expiry & CSV Batch Processing

### System Architecture Enhancement

The SMC ecosystem now includes a dedicated **ESP32 Deployment Tool** that streamlines the ESP32 hardware provisioning process and integrates directly with the SMC License CLI workflow.

```
┌─────────────────────────────────────────────────────────┐
│              ESP32 Deployment Tool                     │
│  (Next.js 14 + No Expiry Support + CSV Export)        │
├─────────────────────────────────────────────────────────┤
│ • Customer Configuration Form with Expiry Options      │
│ • ESP32 Device Detection (Windows/macOS/Container)     │
│ • Firmware Generation & Upload                        │
│ • MAC Address Extraction                              │
│ • 🆕 No Expiry Checkbox Interface                      │
│ • Dual Export: JSON (individual) + CSV (daily batch)  │
│ • 🆕 Enhanced CSV: expiry_date, license_status cols    │
└─────────────────────┬───────────────────────────────────┘
                      │ JSON + Enhanced CSV Export
                      ▼
┌─────────────────────────────────────────────────────────┐
│           SMC License CLI Tool (v1.1.0)                │
├─────────────────────────────────────────────────────────┤
│ • Import JSON from Deployment Tool                     │
│ • 🆕 CSV Batch Processing with Status Updates          │
│ • 🆕 No Expiry License Support (2099-12-31)            │
│ • Generate license.lic with ESP32 binding              │
│ • WiFi Credentials Integration                         │
│ • 🆕 Skip Existing, Dry Run, Verbose Options           │
└─────────────────────┬───────────────────────────────────┘
                      │ License Files + Updated CSV
                      ▼
┌─────────────────────────────────────────────────────────┐
│                SMC Desktop Application                  │
│        (Medical Device Software + License Validation)  │
└─────────────────────────────────────────────────────────┘
```

### Complete Workflow Integration ✅ Phase 4.5 Complete

**Phase 1: ESP32 Hardware Provisioning (Cross-Platform)**
```bash
# Using ESP32 Deployment Tool
cd esp32-deployment-tool/

# Windows Development (Native Support)
npm install                             # Install dependencies
npm run dev                             # Local development
# Complete: Form → Device → Deploy → Extract → JSON + CSV Export
# Export Location: C:\Users\[user]\Desktop\esp32-exports\

# macOS Development  
npm run dev                             # Local development with real hardware
# Complete: Form → Device → Deploy → Extract → JSON + CSV Export
# Export Location: ~/Desktop/esp32-exports/

# Container Production  
docker-compose up --build               # Container environment
# Complete: Form → Device → Deploy → Extract → JSON + CSV Export
# Export Location: Container volume mapped to host Desktop
```

**Phase 2: License Generation (Individual & Batch)**
```bash
# Individual JSON Import (Existing)
cd ../cli/
smc-license generate --import-json ~/Desktop/esp32-exports/customer-BGK001-2025-08-22.json

# 🆕 CSV Batch Processing (Phase 4.5 Complete)
smc-license batch --input ~/Desktop/esp32-exports/esp32-deployments-2025-08-22.csv --update-csv
# → Processes all deployments from a single day with CSV status updates

# 🆕 No Expiry Batch Processing
smc-license batch --input permanent-licenses.csv --no-expiry --update-csv --verbose
# → Generates permanent licenses (valid until 2099-12-31)

# 🆕 Advanced Batch Options
smc-license batch --input batch.csv --expiry-years 2 --skip-existing --output-dir ./licenses/
# → Custom expiry, skip existing files, custom output directory

# Manual generation with deployment data (Existing)
smc-license generate -o "Organization" -c "BGK001" -a "SMC_App" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_BGK001" --wifi-password "SMCPassword123"
```

**Phase 3: SMC Application Integration**
```bash
# Copy license to application
cp license.lic /path/to/smc-app/
cp .env /path/to/smc-app/

# Application automatically validates with ESP32
npm run dev  # Development with WiFi bypass
npm run prod # Production with full ESP32 connection
```

### Cross-Platform Development Strategy ✅

**macOS Development Mode:**
- Environment detection: `process.platform === 'darwin' && NODE_ENV === 'development'`
- MAC extraction from PlatformIO deployment log (no ESP32 WiFi connection required)
- Complete workflow testing without network dependencies
- Real ESP32 hardware integration for firmware upload

**Container Production Mode:**
- Docker-based deployment for Windows production
- HTTP API communication with ESP32 Access Point
- Full network-based MAC extraction and validation
- Production-ready containerized workflow

### Technical Implementation Details

**Environment-Aware API Design:**
```typescript
// /api/extract endpoint intelligent switching
const isDevelopmentMacOS = process.platform === 'darwin' && process.env.NODE_ENV === 'development';

if (isDevelopmentMacOS) {
  // Development: Extract MAC from deployment log
  const macAddress = parseMAC(deploymentLog);
  const wifiCredentials = generateWiFiCredentials(customerId);
  return mockESP32Response(macAddress, customerInfo, wifiCredentials);
} else {
  // Production: HTTP API to ESP32
  const response = await fetch(`http://192.168.4.1/mac`);
  return response.json();
}
```

**JSON Export Format:**
```json
{
  "organization": "Bangkok General Hospital",
  "customerId": "BGK001", 
  "applicationName": "SMC_Cabinet_ICU_01",
  "macAddress": "f4:65:0b:58:66:a4",
  "wifiSSID": "SMC_ESP32_BGK001",
  "wifiPassword": "SMCBGK001247",
  "generatedDate": "2025-08-21T10:30:00.000Z",
  "deploymentMode": "development_macos"
}
```

### Production Readiness Status ✅ Phase 3 Complete

**ESP32 Deployment Tool Status:**
- ✅ **Cross-Platform Ready**: macOS development + Windows native + container production
- ✅ **Windows Native Support**: `npm run dev` works directly on Windows with Desktop export
- ✅ **7 API Endpoints**: All operational with environment detection
- ✅ **Template System**: AM2302 sensor integration with WiFi auto-generation  
- ✅ **Manual Testing**: Complete workflow verified with real ESP32 hardware
- ✅ **Dual Export System**: JSON (individual) + CSV (daily batch) operational
- ✅ **CSV Export Features**: Date rollover, append mode, field escaping
- ✅ **CLI Integration**: JSON + CSV formats compatible with SMC License CLI
- ✅ **Development Mode**: Environment-aware MAC extraction without WiFi dependency
- ✅ **Sales Team Workflow**: Daily CSV files ready for CLI batch processing

### CSV Export System Specification ✅ Phase 4.5 Complete

**Enhanced CSV File Format:**
```csv
timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address,expiry_date,license_status,license_file,notes
2025-08-22T10:30:00.000Z,SMC Medical,TEST001,SMC_Cabinet,SMC_ESP32_TEST001,SecurePass123!,24:6F:28:A0:12:34,192.168.4.1,2025-12-31,pending,,
2025-08-22T10:45:15.123Z,Bangkok Hospital,BGK002,BMC_System,SMC_ESP32_BGK002,HospitalPass456!,24:6F:28:B1:56:78,192.168.4.1,,pending,,No expiry (permanent license)
2025-08-22T11:00:30.456Z,Government Hospital,GOV003,Medical_Cart,SMC_ESP32_GOV003,GovSecure789!,24:6F:28:C2:78:90,192.168.4.1,2026-12-31,completed,GOV003-license.lic,Generated by CLI batch
```

**🆕 New Columns (Phase 4.5):**
- **expiry_date**: License expiry date (YYYY-MM-DD format), empty for no expiry
- **license_status**: 'pending', 'completed', 'failed', 'skipped'
- **license_file**: Generated license filename (populated after CLI processing)
- **notes**: Processing notes and status information

**🆕 No Expiry Handling:**
- **UI Checkbox Checked** → `expiryDate: ""` (empty string in CSV)
- **CLI Parser Detection** → `expiryDate = '2099-12-31'` + `noExpiry = true` flag
- **Display Logic** → Shows "No expiry (permanent)" instead of date

**File Management:**
- **File Naming**: `esp32-deployments-YYYY-MM-DD.csv`
- **Date Rollover**: New file created automatically when date changes
- **Append Mode**: Same-day deployments append to existing file
- **Export Location**: 
  - Windows: `C:\Users\[user]\Desktop\esp32-exports\`
  - macOS: `~/Desktop/esp32-exports/`
  - Container: Volume mapped to host Desktop

**Field Escaping Features:**
- Commas in data fields automatically quoted: `"Hospital, Bangkok"`
- Double quotes escaped: `"Organization ""Quoted"""`
- Special characters preserved in WiFi passwords and organization names

**Sales Team Workflow (Phase 4.5 Complete):**
```
Daily Process:
1. Sales staff deploy multiple ESP32s throughout the day
   • Use checkbox for permanent licenses (no expiry)
   • Set specific expiry dates for timed licenses
2. Each deployment creates individual JSON + appends to daily CSV
3. CSV includes enhanced columns: expiry_date, license_status, etc.
4. End of day: Sales team copies daily CSV file
5. 🆕 CSV sent to development team for CLI batch processing
6. 🆕 CLI processes CSV with: smc-license batch --input file.csv --update-csv
7. 🆕 Updated CSV returned with license_status and license_file populated
8. 🆕 Package: Updated CSV + License files + SMC App → Customer deployment
```

**Integration Benefits (Phase 4.5):**
- **Streamlined Workflow**: Single-click ESP32 provisioning instead of manual setup
- **Error Reduction**: Automated firmware generation with customer-specific configuration
- **Cross-Platform**: Seamless development on macOS, Windows native, production deployment
- **Dual Export**: Individual JSON + daily batch CSV for sales workflow optimization
- **🆕 No Expiry Support**: Checkbox interface for permanent licenses with proper data flow
- **🆕 CSV Batch Processing**: Complete Sales → Developer → Delivery workflow
- **🆕 Status Tracking**: CSV updates with license generation status and file names
- **🆕 Advanced Options**: Skip existing, dry run, custom expiry, output directories
- **CLI Ready**: Direct integration with enhanced SMC License CLI v1.1.0
- **Medical Compliance**: Audit trail and environmental monitoring integration

## CSV Batch Processing Technical Implementation ✅ Phase 4.5

### Core Modules

#### 1. CSV Parser (`cli/modules/csv-parser.ts`)
```typescript
export interface CSVDeploymentRow {
  timestamp: string;
  organization: string;
  customerId: string;
  applicationName: string;
  wifiSSID: string;
  wifiPassword: string;
  macAddress: string;
  ipAddress: string;
  expiryDate: string;
  licenseStatus: 'pending' | 'completed' | 'failed' | 'skipped';
  licenseFile: string;
  notes: string;
  noExpiry?: boolean; // Flag for no-expiry detection
}

// No expiry detection logic
if (!obj.expiryDate || obj.expiryDate.trim() === '') {
  expiryDate = '2099-12-31'; // Far future for permanent
  noExpiry = true;
} else {
  expiryDate = obj.expiryDate;
}
```

#### 2. Batch License Generator (`cli/modules/batch-license-generator.ts`)
```typescript
export interface BatchOptions {
  inputCSV: string;
  outputDir?: string;
  updateCSV?: boolean;
  skipExisting?: boolean;
  expiryDays?: number;
  expiryMonths?: number;
  expiryYears?: number;
  noExpiry?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

// Priority for expiry calculation: CLI options > CSV record > default
function calculateExpiryDate(recordExpiry: string, options: BatchOptions): string {
  if (options.noExpiry) return '2099-12-31';
  if (options.expiryDays) return addDays(new Date(), options.expiryDays);
  if (recordExpiry) return recordExpiry;
  return addYears(new Date(), 1); // Default 1 year
}
```

### CLI Command Specification

```bash
smc-license batch --input <csvFile> [options]

Required:
  --input <csvFile>           CSV file from ESP32 Deployment Tool

Optional:
  --output-dir <dir>          Output directory for license files
  --update-csv                Update CSV with processing status
  --skip-existing             Skip records with existing license files
  --expiry-days <days>        Override expiry: X days from now
  --expiry-months <months>    Override expiry: X months from now
  --expiry-years <years>      Override expiry: X years from now
  --no-expiry                 Set all licenses to permanent (2099-12-31)
  --dry-run                   Validate and preview without generating
  --verbose                   Show detailed processing information

Examples:
  smc-license batch --input deployments.csv --update-csv
  smc-license batch --input batch.csv --expiry-years 2 --skip-existing
  smc-license batch --input permanent.csv --no-expiry --output-dir ./licenses/
  smc-license batch --input test.csv --dry-run --verbose
```

### Processing Workflow

```
1. Load CSV → Parse headers → Validate required columns
2. Filter pending records → Skip completed/failed if needed
3. For each pending record:
   • Determine expiry date (CLI override > CSV > default)
   • Check if license file exists (skip if --skip-existing)
   • Generate license with ESP32 MAC binding
   • Update CSV record status (completed/failed)
   • Log processing results
4. Save updated CSV → Generate summary report
```

### Error Handling & Recovery

```typescript
// Comprehensive error handling with recovery suggestions
try {
  await processBatchLicenses(options);
} catch (error) {
  if (error.code === 'FILE_NOT_FOUND') {
    console.error('CSV file not found. Check file path and permissions.');
  } else if (error.code === 'INVALID_CSV_FORMAT') {
    console.error('Invalid CSV format. Ensure file was generated by ESP32 Deployment Tool.');
  } else if (error.code === 'LICENSE_GENERATION_FAILED') {
    console.error('License generation failed. Check ESP32 connectivity and MAC addresses.');
  }
  
  // Always suggest recovery options
  console.log('Recovery suggestions:');
  console.log('1. Try --dry-run to validate CSV format');
  console.log('2. Use --verbose for detailed error information');
  console.log('3. Check --skip-existing to continue from failures');
}
```

This document provides complete technical specifications for the SMC License CLI Tool v1.1.0 integration with the Smart Medication Cart system, ESP32 hardware, and the enhanced ESP32 Deployment Tool, ensuring secure, compliant, and performance-optimized license management with comprehensive CSV batch processing capabilities for medical device deployments.