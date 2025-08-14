# Protocol Specifications: DS12 & DS16 Hardware Communication

## Overview

This document provides comprehensive technical specifications for DS12 and DS16 medication cabinet protocols. This documentation is essential for implementing safe, reliable hardware communication during the system migration from legacy KU16 to modern protocol architecture.

## Protocol Evolution & Hardware Mapping

### Device Evolution Timeline
```
Original Hardware → Manufacturer Rebrand → Anti-Piracy Protection
KU16 (16-slot)   →  CU16             →  DS16
KU12 (12-slot)   →  CU12             →  DS12
```

### Protocol Compatibility Matrix
| Device | Protocol Base | Slot Count | Command Range | Baud Rate | Status |
|--------|---------------|------------|---------------|-----------|---------|
| DS16   | CU16/KU16     | 16         | 0x30-0x39     | 115200    | Legacy Active |
| DS12   | CU12          | 12         | 0x80-0x8F     | 19200     | New Implementation |

## DS12 Protocol Specification (12-Slot Device)

### Communication Parameters
```typescript
interface DS12Parameters {
  baudRate: 19200;        // Factory default (configurable)
  dataBits: 8;           // 8-bit data transmission
  stopBits: 1;           // Single stop bit
  parity: "none";        // No parity checking
  protocol: "RS485";     // Physical layer
  encoding: "binary";    // Binary data format
}
```

### DS12 Packet Structure
```
STX(1) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(1) + SUM(1) + DATA(DATALEN)
```

**Field Specifications**:
- **STX**: Start of transmission (0x02)
- **ADDR**: Device address (0x00-0x10)
- **LOCKNUM**: Target slot number (1-12)
- **CMD**: Command type (0x80-0x8F)
- **ASK**: Request/Response indicator (0x00=Request, 0x01=Response)
- **DATALEN**: Data payload length (0x00-0xFF)
- **ETX**: End of transmission (0x03)
- **SUM**: Checksum validation byte
- **DATA**: Variable length payload

### DS12 Command Set

#### 1. Status Request (0x80)
**Purpose**: Get current state of all 12 slots
**Request Format**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM
02   00    00       80    00   00       03   SUM
```
**Response Format**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM  DATA1  DATA2
02   00    00       80    01   02       03   SUM  XX     XX
```
**Data Interpretation**:
- **DATA1**: Slots 1-8 lock states (bit 0=slot 1, bit 7=slot 8)
- **DATA2**: Slots 9-12 lock states (bit 0=slot 9, bit 3=slot 12, bits 4-7=unused)
- **Bit Value**: 0=Locked, 1=Unlocked

#### 2. Unlock Slot (0x81)
**Purpose**: Unlock specific medication slot
**Request Format**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM
02   00    [SLOT]   81    00   00       03   SUM
```
**Response Format**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM
02   00    [SLOT]   81    01   00       03   SUM
```
**Slot Range**: 1-12 (decimal)

#### 3. Query/Set Unlock Time (0x82)
**Purpose**: Configure slot unlock duration
**Query Request**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM
02   00    00       82    00   00       03   SUM
```
**Set Request**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM  TIME
02   00    00       82    00   01       03   SUM  XX
```
**Time Unit**: TIME × 10ms (e.g., 0x37 = 55 × 10ms = 550ms)

