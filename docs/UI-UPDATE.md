# UI-UPDATE.md - UI Updates & Integration Testing

## 🎯 Round 3 Implementation Priorities

### Grid Layout Migration Strategy

**Current Layout**: 4x4 grid (16 slots) - 4 columns, 4 rows
**Target Layout**: 3x4 grid (12 slots) - 3 columns, 4 rows

### Slot Grid Component Updates

```typescript
// Current Slot Grid (KU16 - 4x4)
const SlotGrid: React.FC = () => {
  const slots = Array.from({ length: 16 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {slots.map((slotId) => (
        <SlotComponent key={slotId} slotId={slotId} />
      ))}
    </div>
  );
};

// Updated Slot Grid (CU12 - 3x4)
const SlotGrid: React.FC = () => {
  const slots = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {slots.map((slotId) => (
        <SlotComponent key={slotId} slotId={slotId} />
      ))}
    </div>
  );
};
```

### Slot Component Enhancements

```typescript
// Enhanced Slot Component with CU12 features
interface SlotProps {
  slotId: number;
  hn?: string;
  occupied?: boolean;
  opening?: boolean;
  isActive?: boolean;
  lockStatus?: number; // New: CU12 lock status
  errorCode?: number; // New: CU12 error code
}

const SlotComponent: React.FC<SlotProps> = ({
  slotId,
  hn,
  occupied,
  opening,
  isActive,
  lockStatus = 1,
  errorCode = 0,
}) => {
  // Enhanced status determination
  const getSlotStatus = () => {
    if (!isActive) return "inactive";
    if (errorCode > 0) return "error";
    if (opening) return "opening";
    if (occupied) return "occupied";
    return "empty";
  };

  // Enhanced status colors
  const getStatusColor = () => {
    switch (getSlotStatus()) {
      case "inactive":
        return "bg-gray-400";
      case "error":
        return "bg-red-500";
      case "opening":
        return "bg-yellow-400";
      case "occupied":
        return "bg-green-500";
      case "empty":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  // Enhanced lock status indicator
  const getLockIndicator = () => {
    if (lockStatus === 0) return "🔓"; // Unlocked
    if (lockStatus === 1) return "🔒"; // Locked
    return "❓"; // Unknown
  };

  return (
    <div
      className={`
      relative p-4 rounded-lg border-2 transition-all duration-300
      ${getStatusColor()}
      ${opening ? "animate-pulse" : ""}
      ${!isActive ? "opacity-50" : ""}
    `}
    >
      <div className="text-center">
        <div className="text-lg font-bold">Slot {slotId}</div>
        <div className="text-sm">{getLockIndicator()}</div>
        {hn && <div className="text-xs mt-1">HN: {hn}</div>}
        {errorCode > 0 && (
          <div className="text-xs text-red-800 mt-1">
            Error: {getErrorMessage(errorCode)}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 🎨 UI Component Updates

### Status Display Enhancements

```typescript
// Enhanced status display with CU12 error codes
const getErrorMessage = (errorCode: number): string => {
  switch (errorCode) {
    case 0x11:
      return "Command Failed";
    case 0x12:
      return "Timeout";
    case 0x13:
      return "Unknown Command";
    case 0x14:
      return "Checksum Error";
    default:
      return `Error ${errorCode}`;
  }
};

