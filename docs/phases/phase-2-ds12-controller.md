# Phase 2: DS12Controller Implementation

**Status**: 🔄 **ACTIVE - NEXT PHASE**  
**Duration**: 3-4 days  
**Priority**: Critical

## Objective

Implement DS12Controller class that extends KuControllerBase, integrating DS12ProtocolParser with serial communication, state management, and hardware control flow according to medical device standards.

## Prerequisites

- ✅ **Phase 1 Complete**: DS12ProtocolParser, BinaryUtils, ProtocolTypes
- ✅ **Existing Architecture**: KuControllerBase abstract class available
- ✅ **Hardware Ready**: Physical DS12 device available for testing
- ✅ **Dependencies**: node-serialport, Electron, Sequelize ORM

## Task Breakdown

### Task 2.1: Create DS12Controller Class Structure

**Estimate**: 4-6 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending

#### Subtasks:

- [ ] Create `/main/ku-controllers/ds12/DS12Controller.ts` file
- [ ] Implement class extending KuControllerBase
- [ ] Define DS12-specific properties (deviceType: "DS12", maxSlot: 12)
- [ ] Initialize DS12ProtocolParser instance
- [ ] Set up constructor with proper validation

#### Success Criteria:

- DS12Controller class created and compiles without errors
- Extends KuControllerBase with all abstract methods stubbed
- DS12ProtocolParser properly injected and initialized
- Constructor validates BrowserWindow parameter
- TypeScript strict mode compliance

#### Implementation Notes:

```typescript
// Key architectural decisions for this task:
export class DS12Controller extends KuControllerBase {
  readonly deviceType = "DS12" as const;
  readonly maxSlot = 12;
  private protocolParser: DS12ProtocolParser;
  private serialPort: SerialPort | null = null;

  constructor(win: BrowserWindow) {
    super(win);
    this.protocolParser = new DS12ProtocolParser();
    // Additional initialization
  }
}
```

### Task 2.2: Implement Serial Communication Core

**Estimate**: 6-8 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 2.1

#### Subtasks:

- [ ] Implement `connect(port: string, baudRate: number)` method
- [ ] Implement `disconnect()` method with cleanup
- [ ] Implement `isConnected()` status checking
- [ ] Set up PacketLengthParser for DS12 protocol
- [ ] Add connection timeout and retry logic
- [ ] Implement error handling for serial port operations

#### Success Criteria:

- Serial port connection/disconnection works reliably
- Connection status accurately reflects hardware state
- Timeout handling prevents infinite connection attempts
- Memory leaks prevented with proper cleanup
- Error messages provide actionable information
- Connection retry logic with exponential backoff

#### Implementation Notes:

```typescript
// Serial port configuration for DS12
const SERIAL_CONFIG = {
  baudRate: 19200, // DS12 standard baud rate
  delimiter: 0x02, // STX marker for packet parsing
  packetOverhead: 8, // Minimum packet size for DS12
};
```

### Task 2.3: Implement Hardware Command Methods

**Estimate**: 6-8 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 2.1, 2.2

#### Subtasks:

- [ ] Implement `sendCheckState()` using protocol parser
- [ ] Implement `sendUnlock(inputSlot)` with validation
- [ ] Implement `dispense(inputSlot)` with security checks
- [ ] Implement `resetSlot(slotId, passkey)` operation
- [ ] Implement `deactivate(slotId, passkey)` functionality
- [ ] Implement `reactivate(slotId, passkey)` functionality
- [ ] Add command queuing for serial communication

#### Success Criteria:

- All hardware commands send correct DS12 protocol packets
- Input validation prevents invalid slot numbers (1-12)
- Passkey validation integrated for security operations
- Command queuing prevents serial port conflicts
- Error responses properly handled and logged
- Audit logging for all hardware operations

#### Code Template:

```typescript
async sendCheckState(): Promise<SlotState[]> {
  const packetResponse = this.protocolParser.buildStatusRequestPacket(this.address);
  if (!packetResponse.success) {
    await this.logOperation('check-state-error', { error: packetResponse.error });
    throw new Error(`Failed to build status packet: ${packetResponse.error?.message}`);
  }

  await this.sendSerialCommand(packetResponse.data!);
  // Handle response asynchronously
}
```

