# Phase 6: UI Integration

**Status**: ⏸️ **PENDING**  
**Duration**: 2-3 days  
**Priority**: High

## Objective

Integrate DS12 support into the React frontend, update slot management UI for 12-slot configuration, implement device type selection interface, and ensure seamless user experience for medical device operations.

## Prerequisites

- ✅ **Phase 1 Complete**: Protocol foundation established
- ✅ **Phase 2 Complete**: DS12Controller implemented  
- ✅ **Phase 3 Complete**: Serial communication integration
- ✅ **Phase 4 Complete**: IPC handlers refactored
- ✅ **Phase 5 Complete**: Database schema updated
- ✅ **Existing UI**: React components and pages available

## Current UI Structure Analysis

### Existing Components (Reference):
```
/renderer/components/
├── Dialogs/          # Operation dialogs
├── Indicators/       # Status indicators  
├── Modals/          # Modal dialogs
├── Settings/        # Configuration UI
├── Shared/          # Common components
└── Slot/            # Slot management UI
```

### Key Pages:
```
/renderer/pages/
├── home.tsx         # Main slot management
├── setting.tsx      # Device configuration
├── management/      # User management
└── logs.tsx         # Operation logging
```

## Task Breakdown

### Task 6.1: Update Device Selection Interface
**Estimate**: 4-5 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending

#### Subtasks:
- [ ] Add device type selection to settings page
- [ ] Create device detection and validation UI
- [ ] Implement device capability display
- [ ] Add device status indicators
- [ ] Create device switching confirmation dialogs
- [ ] Add device migration progress indicators

#### Success Criteria:
- Users can select between DS12 and DS16 device types
- Device detection works automatically when possible
- Device capabilities clearly displayed to users
- Connection status accurately reflected in UI
- Device switching requires appropriate confirmation
- Migration progress visible to users during transition

#### Device Selection Interface:
```typescript
// DeviceTypeSelector.tsx
interface DeviceTypeProps {
  currentDevice: 'DS12' | 'DS16' | null;
  availablePorts: string[];
  onDeviceChange: (device: 'DS12' | 'DS16', port: string) => Promise<void>;
  isConnecting: boolean;
}

const DeviceTypeSelector: React.FC<DeviceTypeProps> = ({
  currentDevice,
  availablePorts,
  onDeviceChange,
  isConnecting
}) => {
  const [selectedDevice, setSelectedDevice] = useState<'DS12' | 'DS16'>(currentDevice || 'DS12');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  
  const handleDetectDevice = async () => {
    if (!selectedPort) return;
    
    try {
      const detection = await window.electronAPI.invoke('device:detect-type', selectedPort);
      if (detection.success) {
        setDeviceInfo(detection);
        setSelectedDevice(detection.deviceType);
      }
    } catch (error) {
      console.error('Device detection failed:', error);
    }
  };
  
  const handleApplyChanges = async () => {
    await onDeviceChange(selectedDevice, selectedPort);
  };
  
  return (
    <div className="device-selector">
      <h3>Device Configuration</h3>
      
      {/* Device Type Selection */}
      <div className="device-type-selection">
        <label>Device Type:</label>
        <select 
          value={selectedDevice} 
          onChange={(e) => setSelectedDevice(e.target.value as 'DS12' | 'DS16')}
          disabled={isConnecting}
        >
          <option value="DS12">DS12 (12-slot Medical Dispenser)</option>
          <option value="DS16">DS16 (16-slot Medical Device)</option>
        </select>
      </div>
      
      {/* Port Selection */}
      <div className="port-selection">
        <label>Serial Port:</label>
        <select 
          value={selectedPort} 
          onChange={(e) => setSelectedPort(e.target.value)}
          disabled={isConnecting}
        >
          <option value="">Select Port...</option>
          {availablePorts.map(port => (
            <option key={port} value={port}>{port}</option>
          ))}
        </select>
        <button onClick={handleDetectDevice} disabled={!selectedPort || isConnecting}>
          Auto-Detect Device
        </button>
      </div>
      
      {/* Device Information */}
      {deviceInfo && (
        <div className="device-info">
          <h4>Detected Device:</h4>
          <p>Type: {deviceInfo.deviceType}</p>
          <p>Max Slots: {deviceInfo.maxSlots}</p>
          <p>Capabilities: {deviceInfo.capabilities.join(', ')}</p>
        </div>
      )}
      
      {/* Apply Changes */}
      <div className="device-actions">
        <button 
          onClick={handleApplyChanges} 
          disabled={!selectedPort || isConnecting}
          className="apply-changes-btn"
        >
          {isConnecting ? 'Connecting...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
};
```

