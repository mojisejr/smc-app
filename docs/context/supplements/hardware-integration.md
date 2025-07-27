# Hardware Integration & Adaptive Smart State Management

## 🔌 CU12 Adaptive Integration Architecture

### Integration Layer Overview
```typescript
// Adaptive Smart State Management integration points
interface CU12AdaptiveIntegration {
  stateManager: CU12SmartStateManager;      // Adaptive state management with modes
  deviceManager: CU12DeviceManager;        // Resource-efficient device communication
  ipcHandlers: CU12OptimizedIPCHandlers;   // Optimized IPC with caching
  errorHandler: CU12FailureDetector;       // Intelligent failure detection
  monitoringConfig: CU12MonitoringConfig;  // 24/7 stability configuration
}
```

### Adaptive Smart State Management
```typescript
class CU12SmartStateManager {
  private monitoringMode: 'idle' | 'active' | 'operation' = 'idle';
  private lastSyncTime: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private userActivityTimeout: NodeJS.Timeout | null = null;
  
  // Configuration for 24/7 stability
  private readonly CONFIG = {
    HEALTH_CHECK_INTERVAL: 5 * 60 * 1000,    // 5 minutes
    USER_INACTIVE_TIMEOUT: 2 * 60 * 1000,    // 2 minutes
    OPERATION_TIMEOUT: 30 * 1000,            // 30 seconds
    CACHE_TTL: 5 * 1000,                     // 5 seconds
    MAX_CONSECUTIVE_FAILURES: 3
  };
  
  // Sync strategies for different scenarios
  private readonly SYNC_STRATEGIES = {
    ON_DEMAND: 'on_demand',           // When user interacts
    HEALTH_CHECK: 'health_check',     // System health validation
    PRE_OPERATION: 'pre_operation',   // Before unlock/dispense
    POST_OPERATION: 'post_operation'  // After operation complete
  };
  
  async initialize(): Promise<boolean> {
    // 1. Start in idle mode with minimal resource usage
    // 2. Set up adaptive monitoring based on activity
    // 3. Initialize failure detection systems
    // 4. Configure intelligent caching
    await this.startIdleMode();
    return true;
  }
  
  async startIdleMode(): Promise<void> {
    this.monitoringMode = 'idle';
    this.stopAllActiveMonitoring();
    
    // Lightweight health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.quickHealthCheck();
      } catch (error) {
        await this.handleHealthCheckError(error);
      }
    }, this.CONFIG.HEALTH_CHECK_INTERVAL);
  }
  
  async onUserInteraction(): Promise<void> {
    this.monitoringMode = 'active';
    this.stopIdleMode();
    
    // Immediate sync when user becomes active
    await this.syncSlotStatus('ON_DEMAND');
    
    // Set timeout to return to idle mode
    this.userActivityTimeout = setTimeout(() => {
      if (this.monitoringMode === 'active') {
        this.startIdleMode();
      }
    }, this.CONFIG.USER_INACTIVE_TIMEOUT);
  }
  
  async quickHealthCheck(): Promise<void> {
    // Minimal resource health check - just ping hardware
    const isResponding = await this.device.testCommunication();
    if (!isResponding) {
      throw new Error('Hardware not responding');
    }
  }
}
```

## 🔄 Optimized IPC Handler Migration

### Resource-Efficient IPC Architecture
```typescript
// Optimized IPC handlers with caching and batch operations
interface CU12OptimizedIPCHandlers {
  cache: Map<string, {data: any, timestamp: number}>;
  batchQueue: BatchOperation[];
  
  // Resource optimization methods
  getCachedResponse<T>(key: string, ttl: number): T | null;
  batchOperations(operations: BatchOperation[]): Promise<BatchResult[]>;
  optimizeChannelUsage(): void;
}
```

