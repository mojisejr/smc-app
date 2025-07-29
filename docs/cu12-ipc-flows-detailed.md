# CU12 IPC Flows - Complete Documentation

**Hardware**: CU12 (Modern 12-slot Medication Cabinet)  
**Purpose**: Detailed IPC flow documentation for Claude Code understanding  
**Status**: Production system with Universal Adapter compatibility

## CU12 Hardware Overview

CU12 is the modern Smart Medication Cabinet hardware with advanced features:
- **Slots**: 12 medication slots (fixed)
- **Communication**: Packet-based serial protocol with checksums
- **State Management**: 3-mode adaptive monitoring system (idle/active/operation)
- **Protocol**: Custom packet structure with STX/ETX framing
- **Monitoring**: Intelligent resource optimization with circuit breaker pattern
- **Baud Rate**: 19200 with robust error handling

## CU12 State Manager Architecture

```mermaid
graph TB
    subgraph "CU12SmartStateManager"
        A[Monitoring Controller] --> B{Current Mode}
        B -->|idle| C[5-min Health Checks]
        B -->|active| D[Real-time Monitoring]
        B -->|operation| E[Focused Operation Mode]
        
        F[Resource Optimizer] --> G[Intelligent Caching]
        F --> H[Memory Management]
        F --> I[Circuit Breaker]
        
        J[Failure Detector] --> K[Anomaly Detection]
        J --> L[Exponential Backoff]
        J --> M[Recovery Mechanisms]
    end
```

### Adaptive Monitoring Modes

#### Mode Transitions
```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> active : User Interaction
    active --> operation : Core Operation Start
    operation --> active : Operation Complete
    active --> idle : 2min Inactivity Timeout
    
    idle : 5-minute health checks
    active : Real-time monitoring
    operation : Focused slot monitoring
```

## Complete CU12 IPC Handler Map

### Core Operations (Universal Adapters)

#### 1. System Initialization - `init` → `cu12-init`
**File**: `main/hardware/cu12/ipcMain/init.ts:10`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('init')
    Adapter->>StateManager: cu12InitHandler(stateManager, mainWindow)
    StateManager->>StateManager: Switch to 'active' mode
    StateManager->>Device: cu12Device.getStatus()
    Device-->>StateManager: Slot status (12 slots, 2 bytes)
    StateManager->>DB: Transform to KU16 format
    StateManager->>Frontend: webContents.send('init-res', ku16CompatibleData)
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

**Parameters**: Any  
**Returns**: `{success: boolean, connected?: boolean, monitoringMode?: string, slotStatus?: SlotStatus[], error?: string}`  
**Hardware Operation**: Triggers user interaction monitoring and status sync

#### 2. Slot Unlock - `unlock` → `cu12-unlock`
**File**: `main/hardware/cu12/ipcMain/unlock.ts:14`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('unlock', {passkey, slotId, hn})
    Adapter->>StateManager: cu12UnlockHandler(stateManager)
    StateManager->>StateManager: Switch to 'operation' mode
    StateManager->>DB: Validate user authentication
    alt Authentication Success
        StateManager->>Device: cu12Device.unlock(slotId)
        Device-->>StateManager: Unlock command response
        StateManager->>DB: Log unlock operation
        StateManager->>StateManager: Switch to 'active' mode
        StateManager->>Frontend: Return {success: true, slotId, monitoringMode: 'active'}
        StateManager->>Frontend: webContents.send('unlocking-success')
    else Authentication Failed
        StateManager->>Frontend: Return {success: false, error: 'Authentication failed'}
        StateManager->>Frontend: webContents.send('unlocking-error')
    end
