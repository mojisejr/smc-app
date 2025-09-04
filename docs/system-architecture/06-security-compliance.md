# Security & Medical Compliance Framework

## Overview

This document details the comprehensive security architecture and medical compliance framework of the Smart Medication Cart system. Understanding these requirements is critical for maintaining medical device standards, audit compliance, and patient safety during system refactoring.

## Medical Device Security Standards

### Healthcare Regulatory Compliance

**Primary Standards Alignment**:
- **Medical Device Regulations**: Designed for healthcare facility compliance
- **Audit Trail Requirements**: Complete operation traceability for regulatory review
- **Patient Safety Standards**: Unauthorized access prevention and medication security
- **Data Integrity**: Tamper-proof logging and state management

**Critical Compliance Features**:
```typescript
// Every operation must be auditable with full context
interface MedicalAuditRecord {
  timestamp: number;        // Precise operation timing
  userId: string;          // User identification  
  patientHN: string;       // Patient identifier
  slotId: number;          // Affected medication slot
  operation: string;       // Specific action performed
  result: 'success' | 'failure'; // Operation outcome
  message: string;         // Human-readable description
  deviceId?: string;       // Hardware device identifier
  sessionId?: string;      // User session tracking
}
```

### Security Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION SECURITY LAYER                  │
│ • User Authentication (per-operation passkey validation)       │
│ • Role-based Access Control (Admin vs Operator)                │
│ • Session Management (admin dashboard authentication)          │
│ • Input Validation (XSS prevention, data sanitization)         │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC SECURITY LAYER               │
│ • Medical Operation Validation (slot state verification)       │
│ • Duplicate Prevention (same patient multiple slots)           │
│ • Hardware Command Validation (checksum verification)          │
│ • Audit Logging (comprehensive operation tracking)             │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                    DATA SECURITY LAYER                         │
│ • Database Integrity (SQLite transaction management)           │
│ • Log Retention Management (automatic cleanup with limits)     │
│ • Backup and Recovery (audit trail preservation)               │
│ • License Validation (hardware-bound activation)               │
└─────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────┐
│                    HARDWARE SECURITY LAYER                     │
│ • Protocol Integrity (binary command validation)               │
│ • Communication Security (RS485 checksum validation)           │
│ • Physical Security (electromagnetic lock mechanisms)          │
│ • Device Authentication (hardware ID verification)             │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication & Authorization Framework

### 1. Per-Operation Authentication Model

**Design Philosophy**: No system-wide login for quick medication access
**Security Model**: Passkey verification per critical operation

```typescript
// Authentication pattern for each medication operation
interface OperationAuthentication {
  operation: 'unlock' | 'dispense' | 'reset' | 'deactivate';
  requiredRole?: 'admin' | 'operator' | 'any';
  passkeyRequired: true;
  auditLevel: 'full' | 'minimal';
}

// Implementation in unlock.ts
export const unlockHandler = async (payload: UnlockRequest) => {
  // 1. User Authentication
  const user = await User.findOne({ where: { passkey: payload.passkey } });
  if (!user) {
    await auditFailedOperation('unlock', 'authentication_failed', payload);
    throw new Error('ไม่พบผู้ใช้งาน');
  }

  // 2. Operation Authorization  
  if (!isAuthorizedForOperation(user.role, 'unlock')) {
    await auditFailedOperation('unlock', 'authorization_failed', payload);
    throw new Error('ไม่มีสิทธิ์ในการปลดล็อค');
  }

  // 3. Business Logic Validation
  await validateSlotOperation(payload.slotId, 'unlock');

  // 4. Execute with full audit trail
  await executeWithAuditTrail('unlock', user, payload, async () => {
    return await ku16.sendUnlock(payload);
  });
};
```

### 2. Admin Dashboard Authentication

**Access Control**: Centralized admin functions behind authentication barrier
**Session Management**: Temporary session for management operations