#### 4. Query/Set Baud Rate (0x83)
**Purpose**: Modify communication speed
**Supported Rates**: 9600, 19200, 38400, 57600, 115200
**Set Request**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM  RATE
02   00    00       83    00   01       03   SUM  XX
```
**Rate Encoding**:
- 0x01 = 9600 bps
- 0x02 = 19200 bps (default)
- 0x03 = 38400 bps
- 0x04 = 57600 bps
- 0x05 = 115200 bps

#### 5. Query/Set Delayed Unlock Time (0x84)
**Purpose**: Configure delayed unlock mechanism
**Implementation**: Similar to 0x82 with delay parameter

#### 6. Push Door Unlock Waiting Time (0x85)
**Purpose**: Configure door sensor timeout
**Implementation**: Hardware-specific timing configuration

#### 7. System Initialize (0x8E)
**Purpose**: Reset device to factory defaults
**Request Format**:
```
STX  ADDR  LOCKNUM  CMD   ASK  DATALEN  ETX  SUM
02   00    00       8E    00   00       03   SUM
```
**Critical**: Resets all configurations, use with caution

#### 8. Query Version Information (0x8F)
**Purpose**: Get firmware version and device info
**Response**: Device-specific version string

### DS12 Implementation Example

```typescript
// DS12 Protocol Parser Implementation
export class DS12ProtocolParser {
  private readonly STX_MARKER = 0x02;
  private readonly ETX_MARKER = 0x03;
  
  // Build status request command
  buildStatusRequest(address: number): ProtocolResponse<number[]> {
    const command = [
      this.STX_MARKER,  // STX
      address,          // ADDR
      0x00,            // LOCKNUM (0 for all slots)
      0x80,            // CMD (status request)
      0x00,            // ASK (request)
      0x00,            // DATALEN (no data)
      this.ETX_MARKER  // ETX
    ];
    
    const checksum = this.calculateChecksum(command);
    command.push(checksum);
    
    return { 
      success: true, 
      data: command,
      deviceType: DeviceType.DS12,
      timestamp: Date.now()
    };
  }
  
  // Parse slot states from response
  parseSlotStates(response: number[]): ProtocolResponse<SlotState[]> {
    if (!this.validatePacketStructure(response).success) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: "Invalid packet structure"
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now()
      };
    }
    
    const data1 = response[8]; // Slots 1-8
    const data2 = response[9]; // Slots 9-12
    const slots: SlotState[] = [];
    
    // Parse slots 1-8 from DATA1
    for (let i = 0; i < 8; i++) {
      slots.push({
        slotId: i + 1,
        locked: (data1 & (1 << i)) === 0, // 0=locked, 1=unlocked
        occupied: false, // Set by database state
        timestamp: Date.now()
      });
    }
    
    // Parse slots 9-12 from DATA2
    for (let i = 0; i < 4; i++) {
      slots.push({
        slotId: i + 9,
        locked: (data2 & (1 << i)) === 0,
        occupied: false,
        timestamp: Date.now()
      });
    }
    
    return {
      success: true,
      data: slots,
      deviceType: DeviceType.DS12,
      timestamp: Date.now()
    };
  }
  
  // Checksum calculation for DS12 protocol
  private calculateChecksum(data: number[]): number {
    const sum = data.reduce((acc, byte) => acc + byte, 0);
    return sum & 0xFF; // Keep only lowest 8 bits
  }
}
```

## DS16 Protocol Specification (16-Slot Device)

### Communication Parameters
```typescript
interface DS16Parameters {
  baudRate: 115200;      // Higher speed than DS12
  dataBits: 8;
  stopBits: 1;
  parity: "none";
  protocol: "RS485";
  encoding: "binary";
}
```

### DS16 Packet Structure
```
STX(1) + ADDR(1) + CMD(1) + [DATA(2-5)] + ETX(1) + SUM(1)
```

**Simplified Structure**: Fewer fields than DS12
- **STX**: Start marker (0x02)
- **ADDR**: Device address (0x00-0x10)
- **CMD**: Command type (0x30-0x39)
- **DATA**: Variable 2-5 byte payload (command-specific)
- **ETX**: End marker (0x03)
- **SUM**: Checksum byte

### DS16 Command Set

#### 1. Get Status (0x30)
**Purpose**: Query single slot state
**Request Format**:
```
STX  ADDR  CMD  ETX  SUM
02   00    30   03   SUM
```
**Response Format** (7 bytes total):
```
STX  ADDR  CMD  DATA1  DATA2  DATA3  DATA4  ETX  SUM
02   00    30   XX     XX     XX     XX     03   SUM
```
**Data Interpretation**:
- **DATA1**: Slots 1-8 lock states (bit-packed)
- **DATA2**: Slots 9-16 lock states (bit-packed)
- **DATA3**: Slots 1-8 infrared detection (bit-packed)
- **DATA4**: Slots 9-16 infrared detection (bit-packed)

#### 2. Unlock Slot (0x31)
**Purpose**: Unlock specific slot
**Request Format**:
```
STX  ADDR  CMD  SLOT  ETX  SUM
02   00    31   XX    03   SUM
```
**Slot Range**: 1-16 (decimal)

#### 3. Get All Slots Status (0x32)
**Purpose**: Query all slot states on bus
**Response**: Same format as 0x30 but for all devices

#### 4. Unlock All Slots (0x33)
**Purpose**: Emergency unlock all slots
**Critical Command**: Use only for emergency situations

#### 5. Query/Set Unlocking Time (0x37)
**Purpose**: Configure unlock duration
**Similar**: To DS12 0x82 command but with DS16 packet format

#### 6. Query/Set Delayed Unlock Time (0x39)
**Purpose**: Configure delayed unlock mechanism
**Implementation**: Hardware-specific timing configuration

#### 7. Set Baud Rate (0x40)
**Purpose**: Change communication speed
**Supported Rates**: Same as DS12 but with different encoding

### DS16 Implementation Example

```typescript
// DS16 Protocol Parser Implementation (Planned)
export class DS16ProtocolParser {
  private readonly STX_MARKER = 0x02;
  private readonly ETX_MARKER = 0x03;
  
