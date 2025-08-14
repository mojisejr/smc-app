# Hardware Evolution & Protocol Naming Changes

## Overview

This document tracks the evolution of Smart Medication Cart hardware protocols and the naming changes that impact software architecture.

## Hardware Evolution Timeline

### Phase 1: Original KU Series (Pre-2023)
```
KU16 → 16-slot medication cabinet
KU12 → 12-slot medication cabinet
```
- **Protocol Documentation**: Based on early KERONG specifications
- **Software Implementation**: `/main/ku16/index.ts` contains legacy KU16 class
- **Communication**: RS485 serial protocol with proprietary command structure

### Phase 2: CU Series Rebrand (2023)
```
KU16 → CU16 (Same hardware, new name)
KU12 → CU12 (Same hardware, new name)
```
- **Manufacturer Decision**: KERONG renamed series for market differentiation
- **Protocol Compatibility**: 100% backward compatible with KU series
- **Documentation**: `CU16.txt` and `CU12.txt` protocol specifications available in project root
- **Software Impact**: Variable names and comments still reference KU16

### Phase 3: DS Series Protection (2024-Present)
```
CU16 → DS16 (Reverse engineering protection)
CU12 → DS12 (Reverse engineering protection)
```
- **Purpose**: Prevent reverse engineering and unauthorized cloning
- **Protocol Compatibility**: Maintains CU/KU protocol compatibility
- **Software Architecture**: New `/main/ku-controllers/` with protocol abstraction

## Protocol Specifications

### DS16 (16-Slot Device)
**Based on**: CU16.txt protocol documentation
**Command Structure**: 
```
STX(0x02) + ADDR(1) + CMD(1) + ETX(0x03) + SUM(1) 
    OR
STX(0x02) + ADDR(1) + CMD(1) + DATA(2-5) + ETX(0x03) + SUM(1)
```

**Key Commands**:
- `0x30`: Get Status (single slot state)
- `0x31`: Unlock slot
- `0x32`: Get all slot states on bus
- `0x33`: Unlock all slots
- `0x37`: Query/Set unlocking time
- `0x39`: Query/Set delayed unlock time
- `0x40`: Set baud rate

**Data Format**:
- 16 slots encoded in 7-byte response format
- DATA1: Slots 1-8 lock states (bits 0-7)  
- DATA2: Slots 9-16 lock states (bits 0-7)
- DATA3: Slots 1-8 infrared detection (bits 0-7)
- DATA4: Slots 9-16 infrared detection (bits 0-7)

### DS12 (12-Slot Device)
**Based on**: CU12.txt protocol documentation
**Command Structure**:
```
STX(0x02) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(0x03) + SUM(1) + DATA(DATALEN)
```

**Key Commands**:
- `0x80`: Get Status
- `0x81`: Unlock slot
- `0x82`: Query/Set unlocking time
- `0x83`: Query/Set baud rate
- `0x84`: Query/Set delayed unlock time
- `0x85`: Query/Set push door unlock waiting time
- `0x8E`: Initialize device
- `0x8F`: Query version information

**Data Format**:
- 12 slots encoded in 2-byte HookStateDatas format
- Byte 1: Slots 1-8 (bits 0-7)
- Byte 2: Slots 9-12 (bits 0-3, bits 4-7 unused)

## Software Architecture Impact

### Legacy Implementation
**File**: `/main/ku16/index.ts`
**Characteristics**:
- Tightly coupled to CU16 protocol
- Hardcoded 16-slot assumption  
- Binary parsing logic embedded in main class
- Direct serial port communication

**Critical Methods**:
```typescript
class KU16 {
  sendCheckState(): void                    // Send status request
  receivedCheckState(data: number[]): void  // Parse status response
  receivedUnlockState(data: number[]): void // Handle unlock response
  slotBinParser(binArr: number[], availableSlot: number) // Parse binary data
  decToBinArrSlot(data1: number, data2: number) // Convert decimal to binary array
}
```

