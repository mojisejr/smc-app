# Logs Page (`logs.tsx`)

## Overview
Dispensing history and activity log viewer displaying comprehensive audit trails of all medication dispensing operations.

## File Location
`renderer/pages/logs.tsx`

## Purpose
- Display chronological dispensing history
- Provide audit trail for regulatory compliance
- Show user activity tracking
- Enable dispensing pattern analysis

## Key Features

### Log Display
- **Tabular Format**: Organized data presentation
- **Chronological Order**: Time-based sorting
- **User Attribution**: Track who performed actions
- **Status Information**: Operation results and details

### Data Presentation
- **Date/Time**: Formatted timestamps (Thai locale)
- **Slot Information**: Medication compartment numbers
- **User Details**: Operator identification
- **Operation Status**: Success/failure indicators
- **Patient Information**: Hospital Number (HN) tracking

## Component Structure
```tsx
function Document() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      const logs = await ipcRenderer.invoke("get_dispensing_logs");
      setLogs(logs);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div className="grid grid-cols-12 h-screen">
      {/* Sidebar Navigation */}
      <div className="col-span-2">
        <Navbar active={4} />
      </div>
      
      {/* Log Table */}
      <div className="col-span-10">
        <table className="table">
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ช่องยาเลขที่</th>
              <th>สถานะ</th>
              <th>ผู้ใช้งาน</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.slotId}</td>
                <td>{log.message}</td>
                <td>{log.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Database Connections

### Read Operations
- **DispensingLog Table**: Primary data source
  - `id`: Unique log entry identifier
  - `timestamp`: Operation timestamp
  - `userId`: User who performed operation
  - `slotId`: Affected medication slot
  - `hn`: Patient Hospital Number
  - `process`: Type of operation performed
  - `message`: Detailed description
  - `createdAt`: Database entry timestamp

### Table Relationships
- **User Table Join**: Get user details via `userId`
  - User name and role information
  - Authentication details
- **Slot Table Reference**: Slot configuration data
  - Slot status at time of operation
  - Medication compartment details

## IPC Communication

### Incoming Channels
- **`get_dispensing_logs`**: Retrieve all dispensing records
  - Parameters: None
  - Returns: Array of log objects with user details
  - Timing: Page load and refresh events

### Data Flow
1. Page component mounts
2. `get_dispensing_logs` IPC call initiated
3. Main process queries database
4. Joins DispensingLog with User tables
5. Returns formatted log data
6. UI updates with log entries

## Data Format

### Log Entry Structure
```typescript
interface DispensingLogEntry {
  id: number;
  timestamp: number;
  userId: number;
  slotId: number;
  hn: string;
  process: string;
  message: string;
  createdAt: string;
  user: string; // Joined from User table
}
```

### Display Formatting
- **Date/Time**: `new Date(log.createdAt).toLocaleDateString()`
- **Time**: `new Date(log.createdAt).toLocaleTimeString()`
- **Slot Number**: Direct display of `slotId`
- **Status**: Formatted `message` content
- **User**: Display name from joined User table

## User Interface

### Table Layout
- **Header Row**: Thai language column titles
  - วันที่ (Date)
  - ช่องยาเลขที่ (Slot Number)
  - สถานะ (Status)
  - ผู้ใช้งาน (User)

### Visual Design
- **Color Scheme**: Light background with dark text
- **Typography**: Monospace-friendly formatting
- **Spacing**: Proper table cell padding
- **Responsiveness**: Scrollable content area

### Loading States
- **Initial Load**: Loading component display
- **Empty State**: No logs message
- **Error Handling**: Graceful failure display

## Log Categories

### Operation Types
- **Dispensing Operations**: Successful medication dispensing
- **Authentication Events**: User login/logout activities
- **Error Events**: Failed operations and system errors
- **Administrative Actions**: Admin-level operations
- **System Events**: Hardware communication and status

### Status Messages
- **Success**: "จ่ายยาสำเร็จ" (Dispensing successful)
- **Authentication**: "ผู้ใช้เข้าสู่ระบบ" (User logged in)
- **Errors**: "การจ่ายยาล้มเหลว" (Dispensing failed)
- **Admin**: "ผู้ดูแลระบบเข้าใช้งาน" (Admin accessed system)

## Data Integrity

### Audit Trail Features
- **Immutable Records**: Log entries cannot be modified
- **Complete Tracking**: All operations logged
- **User Attribution**: Every action tied to specific user
- **Timestamp Accuracy**: Precise operation timing
- **Regulatory Compliance**: Healthcare audit requirements

### Data Retention
- **Storage Limits**: Configurable log retention
- **Archival**: Old log export and removal
- **Performance**: Efficient large dataset handling
- **Backup**: Log data preservation

## Performance Optimization

### Data Loading
- **Pagination**: Large dataset handling (future enhancement)
- **Filtering**: Date range and user filtering (future enhancement)
- **Sorting**: Chronological and custom sorting
- **Caching**: Efficient data retrieval

### UI Performance
- **Virtual Scrolling**: Large table rendering
- **Lazy Loading**: On-demand data fetching
- **Memory Management**: Efficient component updates
- **Responsive Design**: Mobile-friendly display

## Compliance Features

### Healthcare Regulations
- **Complete Audit Trail**: All medication access logged
- **User Accountability**: Clear operator identification
- **Timestamp Accuracy**: Precise operation timing
- **Data Integrity**: Tamper-evident logging
- **Export Capability**: Regulatory reporting support

### Security
- **Access Control**: Logged user authentication
- **Data Protection**: Secure log storage
- **Audit Integrity**: Immutable log records
- **Privacy Compliance**: Patient data protection

## Future Enhancements

### Advanced Features
- **Search Functionality**: Log content searching
- **Date Range Filtering**: Specific period selection
- **Export Options**: CSV, PDF report generation
- **Real-time Updates**: Live log streaming
- **Analytics Dashboard**: Usage pattern analysis

### Performance Improvements
- **Pagination**: Large dataset management
- **Advanced Filtering**: Multi-criteria selection
- **Sorting Options**: Flexible data ordering
- **Print Support**: Physical report generation