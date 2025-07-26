# Hardware CU12 Protocol Implementation

## 🔧 CU12 Protocol Specifications

### Protocol Overview
- **Communication**: RS-485 protocol
- **Baudrate**: 19200 (factory default, configurable: 9600, 19200, 57600, 115200)
- **Data Format**: 8 data bits, no parity, 1 stop bit
- **Max Packet Length**: 48 bytes
- **Min Packet Length**: 8 bytes
- **Endianness**: Big-endian

### Packet Structure
```
Byte Position | Field     | Size    | Description
0            | STX       | 1 byte  | Start code (fixed: 0x02)
1            | ADDR      | 1 byte  | CU12 address (0x00-0x10)
2            | LOCKNUM   | 1 byte  | Lock number (0x00-0x0C, 0x0C = all locks)
3            | CMD       | 1 byte  | Command code
4            | ASK       | 1 byte  | Response value
5            | DATALEN   | 1 byte  | Length of DATA field
6            | ETX       | 1 byte  | End code (fixed: 0x03)
7            | SUM       | 1 byte  | Checksum (low byte of sum)
8+           | DATA      | 0-40    | Command data (if DATALEN > 0)
```

### Command Codes
```typescript
const CU12Commands = {
  GET_STATUS: 0x80,           // Get lock hook status
  UNLOCK: 0x81,               // Unlock specific lock
  QUERY_SET_UNLOCK_TIME: 0x82, // Query/set unlocking time
  QUERY_SET_BAUDRATE: 0x83,   // Query/set communication baudrate
  QUERY_SET_DELAY_TIME: 0x84, // Query/set delayed unlocking time
  QUERY_SET_PUSH_WAIT: 0x85,  // Query/set push door wait time
  INITIALIZATION: 0x8E,       // Initialize CU12 parameters
  QUERY_VERSION: 0x8F         // Query version information
};
```

### Response Codes
```typescript
const CU12ResponseCodes = {
  SUCCESS: 0x10,              // Correct operation
  FAILED: 0x11,               // Failed operation
  TIMEOUT: 0x12,              // Wait timeout
  UNKNOWN_COMMAND: 0x13,      // Unknown command
  DATA_VERIFICATION_FAIL: 0x14, // Data verification failure
  DEFAULT_ASK: 0x00           // Default ASK value when sending
};
```

## 🔄 Protocol Implementation Strategy

### 1. Protocol Layer Architecture
```typescript
// New CU12 Protocol Handler
interface CU12Protocol {
  // Packet construction
  buildPacket(addr: number, lockNum: number, cmd: number, data?: Buffer): Buffer;
  
  // Packet validation  
  validatePacket(packet: Buffer): boolean;
  calculateChecksum(data: Buffer): number;
  
  // Command methods
  getStatus(addr: number): Promise<Buffer>;
  unlock(addr: number, lockNum: number): Promise<Buffer>;
  queryUnlockTime(addr: number): Promise<number>;
  setUnlockTime(addr: number, timeMs: number): Promise<boolean>;
  initialize(addr: number): Promise<boolean>;
  queryVersion(addr: number): Promise<{soft: number, hard: number}>;
}
```

### 2. Key Implementation Commands

#### Get Status Command (0x80)
```typescript
// Example: Get status of CU12 with ADDR 0x00
// Command: 02 00 00 80 00 00 03 85
// Response: 02 00 00 80 10 02 03 99 02 00
//
// Response interpretation:
// - Hook status data: 02 00 (2 bytes)
// - Lock #2 is locked, others unlocked
const getStatus = async (addr: number = 0x00): Promise<SlotStatus[]> => {
  const packet = buildPacket(addr, 0x00, CU12Commands.GET_STATUS);
  const response = await sendCommand(packet);
  return parseHookStatus(response);
};
```

#### Unlock Command (0x81)
```typescript
// Example: Unlock lock #3 on CU12 ADDR 0x00
// Command: 02 00 02 81 00 00 03 88
// Response: 02 00 02 81 10 00 03 98
//
// LOCKNUM values:
// 0x00-0x0B: Individual locks (1-12)
// 0x0C: All locks
const unlock = async (addr: number, lockNum: number): Promise<boolean> => {
  const packet = buildPacket(addr, lockNum, CU12Commands.UNLOCK);
  const response = await sendCommand(packet);
  return response[4] === CU12ResponseCodes.SUCCESS;
};
```

### 3. Checksum Calculation
```typescript
const calculateChecksum = (data: Buffer): number => {
  // Sum all bytes except the checksum byte itself
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  return sum & 0xFF; // Return low byte
};

const validateChecksum = (packet: Buffer): boolean => {
  const dataLen = packet[5];
  const checksumOffset = 7;
  const expectedChecksum = packet[checksumOffset];
  
  // Calculate checksum for: STX to ETX (7 bytes) + DATA portion
  const checksumData = Buffer.concat([
    packet.subarray(0, checksumOffset),     // STX to ETX (7 bytes)
    packet.subarray(8, 8 + dataLen)        // DATA portion if present
  ]);
  
  const calculatedChecksum = calculateChecksum(checksumData);
  return calculatedChecksum === expectedChecksum;
};
```