```typescript
// Authentication class in /main/auth/index.ts
export class Authentication {
  private _currentUser: string | null = null;
  private _role: string | null = null;
  private _sessionExpiry: number | null = null;

  async login(passkey: string): Promise<AuthResponse | null> {
    const user = await User.findOne({ where: { passkey } });
    
    if (!user || !this.isAdminRole(user.role)) {
      await this.auditLoginAttempt(passkey, 'failed');
      return null;
    }

    // Create admin session with expiry
    this._currentUser = user.dataValues.id;
    this._role = user.dataValues.role;
    this._sessionExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes

    await this.auditLoginAttempt(passkey, 'success');
    return {
      id: user.dataValues.id,
      name: user.dataValues.name,
      role: user.dataValues.role
    };
  }

  async isValidSession(): Promise<boolean> {
    if (!this._currentUser || !this._sessionExpiry) {
      return false;
    }
    
    if (Date.now() > this._sessionExpiry) {
      await this.logout();
      return false;
    }
    
    return true;
  }

  async requireAdminAccess(operation: string): Promise<void> {
    if (!await this.isValidSession()) {
      throw new Error('Admin authentication required');
    }
    
    if (!await this.isAdmin()) {
      await this.auditUnauthorizedAccess(operation);
      throw new Error('Admin privileges required');
    }
  }
}
```

### 3. Role-Based Access Control (RBAC)

**Current Roles**:
- **ADMIN**: Full system access including user management, system configuration, emergency controls
- **OPERATOR**: Standard medication operations (unlock, dispense)
- **VIEWER**: Future role for audit log review only

```typescript
// Role-based operation matrix
const OPERATION_PERMISSIONS = {
  'unlock': ['ADMIN', 'OPERATOR'],
  'dispense': ['ADMIN', 'OPERATOR'], 
  'reset-slot': ['ADMIN'],
  'deactivate-slot': ['ADMIN'],
  'reactivate-slot': ['ADMIN'],
  'user-management': ['ADMIN'],
  'system-settings': ['ADMIN'],
  'export-logs': ['ADMIN'],
  'emergency-reset': ['ADMIN']
} as const;

// Authorization validation
export const validateOperationPermission = async (
  userRole: string, 
  operation: keyof typeof OPERATION_PERMISSIONS
): Promise<boolean> => {
  const allowedRoles = OPERATION_PERMISSIONS[operation];
  return allowedRoles.includes(userRole as any);
};
```

## Comprehensive Audit Logging System

### 1. Dual Logging Architecture

**System Design**: Two-table logging for different audit purposes
- **DispensingLog**: Medical operations (unlock, dispense, errors)
- **SystemLog**: System events (connections, settings, user management)

```typescript
// Dispensing operations logging (medical compliance)
interface DispensingLogData {
  id?: number;
  timestamp: number;
  userId: string;           // User who performed operation
  hn: string;              // Patient identifier
  slotId: number;          // Medication slot affected
  process: 'unlock' | 'dispense-continue' | 'dispense-end' | 
           'unlock-error' | 'dispense-error' | 'deactivate' | 
           'deactivate-error' | 'force-reset' | 'force-reset-error';
  message: string;         // Operation description
}

// System operations logging (technical audit)
interface SystemLogData {
  id?: number;
  user: string;            // User or 'system'
  message: string;         // Event description
  timestamp: number;       // Event time
}
```

### 2. Medical Compliance Audit Trail

**Regulatory Requirements**: Every medication-related operation must be traceable
**Retention Policy**: Configurable log retention with automatic cleanup

```typescript
// Comprehensive medical audit logging
export const auditMedicalOperation = async (
  operation: string,
  user: UserData,
  patient: { hn: string },
  slot: { slotId: number },
  result: 'success' | 'failure',
  details?: any
): Promise<void> => {
  // 1. Log to dispensing table (medical compliance)
  await logDispensing({
    userId: user.id,
    hn: patient.hn,
    slotId: slot.slotId,
    process: result === 'success' ? operation : `${operation}-error`,
    message: generateAuditMessage(operation, user, patient, slot, result, details)
  });

  // 2. Log to system table (technical audit)
  await logger({
    user: user.name,
    message: `${operation}: slot #${slot.slotId} for patient ${patient.hn} - ${result}`
  });

  // 3. Real-time audit alert for failures
  if (result === 'failure') {
    await notifyAuditFailure(operation, user, patient, slot, details);
  }
};

