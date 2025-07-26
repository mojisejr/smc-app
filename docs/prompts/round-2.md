# Round 2: Hardware Integration & Device Testing

**CONTEXT**: Please read the following context files thoroughly:

1. `docs/context/CLAUDE.md` (Master Context - CU12 Refactor Overview)
2. `docs/context/supplements/hardware-integration.md` (Integration & Testing Specifications)

**ROUND OBJECTIVE**:
Integrate CU12 hardware communication into the main application with IPC handlers, real-time state management, and comprehensive error handling. Replace KU16 IPC handlers with CU12 equivalents while maintaining API compatibility.

**PAIRED TASKS**:

- **Task A: IPC Handler Migration**
  - Migrate all KU16 IPC handlers to CU12 equivalents
  - Update channel names and maintain backwards compatibility
  - Implement CU12-specific error handling and logging
  - Update main/background.ts to use CU12 instead of KU16
  - Files: `main/cu12/ipcMain/`, `main/background.ts`

- **Task B: State Management & Real-time Sync**
  - Implement real-time slot state synchronization
  - Add connection monitoring with heartbeat
  - Create hardware error recovery mechanisms
  - Update hardware state management for 12-slot system
  - Files: `main/cu12/stateManager.ts`, `main/cu12/errorHandler.ts`

**SUCCESS CRITERIA**:

- [ ] All IPC handlers successfully migrated from KU16 to CU12
- [ ] Real-time slot state synchronization working (12 slots)
- [ ] Connection error recovery functional with auto-reconnect
- [ ] Hardware communication meets performance requirements (≤3s)
- [ ] Integration tests pass for all IPC channels
- [ ] No breaking changes to renderer process communication
- [ ] Heartbeat monitoring detects and handles disconnections

**IMPLEMENTATION NOTES**:
- Maintain IPC channel compatibility for renderer process
- Use existing error handling patterns from KU16 implementation
- Implement exponential backoff for connection retries
- Ensure atomic database updates for state changes
- Test with both mock and real CU12 hardware

**TESTING APPROACH**:
- Create comprehensive IPC handler tests
- Test connection failure and recovery scenarios
- Validate real-time state synchronization accuracy
- Performance testing for concurrent operations
- Integration testing with existing renderer components

**REFERENCE FILES**:
- Current PRD: `docs/PRD.md` (IPC Architecture)
- KU16 Handlers: `main/ku16/ipcMain/` (Migration Reference)
- Background Process: `main/background.ts` (Integration Point)
- Page Documentation: `docs/pages/02_home-page.md` (UI Integration)