### New Architecture
**File**: `/main/ku-controllers/base/KuControlleBase.ts`
**Characteristics**:
- Abstract base class with device type abstraction
- Protocol parser separation via Strategy Pattern
- Type-safe interfaces for different hardware
- Enhanced error handling and logging

**Abstract Methods**:
```typescript
abstract class KuControllerBase {
  abstract readonly deviceType: "DS12" | "DS16";
  abstract readonly maxSlot: number;
  abstract connect(port: string, baudRate: number): Promise<boolean>;
  abstract sendCheckState(): Promise<SlotState[]>;
  abstract sendUnlock(inputSlot: UnlockRequest): Promise<void>;
  abstract slotBinParser(binArr: number[], availableSlot: number): Promise<SlotState[]>;
}
```

### Protocol Parser Implementation
**File**: `/main/ku-controllers/protocols/parsers/DS12ProtocolParser.ts`
**Status**: Implemented with comprehensive validation
**Features**:
- Checksum validation
- Packet structure validation  
- Command building (status, unlock, version)
- Response parsing with error handling
- Medical device compliance logging

**File**: `/main/ku-controllers/protocols/parsers/DS16ProtocolParser.ts`
**Status**: Planned for implementation
**Requirements**:
- Follow DS12 patterns exactly
- Handle 16-slot vs 12-slot differences
- Maintain same error handling depth
- Support 4-byte data format vs 2-byte

## Migration Strategy

### Current State
- **Production**: Legacy KU16 class handles all hardware communication
- **Development**: DS12ProtocolParser implemented but not integrated
- **Testing**: Unit tests exist for DS12 parser functionality

### Phase 1: Documentation & Analysis (Current)
- ✅ Complete system architecture documentation
- ✅ Map hardware evolution and protocol changes
- ⏳ Document user workflows and business logic
- ⏳ Create technical component relationship diagrams

### Phase 2: DS12 Integration  
- Implement DS12Controller extending KuControllerBase
- Create factory pattern for controller instantiation
- Add configuration management for device type selection
- Integrate with existing IPC handlers

### Phase 3: DS16 Development
- Implement DS16ProtocolParser following DS12 patterns
- Create DS16Controller with 16-slot support
- Add comprehensive test coverage
- Hardware validation with real DS16 devices

### Phase 4: Legacy Migration
- Create compatibility layer for existing code
- Gradually migrate IPC handlers to new controllers
- Update UI components for multi-device support
- Remove legacy KU16 implementation

## Risk Mitigation

### Protocol Compatibility Risks
**Risk**: DS16 protocol differences break existing functionality
**Mitigation**: 
- Comprehensive protocol documentation analysis
- Bit-level validation testing
- Checksum verification preservation
- Hardware simulation for testing

### Medical Device Compliance Risks  
**Risk**: Audit logging or state management changes
**Mitigation**:
- Preserve exact logging format and detail
- Maintain medical device audit trails
- Test regulatory compliance requirements
- Document all changes for validation

### State Management Risks
**Risk**: Complex state synchronization across hardware types
**Mitigation**:
- Abstract state management in base class
- Consistent IPC event naming conventions
- Database schema compatibility preservation
- UI state handling abstraction

## Configuration Management

### Device Type Selection
```typescript
// Planned configuration in background.ts
const deviceConfig = await getDeviceConfiguration();
const controller = ControllerFactory.create(deviceConfig.type, deviceConfig.settings);

// Factory implementation
class ControllerFactory {
  static create(deviceType: 'DS12' | 'DS16', settings: DeviceSettings): KuControllerBase {
    switch(deviceType) {
      case 'DS12': return new DS12Controller(settings);
      case 'DS16': return new DS16Controller(settings);
      default: throw new Error(`Unsupported device type: ${deviceType}`);
    }
  }
}
```

### Backward Compatibility
- Legacy KU16 references preserved in comments
- Database schema unchanged
- IPC event names maintained
- UI slot indexing (1-15) preserved regardless of hardware

This evolution documentation provides the foundation for understanding hardware changes and planning safe protocol migration while maintaining medical device functionality.