// Audit message generation for compliance
const generateAuditMessage = (
  operation: string,
  user: UserData,
  patient: { hn: string },
  slot: { slotId: number },
  result: 'success' | 'failure',
  details?: any
): string => {
  const timestamp = new Date().toLocaleString('th-TH');
  const baseMessage = `${operation} ช่อง ${slot.slotId} ผู้ป่วย ${patient.hn} โดย ${user.name}`;
  
  if (result === 'success') {
    return `${baseMessage} - สำเร็จ เวลา ${timestamp}`;
  } else {
    return `${baseMessage} - ล้มเหลว เวลา ${timestamp} สาเหตุ: ${details?.error || 'ไม่ระบุ'}`;
  }
};
```

### 3. Log Retention & Export System

**Retention Management**: Automatic cleanup based on configurable limits
**Compliance Export**: CSV export for regulatory reporting

```typescript
// Log retention management in /main/logger/index.ts
export const logDispensing = async (data: DispensingLogData) => {
  // Get retention limit from settings
  const setting = await Setting.findOne({ where: { id: 1 } });
  const logLimit = setting.dataValues?.max_log_counts;

  // Count existing logs
  const logCounts = await DispensingLog.count();

  // Cleanup oldest logs if over limit
  if (logCounts >= logLimit) {
    await removeOldestDispensingLogs(logCounts - logLimit + 1);
  }

  // Create new log entry
  await createDispensingLog(data);
};

// Compliance export with Thai language support
export const exportLogs = async (): Promise<ExportResult> => {
  const logs = await getDispensingLogs();
  
  // Format for compliance reporting
  const csvData = logs.map(log => ({
    timestamp: new Date(log.dataValues.timestamp).toLocaleString('th-TH'),
    user: log.dataValues.User?.dataValues.name || 'N/A',
    hn: log.dataValues.hn,
    slotId: log.dataValues.slotId,
    process: log.dataValues.process,
    message: log.dataValues.message
  }));

  // Thai headers for regulatory compliance
  const csvHeaders = [
    'เวลา', 'ผู้ใช้งาน', 'เลข HN', 
    'หมายเลขช่อง', 'กระบวนการ', 'ข้อความ'
  ];

  // UTF-8 BOM for Excel compatibility with Thai characters
  const BOM = '\uFEFF';
  const csvContent = [csvHeaders, ...csvData.map(Object.values)]
    .map(row => row.join(','))
    .join('\n');

  const filename = `smc-log-${new Date().getTime()}.csv`;
  fs.writeFileSync(filename, BOM + csvContent, { encoding: 'utf-8' });

  return { success: true, csvPath: filename };
};
```

## Data Integrity & Security

### 1. Database Security Measures

**Transaction Management**: Atomic operations to prevent data corruption
**Backup Strategy**: Automated backup of critical medical data

```typescript
// Atomic operations for data integrity
export const atomicMedicalOperation = async (
  operation: string,
  userData: any,
  slotData: any,
  hardwareOperation: Function
): Promise<OperationResult> => {
  const transaction = await sequelize.transaction();
  
  try {
    // 1. Pre-operation database state
    const initialState = await captureSlotState(slotData.slotId, transaction);
    
    // 2. Update database within transaction
    await updateSlotState(slotData, transaction);
    await createAuditLog(operation, userData, slotData, transaction);
    
    // 3. Execute hardware operation
    const hardwareResult = await hardwareOperation();
    
    if (!hardwareResult.success) {
      throw new Error(`Hardware operation failed: ${hardwareResult.error}`);
    }
    
    // 4. Commit all changes atomically
    await transaction.commit();
    
    return { success: true, data: hardwareResult };
    
  } catch (error) {
    // 5. Rollback on any failure
    await transaction.rollback();
    
    // 6. Log rollback for audit
    await logOperationRollback(operation, error, initialState);
    
    throw error;
  }
};
```

### 2. Input Validation & Sanitization

**XSS Prevention**: All user input validated and sanitized
**Medical Data Validation**: Patient HN format validation

```typescript
// Comprehensive input validation
export const validateMedicalInput = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // Patient HN validation
  if (data.hn) {
    if (!isValidPatientHN(data.hn)) {
      errors.push('รูปแบบเลขผู้ป่วยไม่ถูกต้อง');
    }
    
    // Sanitize for XSS prevention
    data.hn = sanitizeInput(data.hn);
  }
  
  // Passkey validation
  if (data.passkey) {
    if (data.passkey.length < 4) {
      errors.push('รหัสผู้ใช้ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
    }
    
    // Hash passkey for security
    data.passkey = hashPasskey(data.passkey);
  }
  
  // Slot ID validation
  if (data.slotId) {
    if (data.slotId < 1 || data.slotId > 15) {
      errors.push('หมายเลขช่องไม่ถูกต้อง (1-15)');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedData: data
  };
};

// Medical-specific validation rules
const isValidPatientHN = (hn: string): boolean => {
  // Thailand hospital number format validation
  const hnPattern = /^[A-Z0-9]{6,12}$/;
  return hnPattern.test(hn.toUpperCase());
};

const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '')                                      // Remove javascript:
    .replace(/on\w+\s*=/gi, '')                                       // Remove event handlers
    .trim();
};
```

## License & Hardware Security

### 1. Hardware-Bound License Validation

**Security Model**: License keys tied to specific hardware
**Validation**: Regular license checks with hardware ID verification

```typescript
// Hardware ID generation in /main/license/validator.ts
export function getHardwareId(): string {
  const macAddress = os.networkInterfaces()?.['eth0']?.[0]?.mac || '00:00:00:00:00:00';
  const hostname = os.hostname();
  return createHash('sha256')
    .update(macAddress + hostname)
    .digest('hex');
}

