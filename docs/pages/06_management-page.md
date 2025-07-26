# Management Page (`management/index.tsx`)

## Overview
Comprehensive administrative dashboard providing complete system management capabilities through a tabbed interface for slot management, user administration, system configuration, and log management.

## File Location
`renderer/pages/management/index.tsx`

## Purpose
- Centralized administrative control panel
- Multi-functional management interface
- Secure admin-only access control
- Complete system configuration and monitoring

## Key Features

### Access Control
- **Admin Authentication**: Restricted access requiring admin privileges
- **Role Validation**: Continuous admin status checking
- **Session Management**: Admin session timeout handling
- **Security Redirect**: Automatic redirect for unauthorized access

### Tabbed Interface
1. **Slot Management** (จัดการช่องยา)
2. **User Management** (จัดการผู้ใช้งาน)
3. **System Configuration** (จัดการการตั้งค่าระบบ)
4. **Log Management** (จัดการ Logs)

## Component Structure
```tsx
export default function Document() {
  const { admin } = useApp();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [portList, setPortList] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [slotList, setSlotList] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const tabs = [
    { id: 0, name: "จัดการช่องยา" },
    { id: 1, name: "จัดการผู้ใช้งาน" },
    { id: 2, name: "จัดการการตั้งค่าระบบ" },
    { id: 3, name: "จัดการ Logs" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return <SlotSetting />;
      case 1: return <UserSetting />;
      case 2: return <SystemSetting />;
      case 3: return <LogsSetting />;
    }
  };

  return (
    <div className="grid grid-cols-12 h-screen">
      <div className="col-span-2">
        <Navbar active={5} />
      </div>
      <div className="col-span-10">
        <div className="tabs tabs-boxed">
          {tabs.map(tab => (
            <a key={tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.name}
            </a>
          ))}
        </div>
        <div className="mt-6">{renderTabContent()}</div>
      </div>
    </div>
  );
}
```

## Database Connections

### Comprehensive Access
- **All Tables**: Admin has complete database access
- **Read Operations**: System status and configuration retrieval
- **Write Operations**: Administrative modifications and updates
- **Transaction Management**: Atomic operations for data consistency

### Specific Table Access
- **Slot Table**: Complete slot configuration management
- **User Table**: User account administration
- **Setting Table**: System configuration updates
- **DispensingLog Table**: Audit trail management
- **Log Table**: System event monitoring

## Tab 1: Slot Management

### Features
- **Individual Slot Control**: Activate/deactivate specific slots
- **Bulk Operations**: Enable/disable all slots simultaneously
- **Status Monitoring**: Real-time slot state display
- **Configuration Override**: Admin-level slot management

### Slot Operations
- **Deactivate Single**: `handleDeactivateAdmin(slotId)`
- **Reactivate Single**: `handleReactivateAdmin(slotId)`
- **Deactivate All**: `handleDeactivateAll()`
- **Reactivate All**: `handleReactivateAll()`

### Database Operations
```sql
-- Individual slot updates
UPDATE Slot SET isActive = false WHERE slotId = ?;
UPDATE Slot SET isActive = true WHERE slotId = ?;

-- Bulk operations
UPDATE Slot SET isActive = false; -- Deactivate all
UPDATE Slot SET isActive = true;  -- Reactivate all
```

### IPC Channels
- `deactivate-admin`: Single slot deactivation
- `reactivate-admin`: Single slot reactivation
- `deactivate-all`: Bulk deactivation
- `reactivate-all`: Bulk reactivation
- `get-all-slots`: Retrieve current slot status

## Tab 2: User Management

### Features
- **User Account Creation**: Add new system users
- **User Deletion**: Remove user accounts
- **Role Management**: Assign user roles and permissions
- **User Limit Enforcement**: Maximum user count validation

### User Operations
- **Add User**: `handleNewUser()` - Opens new user modal
- **Delete User**: `handleDeleteUser(id)` - Removes user account
- **View Users**: Display current user list with roles

### Database Operations
```sql
-- Create new user
INSERT INTO User (name, role, passkey) VALUES (?, ?, ?);

-- Delete user
DELETE FROM User WHERE id = ? AND role != 'admin';

-- Get all users
SELECT id, name, role FROM User ORDER BY name;
```

### Validation Rules
- **Maximum Users**: Enforced by `setting.max_user` configuration
- **Admin Protection**: Admin users cannot be deleted
- **Unique Names**: Username uniqueness validation
- **Role Requirements**: Valid role assignment

