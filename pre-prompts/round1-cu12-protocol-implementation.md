# Round 1: CU12 Protocol Implementation

**CONTEXT**: Read `CLAUDE.md` (master) + `HARDWARE-MIGRATION.md` (round-specific)  
**TOKEN BUDGET**: ~9,000 tokens (validated)

## 🎯 ROUND OBJECTIVE

Implement CU12 protocol layer and migrate core communication from KU16 to CU12, establishing the foundation for the hardware migration.

## 🛠 PAIRED TASKS (Context-Scoped)

### Task A: Create CU12 Protocol Layer

**Files**:

- `main/cu12/utils/command-parser.ts`
- `main/cu12/utils/response-handler.ts`

**Context Focus**:

- CU12 packet format implementation
- Command builder with checksum calculation
- Response parser with ASK validation
- All CU12 commands (0x80-0x8F) support

**Implementation Requirements**:

1. **Packet Builder**: Implement `buildCommand()` function with proper checksum calculation
2. **Response Parser**: Implement `parseResponse()` function with packet validation
3. **Command Constants**: Define all CU12 commands (0x80-0x8F)
4. **Error Mapping**: Map ASK values to meaningful error messages
5. **Type Safety**: Full TypeScript implementation with proper interfaces

### Task B: Migrate Core Communication

**Files**:

- `main/cu12/index.ts` (CU12 class implementation)
- `main/ku16/index.ts` (refactor for compatibility)

**Context Focus**:

- CU12 class architecture and serial communication
- Event handling and state management
- Error handling with ASK codes
- Basic unlock/status functionality

**Implementation Requirements**:

1. **CU12 Class**: Create main CU12 class with serial port setup
2. **Serial Communication**: RS485 communication with proper settings (19200 baud, 8N1)
3. **Event Handlers**: Data reception, error handling, connection management
4. **Command Methods**: getStatus(), unlock(), initialize(), setUnlockTime()
5. **State Management**: Opening, dispensing, locked back states
6. **Timing Management**: Proper delays for initialization and configuration commands

## ✅ SUCCESS CRITERIA (From Context)

- [ ] CU12 packet format implemented correctly with checksum validation
- [ ] All CU12 commands (0x80-0x8F) supported and tested
- [ ] Response parsing with ASK validation working (0x10-0x14)
- [ ] Basic unlock/status functionality operational
- [ ] Serial port communication established with proper error handling
- [ ] Device initialization and configuration commands working
- [ ] Timing requirements met (>500ms delays for config commands)

## 📋 CONTEXT-SPECIFIC IMPLEMENTATION

### Critical Protocol Requirements

- **Packet Format**: `[STX][ADDR][LOCKNUM][CMD][ASK][DATALEN][ETX][SUM][DATA...]`
- **Addressing**: Device address (0x00-0x0F) + Lock index (0x00-0x0B, 0x0C=all)
- **Commands**: 0x80=Status, 0x81=Unlock, 0x82=SetTime, 0x8E=Init, etc.
- **ASK Values**: 0x10=Success, 0x11=Failure, 0x12=Timeout, 0x13=Unknown, 0x14=Checksum

### Timing Requirements

- **Initialize Command (0x8E)**: Wait >500ms after sending
- **Set Unlock Time (0x82)**: Wait >500ms after sending
- **Set Delay Time (0x84)**: Wait >500ms after sending
- **Set Push Door Time (0x85)**: Wait >500ms after sending

### Error Handling Strategy

- **ASK Validation**: Always check ASK value in responses
- **Checksum Verification**: Validate packet integrity
- **Timeout Handling**: Implement command timeouts
- **Reconnection**: Auto-reconnect on communication errors

### Directory Structure

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

## 🔧 Implementation Guidelines

### Task A Priority Order

1. **Command Parser**: Start with `buildCommand()` and `parseResponse()` functions
2. **Command Constants**: Define all CU12 command constants
3. **Error Mapping**: Implement ASK value to error message mapping
4. **Testing**: Create basic tests for packet building and parsing

### Task B Priority Order

1. **CU12 Class**: Create basic class structure with constructor
2. **Serial Port Setup**: Initialize RS485 communication
3. **Event Handlers**: Set up data reception and error handling
4. **Command Methods**: Implement core methods (getStatus, unlock, initialize)
5. **State Management**: Add opening, dispensing, locked back states
6. **Integration**: Test with actual hardware or simulation

### Code Quality Requirements

- **Error Handling**: Comprehensive try-catch and error logging
- **Type Safety**: Full TypeScript implementation with proper interfaces
- **Documentation**: Detailed inline comments explaining protocol details
- **Testing**: Manual testing protocols for each command

## 🚨 Critical Considerations

### Protocol Differences from KU16

- **KU16**: 5-byte packets, channel-based addressing, simple commands
- **CU12**: 8+ byte packets, device+lock addressing, rich command set
- **Migration**: Maintain API compatibility where possible

### Hardware Compatibility

- **RS485 Settings**: 19200 baud, 8 data bits, 1 stop bit, no parity
- **Address Management**: Single device (0x00) or multiple devices (0x00-0x0F)
- **Broadcast**: Use 0x10 carefully (affects all devices)

### Testing Protocol

1. **Device Initialization**: Test 0x8E command
2. **Status Query**: Test 0x80 command
3. **Unlock Command**: Test 0x81 command
4. **Configuration**: Test 0x82, 0x83, 0x84, 0x85 commands
5. **Error Scenarios**: Test invalid commands, checksum errors

---

**Execute**: Paired Sub-Agent Pattern  
**Validate**: Manual testing against criteria  
**Commit**: Include context metadata