### Enhanced CU12 IPC Handlers
```typescript
// main/hardware/cu12/ipcMain/init.ts
export const initCU12Handler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-init', async (event, params) => {
    try {
      const { init } = params;
      if (init) {
        // Trigger active mode when user initiates
        await stateManager.onUserInteraction();
        
        const settings = await getSetting();
        const success = await stateManager.initialize({
          port: settings.cu_port,
          baudrate: settings.cu_baudrate || 19200
        });
        
        if (success) {
          // Get status using adaptive sync
          const slotStatus = await stateManager.syncSlotStatus('ON_DEMAND');
          event.sender.send('cu12-slot-update', slotStatus);
        }
        
        await logger.info('CU12 initialization', { success, port: settings.cu_port });
        return success;
      }
    } catch (error) {
      await logger.error('CU12 initialization failed', error);
      return false;
    }
  });
};

// main/hardware/cu12/ipcMain/unlock.ts
export const unlockCU12Handler = (stateManager: CU12SmartStateManager) => {
  ipcMain.handle('cu12-unlock', async (event, params) => {
    try {
      const { slotId, userId, hn } = params;
      
      // Enter operation mode for focused monitoring
      await stateManager.enterOperationMode(slotId);
      
      // 1. Pre-operation sync and validation
      const slotStatus = await stateManager.syncSlotStatus('PRE_OPERATION');
      if (!slotStatus[slotId - 1]?.isActive) {
        throw new Error(`Slot ${slotId} is not active`);
      }
      
      // 2. Execute unlock with operation monitoring
      const success = await stateManager.performUnlockOperation(slotId);
      
      // 3. Post-operation sync
      if (success) {
        await stateManager.syncSlotStatus('POST_OPERATION');
        await logger.info('Slot unlocked successfully', { 
          slotId, userId, hn, timestamp: Date.now() 
        });
      }
      
      return success;
    } catch (error) {
      await logger.error('CU12 unlock failed', { error: error.message, slotId });
      return false;
    } finally {
      // Return to active mode
      await stateManager.exitOperationMode();
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

## 🚨 Intelligent Failure Detection & Recovery

### Advanced Error Handling with Circuit Breaker
```typescript
class CU12FailureDetector {
  private consecutiveFailures: Map<string, number> = new Map();
  private circuitState: Map<string, 'closed' | 'open' | 'half-open'> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private readonly CONFIG = {
    MAX_FAILURES: 3,
    CIRCUIT_TIMEOUT: 30 * 1000,  // 30 seconds
    INITIAL_BACKOFF: 1000,       // 1 second
    MAX_BACKOFF: 30 * 1000       // 30 seconds
  };
  
  async handleOperationError(error: Error, operation: string): Promise<boolean> {
    await logger.warn('CU12 operation error detected', { 
      operation, 
      error: error.message,
      timestamp: Date.now() 
    });
    
    // Check circuit breaker state
    if (this.isCircuitOpen(operation)) {
      await logger.warn('Circuit breaker open, operation blocked', { operation });
      return false;
    }
    
    const failures = this.consecutiveFailures.get(operation) || 0;
    this.consecutiveFailures.set(operation, failures + 1);
    this.lastFailureTime.set(operation, Date.now());
    
    // Open circuit if too many failures
    if (failures + 1 >= this.CONFIG.MAX_FAILURES) {
      await this.openCircuit(operation);
    }
    
    // Attempt recovery with exponential backoff
    return await this.attemptRecovery(operation, failures);
  }
  
  private async attemptRecovery(operation: string, failures: number): Promise<boolean> {
    const backoffTime = Math.min(
      this.CONFIG.INITIAL_BACKOFF * Math.pow(2, failures),
      this.CONFIG.MAX_BACKOFF
    );
    
    await this.sleep(backoffTime);
    
    try {
      // Test hardware communication
      const isHealthy = await this.performHealthCheck();
      
      if (isHealthy) {
        // Reset failure counter on successful recovery
        this.consecutiveFailures.delete(operation);
        this.circuitState.set(operation, 'closed');
        await logger.info('Hardware recovery successful', { operation });
        return true;
      }
    } catch (recoveryError) {
      await logger.error('Recovery attempt failed', { 
        operation, 
        error: recoveryError.message 
      });
    }
    
    return false;
  }
  
  private async openCircuit(operation: string): Promise<void> {
    this.circuitState.set(operation, 'open');
    await logger.error('Circuit breaker opened', { 
      operation,
      failures: this.consecutiveFailures.get(operation)
    });
    
    // Schedule circuit half-open after timeout
    setTimeout(() => {
      this.circuitState.set(operation, 'half-open');
      logger.info('Circuit breaker half-open', { operation });
    }, this.CONFIG.CIRCUIT_TIMEOUT);
  }
  
