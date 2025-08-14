# Phase 4: IPC Handlers Refactoring

**Status**: ⏸️ **PENDING**  
**Duration**: 2-3 days  
**Priority**: High

## Objective

Refactor existing legacy IPC handlers to support DS12Controller, implement device type selection, and create unified IPC patterns that support both DS12 and future DS16 implementations.

## Prerequisites

- ✅ **Phase 1 Complete**: Protocol foundation established
- ✅ **Phase 2 Complete**: DS12Controller implemented
- ✅ **Phase 3 Complete**: Serial communication integration
- ✅ **Existing Code**: Legacy IPC handlers available for reference

## Current IPC Handler Analysis

### Existing Legacy Handlers (Reference):

```
/main/ku16/ipcMain/
├── checkLockedBack.ts
├── deactivate-admin.ts
├── deactivate.ts
├── deactivateAll.ts
├── dispensing-continue.ts
├── dispensing.ts
├── forceReset.ts
├── getPortList.ts
├── init.ts
├── reactivate-admin.ts
├── reactiveAll.ts
├── reset.ts
└── unlock.ts
```

## Task Breakdown

### Task 4.1: Create Device Controller Factory

**Estimate**: 3-4 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending

#### Subtasks:

- [ ] Create `/main/ku-controllers/ControllerFactory.ts`
- [ ] Implement device type detection and selection
- [ ] Add DS12Controller instantiation logic
- [ ] Create controller lifecycle management
- [ ] Add singleton pattern for controller instances
- [ ] Implement controller cleanup and disposal

#### Success Criteria:

- Factory correctly instantiates DS12Controller or DS16Controller based on device type
- Only one controller instance per device type active at a time
- Controller cleanup prevents memory leaks
- Device type detection works reliably
- Factory pattern extensible for DS16 in the future

#### Implementation Architecture:

```typescript
// ControllerFactory.ts
export interface ControllerFactoryConfig {
  deviceType: "DS12" | "DS16";
  win: BrowserWindow;
  port?: string;
  baudRate?: number;
}

export class ControllerFactory {
  private static instances: Map<string, KuControllerBase> = new Map();

  static async createController(
    config: ControllerFactoryConfig
  ): Promise<KuControllerBase> {
    const key = `${config.deviceType}-${config.port}`;

    // Dispose existing controller if switching device types
    if (this.instances.has(key)) {
      await this.disposeController(key);
    }

    let controller: KuControllerBase;
    switch (config.deviceType) {
      case "DS12":
        controller = new DS12Controller(config.win);
        break;
      case "DS16":
        controller = new DS16Controller(config.win);
        break;
      default:
        throw new Error(`Unsupported device type: ${config.deviceType}`);
    }

    this.instances.set(key, controller);
    return controller;
  }

  static async disposeController(key: string): Promise<void> {
    const controller = this.instances.get(key);
    if (controller) {
      await controller.disconnect();
      this.instances.delete(key);
    }
  }
}
```

### Task 4.2: Create Unified IPC Handler Structure

**Estimate**: 4-5 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 4.1

#### Subtasks:

- [ ] Create `/main/device-controllers/ipcMain/` directory structure
- [ ] Design unified IPC handler interface
- [ ] Implement device-agnostic IPC patterns
- [ ] Create IPC handler registration system
- [ ] Add IPC event validation and sanitization
- [ ] Implement IPC error handling patterns

#### Success Criteria:

- IPC handlers work with both DS12 and DS16 controllers
- Device type automatically selected based on user configuration
- IPC events properly validated and sanitized
- Error handling consistent across all handlers
- Handler registration system supports hot-swapping device types

#### Unified IPC Pattern:

```typescript
// Base IPC Handler Interface
interface IpcHandlerConfig {
  event: string;
  handler: (event: IpcMainEvent, ...args: any[]) => Promise<any>;
  validation?: (args: any[]) => boolean;
  requiresConnection?: boolean;
}

// Device-agnostic handler implementation
export async function createUnifiedIpcHandler(
  channel: string,
  handler: (controller: KuControllerBase, ...args: any[]) => Promise<any>
): Promise<void> {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const controller = await getActiveController();
      if (!controller) {
        throw new Error("No active device controller");
      }

      return await handler(controller, ...args);
    } catch (error) {
      console.error(`IPC Handler ${channel} error:`, error);
      throw error;
    }
  });
}
```