```

**Parameters**: `{passkey: string, slotId: number, hn?: string}`  
**Returns**: `{success: boolean, slotId: number, monitoringMode?: string, error?: string}`  
**Hardware Operation**: CU12 protocol unlock command with operation mode management

#### 3. Medication Dispensing - `dispense` → `cu12-dispense`
**File**: `main/hardware/cu12/ipcMain/dispensing.ts:14`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('dispense', {passkey, slotId, hn})
    Adapter->>StateManager: cu12DispenseHandler(stateManager)
    StateManager->>StateManager: Switch to 'operation' mode
    StateManager->>DB: Validate user and slot availability
    alt Validation Success
        StateManager->>Device: Pre-operation status check
        StateManager->>Device: cu12Device.unlock(slotId) // Dispense = unlock for CU12
        Device-->>StateManager: Operation confirmation
        StateManager->>DB: Create dispensing log entry
        StateManager->>StateManager: Monitor slot status
        StateManager->>Frontend: Return {success: true, slotId, message: 'Dispensing initiated'}
        StateManager->>Frontend: webContents.send('dispensing-success')
        
        Note over StateManager: Continuous monitoring for slot closure
        StateManager->>Device: Monitor slot closure
        Device-->>StateManager: Slot locked back confirmation
        StateManager->>Frontend: webContents.send('dispensing-locked-back')
        StateManager->>StateManager: Switch to 'active' mode
    else Validation Failed
        StateManager->>Frontend: Return {success: false, error: 'Validation failed'}
        StateManager->>Frontend: webContents.send('dispensing-error')
    end
```

**Parameters**: `{passkey: string, slotId: number, hn?: string}`  
**Returns**: `{success: boolean, slotId: number, message?: string, monitoringMode?: string, error?: string}`  
**Hardware Operation**: Dispense operation with pre/post status checks and continuous monitoring

#### 4. Continue Dispensing - `dispense-continue` → `cu12-dispense-continue`
**File**: `main/hardware/cu12/ipcMain/dispensing-continue.ts:11`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('dispense-continue', {slotId, userId, hn})
    Adapter->>StateManager: cu12DispenseContinueHandler(stateManager)
    StateManager->>StateManager: Switch to 'operation' mode
    StateManager->>DB: Validate continuation permission
    StateManager->>Device: Get current slot status
    alt Continue Permission Granted
        StateManager->>Device: cu12Device.unlock(slotId) // Continue dispensing
        Device-->>StateManager: Continue confirmation
        StateManager->>DB: Update existing dispensing log
        StateManager->>Frontend: Return {success: true, slotId, message: 'Continue dispensing'}
        StateManager->>Frontend: webContents.send('dispensing-continue-success')
        StateManager->>StateManager: Switch to 'active' mode
    else Permission Denied or Error
        StateManager->>Frontend: Return {success: false, error: 'Continue not allowed'}
        StateManager->>Frontend: webContents.send('dispensing-continue-error')
    end