  async detectAnomalies(): Promise<StateAnomaly[]> {
    const anomalies: StateAnomaly[] = [];
    
    try {
      // 1. Communication timeout detection
      const responseTime = await this.measureResponseTime();
      if (responseTime > 3000) {
        anomalies.push({
          type: 'SLOW_RESPONSE',
          severity: 'WARNING',
          details: `Response time: ${responseTime}ms`
        });
      }
      
      // 2. State inconsistency detection
      const stateInconsistencies = await this.detectStateInconsistencies();
      anomalies.push(...stateInconsistencies);
      
      // 3. Resource usage monitoring
      const resourceIssues = await this.checkResourceUsage();
      anomalies.push(...resourceIssues);
      
    } catch (error) {
      await logger.error('Anomaly detection failed', error);
    }
    
    return anomalies;
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

## 📊 Resource Optimization for 24/7 Operation

### Intelligent Caching System
```typescript
class CU12ResourceOptimizer {
  private cache = new Map<string, {data: any, timestamp: number, hits: number}>();
  private connectionPool: Map<string, CU12Device> = new Map();
  
  async getCachedResponse<T>(key: string, ttl: number = 5000): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      cached.hits++;
      return cached.data;
    }
    return null;
  }
  
  async batchOperations(operations: BatchOperation[]): Promise<BatchResult[]> {
    // Group operations by type for efficiency
    const grouped = this.groupOperationsByType(operations);
    const results: BatchResult[] = [];
    
    for (const [type, ops] of grouped) {
      switch (type) {
        case 'GET_STATUS':
          // Single GET_STATUS call gets all 12 slots
          const allStatus = await this.device.getSlotStatus();
          ops.forEach(op => {
            results.push({
              operationId: op.id,
              result: allStatus[op.slotId - 1]
            });
          });
          break;
          
        case 'UNLOCK':
          // Process unlock operations sequentially with minimal delay
          for (const op of ops) {
            const result = await this.device.unlockSlot(op.slotId);
            results.push({ operationId: op.id, result });
          }
          break;
      }
    }
    
    return results;
  }
  
  async optimizeMemoryUsage(): Promise<void> {
    // Clean expired cache entries
    const now = Date.now();
    for (const [key, value] of this.cache) {
      if (now - value.timestamp > 60000) { // 1 minute max age
        this.cache.delete(key);
      }
    }
    
    // Log cache statistics
    await logger.debug('Cache stats', {
      entries: this.cache.size,
      totalHits: Array.from(this.cache.values()).reduce((sum, v) => sum + v.hits, 0)
    });
  }
}
```

### Structured Logging with Monitoring
```typescript
interface LogEntry {
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  timestamp: number;
  component: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, any>;
  message: string;
}

class CU12StructuredLogger {
  private logBuffer: LogEntry[] = [];
  private readonly LOG_LEVELS = {
    TRACE: 0,    // Detailed debugging (function entry/exit)
    DEBUG: 1,    // Development debugging info
    INFO: 2,     // Normal operations, state changes
    WARN: 3,     // Recoverable errors, performance issues  
    ERROR: 4,    // Operation failures
    FATAL: 5     // System failures requiring intervention
  };
  
  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log('INFO', 'CU12StateManager', message, metadata);
  }
  
  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log('WARN', 'CU12StateManager', message, metadata);
  }
  
  async error(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.log('ERROR', 'CU12StateManager', message, metadata);
  }
  
  private async log(level: LogEntry['level'], component: string, message: string, metadata?: Record<string, any>): Promise<void> {
    const entry: LogEntry = {
      level,
      timestamp: Date.now(),
      component,
      message,
      metadata
    };
    
    // Add to buffer for batch processing
    this.logBuffer.push(entry);
    
    // Immediate console output for development
    console.log(`[${level}] ${component}: ${message}`, metadata || '');
    
    // Batch flush to prevent performance impact
    if (this.logBuffer.length >= 10) {
      await this.flushLogs();
    }
  }
  
  async generateMonitoringReport(): Promise<MonitoringReport> {
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentLogs = this.logBuffer.filter(log => log.timestamp > last24h);
    
    return {
      totalOperations: recentLogs.filter(l => l.level === 'INFO').length,
      errorRate: recentLogs.filter(l => l.level === 'ERROR').length / recentLogs.length,
      averageResponseTime: this.calculateAverageResponseTime(recentLogs),
      resourceUsage: await this.getCurrentResourceUsage(),
      uptimeHours: (Date.now() - this.startTime) / (60 * 60 * 1000)
    };
  }
}
```

## 📋 Round 2 Implementation Priorities

### Task A: Adaptive IPC Handler Migration
1. **Resource-Optimized Handlers**: Migrate all IPC handlers with caching and batching
2. **Smart State Management**: Implement idle/active/operation mode switching
3. **Structured Logging**: Add comprehensive monitoring with log levels
4. **Configuration Management**: Create tunable parameters for 24/7 operation

### Task B: Intelligent Failure Detection & Testing
1. **Circuit Breaker Pattern**: Implement failure detection with recovery
2. **Anomaly Detection**: Monitor state inconsistencies and performance
3. **24/7 Stability Testing**: Long-running operation validation
4. **Resource Monitoring**: CPU, memory, and connection usage tracking

### Success Criteria for Round 2
- [ ] Resource efficiency: <5% CPU idle, <15% during operations
- [ ] 24/7 stability: No memory leaks or performance degradation
- [ ] Adaptive monitoring: Intelligent mode switching based on activity
- [ ] Circuit breaker: Automatic failure detection and recovery
- [ ] Structured logging: Comprehensive monitoring capabilities
- [ ] No breaking changes to renderer process