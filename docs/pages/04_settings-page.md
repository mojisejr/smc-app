# Settings Page (`setting.tsx`)

## Overview
System configuration page for hardware communication settings, port configuration, and device management.

## File Location
`renderer/pages/setting.tsx`

## Purpose
- Configure serial port communication settings
- Set hardware device parameters
- Manage KU16 device connectivity
- Validate service codes for configuration access

## Key Features

### Port Configuration
- **Serial Port Selection**: Choose communication port
- **Baudrate Settings**: Configure communication speed
- **Connection Testing**: Validate hardware connectivity
- **Settings Persistence**: Save configuration to database

### Service Code Validation
- **Security Access**: Protected configuration changes
- **Admin Verification**: Service code requirement
- **Error Prevention**: Invalid configuration protection
- **Access Control**: Restricted settings modification

### Hardware Integration
- **Device Status**: Real-time connectivity monitoring
- **Indicators Display**: Visual system status
- **Communication Test**: Port connectivity verification
- **Automatic Detection**: Available port scanning

## Component Structure
```tsx
function Setting() {
  const { setting, updateSetting } = useSetting();
  const [enableEdit, setEnableEdit] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleUpdateSetting = (e) => {
    // Validation and update logic
    updateSetting({
      ku_port: port,
      ku_baudrate: parseInt(baudrate),
    });
  };

  return (
    <div className="grid grid-cols-12 h-screen">
      {/* Sidebar */}
      <div className="col-span-2">
        <Indicators />
      </div>
      
      {/* Settings Form */}
      <div className="col-span-10">
        <form>
          <input ref={portRef} placeholder={setting?.ku_port} />
          <input ref={baudrateRef} placeholder={setting?.ku_baudrate} />
          <input ref={servCodeRef} type="password" placeholder="service code" />
          <button onClick={handleUpdateSetting}>บันทึก</button>
        </form>
      </div>
    </div>
  );
}
```

## Database Connections

### Read Operations
- **Setting Table**: Current configuration retrieval
  - `ku_port`: Current KU16 device port
  - `ku_baudrate`: Current communication baudrate
  - `service_code`: Validation code for changes
  - `organization`: Customer information
  - `customer_name`: License holder details

### Write Operations
- **Setting Table**: Configuration updates
  - Updates `ku_port` with new port selection
  - Updates `ku_baudrate` with new communication speed
  - Maintains service code validation
  - Preserves customer and license information

## IPC Communication

### Incoming Channels
- **`set-setting-res`**: Configuration update response
  - Parameters: Updated setting object or null
  - Triggers: Success/failure notifications
  - Actions: UI updates and navigation

### Outgoing Channels
- **`init`**: Reinitialize system with new settings
  - Parameters: `{ init: true }`
  - Purpose: Apply new hardware configuration
  - Timing: After successful setting updates

### Communication Flow
1. User modifies port/baudrate settings
2. Service code validation
3. Settings sent to main process
4. Hardware reinitialization
5. Response handling and UI updates
6. Automatic redirect to home page

## Form Validation

### Required Fields
- **Port Selection**: Must specify valid serial port
- **Baudrate**: Valid communication speed
- **Service Code**: Correct validation code

### Validation Rules
- **Non-empty Values**: All fields required
- **Service Code Match**: Must match stored code
- **Port Availability**: Selected port must exist
- **Baudrate Range**: Valid communication speeds

### Error Messages (Thai)
- **Empty Fields**: "กรุณากรอกข้อมูลให้ครบถ้วน" (Please fill all fields)
- **Invalid Service Code**: "รหัสบริการไม่ถูกต้อง" (Service code incorrect)
- **Save Failure**: "ไม่สามารถบันทึกข้อมูลได้" (Cannot save data)
- **Save Success**: "บันทึกข้อมูลสำเร็จ" (Data saved successfully)

## User Interface

### Layout Structure
- **Sidebar**: System indicators and navigation
- **Main Area**: Configuration form
- **Form Controls**: Input fields and buttons
- **Status Display**: Current settings preview

### Form States
- **Read-Only Mode**: Default state with current settings
- **Edit Mode**: Enabled after clicking edit button
- **Loading State**: During save operations
- **Success/Error States**: Post-operation feedback

### Button Controls
- **แก้ไข (Edit)**: Enable form editing
- **ยกเลิก (Cancel)**: Revert changes
- **บันทึก (Save)**: Submit configuration changes

## Hardware Integration

### KU16 Device Configuration
- **Port Settings**: Serial communication port
- **Baudrate Options**: 9600, 19200, 38400, 57600, 115200
- **Communication Protocol**: Custom KU16 commands
- **Device Detection**: Automatic port scanning

### Indicator Device
- **Visual Status**: LED indicators
- **Connection Monitoring**: Real-time status
- **Audio Feedback**: Sound notifications
- **Status Display**: Device connectivity

## Security Features

### Service Code Protection
- **Access Control**: Prevents unauthorized changes
- **Validation**: Server-side code verification
- **Audit Trail**: Configuration change logging
- **Administrative Control**: Restricted access

### Configuration Safety
- **Validation**: Prevent invalid configurations
- **Rollback**: Automatic revert on failure
- **Backup**: Previous settings preservation
- **Testing**: Connection verification

## Settings Management

### Configuration Persistence
- **Database Storage**: SQLite setting table
- **Atomic Updates**: Transaction-based changes
- **Version Control**: Configuration history
- **Backup/Restore**: Settings preservation

### System Integration
- **Hardware Reinitialization**: Automatic device restart
- **Service Restart**: Communication stack reset
- **Status Updates**: Real-time configuration apply
- **Error Recovery**: Failure handling and rollback

## Usage Workflow

### Normal Configuration
1. Navigate to settings page
2. Click "แก้ไข" (Edit) button
3. Modify port and/or baudrate
4. Enter service code
5. Click "บันทึก" (Save)
6. System reinitializes hardware
7. Automatic redirect to home

### Error Recovery
1. Invalid configuration detected
2. Error message displayed
3. Settings reverted to previous
4. User prompted to try again
5. System maintains stable state

## Performance Considerations
- **Efficient Updates**: Minimal database operations
- **Hardware Testing**: Quick connectivity verification
- **UI Responsiveness**: Non-blocking operations
- **Error Handling**: Graceful failure management