// License validation with medical compliance
export async function validateLicense(): Promise<boolean> {
  const licenseKey = await loadLicense();
  if (!licenseKey) return false;

  const licenseData = decryptLicense(licenseKey);
  if (!licenseData) return false;

  // Hardware ID validation (anti-piracy)
  const currentHWID = getHardwareId();
  if (licenseData.hwid !== currentHWID) {
    await auditSecurityViolation('license_hwid_mismatch', { 
      expected: licenseData.hwid, 
      actual: currentHWID 
    });
    return false;
  }

  // Expiry validation
  if (new Date(licenseData.expiry) < new Date()) {
    await auditSecurityViolation('license_expired', { 
      expiry: licenseData.expiry 
    });
    return false;
  }

  // Organization validation (customer binding)
  const settings = await Setting.findOne({ where: { id: 1 } });
  if (licenseData.customerName !== settings.dataValues.organization ||
      licenseData.organization !== settings.dataValues.customer_name) {
    await auditSecurityViolation('license_organization_mismatch', {
      license: { customer: licenseData.customerName, org: licenseData.organization },
      system: { customer: settings.dataValues.customer_name, org: settings.dataValues.organization }
    });
    return false;
  }

  return true;
}
```

### 2. Protocol Security Measures

**Checksum Validation**: All hardware communication verified
**Command Validation**: Only authorized commands sent to hardware

```typescript
// Protocol security in DS12ProtocolParser.ts
export class DS12ProtocolParser {
  // Validate packet integrity before processing
  validatePacketStructure(packet: number[]): ProtocolResponse<boolean> {
    // Check packet length
    if (packet.length < MIN_PACKET_LENGTH) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_PACKET_LENGTH,
          message: 'Packet too short for DS12 protocol'
        }
      };
    }

    // Validate STX and ETX markers
    if (packet[0] !== STX_MARKER || packet[packet.length - 2] !== ETX_MARKER) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_PACKET_MARKERS,
          message: 'Invalid STX/ETX markers'
        }
      };
    }

    // Verify checksum
    const expectedChecksum = packet[packet.length - 1];
    const calculatedChecksum = calculateChecksum(packet.slice(0, -1));
    
    if (expectedChecksum !== calculatedChecksum) {
      await auditSecurityViolation('checksum_mismatch', {
        expected: expectedChecksum,
        calculated: calculatedChecksum,
        packet: packet
      });
      
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.CHECKSUM_MISMATCH,
          message: 'Packet checksum validation failed'
        }
      };
    }

    return { success: true, data: true };
  }

  // Authorized command validation
  buildUnlockCommand(slotId: number, address: number): ProtocolResponse<number[]> {
    // Validate slot range for DS12
    if (slotId < 1 || slotId > 12) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_SLOT_NUMBER,
          message: `Slot ${slotId} out of range for DS12 device (1-12)`
        }
      };
    }

    // Build secure command with checksum
    const command = [STX_MARKER, address, slotId, CMD_UNLOCK, 0x00, 0x00, ETX_MARKER];
    const checksum = calculateChecksum(command);
    command.push(checksum);

    // Audit command generation
    this.auditCommandGeneration('unlock', slotId, command);

    return { success: true, data: command };
  }
}
```

## Security Risk Assessment for Refactoring

### High-Risk Security Areas

1. **Protocol Parsing**: Binary data manipulation and checksum validation
2. **Authentication Flow**: User validation and session management
3. **Database Operations**: Transaction integrity and audit logging
4. **Hardware Communication**: Command validation and response verification

### Medium-Risk Security Areas

1. **IPC Communication**: Event handling and data validation
2. **UI Input Validation**: Form data sanitization
3. **License Validation**: Hardware binding and expiry checks
4. **Configuration Management**: Settings validation and updates

### Low-Risk Security Areas

1. **UI Styling**: Component presentation and layout
2. **Development Tools**: Build scripts and debugging utilities
3. **Documentation**: System documentation and comments

### Security-Preserving Refactoring Guidelines

**1. Authentication Preservation**:
```typescript
// Maintain exact authentication behavior during migration
const legacyAuth = async (passkey: string) => {
  // Preserve existing authentication logic exactly
  return await User.findOne({ where: { passkey } });
};