### Task 2.4: Implement Response Processing

**Estimate**: 6-8 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 2.1, 2.2, 2.3

#### Subtasks:

- [ ] Implement `receivedCheckState(data: number[])` method
- [ ] Implement `receivedUnlockState(data: number[])` method
- [ ] Implement `receive()` main data processing loop
- [ ] Add response validation using protocol parser
- [ ] Implement state machine for operation flow control
- [ ] Add response timeout handling

#### Success Criteria:

- All response data validated through DS12ProtocolParser
- State machine properly manages unlock/dispense/lock cycles
- Response timeouts handled gracefully
- Invalid responses logged and handled appropriately
- UI state updates sent through IPC events
- Database state synchronized with hardware state

#### State Flow Design:

```
IDLE → UNLOCKING → WAITING_FOR_LOCK → IDLE
IDLE → DISPENSING → WAITING_FOR_DISPENSE_LOCK → IDLE
IDLE → RESETTING → IDLE
```

### Task 2.5: Implement Slot State Management

**Estimate**: 4-6 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 2.1, 2.4

#### Subtasks:

- [ ] Implement `slotBinParser(binArr, availableSlot)` using DS12ProtocolParser
- [ ] Replace binary manipulation with protocol parser calls
- [ ] Add slot state validation and error checking
- [ ] Implement slot state caching for performance
- [ ] Add state change event emission to UI
- [ ] Integrate with database slot model updates

#### Success Criteria:

- Slot states accurately parsed from DS12 hardware responses
- 12-slot state array correctly generated (slots 1-12)
- Database synchronization maintains consistency
- UI receives real-time slot state updates
- Caching improves performance without stale data
- Error states properly communicated to UI layer

### Task 2.6: Add Comprehensive Error Handling

**Estimate**: 4-5 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: All previous tasks

#### Subtasks:

- [ ] Add try-catch blocks for all async operations
- [ ] Implement ProtocolResponse<T> pattern throughout controller
- [ ] Add connection recovery and retry logic
- [ ] Implement hardware timeout detection
- [ ] Add error event emission to UI layer
- [ ] Create error logging with categorization

#### Success Criteria:

- No unhandled promise rejections
- Connection failures trigger automatic retry with backoff
- Hardware timeouts properly detected and handled
- UI layer receives meaningful error messages
- Audit trail includes all error conditions
- System remains stable during hardware disconnection

### Task 2.7: Integration Testing and Validation

**Estimate**: 6-8 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: All implementation tasks

#### Subtasks:

- [ ] Create DS12Controller unit tests
- [ ] Test serial communication with mock hardware
- [ ] Validate state machine transitions
- [ ] Test error handling scenarios
- [ ] Performance testing with real DS12 hardware
- [ ] Memory leak testing with connection cycles

#### Success Criteria:

- Unit test coverage >85%
- All state machine transitions tested
- Error scenarios trigger appropriate recovery
- No memory leaks during connection cycles
- Performance meets medical device requirements
- Real hardware integration successful

## Detailed Implementation Architecture

### Class Structure

```typescript
export class DS12Controller extends KuControllerBase {
  // Properties
  readonly deviceType = "DS12" as const;
  readonly maxSlot = 12;
  private protocolParser: DS12ProtocolParser;
  private serialPort: SerialPort | null = null;
  private parser: PacketLengthParser | null = null;
  private address: number = 0x00; // Default DS12 address

  // State management
  private connectionRetries = 0;
  private maxRetries = 3;
  private commandQueue: Array<{
    command: number[];
    resolve: Function;
    reject: Function;
  }> = [];
  private processing = false;

  // Abstract method implementations
  async connect(port: string, baudRate: number): Promise<boolean>;
  async disconnect(): Promise<void>;
  isConnected(): boolean;
  async sendCheckState(): Promise<SlotState[]>;
  async sendUnlock(inputSlot): Promise<void>;
  async dispense(inputSlot): Promise<void>;
  async resetSlot(slotId: number, passkey: string): Promise<void>;
  async deactivate(slotId: number, passkey: string): Promise<void>;
  async reactivate(slotId: number, passkey: string): Promise<void>;
  async receivedCheckState(data: number[]): Promise<void>;
  async receivedUnlockState(data: number[]): Promise<void>;
  receive(): void;
  async slotBinParser(
    binArr: number[],
    availableSlot: number
  ): Promise<SlotState[]>;
}
```