### Task 4.3: Refactor Core Device Operations

**Estimate**: 5-6 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 4.1, 4.2

#### Subtasks:

- [ ] Refactor `init.ts` to support device type selection
- [ ] Update `getPortList.ts` for cross-platform serial port detection
- [ ] Refactor `unlock.ts` to use unified controller interface
- [ ] Update `dispensing.ts` and `dispensing-continue.ts` for DS12
- [ ] Refactor `checkLockedBack.ts` for DS12 response handling
- [ ] Update state management IPC handlers

#### Success Criteria:

- Device initialization supports DS12 and DS16 seamlessly
- Port detection works across all supported platforms
- Unlock operations maintain security and audit requirements
- Dispensing flow works with DS12 hardware protocol
- State checking properly handles DS12 response format
- All operations maintain existing security standards

#### Key Handler Refactoring:

```typescript
// Refactored init.ts
ipcMain.handle(
  "ku:init",
  async (
    event,
    config: {
      deviceType: "DS12" | "DS16";
      port: string;
      baudRate: number;
    }
  ) => {
    try {
      const controller = await ControllerFactory.createController({
        deviceType: config.deviceType,
        win: mainWindow,
        port: config.port,
        baudRate: config.baudRate,
      });

      const connected = await controller.connect(config.port, config.baudRate);

      if (connected) {
        // Initialize device-specific settings
        await initializeDeviceSettings(controller);
        return { success: true, deviceType: config.deviceType };
      } else {
        throw new Error("Failed to connect to device");
      }
    } catch (error) {
      console.error("Device initialization failed:", error);
      throw error;
    }
  }
);

// Refactored unlock.ts
ipcMain.handle(
  "ku:unlock",
  async (
    event,
    unlockData: {
      slotId: number;
      hn: string;
      passkey: string;
    }
  ) => {
    const controller = await getActiveController();
    await controller.sendUnlock({
      slotId: unlockData.slotId,
      hn: unlockData.hn,
      timestamp: Date.now(),
      passkey: unlockData.passkey,
    });
  }
);
```

### Task 4.4: Implement Device Type Management

**Estimate**: 3-4 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 4.1, 4.2

#### Subtasks:

- [ ] Create device type detection IPC handler
- [ ] Implement device type persistence in settings
- [ ] Add device type switching functionality
- [ ] Create device capability detection
- [ ] Implement device configuration validation
- [ ] Add device type migration helpers

#### Success Criteria:

- Device type automatically detected when possible
- User can manually select device type when needed
- Device type persisted across application restarts
- Device capabilities properly detected and reported
- Configuration validation prevents invalid setups
- Migration from legacy devices to DS12 works seamlessly

#### Device Management Implementation:

```typescript
// Device Type Management
ipcMain.handle("device:detect-type", async (event, port: string) => {
  try {
    const deviceInfo = await detectDeviceType(port);
    return {
      success: true,
      deviceType: deviceInfo.type,
      capabilities: deviceInfo.capabilities,
      maxSlots: deviceInfo.maxSlots,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle(
  "device:set-type",
  async (event, deviceType: "DS12" | "DS16") => {
    try {
      await updateDeviceTypeSetting(deviceType);

      // Reinitialize with new device type
      const currentPort = await getCurrentPort();
      if (currentPort) {
        await reinitializeWithDeviceType(deviceType, currentPort);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
);
```

### Task 4.5: Add Error Handling and Validation

**Estimate**: 3-4 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: All previous tasks

#### Subtasks:

- [ ] Implement comprehensive IPC input validation
- [ ] Add standardized error response format
- [ ] Create IPC timeout handling
- [ ] Implement retry mechanisms for failed operations
- [ ] Add operation cancellation support
- [ ] Create audit logging for all IPC operations

#### Success Criteria:

- All IPC inputs validated before processing
- Error responses provide actionable information
- IPC timeouts prevent hanging operations
- Failed operations can be retried automatically
- Long-running operations can be cancelled
- Complete audit trail for compliance

#### Error Handling Pattern:

```typescript
interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

// Standardized error handling wrapper
function createSafeIpcHandler<T>(
  handler: (...args: any[]) => Promise<T>,
  validator?: (args: any[]) => boolean
) {
  return async (
    event: IpcMainEvent,
    ...args: any[]
  ): Promise<IpcResponse<T>> => {
    try {
      // Validate inputs
      if (validator && !validator(args)) {
        throw new Error("Invalid input parameters");
      }

      const data = await handler(...args);

      return {
        success: true,
        data,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || "UNKNOWN_ERROR",
          message: error.message,
          details: error.details,
        },
        timestamp: Date.now(),
      };
    }
  };
}
```

### Task 4.6: Create Comprehensive Testing

**Estimate**: 4-5 hours  
**Priority**: Medium  
**Status**: ⏸️ Pending  
**Dependencies**: All implementation tasks

#### Subtasks:

- [ ] Create IPC handler unit tests
- [ ] Test device type switching scenarios
- [ ] Validate error handling and recovery
- [ ] Test concurrent IPC operation handling
- [ ] Create integration tests with real hardware
- [ ] Add performance testing for IPC operations

#### Success Criteria:

- All IPC handlers have >85% test coverage
- Device switching tested with mock and real hardware
- Error scenarios properly tested and handled
- Concurrent operations don't cause race conditions
- Performance meets responsiveness requirements
- Integration tests validate end-to-end functionality

## Testing Strategy

### Unit Testing

- Mock device controllers for isolated testing
- Test all IPC handlers with various input scenarios
- Validate error handling and edge cases
- Test device type switching logic

### Integration Testing

- Test with real DS12 and DS16 hardware
- Validate device type detection and switching
- Test error recovery and retry mechanisms
- Performance testing under load

### End-to-End Testing

- Complete user workflows with device switching
- Multi-device operation scenarios
- Error injection and recovery testing
- Long-duration stability testing

## Risk Mitigation

### High-Risk Areas

1. **Device Type Switching**: User confusion, data loss
   - **Mitigation**: Clear UI indicators, confirmation dialogs
2. **IPC Handler Conflicts**: Multiple handlers for same event
   - **Mitigation**: Handler registration system with conflict detection
3. **State Synchronization**: UI and device state misalignment
   - **Mitigation**: Event-driven updates, single source of truth

### Known Challenges

1. **Legacy Compatibility**: Maintaining existing legacy functionality
2. **Error Message Consistency**: User-friendly error communication
3. **Performance Impact**: Additional abstraction overhead

## Success Metrics

| Metric              | Target        | Measurement Method       |
| ------------------- | ------------- | ------------------------ |
| IPC Response Time   | <50ms         | Performance benchmarking |
| Device Switch Time  | <5s           | User workflow testing    |
| Error Recovery Rate | >95%          | Error injection testing  |
| Code Coverage       | >85%          | Unit test coverage       |
| User Experience     | No regression | Comparative testing      |

## Phase 4 Deliverables

### Primary Deliverables

- **Unified IPC Handler System**: Device-agnostic handlers
- **Controller Factory**: Device type management
- **Migration Support**: Legacy to DS12 transition

### Supporting Deliverables

- **Test Suite**: Comprehensive IPC testing
- **Migration Guide**: Legacy to DS12 transition documentation
- **Performance Benchmarks**: IPC operation metrics

## Next Phase Preparation

Upon completion of Phase 4, the following will be ready for Phase 5:

1. **Unified Device Interface**: IPC handlers work with all device types
2. **Device Management**: Robust device type switching
3. **Error Handling**: Production-grade error management
4. **Testing Framework**: Validated testing patterns

## File Locations

| Component            | File Path                                   | Status     |
| -------------------- | ------------------------------------------- | ---------- |
| Controller Factory   | `/main/ku-controllers/ControllerFactory.ts` | ⏸️ Pending |
| Unified IPC Handlers | `/main/device-controllers/ipcMain/`         | ⏸️ Pending |
| Device Management    | `/main/device-controllers/DeviceManager.ts` | ⏸️ Pending |
| IPC Tests            | `/tests/ipc/unified-handlers.test.ts`       | ⏸️ Pending |

---

**Phase 4 creates the unified interface that enables seamless device type switching and provides the foundation for UI integration.**
