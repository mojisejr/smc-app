# Hardware Integration & Device Testing

## 🔌 CU12 Integration Architecture

### Integration Layer Overview
```typescript
// Main integration points
interface HardwareIntegration {
  deviceManager: CU12DeviceManager;     // Core device communication
  ipcHandlers: CU12IPCHandlers;         // Electron IPC integration  
  stateManager: HardwareStateManager;   // Real-time state tracking
  errorHandler: HardwareErrorHandler;   // Error recovery and logging
}
```

### Device Lifecycle Management
```typescript
class CU12DeviceManager {
  private device: CU12Device;
  private connectionState: ConnectionState;
  private heartbeatInterval: NodeJS.Timeout;
  
  async initialize(settings: CU12Settings): Promise<boolean> {
    // 1. Auto-detect or connect to specified port
    // 2. Test communication with device
    // 3. Initialize device parameters
    // 4. Start heartbeat monitoring
    // 5. Set up event listeners
  }
  
  async startHeartbeat(): Promise<void> {
    // Periodic status check to maintain connection
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.device.getSlotStatus();
        this.updateConnectionState('connected');
      } catch (error) {
        this.handleConnectionError(error);
      }
    }, 5000); // Check every 5 seconds
  }
}
```

## 🔄 IPC Handler Migration

### Current KU16 IPC Handlers (to be replaced)
```typescript
// Existing handlers in main/ku16/ipcMain/
// - init.ts
// - unlock.ts  
// - dispensing.ts
// - getPortList.ts
// - checkLockedBack.ts
// - reset.ts
// - deactivate.ts
// - reactivate.ts
```

### New CU12 IPC Handlers
```typescript
// main/cu12/ipcMain/init.ts
export const initCU12Handler = () => {
  ipcMain.handle('cu12-init', async (event, params) => {
    try {
      const { init } = params;
      if (init) {
        const settings = await getSetting();
        const success = await cu12Manager.initialize({
          port: settings.cu_port,
          baudrate: settings.cu_baudrate || 19200
        });
        
        if (success) {
          // Update slot states and notify renderer
          const slotStatus = await cu12Manager.getSlotStatus();
          event.sender.send('cu12-slot-update', slotStatus);
        }
        
        return success;
      }
    } catch (error) {
      logger.error('CU12 initialization failed:', error);
      return false;
    }
  });
};

// main/cu12/ipcMain/unlock.ts
export const unlockCU12Handler = () => {
  ipcMain.handle('cu12-unlock', async (event, params) => {
    try {
      const { slotId, userId, hn } = params;
      
      // 1. Validate slot availability
      const slotStatus = await cu12Manager.getSlotStatus();
      if (!slotStatus[slotId - 1]?.isActive) {
        throw new Error(`Slot ${slotId} is not active`);
      }
      
      // 2. Execute unlock command
      const success = await cu12Manager.unlockSlot(slotId);
      
      // 3. Log dispensing attempt
      if (success) {
        await logDispensingEvent({
          userId,
          slotId,
          hn,
          process: 'unlock',
          message: 'Slot unlocked successfully'
        });
      }
      
      return success;
    } catch (error) {
      logger.error('CU12 unlock failed:', error);
      return false;
    }
  });
};
```

### IPC Channel Mapping
```typescript
// Channel migration mapping
const ipcChannelMigration = {
  // Initialization
  'init' → 'cu12-init',
  
  // Slot operations  
  'unlock' → 'cu12-unlock',
  'dispensing' → 'cu12-dispensing',
  'reset' → 'cu12-reset',
  
  // Status and monitoring
  'check-locked-back' → 'cu12-check-status',
  'get-port-list' → 'cu12-get-ports',
  
  // Admin operations
  'deactivate' → 'cu12-deactivate',
  'deactivate-all' → 'cu12-deactivate-all',
  'reactivate-admin' → 'cu12-reactivate',
  'reactivate-all' → 'cu12-reactivate-all'
};
```

## 🔧 Real-time State Management

### Slot State Synchronization
```typescript
class HardwareStateManager {
  private slotStates: Map<number, SlotState> = new Map();
  private lastUpdate: number = 0;
  
  async updateSlotStates(): Promise<void> {
    try {
      // Get current status from CU12 device
      const deviceStatus = await cu12Manager.getSlotStatus();
      
      // Compare with database state
      const dbSlots = await getAllSlots();
      
      // Merge states and detect changes
      const changes = this.detectStateChanges(deviceStatus, dbSlots);
      
      if (changes.length > 0) {
        // Update database
        await this.updateDatabase(changes);
        
        // Notify renderer process
        this.notifyRenderer(changes);
        
        // Log state changes
        await this.logStateChanges(changes);
      }
      
      this.lastUpdate = Date.now();
    } catch (error) {
      logger.error('State synchronization failed:', error);
    }
  }
  
  private detectStateChanges(deviceStatus: any[], dbSlots: any[]): StateChange[] {
    const changes: StateChange[] = [];
    
    // Check for status mismatches
    for (let i = 0; i < Math.min(deviceStatus.length, 12); i++) {
      const deviceSlot = deviceStatus[i];
      const dbSlot = dbSlots.find(s => s.slotId === i + 1);
      
      if (deviceSlot && dbSlot) {
        if (deviceSlot.occupied !== dbSlot.occupied) {
          changes.push({
            slotId: i + 1,
            field: 'occupied',
            oldValue: dbSlot.occupied,
            newValue: deviceSlot.occupied
          });
        }
        
        if (deviceSlot.opening !== dbSlot.opening) {
          changes.push({
            slotId: i + 1,
            field: 'opening', 
            oldValue: dbSlot.opening,
            newValue: deviceSlot.opening
          });
        }
      }
    }
    
    return changes;
  }
}
```