```

**Parameters**: `{slotId: number, userId?: number, hn?: string}`  
**Returns**: `{success: boolean, slotId: number, message?: string, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Hardware Operation**: Continues dispensing process with state validation

#### 5. Slot Reset - `reset` → `cu12-reset`
**File**: `main/hardware/cu12/ipcMain/reset.ts:14`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('reset', {slotId})
    Adapter->>StateManager: cu12ResetHandler(stateManager)
    StateManager->>StateManager: Switch to 'operation' mode
    StateManager->>Device: Get current slot status
    StateManager->>DB: Complete dispensing log entry
    StateManager->>Device: Reset slot state (if needed)
    Device-->>StateManager: Reset confirmation
    StateManager->>Frontend: Return {success: true, slotId, message: 'Slot reset complete'}
    StateManager->>Frontend: webContents.send('reset-success')
    StateManager->>StateManager: Switch to 'active' mode, trigger sync
```

**Parameters**: `{slotId: number}`  
**Returns**: `{success: boolean, slotId: number, message?: string, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Hardware Operation**: Completes dispensing process and resets slot state

#### 6. Force Reset - `force-reset` → `cu12-force-reset`
**File**: `main/hardware/cu12/ipcMain/forceReset.ts:12`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('force-reset', {slotId})
    Adapter->>StateManager: cu12ForceResetHandler(stateManager)
    StateManager->>StateManager: Switch to 'operation' mode
    StateManager->>StateManager: Clear failure tracking for slot
    StateManager->>Device: Force reset hardware state
    Device-->>StateManager: Force reset confirmation
    StateManager->>DB: Log emergency reset operation
    StateManager->>Frontend: Return {success: true, slotId, message: 'Force reset complete'}
    StateManager->>Frontend: webContents.send('force-reset-success')
    StateManager->>StateManager: Switch to 'active' mode, trigger sync
```

**Parameters**: `{slotId: number}`  
**Returns**: `{success: boolean, slotId: number, message?: string, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Hardware Operation**: Emergency reset bypassing normal checks, clears failure tracking

#### 7. Lock Status Check - `check-locked-back` → `cu12-check-locked-back`
**File**: `main/hardware/cu12/ipcMain/status.ts:46`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    
    Frontend->>Adapter: ipcRenderer.invoke('check-locked-back', {slotId})
    Adapter->>StateManager: cu12CheckLockedBackHandler(stateManager)
    StateManager->>Device: cu12Device.getStatus() // Instant check
    Device-->>StateManager: Current slot status (2 bytes)
    StateManager->>StateManager: Parse specific slot lock status
    StateManager->>Frontend: Return {success: true, slotId, isLockedBack: boolean, slotStatus}
```

**Parameters**: `{slotId: number}`  
**Returns**: `{success: boolean, slotId: number, isLockedBack?: boolean, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Hardware Operation**: Instant lock status check for user-controlled flow

### Status and Monitoring Operations

#### 8. System Status - `cu12-get-status`
**File**: `main/hardware/cu12/ipcMain/status.ts:11`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant StateManager as CU12StateManager
    participant Device as CU12Device
    participant Monitor as Failure Detector
    
    Frontend->>StateManager: ipcRenderer.invoke('cu12-get-status')
    StateManager->>StateManager: Switch to 'active' mode
    StateManager->>Device: cu12Device.getStatus()
    Device-->>StateManager: Complete slot status (12 slots)
    StateManager->>Monitor: Get health status
    Monitor-->>StateManager: Health report
    StateManager->>Frontend: Return {success: true, connected: true, monitoringMode: 'active', slotStatus, healthStatus}
```

**Parameters**: Any  
**Returns**: `{success: boolean, connected: boolean, monitoringMode: string, slotStatus?: SlotStatus[], healthStatus?: object, timestamp?: number, error?: string}`  
**Hardware Operation**: Triggers active monitoring and provides comprehensive status

#### 9. Health Check - `cu12-health-check`
**File**: `main/hardware/cu12/ipcMain/status.ts:23`
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant StateManager as CU12StateManager
    participant Monitor as Failure Detector
    participant Optimizer as Resource Optimizer
    
    Frontend->>StateManager: ipcRenderer.invoke('cu12-health-check')
    StateManager->>Monitor: Generate monitoring report
    Monitor-->>StateManager: Comprehensive health status
    StateManager->>Optimizer: Get resource metrics
    Optimizer-->>StateManager: Performance metrics
    StateManager->>Frontend: Return {success: true, healthStatus, monitoringReport, connected: true}
```

**Parameters**: Any  
**Returns**: `{success: boolean, healthStatus?: object, monitoringReport?: object, connected: boolean, monitoringMode?: string, timestamp?: number, error?: string}`  
**Hardware Operation**: Comprehensive health check with monitoring reports

### Administrative Operations (Universal Adapters)

#### 10. Admin Deactivation - `deactivate-admin` → `cu12-deactivate`
**File**: `main/hardware/cu12/ipcMain/deactivate.ts:11`
```mermaid
sequenceDiagram
    participant Frontend as Admin Dashboard
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('deactivate-admin', {slotId})
    Adapter->>StateManager: cu12DeactivateHandler(stateManager)
    StateManager->>DB: UPDATE slot SET isActive = false WHERE id = slotId
    DB-->>StateManager: Database update confirmation
    StateManager->>StateManager: triggerFrontendSync() // Real-time update
    StateManager->>Frontend: Return {success: true, slotId, message: 'Slot deactivated'}
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

**Parameters**: `{slotId: number}`  
**Returns**: `{success: boolean, slotId: number, message?: string, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Database Operation**: Updates slot active status with immediate frontend sync

#### 11. Bulk Deactivation - `deactivate-all` → `cu12-deactivate-all`
**File**: `main/hardware/cu12/ipcMain/deactivate.ts:32`
```mermaid
sequenceDiagram
    participant Frontend as Admin Dashboard
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('deactivate-all')
    Adapter->>StateManager: cu12DeactivateAllHandler(stateManager)
    StateManager->>DB: UPDATE slot SET isActive = false (all slots)
    DB-->>StateManager: Bulk update confirmation
    StateManager->>StateManager: triggerFrontendSync() // Refresh all slots
    StateManager->>Frontend: Return {success: true, message: 'All slots deactivated', slotStatuses}
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

**Parameters**: Any  
**Returns**: `{success: boolean, message?: string, slotStatuses?: SlotStatus[], monitoringMode?: string, error?: string}`  
**Database Operation**: Bulk deactivation with comprehensive frontend sync

#### 12. Admin Reactivation - `reactivate-admin` → `cu12-reactivate-admin`
**File**: `main/hardware/cu12/ipcMain/reactivate.ts:14`
```mermaid
sequenceDiagram
    participant Frontend as Admin Dashboard
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('reactivate-admin', {slotId})
    Adapter->>StateManager: cu12ReactivateAdminHandler(stateManager)
    StateManager->>DB: UPDATE slot SET isActive = true WHERE id = slotId
    DB-->>StateManager: Database update confirmation
    StateManager->>StateManager: triggerFrontendSync() // Real-time update
    StateManager->>Frontend: Return {success: true, slotId, message: 'Slot reactivated'}
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

**Parameters**: `{slotId: number}`  
**Returns**: `{success: boolean, slotId: number, message?: string, slotStatus?: SlotStatus, monitoringMode?: string, error?: string}`  
**Database Operation**: Reactivates specific slot with immediate sync

#### 13. Bulk Reactivation - `reactivate-all` → `cu12-reactivate-all`
**File**: `main/hardware/cu12/ipcMain/reactivate.ts:32`
```mermaid
sequenceDiagram
    participant Frontend as Admin Dashboard
    participant Adapter as Universal Adapter
    participant StateManager as CU12StateManager
    participant DB as Database
    
    Frontend->>Adapter: ipcRenderer.invoke('reactivate-all')
    Adapter->>StateManager: cu12ReactivateAllHandler(stateManager)
    StateManager->>DB: UPDATE slot SET isActive = true (all slots)
    DB-->>StateManager: Bulk update confirmation
    StateManager->>StateManager: triggerFrontendSync() // Refresh all slots
    StateManager->>Frontend: Return {success: true, message: 'All slots reactivated', slotStatuses}
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

**Parameters**: Any  
**Returns**: `{success: boolean, message?: string, slotStatuses?: SlotStatus[], monitoringMode?: string, error?: string}`  
**Database Operation**: Bulk reactivation with comprehensive frontend sync

## CU12 Hardware Protocol

### Packet Structure
**File**: `main/hardware/cu12/protocol.ts:45-65`

CU12 uses a sophisticated packet-based protocol:
```
STX(1) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(1) + CHECKSUM(1) + DATA(n)
```

### Protocol Commands
```typescript
// Command definitions
GET_STATUS = 0x80    // Request all slot status
UNLOCK = 0x81        // Unlock specific slot
// Additional configuration commands...

// Response codes
SUCCESS = 0x10       // Operation successful
FAILED = 0x11        // Operation failed
TIMEOUT = 0x12       // Communication timeout
```

### Slot Status Format
CU12 represents 12 slots in 2 bytes (16 bits):
```mermaid
graph LR
    A[Hardware Response] --> B[2 Bytes: 16 bits]
    B --> C[Bits 0-11: Slot Status]
    C --> D[1 = Locked, 0 = Unlocked]
    B --> E[Bits 12-15: Reserved]
```

### Checksum Calculation
```typescript
// Checksum = sum of all bytes (low byte only)
const checksum = packet.reduce((sum, byte) => sum + byte, 0) & 0xFF;
```

## CU12 Adaptive Monitoring System

### Resource Optimization Features

#### Intelligent Caching
```mermaid
graph TB
    A[IPC Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Fetch from Hardware]
    D --> E[Cache with TTL]
    E --> F[Return Fresh Data]
    
    G[Timer: 5 seconds] --> H[Cache Expiration]
    H --> I[Clear Cache Entry]
```

**Default TTL**: 5 seconds  
**Cache Keys**: `slot_status`, `health_check`, `device_info`

#### Circuit Breaker Pattern
```mermaid
stateDiagram-v2
    [*] --> closed
    closed --> open : 3 Consecutive Failures
    open --> half_open : 30s Recovery Timeout
    half_open --> closed : Success
    half_open --> open : Failure
    
    closed : Normal Operation
    open : Block All Requests
    half_open : Test Recovery
```

**Failure Threshold**: 3 consecutive failures  
**Recovery Timeout**: 30 seconds  
**Exponential Backoff**: 1s → 2s → 4s → 8s → 16s → 30s (max)

### Failure Detection and Recovery

#### Anomaly Detection Categories
**File**: `main/hardware/cu12/errorHandler.ts:85-120`

1. **Slow Response Detection** (>3s threshold)
2. **State Inconsistency Checks** (hardware vs database)
3. **Resource Usage Monitoring** (memory/CPU)
4. **Communication Error Detection** (circuit breaker status)

#### Health Status Classification
```mermaid
graph TB
    A[System Metrics] --> B{Health Check}
    B -->|No Issues| C[healthy: All systems normal]
    B -->|Minor Issues| D[warning: Performance degraded]
    B -->|Critical Issues| E[error: System requires attention]
```

## Real-time Frontend Synchronization

### triggerFrontendSync() Method
**File**: `main/hardware/cu12/stateManager.ts:380-410`

```mermaid
sequenceDiagram
    participant Admin as Admin Dashboard
    participant StateManager as CU12StateManager
    participant Cache as Resource Cache
    participant Device as CU12Device
    participant Frontend as Home Page
    
    Admin->>StateManager: Admin operation complete
    StateManager->>Cache: Clear 'slot_status' cache
    StateManager->>Device: Force fresh status sync
    Device-->>StateManager: Current slot status
    StateManager->>StateManager: Transform to KU16 format
    StateManager->>Frontend: webContents.send('init-res', ku16Data)
    StateManager->>Frontend: webContents.send('admin-sync-complete')
```

This ensures that admin dashboard changes immediately reflect on the home page.

## Data Transformation Layer

### CU12-to-KU16 Format Adapter
**File**: `main/adapters/cu12DataAdapter.ts`

```mermaid
graph TB
    A[CU12 SlotStatus] --> B[Transform Function]
    B --> C{Hardware Status}
    C --> D[occupied: boolean]
    C --> E[opening: boolean]
    
    B --> F{Database Query}
    F --> G[isActive: boolean]
    F --> H[User Info]
    
    D --> I[KU16 Compatible Object]
    E --> I
    G --> I
    H --> I
```

**Key Transformation**:
- **Hardware status** (occupied, opening) from CU12 device
- **Admin settings** (isActive) from database
- **User information** (hn, timestamp, lastOp) from database
- **Consistent field mapping** for frontend compatibility

## Error Handling and Event Emission

### Standard Event Patterns
All CU12 operations follow consistent event emission:

```typescript
// Success pattern
mainWindow.webContents.send(`${operation}-success`, {
  slotId,
  timestamp: Date.now(),
  monitoringMode: this.currentMode
});

// Error pattern
mainWindow.webContents.send(`${operation}-error`, {
  error: errorMessage,
  slotId,
  timestamp: Date.now()
});
```

### Error Categories

#### Hardware Communication Errors
- Connection timeouts (5-second limit)
- Invalid response packets
- Checksum validation failures
- Serial port communication errors

#### Business Logic Errors
- Authentication failures
- Invalid slot operations
- Database constraint violations
- State inconsistency errors

#### Resource Management Errors  
- Memory allocation failures
- Cache overflow conditions
- Circuit breaker activation
- Resource cleanup failures

## Performance Characteristics

### Resource Usage Optimization
- **Memory Reduction**: Up to 60% reduction in idle mode
- **CPU Usage**: Adaptive based on monitoring mode
- **Network Calls**: Intelligent caching reduces hardware requests
- **Response Time**: <200ms for cached operations, <1s for hardware operations

### Monitoring Mode Performance
| Mode | Health Check Frequency | Resource Usage | Response Time |
|------|----------------------|----------------|---------------|
| idle | 5 minutes | Minimal (10% baseline) | 2-5 seconds |
| active | Real-time | Normal (100% baseline) | <500ms |
| operation | Focused | High (120% baseline) | <200ms |

### Communication Statistics
- **Baud Rate**: 19200 with error recovery
- **Packet Size**: Variable (8-64 bytes typical)
- **Success Rate**: >99% with circuit breaker protection
- **Recovery Time**: <30 seconds after failure

## Integration with Universal Adapters

### Universal Adapter Routing
**File**: `main/adapters/{operation}Adapter.ts`

```typescript
export const registerUniversalXxxHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  ipcMain.handle('standard-name', async (event, payload) => {
    const hardwareInfo = await getHardwareType();
    
    if (hardwareInfo.type === 'CU12' && cu12StateManager) {
      // Route to CU12 implementation
      return await cu12StateManager.performOperation(payload);
    } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
      // Route to KU16 implementation  
      return await ku16Instance.operation(payload);
    }
    
    throw new Error('No compatible hardware detected');
  });
};
```

### Hardware Detection Flow
```mermaid
sequenceDiagram
    participant Frontend as React Frontend
    participant Adapter as Universal Adapter
    participant DB as Database Settings
    participant CU12 as CU12StateManager
    
    Frontend->>Adapter: ipcRenderer.invoke('unlock', payload)
    Adapter->>DB: getHardwareType()
    DB-->>Adapter: {type: 'CU12', configured: true}
    Adapter->>CU12: cu12StateManager.performUnlockOperation(payload)
    CU12-->>Adapter: Operation result
    Adapter-->>Frontend: Standardized response
```

## Testing and Validation

### CU12-Specific Test Scenarios
1. **Adaptive Monitoring**: Mode transitions under various load conditions
2. **Circuit Breaker**: Failure recovery and exponential backoff
3. **Real-time Sync**: Admin dashboard to home page updates
4. **Resource Optimization**: Memory and CPU usage in different modes
5. **Protocol Handling**: Packet validation and checksum verification

### Integration Test Points
- Universal adapter routing works correctly
- Event emission maintains KU16 compatibility
- Data transformation preserves frontend functionality
- Error handling provides consistent user experience

---

**CU12 Status**: ✅ **Production Ready via Universal Adapters**  
**Monitoring System**: 3-mode adaptive with resource optimization  
**Protocol**: Packet-based with robust error handling and recovery  
**Frontend Compatibility**: 100% maintained through data transformation layer  
**Performance**: Up to 60% resource reduction in idle mode