  // Build status request for all slots
  buildStatusRequest(address: number): ProtocolResponse<number[]> {
    const command = [
      this.STX_MARKER,  // STX
      address,          // ADDR
      0x30,            // CMD (get status)
      this.ETX_MARKER  // ETX
    ];
    
    const checksum = this.calculateChecksum(command);
    command.push(checksum);
    
    return {
      success: true,
      data: command,
      deviceType: DeviceType.DS16,
      timestamp: Date.now()
    };
  }
  
  // Parse 16 slot states from 4-byte response
  parseSlotStates(response: number[]): ProtocolResponse<SlotState[]> {
    // Validate 7-byte response format
    if (response.length !== 7) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `Invalid DS16 response length: ${response.length}, expected 7`
        },
        deviceType: DeviceType.DS16,
        timestamp: Date.now()
      };
    }
    
    const data1 = response[3]; // Slots 1-8 lock states
    const data2 = response[4]; // Slots 9-16 lock states
    const data3 = response[5]; // Slots 1-8 infrared detection
    const data4 = response[6]; // Slots 9-16 infrared detection
    const slots: SlotState[] = [];
    
    // Parse slots 1-8
    for (let i = 0; i < 8; i++) {
      slots.push({
        slotId: i + 1,
        locked: (data1 & (1 << i)) === 0,        // Lock state
        infrared: (data3 & (1 << i)) !== 0,      // Item detection
        occupied: false, // Set by database
        timestamp: Date.now()
      });
    }
    
    // Parse slots 9-16
    for (let i = 0; i < 8; i++) {
      slots.push({
        slotId: i + 9,
        locked: (data2 & (1 << i)) === 0,        // Lock state
        infrared: (data4 & (1 << i)) !== 0,      // Item detection
        occupied: false,
        timestamp: Date.now()
      });
    }
    
    return {
      success: true,
      data: slots,
      deviceType: DeviceType.DS16,
      timestamp: Date.now()
    };
  }
}
```

## Binary Data Processing & Bit Manipulation

### Checksum Calculation
Both protocols use simple additive checksum:
```typescript
function calculateChecksum(data: number[]): number {
  const sum = data.reduce((acc, byte) => acc + byte, 0);
  return sum & 0xFF; // Keep only lowest 8 bits
}

