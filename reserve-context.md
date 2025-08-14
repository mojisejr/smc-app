# SMC App Protocol Refactoring - Project Context Reserve

**Date**: 2025-01-12  
**Project**: Smart Medication Cart (SMC) Electron Application  
**Branch**: improve-slot-ui  
**Status**: Phase 1.2 Implementation (ProtocolTypes.ts Complete)

---

## 📋 Project Overview

### **Objective**
Refactor SMC Electron app from single hardware support (KU16/CU16) to unified protocol system supporting:
- **DS12** (12 slots) - Based on CU12 protocol
- **DS16** (16 slots) - Based on CU16 protocol  
- **Future expansion**: DS20, DS24, etc.

### **Key Constraints**
- RS485 communication only (no TCP initially)
- Maintain backward compatibility with existing UI
- Medical device compliance (audit logging, security)
- Test with DS12 hardware first (developer has physical device)

---

## 🏗️ Architecture Decisions Made

### **Design Patterns**
1. **Strategy Pattern**: Protocol parsing (DS12ProtocolParser, DS16ProtocolParser)
2. **Factory Pattern**: Runtime protocol selection (ProtocolFactory)
3. **Abstract Base Class**: Common hardware controller interface (KuControllerBase)
4. **State Machine**: Unified state management (planned)

### **Type System**
- **const enum** for device types and commands (performance)
- **Union types** for protocol packets (DS12Packet | DS16Packet)
- **Type guards** for runtime safety (isDS12packet, isDS16packet)
- **Generic interfaces** for responses (ProtocolResponse<T>)

### **Security Architecture**
- Passkey validation for all operations
- Role-based access control (admin, operator)
- Comprehensive audit logging
- Error handling without exposing sensitive data

---

## 📂 Current File Structure

### **✅ Implemented Files**
```
main/ku-controllers/
├── base/
│   └── KuControllerBase.ts                    # Abstract base controller
└── protocols/
    └── interfaces/
        └── ProtocolTypes.ts                   # Type definitions (Phase 1.2)
```

### **📋 Planned Implementation**
```
main/ku-controllers/protocols/
├── parsers/
│   ├── DS12ProtocolParser.ts                 # CU12 protocol parsing
│   └── DS16ProtocolParser.ts                 # CU16 protocol parsing
├── builders/
│   ├── DS12PacketBuilder.ts                  # CU12 command building
│   └── DS16PacketBuilder.ts                  # CU16 command building
├── factory/
│   └── ProtocolFactory.ts                    # Runtime protocol selection
└── utils/
    └── BinaryUtils.ts                        # Binary parsing utilities
```

---

## 🔧 Protocol Specifications

### **DS12 (CU12) Protocol**
- **Slots**: 12
- **Commands**: 0x80-0x8F range
- **Packet Structure**: STX(0x02) + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX(0x03) + SUM + DATA
- **Response Data**: HookStateDatas[2] for 12 slots
- **Baud Rate**: 19200 (default)

**Key Commands**:
- 0x80: Get Status
- 0x81: Unlock
- 0x82: Query/Set unlock time
- 0x83: Query/Set baud rate
- 0x8E: Initialize
- 0x8F: Query version

### **DS16 (CU16) Protocol**  
- **Slots**: 16
- **Commands**: 0x30-0x40 range
- **Packet Structure**: STX(0x02) + ADDR + CMD + ETX(0x03) + SUM (variable length)
- **Response Data**: DATA1(slots 1-8) + DATA2(slots 9-16) + DATA3/DATA4(infrared)
- **Baud Rate**: 19200 (default)

**Key Commands**:
- 0x30: Get Status
- 0x31: Unlock
- 0x37: Set/Query unlock time
- 0x39: Set delay unlock time
- 0x40: Set baud rate

---

## 📈 Implementation Status

### **Phase 1.1: Foundation** ✅ COMPLETE
- **File**: `main/ku-controllers/base/KuControllerBase.ts`
- **Status**: Abstract base class with all required methods
- **Features**: Security, logging, state management, protocol abstraction points
- **Quality**: Code reviewed and approved

### **Phase 1.2: Protocol Types** ✅ COMPLETE  
- **File**: `main/ku-controllers/protocols/interfaces/ProtocolTypes.ts`
- **Status**: Type definitions implemented
- **Features**: DeviceType enum, CommandType enum, packet interfaces, config types, type guards
- **Quality**: Needs review for command mapping accuracy

