# HARDWARE-MIGRATION.md - CU12 Protocol Implementation

## 🎯 Round 1 Implementation Priorities

### CU12 Protocol Specifications

**Packet Format**: `[STX][ADDR][LOCKNUM][CMD][ASK][DATALEN][ETX][SUM][DATA...]`

- **STX**: Start byte (0x02)
- **ADDR**: CU12 address (0x00-0x0F, 0x10=broadcast)
- **LOCKNUM**: Lock index (0x00-0x0B, 0x0C=all)
- **CMD**: Command byte (0x80-0x8F)
- **ASK**: Usually 0x00 when sending
- **DATALEN**: Length of DATA block
- **ETX**: End byte (0x03)
- **SUM**: Checksum (sum of all bytes including DATA)
- **DATA**: Optional payload

### Command Reference (CU12)

| Name                            | CMD  | DATA Format     | Description                           |
| ------------------------------- | ---- | --------------- | ------------------------------------- |
| Get Lock Status                 | 0x80 | None            | Query current lock state              |
| Unlock Lock                     | 0x81 | None            | Unlock specified or all locks         |
| Query/Set Unlocking Time        | 0x82 | u16 (10ms unit) | Default: 550ms (0x0037)               |
| Query/Set Baud Rate             | 0x83 | u8              | 0:9600, 1:19200, 2:57600, 3:115200    |
| Query/Set Delayed Unlock Time   | 0x84 | u8 seconds      | Delay before unlocking starts         |
| Query/Set Push Door Wait Time   | 0x85 | u8 seconds      | Wait for door push detection          |
| Initialize CU12                 | 0x8E | None            | Reset all settings to factory default |
| Query Software/Hardware Version | 0x8F | None            | Returns [softVersion, hardVersion]    |

### Response ASK Values

| ASK  | Meaning              |
| ---- | -------------------- |
| 0x10 | Success              |
| 0x11 | Failure              |
| 0x12 | Timeout              |
| 0x13 | Unknown command      |
| 0x14 | Checksum error       |
| 0x00 | Default when sending |

## 🔧 Protocol Migration Strategy

### KU16 to CU12 Command Mapping

```typescript
// KU16 Commands (Current)
const ku16Commands = {
  status: [0x02, 0x00, 0x30, 0x03, 0x35],
  unlock: (channel: number) => [0x02, channel, 0x31, 0x03, checksum],
};

// CU12 Commands (Target)
const cu12Commands = {
  getStatus: (addr: number) => buildCommand(addr, 0x0c, 0x80, null),
  unlock: (addr: number, locknum: number) =>
    buildCommand(addr, locknum, 0x81, null),
  setUnlockTime: (addr: number, time: number) =>
    buildCommand(addr, 0x0c, 0x82, time),
  initDevice: (addr: number) => buildCommand(addr, 0x0c, 0x8e, null),
};
```

### Packet Builder Implementation

```typescript
function buildCommand(
  addr: number,
  locknum: number,
  cmd: number,
  data?: Buffer
): Buffer {
  const ask = 0x00;
  const datalen = data ? data.length : 0;
  const etx = 0x03;

  // Build packet without checksum
  const packet = Buffer.alloc(8 + datalen);
  packet[0] = 0x02; // STX
  packet[1] = addr;
  packet[2] = locknum;
  packet[3] = cmd;
  packet[4] = ask;
  packet[5] = datalen;
  packet[6] = etx;

  // Add data if present
  if (data) {
    data.copy(packet, 7);
  }

  // Calculate and add checksum
  const checksum = packet
    .slice(0, 7 + datalen)
    .reduce((sum, byte) => sum + byte, 0);
  packet[7 + datalen] = checksum;

  return packet;
}
```

### Response Parser Implementation

```typescript
function parseResponse(buffer: Buffer): {
  addr: number;
  locknum: number;
  cmd: number;
  ask: number;
  datalen: number;
  data: Buffer;
  valid: boolean;
} {
  if (buffer.length < 8) return { valid: false } as any;

  const stx = buffer[0];
  const addr = buffer[1];
  const locknum = buffer[2];
  const cmd = buffer[3];
  const ask = buffer[4];
  const datalen = buffer[5];
  const etx = buffer[6];
  const checksum = buffer[7 + datalen];

  // Validate packet structure
  if (stx !== 0x02 || etx !== 0x03) return { valid: false } as any;

  // Validate checksum
  const calculatedSum = buffer
    .slice(0, 7 + datalen)
    .reduce((sum, byte) => sum + byte, 0);
  if (calculatedSum !== checksum) return { valid: false } as any;

  const data = datalen > 0 ? buffer.slice(7, 7 + datalen) : Buffer.alloc(0);

  return {
    addr,
    locknum,
    cmd,
    ask,
    datalen,
    data,
    valid: true,
  };
}
```

## 🏗️ CU12 Class Architecture

### Core CU12 Class Structure