// New authentication with backward compatibility
const newAuth = async (passkey: string) => {
  const result = await legacyAuth(passkey);
  // Add enhanced security features only after validation
  return result;
};
```

**2. Audit Trail Continuity**:
```typescript
// Ensure no gaps in audit logging during migration
const migrateWithAuditContinuity = async (operation: Function) => {
  await auditMigrationStart(operation.name);
  
  try {
    const result = await operation();
    await auditMigrationSuccess(operation.name, result);
    return result;
  } catch (error) {
    await auditMigrationFailure(operation.name, error);
    throw error;
  }
};
```

**3. Protocol Security Validation**:
```typescript
// Validate new protocol parsers against existing security standards
export const validateNewProtocolParser = async (parser: any) => {
  // 1. Checksum validation consistency
  await testChecksumValidation(parser);
  
  // 2. Command authorization preservation  
  await testCommandAuthorization(parser);
  
  // 3. Error handling security
  await testSecureErrorHandling(parser);
  
  // 4. Audit logging completeness
  await testAuditLogging(parser);
};
```

## Compliance Checklist for DS12/DS16 Migration

### Pre-Migration Security Validation

- [ ] Document current security architecture completely
- [ ] Identify all authentication touchpoints
- [ ] Map complete audit trail flows
- [ ] Validate license validation mechanisms
- [ ] Test backup and recovery procedures

### During Migration Security Measures

- [ ] Maintain parallel audit logging during transition
- [ ] Preserve all authentication mechanisms
- [ ] Validate protocol security with test vectors  
- [ ] Test emergency access procedures
- [ ] Monitor for security regression

### Post-Migration Security Verification

- [ ] Complete security regression testing
- [ ] Validate audit log continuity
- [ ] Test all authentication scenarios
- [ ] Verify license validation functionality
- [ ] Document security architecture changes

## ESP32 Security & Compliance Integration

### ESP32 Hardware Security Architecture
**Location**: `smc-key-temp/` directory  
**Purpose**: Secure hardware binding and environmental monitoring for medical device compliance

### ESP32 Security Features

#### 1. MAC Address-Based Hardware Binding
**Security Model**: Hardware-unique identifier prevents license transfer
```cpp
// ESP32 MAC address retrieval (immutable hardware ID)
String macAddress = WiFi.macAddress();  // Returns 24:6F:28:A0:12:34 format
JsonDocument doc;
doc["mac_address"] = macAddress;