### **Phase 1.3: Protocol Parsers** 📋 NEXT UP
- **Priority**: DS12ProtocolParser first (hardware available)
- **Timeline**: Week 2 of implementation
- **Dependencies**: ProtocolTypes.ts, BinaryUtils.ts

---

## 👨‍💻 Developer Assessment

### **Skill Level**: 8.5/10
- **TypeScript**: 9/10 - Excellent enum/interface design
- **Architecture**: 8/10 - Good pattern understanding  
- **Testing**: 7/10 - Needs TDD implementation
- **Security**: 8/10 - Strong security awareness
- **Problem Solving**: 9/10 - Thoughtful questions and solutions

### **Learning Style**
- Prefers hands-on implementation over theory
- Asks specific technical questions
- Good at understanding architectural concepts
- Needs guidance on testing best practices

---

## 🔍 Critical Technical Details

### **Binary Parsing Challenge**
- **DS12**: 12 slots in HookStateDatas[2] (1.5 bytes of actual data)
- **DS16**: 16 slots in DATA1+DATA2 (2 bytes), plus infrared in DATA3+DATA4
- **Solution**: Strategy pattern with protocol-specific parsers

### **State Management Strategy**
- **Problem**: Triple state redundancy (Class + Database + UI)
- **Solution**: Database as single source of truth, class as cache, UI via events
- **Pattern**: State machine with enum states instead of boolean flags

### **IPC Integration**
- **Current**: Direct KU16 class integration in IPC handlers
- **Target**: Protocol-agnostic handlers with factory selection
- **Migration**: Unified handlers with backward compatibility

---

## 📋 Next Implementation Steps

### **Immediate (Phase 1.3)**
1. Create `BinaryUtils.ts` with hex/decimal/binary conversion utilities
2. Implement `DS12ProtocolParser.ts` with CU12 packet parsing
3. Create test suite for DS12 protocol parsing
4. Test with actual DS12 hardware

### **Week 2**
1. Implement `DS16ProtocolParser.ts` with CU16 packet parsing  
2. Create `ProtocolFactory.ts` for runtime selection
3. Integrate parsers with `KuControllerBase.ts`
4. Update IPC handlers for protocol abstraction

### **Week 3**
1. Implement packet builders (DS12PacketBuilder, DS16PacketBuilder)
2. Add command validation and error handling
3. Integration testing with existing UI
4. Performance optimization and cleanup

---

## 🧪 Testing Strategy

### **Test-Driven Development**
- Write tests BEFORE implementation
- Use actual protocol data from CU12/CU16 documentation
- Mock hardware responses for consistent testing
- Include edge cases (malformed packets, checksum errors)

### **Test Data Sources**
- **CU12.txt**: Contains actual command/response examples
- **CU16.txt**: Contains protocol packet examples  
- **Edge Cases**: Invalid checksums, wrong packet lengths, unknown commands

---

## 📚 Documentation References

### **Protocol Documentation**
- `CU12.txt`: Complete CU12/DS12 protocol specification
- `CU16.txt`: Complete CU16/DS16 protocol specification
- Both files contain command examples, packet structures, and response formats

### **Key Files to Monitor**
- `main/ku-controllers/base/KuControllerBase.ts`: Base implementation
- `main/ku-controllers/protocols/interfaces/ProtocolTypes.ts`: Type system
- `main/ku16/utils/command-parser.ts`: Legacy implementation reference
- `skill_progress.md`: Developer skill tracking

---

## 🎯 Success Criteria

### **Phase 1 Complete When**:
- [ ] DS12 protocol parsing working with hardware
- [ ] DS16 protocol parsing tested with mock data
- [ ] Factory pattern selecting correct parser
- [ ] IPC handlers using protocol abstraction
- [ ] Backward compatibility maintained
- [ ] Comprehensive test coverage

### **Quality Gates**:
- All TypeScript compilation without errors
- 90%+ test coverage on protocol parsers
- Successful DS12 hardware integration
- UI functionality unchanged from user perspective
- Security audit logging functional
- Performance not degraded from original

---

**END OF CONTEXT RESERVE**  
*This document preserves critical project state for context continuity*