## 🔧 Hardware Communication Layer

### 1. Serial Port Configuration
```typescript
interface CU12SerialConfig {
  port: string;           // e.g., "/dev/ttyUSB0", "COM3"
  baudRate: 19200;        // Default CU12 baudrate
  dataBits: 8;
  parity: 'none';
  stopBits: 1;
  autoOpen: false;
  timeout: 3000;          // 3 second timeout
}
```

### 2. Device Communication Manager
```typescript
class CU12DeviceManager {
  private protocol: CU12Protocol;
  private serialPort: SerialPort;
  
  async initialize(config: CU12SerialConfig): Promise<boolean> {
    // 1. Open serial connection
    // 2. Test communication with ping command
    // 3. Initialize device if needed
    // 4. Set up event handlers
  }
  
  async sendCommand(packet: Buffer): Promise<Buffer> {
    // 1. Send packet via serial
    // 2. Wait for response with timeout
    // 3. Validate response packet
    // 4. Return response data
  }
  
  async autoDetectDevice(): Promise<string | null> {
    // 1. Scan available serial ports
    // 2. Test CU12 communication on each port
    // 3. Return first working port
  }
}
```

## 🔄 Migration from KU16 to CU12

### 1. File Structure Changes
```
main/
├── hardware/
│   ├── cu12/              # New CU12 implementation
│   │   ├── protocol.ts    # CU12 protocol handler
│   │   ├── device.ts      # Device communication manager
│   │   ├── commands.ts    # Command implementations
│   │   └── types.ts       # CU12 type definitions
│   └── ku16/              # Legacy KU16 (to be removed)
│       └── ...
├── interfaces/
│   └── hardware.ts        # Shared hardware interfaces
└── background.ts          # Updated to use CU12
```

### 2. Interface Abstraction
```typescript
// Shared interface for both KU16 and CU12
interface HardwareDevice {
  initialize(config: any): Promise<boolean>;
  getSlotStatus(): Promise<SlotStatus[]>;
  unlockSlot(slotId: number): Promise<boolean>;
  unlockAllSlots(): Promise<boolean>;
  testCommunication(): Promise<boolean>;
  disconnect(): Promise<void>;
}

// CU12 Implementation
class CU12Device implements HardwareDevice {
  // Implement all interface methods using CU12 protocol
}
```

### 3. Configuration Migration
```typescript
// Settings table updates
const migrateToCU12Settings = async () => {
  const currentSettings = await getSetting();
  
  // Remove KU16 settings
  await updateSetting({
    ku_port: null,
    ku_baudrate: null,
    
    // Add CU12 settings
    cu_port: currentSettings.ku_port || "/dev/ttyUSB0",
    cu_baudrate: 19200,
    available_slots: 12  // Reduced from 15
  });
};
```

## 🧪 Testing Strategy

### 1. Protocol Layer Tests
```typescript
describe('CU12 Protocol', () => {
  test('should build valid GET_STATUS packet', () => {
    const packet = buildPacket(0x00, 0x00, 0x80);
    expect(packet).toEqual(Buffer.from([0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x85]));
  });
  
  test('should validate checksum correctly', () => {
    const validPacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00]);
    expect(validateChecksum(validPacket)).toBe(true);
  });
});
```

### 2. Hardware Integration Tests
```typescript
describe('CU12 Hardware Integration', () => {
  test('should detect CU12 device on serial port', async () => {
    const port = await device.autoDetectDevice();
    expect(port).toBeTruthy();
  });
  
  test('should unlock specific slot', async () => {
    const result = await device.unlockSlot(3);
    expect(result).toBe(true);
  });
});
```

## 📋 Round 1 Implementation Priorities

### Task A: Core Protocol Implementation
1. **Protocol Handler**: Implement packet building and validation
2. **Command Methods**: GET_STATUS and UNLOCK commands
3. **Checksum Logic**: Accurate checksum calculation and validation
4. **Basic Types**: CU12-specific type definitions

### Task B: Device Communication
1. **Serial Manager**: Basic serial port communication
2. **Device Detection**: Auto-detect CU12 on available ports
3. **Error Handling**: Timeout and communication error handling
4. **Integration Layer**: Connect protocol to main application

### Success Criteria for Round 1
- [ ] CU12 protocol packet construction working
- [ ] Checksum validation passes all test cases
- [ ] Basic device communication established
- [ ] GET_STATUS and UNLOCK commands functional
- [ ] Unit tests covering protocol layer
- [ ] No breaking changes to existing KU16 code (parallel implementation)