function validateChecksum(packet: number[]): boolean {
  const receivedChecksum = packet[packet.length - 1];
  const calculatedChecksum = calculateChecksum(packet.slice(0, -1));
  return receivedChecksum === calculatedChecksum;
}
```

### Bit-Level Slot State Extraction
```typescript
// Extract individual slot states from packed byte
function extractSlotStates(data: number, startSlot: number): SlotState[] {
  const states: SlotState[] = [];
  
  for (let bit = 0; bit < 8; bit++) {
    const slotId = startSlot + bit;
    const locked = (data & (1 << bit)) === 0; // 0=locked, 1=unlocked
    
    states.push({
      slotId,
      locked,
      occupied: false, // Determined by database state
      timestamp: Date.now()
    });
  }
  
  return states;
}

// Example: DS12 with DATA1=0x0F (00001111 binary)
// Slots 1-4: unlocked (bits 0-3 = 1)
// Slots 5-8: locked (bits 4-7 = 0)
```

### Hardware State Synchronization Pattern
```typescript
// Unified slot state management across protocols
interface SlotState {
  slotId: number;           // 1-12 for DS12, 1-16 for DS16
  locked: boolean;          // Hardware lock state
  infrared?: boolean;       // Item detection (DS16 only)
  occupied: boolean;        // Database medication assignment
  opening: boolean;         // UI operation state
  isActive: boolean;        // Admin management state
  timestamp: number;        // Last update time
}

// Protocol-agnostic state parser interface
interface ProtocolParser {
  parseSlotStates(response: number[]): ProtocolResponse<SlotState[]>;
  buildStatusRequest(address: number): ProtocolResponse<number[]>;
  buildUnlockCommand(slotId: number, address: number): ProtocolResponse<number[]>;
  validatePacketStructure(packet: number[]): ProtocolResponse<boolean>;
}
```

## Error Handling & Validation

### Protocol-Specific Error Codes
```typescript
enum ProtocolErrorCode {
  // Communication Errors
  CONNECTION_FAILED = "CONNECTION_FAILED",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  
  // Protocol Errors
  UNSUPPORTED_COMMAND = "UNSUPPORTED_COMMAND",
  INVALID_SLOT_NUMBER = "INVALID_SLOT_NUMBER",
  DEVICE_BUSY = "DEVICE_BUSY",
  
  // Data Integrity Errors
  CHECKSUM_MISMATCH = "CHECKSUM_MISMATCH",
  INVALID_PACKET_LENGTH = "INVALID_PACKET_LENGTH",
  INVALID_PACKET_MARKERS = "INVALID_PACKET_MARKERS",
  
  // Hardware Errors
  SLOT_MALFUNCTION = "SLOT_MALFUNCTION",
  SENSOR_ERROR = "SENSOR_ERROR",
  POWER_FAILURE = "POWER_FAILURE"
}
```

### Robust Validation Pipeline
```typescript
// Comprehensive packet validation
export const validateProtocolPacket = (
  packet: number[],
  deviceType: DeviceType
): ProtocolResponse<boolean> => {
  // 1. Basic structure validation
  if (!packet || packet.length === 0) {
    return createErrorResponse(ProtocolErrorCode.INVALID_RESPONSE, 
                              "Empty packet received");
  }
  
  // 2. STX/ETX marker validation
  if (packet[0] !== 0x02) {
    return createErrorResponse(ProtocolErrorCode.INVALID_PACKET_MARKERS,
                              "Missing STX marker");
  }
  
  const etxIndex = deviceType === DeviceType.DS12 ? 
                   packet.length - 2 : packet.length - 2;
  if (packet[etxIndex] !== 0x03) {
    return createErrorResponse(ProtocolErrorCode.INVALID_PACKET_MARKERS,
                              "Missing ETX marker");
  }
  
  // 3. Checksum validation
  if (!validateChecksum(packet)) {
    return createErrorResponse(ProtocolErrorCode.CHECKSUM_MISMATCH,
                              "Packet checksum validation failed");
  }
  
  // 4. Device-specific validation
  const deviceValidation = deviceType === DeviceType.DS12 ?
                          validateDS12Packet(packet) :
                          validateDS16Packet(packet);
  
  if (!deviceValidation.success) {
    return deviceValidation;
  }
  
  return { success: true, data: true, deviceType, timestamp: Date.now() };
};
```

## Integration with Legacy System

### Migration Strategy for Protocol Support
```typescript
// Factory pattern for protocol parser selection
export class ProtocolParserFactory {
  static createParser(deviceType: DeviceType): ProtocolParser {
    switch (deviceType) {
      case DeviceType.DS12:
        return new DS12ProtocolParser();
      case DeviceType.DS16:
        return new DS16ProtocolParser();
      default:
        throw new Error(`Unsupported device type: ${deviceType}`);
    }
  }
}