### Task 6.2: Update Slot Management for 12-Slot Layout
**Estimate**: 5-6 hours  
**Priority**: Critical  
**Status**: ⏸️ Pending  
**Dependencies**: Task 6.1

#### Subtasks:
- [ ] Update slot grid layout for 12 vs 16 slots
- [ ] Modify slot component for device-specific rendering
- [ ] Update slot numbering and positioning
- [ ] Adapt slot status indicators for DS12
- [ ] Update slot operation dialogs
- [ ] Add device-specific slot validation

#### Success Criteria:
- Slot grid automatically adjusts to 12 slots for DS12
- Slot numbering matches DS12 hardware layout
- Status indicators work correctly with DS12 protocol
- Operation dialogs validate against DS12 constraints
- Slot validation prevents operations on non-existent slots
- Visual layout remains user-friendly and intuitive

#### Responsive Slot Layout:
```typescript
// SlotGrid.tsx
interface SlotGridProps {
  deviceType: 'DS12' | 'DS16';
  slots: SlotState[];
  onSlotAction: (slotId: number, action: string) => void;
}

const SlotGrid: React.FC<SlotGridProps> = ({ deviceType, slots, onSlotAction }) => {
  const maxSlots = deviceType === 'DS12' ? 12 : 16;
  const gridCols = deviceType === 'DS12' ? 4 : 4; // 3x4 for DS12, 4x4 for DS16
  const gridRows = deviceType === 'DS12' ? 3 : 4;
  
  // Filter slots based on device type
  const deviceSlots = slots.filter(slot => 
    slot.slotId >= 1 && slot.slotId <= maxSlots
  );
  
  return (
    <div 
      className={`slot-grid ${deviceType.toLowerCase()}`}
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`
      }}
    >
      {Array.from({ length: maxSlots }, (_, index) => {
        const slotId = index + 1;
        const slot = deviceSlots.find(s => s.slotId === slotId);
        
        return (
          <SlotComponent
            key={slotId}
            slotId={slotId}
            slot={slot}
            deviceType={deviceType}
            onAction={onSlotAction}
          />
        );
      })}
    </div>
  );
};

// Enhanced SlotComponent with device type awareness
const SlotComponent: React.FC<{
  slotId: number;
  slot?: SlotState;
  deviceType: 'DS12' | 'DS16';
  onAction: (slotId: number, action: string) => void;
}> = ({ slotId, slot, deviceType, onAction }) => {
  const getSlotStyle = () => {
    // DS12-specific styling and positioning
    if (deviceType === 'DS12') {
      return {
        backgroundColor: slot?.status === 'locked' ? '#e3f2fd' : '#f5f5f5',
        border: slot?.status === 'active' ? '2px solid #2196f3' : '1px solid #ddd',
        // Medical-appropriate color scheme for DS12
      };
    }
    // DS16 styling
    return {
      backgroundColor: slot?.status === 'locked' ? '#fff3e0' : '#f5f5f5',
      border: slot?.status === 'active' ? '2px solid #ff9800' : '1px solid #ddd',
    };
  };
  
  return (
    <div 
      className={`slot-component ${deviceType.toLowerCase()}`}
      style={getSlotStyle()}
      onClick={() => onAction(slotId, 'select')}
    >
      <div className="slot-number">
        {String(slotId).padStart(2, '0')}
      </div>
      <div className="slot-status">
        {slot?.status || 'empty'}
      </div>
      {slot?.patientHN && (
        <div className="patient-info">
          HN: {slot.patientHN}
        </div>
      )}
    </div>
  );
};
```

### Task 6.3: Update Operation Dialogs for DS12
**Estimate**: 4-5 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 6.1, 6.2

#### Subtasks:
- [ ] Update unlock dialog for DS12 validation
- [ ] Modify dispensing dialogs for 12-slot constraints
- [ ] Update slot management dialogs
- [ ] Add device-specific operation confirmations
- [ ] Update error messages for DS12 operations
- [ ] Add operation progress indicators

#### Success Criteria:
- Unlock operations validate against DS12 slot range (1-12)
- Dispensing dialogs show DS12-appropriate information
- Management operations respect DS12 capabilities
- Confirmation dialogs clearly indicate device type
- Error messages provide DS12-specific guidance
- Progress indicators reflect actual DS12 operation timing

#### Enhanced Operation Dialogs:
```typescript
// UnlockDialog.tsx - Enhanced for DS12 support
interface UnlockDialogProps {
  deviceType: 'DS12' | 'DS16';
  maxSlots: number;
  onUnlock: (slotData: UnlockData) => Promise<void>;
  onClose: () => void;
}