## 🚨 Error Handling & Recovery

### Connection Error Recovery
```typescript
class HardwareErrorHandler {
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries: number = 3;
  private backoffDelay: number = 1000; // Start with 1 second
  
  async handleConnectionError(error: Error, operation: string): Promise<boolean> {
    logger.error(`CU12 ${operation} failed:`, error);
    
    const attempts = this.retryAttempts.get(operation) || 0;
    
    if (attempts < this.maxRetries) {
      // Exponential backoff retry
      const delay = this.backoffDelay * Math.pow(2, attempts);
      await this.sleep(delay);
      
      this.retryAttempts.set(operation, attempts + 1);
      
      try {
        // Attempt reconnection
        await cu12Manager.reconnect();
        
        // Reset retry counter on success
        this.retryAttempts.delete(operation);
        return true;
      } catch (retryError) {
        logger.error(`Retry ${attempts + 1} failed:`, retryError);
        return false;
      }
    } else {
      // Max retries exceeded - enter safe mode
      await this.enterSafeMode(error, operation);
      return false;
    }
  }
  
  private async enterSafeMode(error: Error, operation: string): Promise<void> {
    logger.error('Entering safe mode due to repeated failures');
    
    // 1. Stop all hardware operations
    cu12Manager.stop();
    
    // 2. Notify renderer about hardware failure
    mainWindow.webContents.send('hardware-error', {
      error: error.message,
      operation,
      safeMode: true
    });
    
    // 3. Log critical error
    await logger.critical(`Hardware failure in ${operation}`, error);
  }
}
```

### Timeout and Communication Handling
```typescript
class CU12CommunicationHandler {
  private static readonly COMMAND_TIMEOUT = 3000; // 3 seconds
  private static readonly MAX_PACKET_SIZE = 48;
  
  async sendCommandWithTimeout(packet: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('CU12 command timeout'));
      }, CU12CommunicationHandler.COMMAND_TIMEOUT);
      
      this.serialPort.write(packet, (writeError) => {
        if (writeError) {
          clearTimeout(timeout);
          reject(writeError);
          return;
        }
        
        // Wait for response
        this.serialPort.once('data', (response: Buffer) => {
          clearTimeout(timeout);
          
          try {
            if (this.validateResponse(response)) {
              resolve(response);
            } else {
              reject(new Error('Invalid response packet'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }
  
  private validateResponse(response: Buffer): boolean {
    // 1. Check minimum packet size
    if (response.length < 8) return false;
    
    // 2. Check STX and ETX markers
    if (response[0] !== 0x02 || response[6] !== 0x03) return false;
    
    // 3. Validate checksum
    if (!this.validateChecksum(response)) return false;
    
    // 4. Check response code
    const responseCode = response[4];
    const validCodes = [0x10, 0x11, 0x12, 0x13, 0x14];
    if (!validCodes.includes(responseCode)) return false;
    
    return true;
  }
}
```

## 🧪 Hardware Testing Framework

### Device Detection Tests
```typescript
describe('CU12 Device Detection', () => {
  let deviceManager: CU12DeviceManager;
  
  beforeEach(() => {
    deviceManager = new CU12DeviceManager();
  });
  
  test('should detect CU12 device on available ports', async () => {
    const ports = await SerialPort.list();
    const detectedPort = await deviceManager.autoDetectDevice();
    
    expect(detectedPort).toBeTruthy();
    expect(ports.some(p => p.path === detectedPort)).toBe(true);
  });
  
  test('should establish communication with detected device', async () => {
    const port = await deviceManager.autoDetectDevice();
    const connected = await deviceManager.connect(port);
    
    expect(connected).toBe(true);
    
    // Test basic communication
    const status = await deviceManager.getSlotStatus();
    expect(Array.isArray(status)).toBe(true);
    expect(status.length).toBe(12);
  });
});
```

### Integration Tests
```typescript
describe('CU12 Integration Tests', () => {
  test('should handle complete unlock workflow', async () => {
    // 1. Initialize device
    const initialized = await cu12Manager.initialize({
      port: '/dev/ttyUSB0',
      baudrate: 19200
    });
    expect(initialized).toBe(true);
    
    // 2. Get initial status
    const initialStatus = await cu12Manager.getSlotStatus();
    expect(initialStatus[0].opening).toBe(false);
    
    // 3. Unlock slot 1
    const unlocked = await cu12Manager.unlockSlot(1);
    expect(unlocked).toBe(true);
    
    // 4. Verify status changed
    const updatedStatus = await cu12Manager.getSlotStatus();
    expect(updatedStatus[0].opening).toBe(true);
    
    // 5. Wait for automatic lock
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 6. Verify slot locked again
    const finalStatus = await cu12Manager.getSlotStatus();
    expect(finalStatus[0].opening).toBe(false);
  });
});
```

## 📋 Round 2 Implementation Priorities

### Task A: IPC Handler Migration
1. **Replace KU16 Handlers**: Migrate all IPC handlers to CU12
2. **Channel Updates**: Update IPC channel names and signatures
3. **Error Handling**: Implement CU12-specific error handling
4. **Logging Integration**: Connect to existing logging system

### Task B: State Management & Testing
1. **Real-time Sync**: Implement slot state synchronization
2. **Connection Monitoring**: Heartbeat and error recovery
3. **Integration Tests**: Comprehensive hardware testing
4. **Performance Testing**: Validate response times

### Success Criteria for Round 2
- [ ] All IPC handlers migrated to CU12
- [ ] Real-time slot state synchronization working
- [ ] Connection error recovery functional
- [ ] Integration tests passing
- [ ] Performance meets requirements (≤3s response time)
- [ ] No breaking changes to renderer process