// Backward compatibility wrapper
export class LegacyCompatibilityWrapper {
  private parser: ProtocolParser;
  
  constructor(deviceType: DeviceType) {
    this.parser = ProtocolParserFactory.createParser(deviceType);
  }
  
  // Maintain existing KU16 method signatures
  sendCheckState(): void {
    const command = this.parser.buildStatusRequest(0x00);
    if (command.success) {
      // Send via serial port
      this.sendToHardware(command.data!);
    }
  }
  
  receivedCheckState(data: number[]): void {
    const states = this.parser.parseSlotStates(data);
    if (states.success) {
      // Update UI with parsed states
      this.updateSlotStates(states.data!);
    }
  }
}
```

### Configuration-Driven Device Selection
```typescript
// Runtime device configuration
interface DeviceConfiguration {
  type: DeviceType;
  port: string;
  baudRate: number;
  address: number;
  enableLogging: boolean;
}

// Configuration loader with validation
export const loadDeviceConfiguration = async (): Promise<DeviceConfiguration> => {
  const settings = await getSetting();
  
  // Detect device type from settings or auto-detect
  const deviceType = await detectDeviceType(settings.ku_port);
  
  return {
    type: deviceType,
    port: settings.ku_port,
    baudRate: deviceType === DeviceType.DS12 ? 19200 : 115200,
    address: 0x00,
    enableLogging: true
  };
};
```

## Testing & Validation Strategy

### Protocol Test Vectors
```typescript
// DS12 Test Cases
export const DS12_TEST_VECTORS = {
  STATUS_REQUEST: {
    input: [0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x85],
    expectedResponse: [0x02, 0x00, 0x00, 0x80, 0x01, 0x02, 0x03, 0x88, 0xFF, 0x0F],
    description: "All slots 1-8 locked, slots 9-12 unlocked"
  },
  UNLOCK_SLOT_5: {
    input: [0x02, 0x00, 0x05, 0x81, 0x00, 0x00, 0x03, 0x8B],
    expectedResponse: [0x02, 0x00, 0x05, 0x81, 0x01, 0x00, 0x03, 0x8C],
    description: "Unlock slot 5 successfully"
  }
};

// DS16 Test Cases
export const DS16_TEST_VECTORS = {
  STATUS_REQUEST: {
    input: [0x02, 0x00, 0x30, 0x03, 0x35],
    expectedResponse: [0x02, 0x00, 0x30, 0xFF, 0xFF, 0x00, 0x00, 0x03, 0x67],
    description: "All 16 slots unlocked, no items detected"
  },
  UNLOCK_SLOT_10: {
    input: [0x02, 0x00, 0x31, 0x0A, 0x03, 0x40],
    expectedResponse: [0x02, 0x00, 0x31, 0x0A, 0x03, 0x40],
    description: "Unlock slot 10 successfully"
  }
};
```

This comprehensive protocol specification provides the foundation for implementing safe, reliable DS12 and DS16 hardware communication while maintaining medical device compliance and audit requirements throughout the system migration process.