// Status indicator component
const StatusIndicator: React.FC<{ status: string; errorCode?: number }> = ({
  status,
  errorCode,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div
        className={`
        w-3 h-3 rounded-full
        ${status === "connected" ? "bg-green-500" : "bg-red-500"}
      `}
      />
      <span className="text-sm font-medium">
        {status === "connected" ? "Connected" : "Disconnected"}
      </span>
      {errorCode && errorCode > 0 && (
        <span className="text-xs text-red-600">
          ({getErrorMessage(errorCode)})
        </span>
      )}
    </div>
  );
};
```

### Configuration Panel Updates

```typescript
// CU12 Configuration Panel
const CU12ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState({
    unlockTime: 550,
    delayedUnlock: 0,
    pushDoorWait: 0,
    baudRate: 19200,
    address: 0,
  });

  const handleConfigUpdate = async (updates: Partial<typeof config>) => {
    try {
      const result = await window.electronAPI.configureCU12(updates);
      if (result.success) {
        toast.success("Configuration updated successfully");
        setConfig((prev) => ({ ...prev, ...updates }));
      } else {
        toast.error(`Configuration failed: ${result.error}`);
      }
    } catch (error) {
      toast.error("Configuration update failed");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">CU12 Configuration</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Unlock Time (10ms units)
          </label>
          <input
            type="number"
            value={config.unlockTime}
            onChange={(e) =>
              handleConfigUpdate({ unlockTime: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded-md"
            min="1"
            max="65535"
          />
          <p className="text-xs text-gray-500 mt-1">
            Current: {config.unlockTime * 10}ms
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Delayed Unlock (seconds)
          </label>
          <input
            type="number"
            value={config.delayedUnlock}
            onChange={(e) =>
              handleConfigUpdate({ delayedUnlock: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            max="255"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Push Door Wait (seconds)
          </label>
          <input
            type="number"
            value={config.pushDoorWait}
            onChange={(e) =>
              handleConfigUpdate({ pushDoorWait: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            max="255"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Device Address
          </label>
          <input
            type="number"
            value={config.address}
            onChange={(e) =>
              handleConfigUpdate({ address: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded-md"
            min="0"
            max="15"
          />
        </div>
      </div>
    </div>
  );
};
```

## 🔄 Integration Testing Strategy

### Component Testing Checklist

```typescript
// Integration test for slot grid
const testSlotGridIntegration = async () => {
  // 1. Test grid layout
  const grid = screen.getByTestId("slot-grid");
  expect(grid).toHaveClass("grid-cols-3"); // Should be 3 columns

  // 2. Test slot count
  const slots = screen.getAllByTestId(/slot-\d+/);
  expect(slots).toHaveLength(12); // Should have 12 slots

  // 3. Test slot IDs
  slots.forEach((slot, index) => {
    expect(slot).toHaveTextContent(`Slot ${index + 1}`);
  });

  // 4. Test status display
  const statusIndicators = screen.getAllByTestId(/status-indicator/);
  expect(statusIndicators).toHaveLength(12);
};

// Integration test for error handling
const testErrorHandling = async () => {
  // 1. Test error code display
  const errorSlot = screen.getByTestId("slot-1");
  fireEvent.click(errorSlot);

  const errorMessage = screen.getByText(/Error: Command Failed/);
  expect(errorMessage).toBeInTheDocument();

  // 2. Test error recovery
  const retryButton = screen.getByText("Retry");
  fireEvent.click(retryButton);

  await waitFor(() => {
    expect(screen.queryByText(/Error: Command Failed/)).not.toBeInTheDocument();
  });
};
```

### End-to-End Testing Scenarios

```typescript
// E2E test scenarios
const e2eTestScenarios = [
  {
    name: "Basic Slot Operations",
    steps: [
      "Load application with CU12 connection",
      "Verify 12 slots displayed in 3x4 grid",
      "Click on empty slot",
      "Verify unlock command sent",
      "Verify slot status updated to opening",
      "Wait for lock back signal",
      "Verify slot status updated to occupied",
    ],
  },
  {
    name: "Error Handling",
    steps: [
      "Simulate communication error",
      "Verify error message displayed",
      "Verify error code shown in UI",
      "Test retry functionality",
      "Verify error cleared after successful retry",
    ],
  },
  {
    name: "Configuration Updates",
    steps: [
      "Open configuration panel",
      "Update unlock time",
      "Verify setting saved to database",
      "Verify command sent to CU12 device",
      "Test configuration persistence",
    ],
  },
];
```

## 🎯 UI Migration Checklist

### Layout Updates

- [ ] **Grid Layout**: Change from `grid-cols-4` to `grid-cols-3`
- [ ] **Slot Count**: Update from 16 to 12 slots
- [ ] **Responsive Design**: Ensure 3x4 layout works on all screen sizes
- [ ] **Spacing**: Adjust gap and padding for new layout

### Component Updates

- [ ] **Slot Component**: Add lock status and error code display
- [ ] **Status Indicators**: Update with CU12-specific status codes
- [ ] **Error Messages**: Implement ASK-based error message display
- [ ] **Configuration Panel**: Add CU12-specific settings

### Integration Updates

- [ ] **API Integration**: Update IPC calls to use CU12 handlers
- [ ] **State Management**: Update slot state with new fields
- [ ] **Event Handling**: Update event handlers for new protocol
- [ ] **Error Handling**: Implement enhanced error handling

### Testing Updates

- [ ] **Unit Tests**: Update component tests for new structure
- [ ] **Integration Tests**: Test CU12 protocol integration
- [ ] **E2E Tests**: Validate complete user workflows
- [ ] **Error Scenarios**: Test all error conditions

## 🔧 Performance Optimization

### Grid Rendering Optimization

```typescript
// Optimized slot grid with React.memo
const SlotComponent = React.memo<SlotProps>(
  ({ slotId, hn, occupied, opening, isActive, lockStatus, errorCode }) => {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison for performance
    return (
      prevProps.slotId === nextProps.slotId &&
      prevProps.hn === nextProps.hn &&
      prevProps.occupied === nextProps.occupied &&
      prevProps.opening === nextProps.opening &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.lockStatus === nextProps.lockStatus &&
      prevProps.errorCode === nextProps.errorCode
    );
  }
);

// Virtual scrolling for large slot lists (if needed)
const VirtualizedSlotGrid: React.FC = () => {
  return (
    <FixedSizeGrid
      columnCount={3}
      columnWidth={200}
      height={600}
      rowCount={4}
      rowHeight={150}
      width={600}
    >
      {({ columnIndex, rowIndex, style }) => {
        const slotId = rowIndex * 3 + columnIndex + 1;
        if (slotId > 12) return null;

        return (
          <div style={style}>
            <SlotComponent slotId={slotId} />
          </div>
        );
      }}
    </FixedSizeGrid>
  );
};
```

### State Management Optimization

```typescript
// Optimized state updates
const useSlotState = () => {
  const [slots, setSlots] = useState<SlotState[]>([]);

  const updateSlot = useCallback(
    (slotId: number, updates: Partial<SlotState>) => {
      setSlots((prev) =>
        prev.map((slot) =>
          slot.slotId === slotId ? { ...slot, ...updates } : slot
        )
      );
    },
    []
  );

  const updateMultipleSlots = useCallback(
    (updates: Array<{ slotId: number; updates: Partial<SlotState> }>) => {
      setSlots((prev) => {
        const slotMap = new Map(prev.map((slot) => [slot.slotId, slot]));
        updates.forEach(({ slotId, updates }) => {
          const slot = slotMap.get(slotId);
          if (slot) {
            slotMap.set(slotId, { ...slot, ...updates });
          }
        });
        return Array.from(slotMap.values());
      });
    },
    []
  );

  return { slots, updateSlot, updateMultipleSlots };
};
```

## ⚠️ UI Migration Considerations

### Backward Compatibility

- **Data Display**: Ensure existing data displays correctly in new layout
- **User Experience**: Maintain familiar interaction patterns
- **Error Handling**: Preserve existing error handling while adding new features

### Accessibility

- **Screen Readers**: Update ARIA labels for new slot count
- **Keyboard Navigation**: Ensure proper tab order in 3x4 grid
- **Color Contrast**: Maintain accessibility standards with new status colors

### Performance

- **Rendering**: Optimize for 12 slots instead of 16
- **Updates**: Minimize re-renders during status updates
- **Memory**: Clean up unused event listeners and state

### Testing Strategy

- **Visual Regression**: Compare before/after screenshots
- **Functional Testing**: Test all user interactions
- **Error Scenarios**: Test all error conditions and recovery
- **Performance Testing**: Measure render times and memory usage
