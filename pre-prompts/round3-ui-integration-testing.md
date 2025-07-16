# Round 3: UI Updates & Integration Testing

**CONTEXT**: Read `CLAUDE.md` (master) + `UI-UPDATE.md` (round-specific)  
**TOKEN BUDGET**: ~9,000 tokens (validated)

## 🎯 ROUND OBJECTIVE

Update UI components for 12-slot layout and perform comprehensive integration testing to ensure the complete CU12 migration works seamlessly.

## 🛠 PAIRED TASKS (Context-Scoped)

### Task A: Update Slot Grid UI

**Files**:

- `renderer/components/Slot/index.tsx`
- `renderer/components/Slot/empty.tsx`
- `renderer/components/Slot/locked.tsx`
- `renderer/components/Settings/SlotSetting.tsx`

**Context Focus**:

- Grid layout migration from 4x4 to 3x4
- Slot component enhancements with CU12 features
- Status display with ASK-based error codes
- Configuration panel for CU12 settings

**Implementation Requirements**:

1. **Grid Layout**: Change from `grid-cols-4` to `grid-cols-3` for 12 slots
2. **Slot Component**: Add lock status and error code display
3. **Status Colors**: Enhanced status colors with error states
4. **Configuration Panel**: Add CU12-specific settings (unlock time, delays)
5. **Responsive Design**: Ensure 3x4 layout works on all screen sizes
6. **Accessibility**: Update ARIA labels and keyboard navigation

### Task B: Integration Testing & Validation

**Files**: All modified files from previous rounds

**Context Focus**:

- End-to-end testing of complete CU12 migration
- Error scenario testing with ASK codes
- Performance validation and optimization
- User acceptance testing

**Implementation Requirements**:

1. **Component Testing**: Test slot grid layout and component interactions
2. **Error Handling**: Test all error scenarios and recovery
3. **Performance Testing**: Validate system performance with 12 slots
4. **E2E Testing**: Complete workflow testing from UI to hardware
5. **User Experience**: Validate UI responsiveness and usability
6. **Integration Validation**: Test all components work together

## ✅ SUCCESS CRITERIA (From Context)

- [ ] UI grid changed to 3x4 layout with 12 slots
- [ ] Slot status display working correctly with CU12 features
- [ ] Error messages displayed properly with ASK codes
- [ ] Configuration panel updated with CU12 settings
- [ ] End-to-end testing passed for all workflows
- [ ] All error scenarios tested and handled
- [ ] Performance validation completed
- [ ] User acceptance testing passed

## 📋 CONTEXT-SPECIFIC IMPLEMENTATION

### Grid Layout Migration

- **Current**: 4x4 grid (16 slots) with `grid-cols-4`
- **Target**: 3x4 grid (12 slots) with `grid-cols-3`
- **Slot Count**: Update from 16 to 12 slots
- **Responsive**: Ensure layout works on different screen sizes

### Slot Component Enhancements

- **Lock Status**: Add visual indicators (🔓/🔒) for lock state
- **Error Codes**: Display ASK-based error messages
- **Status Colors**: Enhanced color scheme for different states
- **Animation**: Maintain opening/closing animations

### Status Display Updates

- **Error Mapping**: Map ASK codes to user-friendly messages
- **Status Indicators**: Enhanced connection and device status
- **Real-time Updates**: Live status updates from CU12 device
- **Error Recovery**: Retry mechanisms for failed operations

### Configuration Panel

- **Unlock Time**: Configure unlock time in 10ms units
- **Delayed Unlock**: Set delayed unlock time in seconds
- **Push Door Wait**: Configure push door wait time
- **Device Address**: Set CU12 device address (0-15)

## 🔧 Implementation Guidelines

### Task A Priority Order

1. **Grid Layout**: Update CSS classes from grid-cols-4 to grid-cols-3
2. **Slot Count**: Change slot array from 16 to 12 slots
3. **Component Props**: Add lockStatus and errorCode props
4. **Status Display**: Implement enhanced status colors and indicators
5. **Configuration**: Add CU12-specific configuration options
6. **Responsive**: Test and adjust for different screen sizes

### Task B Priority Order

1. **Component Testing**: Test individual components and interactions
2. **Integration Testing**: Test components working together
3. **Error Scenarios**: Test all error conditions and recovery
4. **Performance Testing**: Measure and optimize performance
5. **E2E Testing**: Complete workflow testing
6. **User Testing**: Validate user experience and usability

### Testing Strategy

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Error Tests**: Test all error scenarios and recovery
- **Performance Tests**: Measure response times and memory usage

## 🚨 Critical Considerations

### Layout Changes

- **User Experience**: Minimize disruption to existing users
- **Visual Consistency**: Maintain design consistency with new layout
- **Accessibility**: Ensure accessibility standards are maintained
- **Responsive Design**: Test on different screen sizes and resolutions

### Error Handling

- **User-Friendly Messages**: Convert technical ASK codes to readable messages
- **Error Recovery**: Provide clear recovery options for users
- **Visual Feedback**: Clear visual indicators for error states
- **Logging**: Comprehensive error logging for debugging

### Performance Optimization

- **Rendering**: Optimize for 12 slots instead of 16
- **Updates**: Minimize re-renders during status updates
- **Memory**: Clean up unused event listeners and state
- **Loading**: Optimize loading times and user feedback

### Integration Testing

- **Hardware Communication**: Test actual CU12 device communication
- **Database Integration**: Verify database operations work correctly
- **API Integration**: Test all IPC handlers and API calls
- **Error Scenarios**: Test all possible error conditions

## 🎨 UI Component Specifications

### Slot Grid Component

```typescript
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

### Enhanced Slot Component

```typescript
interface SlotProps {
  slotId: number;
  hn?: string;
  occupied?: boolean;
  opening?: boolean;
  isActive?: boolean;
  lockStatus?: number; // New: CU12 lock status
  errorCode?: number; // New: CU12 error code
}
```

### Status Color Mapping

- **Inactive**: Gray (bg-gray-400)
- **Error**: Red (bg-red-500)
- **Opening**: Yellow (bg-yellow-400)
- **Occupied**: Green (bg-green-500)
- **Empty**: Blue (bg-blue-500)

### Error Message Mapping

- **0x11**: "Command Failed"
- **0x12**: "Timeout"
- **0x13**: "Unknown Command"
- **0x14**: "Checksum Error"

## 📊 Testing Scenarios

### Component Testing

1. **Grid Layout**: Verify 3x4 layout displays correctly
2. **Slot Count**: Confirm 12 slots are displayed
3. **Status Display**: Test all status colors and indicators
4. **Error Display**: Test error message display
5. **Configuration**: Test configuration panel functionality

### Integration Testing

1. **Hardware Communication**: Test CU12 device communication
2. **Database Operations**: Test slot status updates
3. **Error Handling**: Test error scenarios and recovery
4. **Performance**: Test system performance with 12 slots

### E2E Testing

1. **Complete Workflow**: Test full dispensing workflow
2. **Error Recovery**: Test error scenarios and recovery
3. **Configuration**: Test CU12 configuration updates
4. **User Experience**: Validate overall user experience

---

**Execute**: Paired Sub-Agent Pattern  
**Validate**: Manual testing against criteria  
**Commit**: Include context metadata