```typescript
export class CU12 {
  private serialPort: SerialPort;
  private parser: PacketLengthParser;
  private path: string;
  private baudRate: number;
  private address: number;
  private connected: boolean = false;
  private opening: boolean = false;
  private dispensing: boolean = false;
  private openingSlot: { slotId: number; hn: string; timestamp: number };
  private waitForLockedBack: boolean = false;
  private waitForDispenseLockedBack: boolean = false;

  constructor(
    path: string,
    baudRate: number = 19200,
    address: number = 0x00,
    win: BrowserWindow
  ) {
    this.path = path;
    this.baudRate = baudRate;
    this.address = address;
    this.win = win;

    this.initializeSerialPort();
  }

  private initializeSerialPort(): void {
    this.serialPort = new SerialPort({
      path: this.path,
      baudRate: this.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      autoOpen: false,
    });

    this.parser = this.serialPort.pipe(
      new PacketLengthParser({
        delimiter: 0x02,
        packetOverhead: 8,
      })
    );

    this.setupEventHandlers();
  }
}
```

### Command Methods

```typescript
// Get lock status for all locks
async getStatus(): Promise<boolean> {
  const cmd = buildCommand(this.address, 0x0C, 0x80, null);
  return this.sendCommand(cmd);
}

// Unlock specific lock
async unlock(locknum: number): Promise<boolean> {
  const cmd = buildCommand(this.address, locknum, 0x81, null);
  return this.sendCommand(cmd);
}

// Initialize device
async initialize(): Promise<boolean> {
  const cmd = buildCommand(this.address, 0x0C, 0x8E, null);
  const result = await this.sendCommand(cmd);
  if (result) {
    // Wait >500ms after initialization
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return result;
}

// Set unlock time
async setUnlockTime(time: number): Promise<boolean> {
  const data = Buffer.alloc(2);
  data.writeUInt16BE(time, 0);
  const cmd = buildCommand(this.address, 0x0C, 0x82, data);
  const result = await this.sendCommand(cmd);
  if (result) {
    // Wait >500ms after setting time
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return result;
}
```

## 🔄 Migration Implementation Guide

### Step 1: Create CU12 Directory Structure

```
main/
├── cu12/
│   ├── index.ts              # Main CU12 class
│   ├── utils/
│   │   ├── command-parser.ts # Packet builder/parser
│   │   └── response-handler.ts # Response processing
│   └── ipcMain/              # IPC handlers (Round 2)
└── ku16/                     # Legacy (to be refactored)
```

### Step 2: Implement Core Protocol Layer

1. **Packet Builder**: `buildCommand()` function with proper checksum calculation
2. **Response Parser**: `parseResponse()` function with validation
3. **Command Constants**: All CU12 commands (0x80-0x8F)
4. **Error Handling**: ASK value interpretation and error mapping

### Step 3: Create CU12 Class

1. **Serial Port Setup**: RS485 communication with proper settings
2. **Event Handlers**: Data reception, error handling, connection management
3. **Command Methods**: getStatus(), unlock(), initialize(), setUnlockTime()
4. **State Management**: Opening, dispensing, locked back states

### Step 4: Response Processing

```typescript
private handleResponse(buffer: Buffer): void {
  const response = parseResponse(buffer);
  if (!response.valid) {
    this.emit('error', new Error('Invalid response packet'));
    return;
  }

  // Handle different ASK values
  switch (response.ask) {
    case 0x10: // Success
      this.handleSuccessResponse(response);
      break;
    case 0x11: // Failure
      this.emit('error', new Error('Command failed'));
      break;
    case 0x12: // Timeout
      this.emit('error', new Error('Command timeout'));
      break;
    case 0x13: // Unknown command
      this.emit('error', new Error('Unknown command'));
      break;
    case 0x14: // Checksum error
      this.emit('error', new Error('Checksum error'));
      break;
    default:
      this.emit('error', new Error(`Unknown ASK value: 0x${response.ask.toString(16)}`));
  }
}
```

## ⚠️ Implementation Notes

### Critical Timing Requirements

- **Initialize Command**: Wait >500ms after sending 0x8E
- **Set Unlock Time**: Wait >500ms after sending 0x82
- **Set Delay Time**: Wait >500ms after sending 0x84
- **Set Push Door Time**: Wait >500ms after sending 0x85

### Address Management

- **Single Device**: Use address 0x00
- **Multiple Devices**: Ensure unique addresses (0x00-0x0F)
- **Broadcast**: Use 0x10 carefully (affects all devices)

### Error Handling Strategy

- **ASK Validation**: Always check ASK value in responses
- **Checksum Verification**: Validate packet integrity
- **Timeout Handling**: Implement command timeouts
- **Reconnection**: Auto-reconnect on communication errors

### Testing Protocol

1. **Device Initialization**: Test 0x8E command
2. **Status Query**: Test 0x80 command
3. **Unlock Command**: Test 0x81 command
4. **Configuration**: Test 0x82, 0x83, 0x84, 0x85 commands
5. **Error Scenarios**: Test invalid commands, checksum errors