const UnlockDialog: React.FC<UnlockDialogProps> = ({
  deviceType,
  maxSlots,
  onUnlock,
  onClose
}) => {
  const [slotId, setSlotId] = useState<number>(1);
  const [patientHN, setPatientHN] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  const validateInputs = (): boolean => {
    if (slotId < 1 || slotId > maxSlots) {
      alert(`Slot number must be between 1 and ${maxSlots} for ${deviceType}`);
      return false;
    }
    
    if (!patientHN.trim()) {
      alert('Patient HN is required');
      return false;
    }
    
    if (!passkey.trim()) {
      alert('Passkey is required for security');
      return false;
    }
    
    return true;
  };
  
  const handleUnlock = async () => {
    if (!validateInputs()) return;
    
    setIsProcessing(true);
    try {
      await onUnlock({
        slotId,
        hn: patientHN,
        passkey,
        timestamp: Date.now()
      });
      onClose();
    } catch (error) {
      console.error('Unlock operation failed:', error);
      alert(`Unlock failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="unlock-dialog">
      <div className="dialog-header">
        <h3>Unlock Slot - {deviceType}</h3>
        <span className="device-indicator">{maxSlots} Slots Available</span>
      </div>
      
      <div className="dialog-content">
        <div className="input-group">
          <label>Slot Number (1-{maxSlots}):</label>
          <input
            type="number"
            min={1}
            max={maxSlots}
            value={slotId}
            onChange={(e) => setSlotId(parseInt(e.target.value))}
            disabled={isProcessing}
          />
        </div>
        
        <div className="input-group">
          <label>Patient HN:</label>
          <input
            type="text"
            value={patientHN}
            onChange={(e) => setPatientHN(e.target.value)}
            placeholder="Enter patient hospital number"
            disabled={isProcessing}
          />
        </div>
        
        <div className="input-group">
          <label>Security Passkey:</label>
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            placeholder="Enter your passkey"
            disabled={isProcessing}
          />
        </div>
      </div>
      
      <div className="dialog-actions">
        <button onClick={onClose} disabled={isProcessing}>
          Cancel
        </button>
        <button 
          onClick={handleUnlock} 
          disabled={isProcessing}
          className="primary-action"
        >
          {isProcessing ? 'Unlocking...' : 'Unlock Slot'}
        </button>
      </div>
    </div>
  );
};
```

### Task 6.4: Update Status Indicators and Feedback
**Estimate**: 3-4 hours  
**Priority**: High  
**Status**: ⏸️ Pending  
**Dependencies**: Task 6.1, 6.2

#### Subtasks:
- [ ] Update connection status indicators for DS12
- [ ] Modify operation status feedback
- [ ] Add device-specific status messages
- [ ] Update progress indicators for DS12 timing
- [ ] Enhance error display for DS12 operations
- [ ] Add device capability status display

#### Success Criteria:
- Connection status accurately reflects DS12 communication
- Operation feedback appropriate for DS12 timing
- Status messages device-specific and clear
- Progress indicators match actual DS12 response times
- Error displays provide actionable DS12 guidance
- Device capabilities visible to users

#### Enhanced Status Components:
```typescript
// DeviceStatusIndicator.tsx
interface DeviceStatusProps {
  deviceType: 'DS12' | 'DS16' | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastOperation?: {
    type: string;
    timestamp: number;
    status: 'success' | 'error' | 'in-progress';
  };
}

const DeviceStatusIndicator: React.FC<DeviceStatusProps> = ({
  deviceType,
  connectionStatus,
  lastOperation
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'disconnected': return '#9e9e9e';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };
  
  const getDeviceIcon = () => {
    return deviceType === 'DS12' ? '🏥' : '📦'; // Medical vs legacy icon
  };
  
  return (
    <div className="device-status-indicator">
      <div className="status-main">
        <span className="device-icon">{getDeviceIcon()}</span>
        <div className="status-info">
          <div className="device-type">
            {deviceType || 'No Device Selected'}
          </div>
          <div 
            className="connection-status"
            style={{ color: getStatusColor() }}
          >
            {connectionStatus.toUpperCase()}
          </div>
        </div>
        <div 
          className="status-indicator"
          style={{ backgroundColor: getStatusColor() }}
        />
      </div>
      
      {lastOperation && (
        <div className="last-operation">
          <small>
            Last: {lastOperation.type} - {new Date(lastOperation.timestamp).toLocaleTimeString()}
            <span className={`operation-status ${lastOperation.status}`}>
              {lastOperation.status}
            </span>
          </small>
        </div>
      )}
    </div>
  );
};
```

### Task 6.5: Update Settings and Configuration UI
**Estimate**: 3-4 hours  
**Priority**: Medium  
**Status**: ⏸️ Pending  
**Dependencies**: Task 6.1

#### Subtasks:
- [ ] Add device configuration section to settings
- [ ] Update port selection with device detection
- [ ] Add device-specific parameter configuration
- [ ] Create device migration interface
- [ ] Update backup/restore for device data
- [ ] Add device diagnostic tools

#### Success Criteria:
- Device configuration clearly separated from other settings
- Port selection includes automatic device detection
- Device parameters easily configurable by users
- Migration interface guides users through upgrade process
- Backup/restore handles device-specific data correctly
- Diagnostic tools help troubleshoot device issues

### Task 6.6: Create Comprehensive Testing
**Estimate**: 4-5 hours  
**Priority**: Medium  
**Status**: ⏸️ Pending  
**Dependencies**: All implementation tasks

#### Subtasks:
- [ ] Create UI component unit tests for DS12 support
- [ ] Test device type switching scenarios
- [ ] Validate responsive layout on different screen sizes
- [ ] Test error handling and user feedback
- [ ] Create accessibility testing for new components
- [ ] Add performance testing for UI responsiveness

#### Success Criteria:
- All new components have >80% test coverage
- Device switching works smoothly without UI glitches
- Layout responsive across desktop and tablet sizes
- Error scenarios provide clear user guidance
- Components meet accessibility standards
- UI remains responsive during device operations

## Testing Strategy

### Unit Testing
- React component testing with Jest and Testing Library
- Device type switching logic testing
- Slot validation and constraint testing
- Error handling and user feedback testing

### Integration Testing
- UI integration with DS12Controller
- Device type selection and configuration
- End-to-end user workflows
- Cross-browser compatibility testing

### User Experience Testing
- Usability testing with medical device users
- Accessibility compliance testing
- Performance testing on target hardware
- Visual regression testing

## Risk Mitigation

### High-Risk Areas
1. **User Confusion**: Device type switching complexity
   - **Mitigation**: Clear labeling, guided workflows, help documentation
2. **Data Loss**: UI state during device switching
   - **Mitigation**: State persistence, confirmation dialogs, recovery mechanisms
3. **Performance Impact**: UI responsiveness during device operations
   - **Mitigation**: Async operations, loading indicators, performance monitoring

### Known Challenges
1. **Layout Adaptation**: 12 vs 16 slot visual differences
2. **User Training**: New device type selection workflow
3. **Error Communication**: Device-specific error messages

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User Task Completion | >95% | Usability testing sessions |
| UI Response Time | <200ms | Performance benchmarking |
| Error Recovery Rate | >90% | Error scenario testing |
| User Satisfaction | >4.5/5 | Post-implementation surveys |
| Accessibility Compliance | WCAG 2.1 AA | Accessibility audit |

## Phase 6 Deliverables

### Primary Deliverables
- **Updated React Components**: DS12-compatible UI components
- **Device Selection Interface**: User-friendly device management
- **Responsive Slot Layout**: Adaptive 12/16-slot grids

### Supporting Deliverables
- **UI Test Suite**: Comprehensive component testing
- **User Documentation**: Device type selection guide
- **Accessibility Report**: Compliance verification

## Next Phase Preparation

Upon completion of Phase 6, the following will be ready for Phase 7:

1. **Complete UI Integration**: Fully functional DS12 interface
2. **User Workflow Validation**: Tested user experience patterns
3. **Performance Baseline**: UI responsiveness metrics
4. **User Training Materials**: Documentation and guides

## File Locations

| Component | File Path | Status |
|-----------|-----------|---------|
| Device Selector | `/renderer/components/Settings/DeviceSelector.tsx` | ⏸️ Pending |
| Slot Grid | `/renderer/components/Slot/SlotGrid.tsx` | ⏸️ Pending |
| Status Indicators | `/renderer/components/Indicators/DeviceStatus.tsx` | ⏸️ Pending |
| Enhanced Dialogs | `/renderer/components/Dialogs/` | ⏸️ Pending |
| UI Tests | `/tests/ui/ds12-components.test.tsx` | ⏸️ Pending |

---

**Phase 6 completes the user-facing implementation, providing medical professionals with an intuitive interface for DS12 device management.**