### IPC Channels
- `get-user`: Retrieve user list
- `delete-user`: Remove user account
- New user creation via modal component

## Tab 3: System Configuration

### Features
- **Port Management**: Serial port configuration
- **Device Settings**: Hardware device management
- **Indicator Configuration**: Visual/audio device setup
- **Service Code Updates**: Administrative access codes

### Port Configuration
- **KU16 Port**: Main device communication port
- **Indicator Port**: Visual/audio feedback device
- **Baudrate Settings**: Communication speed configuration
- **Port Scanning**: Available port detection

### Database Operations
```sql
-- Update system settings
UPDATE Setting SET 
  ku_port = ?, 
  indi_port = ?, 
  ku_baudrate = ?, 
  indi_baudrate = ?
WHERE id = 1;
```

### Hardware Integration
- **Port Selection**: `handleSetSelectedPort(port)`
- **Indicator Setup**: `handleSetIndicatorPort(port)`
- **Device Testing**: Communication verification
- **Configuration Apply**: System reinitialization

### IPC Channels
- `get-port-list`: Available port enumeration
- `set-selected-port`: KU16 port configuration
- `set-indicator-port`: Indicator device setup

## Tab 4: Log Management

### Features
- **Log Viewing**: Complete dispensing log display
- **Export Functionality**: Log file generation
- **Log Retention**: Storage management
- **Audit Trail**: Complete activity tracking

### Log Operations
- **View Logs**: Display all dispensing activities
- **Export Logs**: Generate log files for external use
- **Filter Options**: Date range and user filtering (future)
- **Archive Management**: Old log handling

### Database Operations
```sql
-- Retrieve all logs with user details
SELECT dl.*, u.name as user_name 
FROM DispensingLog dl 
LEFT JOIN User u ON dl.userId = u.id 
ORDER BY dl.createdAt DESC;
```

### Export Features
- **File Generation**: CSV/Excel export capability
- **Date Range**: Specific period selection
- **User Filtering**: Per-user log extraction
- **Regulatory Compliance**: Audit-ready formats

### IPC Channels
- `get_dispensing_logs`: Retrieve log data
- `export_logs`: Generate export files

## Security Features

### Admin Access Control
- **Authentication Required**: Admin passkey validation
- **Session Management**: Admin session timeout
- **Role Verification**: Continuous admin status check
- **Audit Logging**: All admin actions logged

### Operation Security
- **Service Code**: Additional validation for critical operations
- **Confirmation Dialogs**: Destructive action confirmation
- **Audit Trail**: Complete admin activity logging
- **Access Restriction**: Non-admin user blocking

## User Interface

### Layout Design
- **Sidebar Navigation**: Consistent app navigation
- **Tab Interface**: Clean functional separation
- **Responsive Design**: Adaptive layout
- **Thai Language**: Localized interface text

### Visual Elements
- **Active Tab Highlighting**: Clear current selection
- **Loading States**: Operation progress indication
- **Success/Error Messages**: Toast notifications
- **Modal Dialogs**: Guided workflows

### Accessibility
- **Keyboard Navigation**: Tab-based interface
- **Visual Feedback**: Clear operation results
- **Error Prevention**: Validation and confirmation
- **Help Text**: Contextual guidance

## Error Handling

### Validation Errors
- **User Limit**: Maximum user count enforcement
- **Port Conflicts**: Device communication issues
- **Permission Errors**: Insufficient admin rights
- **Database Errors**: Transaction failure handling

### Recovery Mechanisms
- **Automatic Retry**: Failed operation retry
- **State Refresh**: Data consistency maintenance
- **Graceful Degradation**: Partial functionality preservation
- **User Guidance**: Clear error messages and solutions

## Performance Considerations

### Data Loading
- **Lazy Loading**: Tab-specific data fetching
- **Efficient Queries**: Optimized database operations
- **Caching**: Reduced redundant operations
- **Pagination**: Large dataset handling (future)

### UI Responsiveness
- **Async Operations**: Non-blocking admin actions
- **Progress Indicators**: Operation status display
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Graceful failure handling

## Integration Points

### Hardware Management
- **Device Control**: Direct hardware manipulation
- **Status Monitoring**: Real-time device feedback
- **Configuration Apply**: System reinitialization
- **Diagnostic Tools**: Hardware testing capabilities

### System Coordination
- **Database Management**: Complete data control
- **User Coordination**: Multi-user system management
- **Security Enforcement**: Access control implementation
- **Audit Compliance**: Regulatory requirement fulfillment