// Medical compliance: MAC address cannot be spoofed at hardware level
// Provides cryptographically secure device identification
```

**License Binding Security**:
- **Immutable ID**: ESP32 MAC address burned into hardware during manufacturing
- **Hardware Validation**: License CLI verifies MAC address for each activation
- **Transfer Prevention**: License tied to specific hardware prevents unauthorized copying
- **Audit Trail**: All MAC address requests logged for compliance tracking

#### 2. Network Security & Isolation
**WiFi Access Point Security**:
```cpp
// Secure WiFi configuration
const char* ssid = "ESP32_AP";
const char* password = "password123";  // Production: Use strong passwords

// Network isolation - ESP32 creates closed network
WiFi.mode(WIFI_AP);  // Access Point only, no internet access
WiFi.softAPConfig(local_ip, gateway, subnet);
```

**Security Benefits**:
- **Network Isolation**: ESP32 creates isolated network for configuration
- **No Internet Access**: Prevents remote attacks and data exfiltration
- **Limited Attack Surface**: Only HTTP API endpoints exposed
- **Controlled Access**: WiFi password required for device connection

#### 3. API Security & Input Validation
**CORS Security Configuration**:
```cpp
// Cross-Origin Resource Sharing security
DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "*");

// Note: Wildcard CORS acceptable for isolated network with controlled access
```

**JSON Response Security**:
```cpp
// Secure JSON serialization (prevents XSS)
JsonDocument doc;  // ArduinoJson v7 with built-in security
doc["mac_address"] = WiFi.macAddress();  // No user input, hardware-generated
doc["temperature_c"] = temperature;      // Sensor data, validated range
String jsonString;
serializeJson(doc, jsonString);         // Safe serialization
request->send(200, "application/json", jsonString);
```

#### 4. Environmental Data Security & Compliance
**Medical Compliance Data Handling**:
```cpp
// DHT22 sensor data with medical compliance
sensors_event_t event;
dht.temperature().getEvent(&event);

