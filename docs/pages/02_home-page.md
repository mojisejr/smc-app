# Home Page (`home.tsx`)

## Overview
The main dashboard page displaying the 15-slot medication compartment grid and serving as the primary interface for medication dispensing operations.

## File Location
`renderer/pages/home.tsx`

## Purpose
- Display real-time status of all 15 medication slots
- Provide dispensing controls and workflow
- Show system indicators and navigation
- Handle dispensing modals and dialogs

## Key Features

### Slot Grid Display
- **Layout**: 5 columns × 3 rows grid (15 total slots)
- **Real-time Status**: Live updates of slot states
- **Visual Indicators**: Color-coded slot status
- **Interactive Controls**: Click-to-select functionality

### Slot States
1. **Occupied**: Slot contains medication (visual indicator)
2. **Available**: Empty slot ready for use
3. **Opening**: Slot in process of unlocking
4. **Inactive**: Slot disabled/unavailable

### Navigation Sidebar
- **Logo Display**: Company branding
- **Navigation Menu**: Access to all major functions
- **Dispensing Button**: Primary action button
- **Quick Access**: Admin and settings shortcuts

### Modal System
1. **Lock Wait Modal**: During unlocking process
2. **Dispensing Wait Modal**: During medication dispensing
3. **Deactivate Modal**: For slot deactivation
4. **Authentication Modals**: User verification

## Component Structure
```tsx
function Home() {
  const { slots } = useKuStates();
  const { unlocking } = useUnlock();
  const { dispensing } = useDispense();
  const { indicator } = useIndicator();
  
  return (
    <div className="grid grid-cols-12 h-screen">
      {/* Sidebar */}
      <div className="col-span-2">
        <Navbar active={1} />
      </div>
      
      {/* Main Content */}
      <div className="col-span-10 bg-[#F3F3F3]">
        <ul className="grid grid-cols-5 gap-6">
          {slots.map(slot => (
            <Slot key={slot.slotId} slotData={slot} />
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Database Connections

### Read Operations
- **Slot Table**: Real-time slot status and configuration
  - `slotId`: Slot identifier (1-15)
  - `occupied`: Medication presence status
  - `opening`: Current operation state
  - `isActive`: Slot availability
  - `hn`: Associated patient hospital number
  - `timestamp`: Last activity time

### Write Operations
- **DispensingLog Table**: Created during dispensing operations
  - Records user actions
  - Logs dispensing events
  - Tracks slot operations

## IPC Communication

### Incoming Channels
- **Slot Status Updates**: Real-time slot state changes
- **Hardware Events**: Device communication results
- **User Authentication**: Login/logout events

### Outgoing Channels
- **Dispensing Commands**: Slot unlock/lock operations
- **Status Requests**: Slot state queries
- **Authentication Requests**: User verification

## Custom Hooks Integration

### useKuStates()
- **Purpose**: KU16 device state management
- **Data**: Slot array with real-time status
- **Updates**: Live hardware communication

### useDispense()
- **Purpose**: Dispensing workflow management
- **States**: dispensing, continue, reset flags
- **Data**: slotId, hn, process status

### useUnlock()
- **Purpose**: Slot unlocking operations
- **States**: unlocking status and target slot
- **Data**: unlock progress and results

### useIndicator()
- **Purpose**: Visual/audio indicator management
- **Data**: Device status and feedback

## User Interactions

### Primary Actions
1. **Slot Selection**: Click on slot to view details
2. **Dispensing**: Use "จ่ายยา" (Dispense) button
3. **Navigation**: Sidebar menu options
4. **Status Monitoring**: Real-time slot updates

### Dispensing Workflow
1. User clicks "จ่ายยา" button
2. Authentication modal appears
3. User enters passkey
4. Slot selection modal opens
5. HN (Hospital Number) input
6. Hardware commands sent
7. Slot unlocks and opens
8. Medication removal
9. Slot locks automatically
10. Log entry created

## Error Handling
- **Hardware Failures**: Force reset options
- **Communication Errors**: Retry mechanisms
- **Authentication Failures**: Re-prompt for credentials
- **Timeout Handling**: Automatic slot locking

## Performance Considerations
- **Real-time Updates**: Efficient slot state management
- **Memory Usage**: Optimized component rendering
- **Hardware Communication**: Async operations
- **UI Responsiveness**: Non-blocking operations

## Integration Points
- **Hardware Interface**: KU16 device communication
- **Database Layer**: Slot and log management
- **Authentication System**: User verification
- **Indicator System**: Visual/audio feedback

## Accessibility Features
- **Visual Indicators**: Clear slot status display
- **Toast Notifications**: User feedback messages
- **Modal Dialogs**: Guided workflow steps
- **Responsive Design**: Optimized for touch interfaces