### Error Handling Strategy

- **Connection Errors**: Retry with exponential backoff, emit events to UI
- **Protocol Errors**: Log detailed error, attempt recovery, notify user
- **Hardware Timeouts**: Reset state machine, attempt reconnection
- **Validation Errors**: Prevent operation, log attempt, return clear error

### Performance Requirements

- **Connection Time**: <3 seconds for initial connection
- **Command Response**: <500ms for slot state requests
- **Memory Usage**: <50MB heap usage for controller instance
- **Error Recovery**: <10 seconds for automatic reconnection

## Risk Mitigation

### High-Risk Areas

1. **Serial Communication Reliability**:
   - **Mitigation**: Comprehensive timeout handling, retry logic, error recovery
2. **State Synchronization**:
   - **Mitigation**: Single source of truth pattern, event-driven updates
3. **Hardware Integration**:
   - **Mitigation**: Extensive testing with real device, mock frameworks

### Known Challenges

1. **Legacy to DS12 Migration**: Different packet structures, slot counts
2. **State Machine Complexity**: Multiple concurrent operations
3. **Error Message Consistency**: Maintaining user-friendly error communication

## Testing Strategy

### Unit Testing

- Mock SerialPort for isolated controller testing
- Test all abstract method implementations
- Validate state machine transitions
- Error scenario testing

### Integration Testing

- Real DS12 hardware connection testing
- End-to-end command/response cycles
- Performance benchmarking
- Memory leak detection

### Hardware Testing

- Physical slot operations (unlock, lock detection)
- Error condition simulation (disconnection, power loss)
- Concurrent operation handling
- Long-running stability testing

## Success Metrics

| Metric                 | Target | Measurement Method               |
| ---------------------- | ------ | -------------------------------- |
| Unit Test Coverage     | >85%   | Jest coverage report             |
| Connection Reliability | >99%   | 1000 connection cycles           |
| Command Success Rate   | >99.5% | Hardware operation testing       |
| Error Recovery Time    | <10s   | Disconnection/reconnection tests |
| Memory Stability       | <50MB  | 24-hour operation monitoring     |
| Response Time          | <500ms | Command timing measurements      |

## Phase 2 Deliverables

### Primary Deliverable

- **DS12Controller.ts**: Complete, tested, production-ready controller

### Supporting Deliverables

- **Unit Test Suite**: Comprehensive test coverage
- **Integration Tests**: Hardware validation tests
- **Performance Benchmarks**: Documented performance metrics
- **Error Handling Documentation**: Error scenarios and recovery procedures

## Next Phase Preparation

Upon completion of Phase 2, the following will be ready for Phase 3:

1. **Working DS12Controller**: Fully functional device controller
2. **State Management**: Proven state machine implementation
3. **Error Handling**: Comprehensive error recovery system
4. **Testing Framework**: Validated testing patterns for hardware integration

## File Locations

| Component         | File Path                                     | Status     |
| ----------------- | --------------------------------------------- | ---------- |
| DS12Controller    | `/main/ku-controllers/ds12/DS12Controller.ts` | ⏸️ Pending |
| Controller Tests  | `/tests/controllers/DS12Controller.test.ts`   | ⏸️ Pending |
| Integration Tests | `/tests/integration/ds12-hardware.test.ts`    | ⏸️ Pending |
| Mock Hardware     | `/tests/mocks/MockDS12Hardware.ts`            | ⏸️ Pending |

---

**Phase 2 represents the core implementation that bridges protocol foundation with hardware control. Success here enables all subsequent phases to build upon a stable, tested controller foundation.**
