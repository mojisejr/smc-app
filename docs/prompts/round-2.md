# Round 2: Hardware Integration & Adaptive Smart State Management

**CONTEXT**: Please read the following context files thoroughly:

1. `docs/context/CLAUDE.md` (Master Context - CU12 Refactor Overview)
2. `docs/context/supplements/hardware-integration.md` (Adaptive State Management Specifications)

**ROUND OBJECTIVE**:
Integrate CU12 hardware communication with Adaptive Smart State Management for 24/7 stable operation. Implement resource-efficient monitoring that adapts to user activity while maintaining comprehensive error handling and IPC compatibility.

**PAIRED TASKS**:

- **Task A: IPC Handler Migration & Optimization**
  - Migrate all KU16 IPC handlers to CU12 equivalents with resource optimization
  - Implement intelligent caching and batch operations
  - Add structured logging with monitoring capabilities
  - Update main/background.ts to use adaptive CU12 state manager
  - Files: `main/hardware/cu12/ipcMain/`, `main/hardware/cu12/stateManager.ts`

- **Task B: Adaptive State Management & Failure Detection**
  - Implement smart monitoring with idle/active/operation modes
  - Add intelligent hardware failure detection and recovery
  - Create resource-efficient event-driven architecture
  - Implement 24/7 stability patterns with minimal resource usage
  - Files: `main/hardware/cu12/monitoringConfig.ts`, `main/hardware/cu12/errorHandler.ts`

**SUCCESS CRITERIA**:

- [ ] All IPC handlers successfully migrated with resource optimization
- [ ] Adaptive state management with idle/active/operation modes working
- [ ] Resource efficiency: CPU usage <5% idle, <15% during operations
- [ ] 24/7 stability: No memory leaks or performance degradation
- [ ] Hardware failure detection and automatic recovery functional
- [ ] No breaking changes to renderer process communication
- [ ] Smart monitoring adapts to user activity patterns

**IMPLEMENTATION NOTES**:
- Implement event-driven architecture instead of continuous polling
- Use intelligent caching with TTL for frequent operations
- Health check every 5 minutes, user timeout 2 minutes
- Structured logging: TRACE/DEBUG/INFO/WARN/ERROR/FATAL levels
- Batch operations and connection pooling for efficiency

**TESTING APPROACH**:
- Resource usage monitoring during idle and active states
- 24/7 stability testing with continuous operation
- Failure injection testing for error recovery validation
- Performance benchmarking for adaptive state transitions
- Memory leak detection and resource cleanup validation

**REFERENCE FILES**:
- Current PRD: `docs/PRD.md` (IPC Architecture)
- KU16 Handlers: `main/ku16/ipcMain/` (Migration Reference)
- Background Process: `main/background.ts` (Integration Point)
- Page Documentation: `docs/pages/02_home-page.md` (UI Integration)