if (!isnan(event.temperature)) {
  // Validate temperature range for medical storage (2-8°C typical)
  if (event.temperature >= -10 && event.temperature <= 50) {
    doc["temperature_c"] = event.temperature;
    doc["status"] = "valid";
    // Log for audit trail: Temperature within acceptable range
  } else {
    doc["status"] = "out_of_range";
    doc["error"] = "Temperature outside medical storage range";
    // Alert system: Environmental compliance violation
  }
}
```

### ESP32 Integration with SMC License CLI Security

#### Secure Communication Workflow
```
1. ESP32 Boot → Secure WiFi AP Creation
2. CLI Connection → Password-protected network access
3. MAC Retrieval → HTTP GET /mac (hardware-based ID)
4. License Generation → AES-256-CBC encryption with MAC binding
5. Validation → ESP32 MAC verification during license activation
```

#### Development vs Production Security Modes
**Development Mode Security** (SMC License CLI):
```typescript
// Development security bypass for testing
if (process.env.NODE_ENV === 'development') {
  console.log('[SECURITY] Development mode: Using mock ESP32 responses');
  return {
    mac_address: "DEV:TEST:MAC:ADDR",
    server: { status: "healthy" },
    security_mode: "development"
  };
}
```

**Production Mode Security**:
```typescript
// Production security validation
try {
  const response = await fetch('http://192.168.4.1/mac', {
    timeout: 5000,  // Prevent hang attacks
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`ESP32 security validation failed: ${response.status}`);
  }
  
  const macData = await response.json();
  
  // Validate MAC address format
  if (!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(macData.mac_address)) {
    throw new Error('Invalid MAC address format from ESP32');
  }
  
  console.log('[SECURITY] Production mode: Hardware MAC verified');
  return macData;
} catch (error) {
  console.error('[SECURITY] ESP32 communication failed:', error);
  throw error;
}
```

### Medical Device Compliance Integration

#### Environmental Monitoring Compliance
**Temperature Monitoring Security**:
- **Data Integrity**: Sensor readings validated against medical ranges
- **Audit Logging**: Environmental data logged for regulatory compliance
- **Alert System**: Threshold violations trigger security alerts
- **Tamper Detection**: Sensor disconnection detected and logged

**Humidity Control Compliance**:
- **Range Validation**: Humidity levels checked against medical standards
- **Data Retention**: Historical environmental data for compliance audits
- **Alert Mechanisms**: Compliance violations logged and reported
- **Calibration Tracking**: Sensor accuracy validation for medical standards

#### Security Audit Trail Integration
**ESP32 Operation Logging**:
```cpp
// Audit logging for all ESP32 operations
void logESP32Operation(String operation, String details) {
  Serial.print("[AUDIT] ESP32 ");
  Serial.print(operation);
  Serial.print(": ");
  Serial.print(details);
  Serial.print(" | Timestamp: ");
  Serial.println(millis());
  
  // Integration point: Forward to SMC audit system
  // JSON format for structured logging
}

// Example usage
server.on("/mac", HTTP_GET, [](AsyncWebServerRequest *request){
  String clientIP = request->client()->remoteIP().toString();
  logESP32Operation("MAC_REQUEST", "Client: " + clientIP);
  
  String macAddress = WiFi.macAddress();
  logESP32Operation("MAC_RESPONSE", macAddress);
  
  // Standard MAC response...
});
```

### ESP32 Security Risk Assessment

#### Low-Risk Security Areas
1. **WiFi Access Point**: Standard ESP32 functionality with proven security
2. **JSON Serialization**: ArduinoJson library with built-in security features
3. **HTTP Server**: ESPAsyncWebServer with established security patterns
4. **Environmental Sensors**: Read-only sensor data with validation

#### Medium-Risk Security Areas
1. **Network Configuration**: WiFi password management and access control
2. **API Endpoints**: HTTP request handling and input validation
3. **Data Validation**: Sensor range checking and data integrity
4. **Error Handling**: Secure error responses without information leakage

#### High-Risk Security Areas
1. **MAC Address Binding**: Critical for license security - must be immutable
2. **License Integration**: ESP32 communication security with SMC License CLI
3. **Medical Compliance**: Environmental data integrity for regulatory requirements
4. **Production Deployment**: Real hardware security vs development bypasses

### ESP32 Security Compliance Checklist

#### Pre-Deployment Security Validation
- [ ] ESP32 firmware security review completed
- [ ] MAC address binding tested with real hardware
- [ ] WiFi security configuration validated
- [ ] API endpoint security tested
- [ ] Environmental monitoring compliance verified

#### Production Security Requirements  
- [ ] Strong WiFi passwords implemented
- [ ] MAC address immutability verified
- [ ] HTTPS considered for sensitive operations
- [ ] Input validation comprehensive
- [ ] Error handling secure (no information leakage)

#### Ongoing Security Monitoring
- [ ] Environmental compliance monitoring active
- [ ] Audit logging for all ESP32 operations
- [ ] Regular security updates for ESP32 firmware
- [ ] Hardware tampering detection
- [ ] License binding validation continuous

This comprehensive security and compliance framework ensures that medical device standards, audit requirements, and patient safety are preserved throughout the system refactoring process while enabling safe evolution to support DS12/DS16 hardware protocols and ESP32-based security enhancements.