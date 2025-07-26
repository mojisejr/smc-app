# Round 1: CU12 Protocol Implementation

**CONTEXT**: Please read the following context files thoroughly:

1. `docs/context/CLAUDE.md` (Master Context - CU12 Refactor Overview)
2. `docs/context/supplements/hardware-cu12.md` (CU12 Protocol Specifications)

**ROUND OBJECTIVE**:
Implement the core CU12 communication protocol and establish basic device communication. Create a parallel CU12 implementation alongside the existing KU16 system without breaking current functionality.

**PAIRED TASKS**:

- **Task A: Core Protocol Implementation**
  - Create CU12 protocol handler with packet construction/validation
  - Implement checksum calculation (including DATA portion)
  - Create command methods for GET_STATUS (0x80) and UNLOCK (0x81)
  - Add CU12-specific type definitions and interfaces
  - Files: `main/hardware/cu12/protocol.ts`, `main/hardware/cu12/types.ts`

- **Task B: Device Communication Layer**
  - Implement CU12Device class with serial communication
  - Add device auto-detection for CU12 ports
  - Create timeout and error handling for communication
  - Integrate with existing hardware interface pattern
  - Files: `main/hardware/cu12/device.ts`, `main/hardware/cu12/index.ts`

**SUCCESS CRITERIA**:

- [ ] CU12 protocol packet construction working correctly
- [ ] Checksum validation passes for test packets (see CU12.md examples)
- [ ] GET_STATUS command returns valid 12-slot status array
- [ ] UNLOCK command successfully unlocks individual slots (1-12)
- [ ] Device auto-detection finds CU12 on available ports
- [ ] All unit tests pass for protocol layer
- [ ] No breaking changes to existing KU16 implementation

**IMPLEMENTATION NOTES**:
- Use big-endian packet format as specified in CU12.md
- Default baudrate: 19200 (configurable to 9600, 57600, 115200)
- Maximum 12 slots (LOCKNUM 0x00-0x0B, 0x0C for all slots)
- Implement parallel to KU16 - do not replace existing code yet
- Follow existing project patterns in `main/ku16/` for consistency

**TESTING APPROACH**:
- Create mock CU12 device for testing
- Test with example packets from CU12.md documentation
- Validate response parsing and error handling
- Ensure 3-second timeout compliance

**REFERENCE FILES**:
- Current PRD: `docs/PRD.md` (Database Schema & Architecture)
- CU12 Hardware Spec: `docs/CU12.md` (Protocol Examples & Commands)
- KU16 Implementation: `main/ku16/` (Pattern Reference)
- Page Documentation: `docs/pages/02_home-page.md` (Hardware Integration)

