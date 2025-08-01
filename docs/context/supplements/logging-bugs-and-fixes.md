# Logging System Bugs and Fixes

## Critical Bugs Identified

### Bug #1: Missing User Names in UI
**Severity**: High
**Impact**: User experience degradation, unclear audit trail
**Status**: Identified

#### Problem Description
When dispensing logs are displayed in the UI, the user column shows blank spaces instead of user names when the User relationship returns null.

#### Root Cause Analysis
```typescript
// File: main/logger/index.ts:71-73
user: log.dataValues.User == null
  ? null  // This returns null to UI
  : log.dataValues.User.dataValues.name,
```

```tsx
// File: renderer/pages/logs.tsx:78
<td>{log.user}</td>  // Renders empty when log.user is null
```

#### Affected Files
- `renderer/pages/logs.tsx:78`
- `renderer/components/Logs/LegacyLogsView.tsx:104`
- `main/logger/index.ts:71-73`

#### Reproduction Steps
1. Navigate to logs page (`/logs`)
2. Look for entries where no user is associated
3. Observe blank user column

#### Expected vs Actual Behavior
- **Expected**: Display "ไม่ระบุผู้ใช้งาน" or similar placeholder
- **Actual**: Blank cell that confuses users

#### Fix Implementation

**Option 1: Frontend Fix (Quick)**
```tsx
// In renderer/pages/logs.tsx:78
<td>{log.user || 'ไม่ระบุผู้ใช้งาน'}</td>

// In renderer/components/Logs/LegacyLogsView.tsx:104
<span className="text-sm text-gray-900">
  {log.user || 'ไม่ระบุผู้ใช้งาน'}
</span>
```

**Option 2: Backend Fix (Better)**
```typescript
// In main/logger/index.ts:71-73
user: log.dataValues.User == null
  ? 'ไม่ระบุผู้ใช้งาน'
  : log.dataValues.User.dataValues.name,
```

**Option 3: Universal Adapter Fix (Best)**
```typescript
// In main/adapters/loggingAdapter.ts:65-69
const logsWithContext = logs.map(log => ({
  ...log.toJSON(),
  user: log.User?.name || 'ไม่ระบุผู้ใช้งาน',
  hardwareType: hardwareInfo.type,
  systemInfo: `${hardwareInfo.type} (${hardwareInfo.maxSlots} slots)`
}));
```

**Recommended**: Option 3 (Universal Adapter)

#### Testing
```typescript
// Unit test
describe('User Display', () => {
  test('should show placeholder for null user', () => {
    const log = { id: 1, User: null, message: 'test' };
    const processed = processLogForDisplay(log);
    expect(processed.user).toBe('ไม่ระบุผู้ใช้งาน');
  });
});
```

---

### Bug #2: Export Format Mismatch
**Severity**: Medium
**Impact**: User confusion, incorrect documentation
**Status**: Identified

#### Problem Description
The admin UI tooltip indicates that logs will be exported as CSV files, but the actual implementation exports JSON format.

#### Root Cause Analysis
```tsx
// File: renderer/components/Settings/LogsSetting.tsx:46
<Tooltip text={"ส่ง logs ทั้งหมดไปยังไฟล์ .csv"} />
```

```typescript
// File: main/adapters/loggingAdapter.ts:110
fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
// Returns JSON filename, not CSV
```

#### Affected Files
- `renderer/components/Settings/LogsSetting.tsx:46`
- `renderer/pages/management/index.tsx:92-95`
- `main/adapters/loggingAdapter.ts:83-119`

#### Fix Implementation

**Option 1: Update UI Text (Quick)**
```tsx
<Tooltip text={"ส่ง logs ทั้งหมดไปยังไฟล์ .json"} />
```

**Option 2: Implement CSV Export (Better)**
```typescript
// In main/adapters/loggingAdapter.ts
const exportLogsAsCSV = (logs: any[], hardwareInfo: any) => {
  const headers = ['วันที่', 'เวลา', 'ผู้ใช้งาน', 'ช่องยา', 'กระบวนการ', 'ข้อความ', 'ระบบ'];
  
  const csvRows = logs.map(log => [
    new Date(log.createdAt).toLocaleDateString('th-TH'),
    new Date(log.createdAt).toLocaleTimeString('th-TH'),
    log.User?.name || 'ไม่ระบุผู้ใช้งาน',
    log.slotId || '-',
    log.process || '-',
    log.message || '-',
    hardwareInfo.type
  ]);
  
  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Add BOM for Thai text support in Excel
  const BOM = '\uFEFF';
  return BOM + csvContent;
};
```

**Recommended**: Option 2 (Implement CSV)

---

### Bug #3: Inconsistent User Field Types
**Severity**: Medium
**Impact**: Data integrity issues, join query problems
**Status**: Identified

#### Problem Description
The system has two different approaches to storing user information:
- `DispensingLog.userId` (INTEGER foreign key)
- `Log.user` (STRING direct storage)

#### Root Cause Analysis
```typescript
// DispensingLog model
userId: { type: DataTypes.INTEGER },
// Relationship: belongsTo(User, { foreignKey: "userId" })

// Log model  
user: { type: DataTypes.STRING },
// No relationship defined
```

#### Impact
- Cannot perform unified queries across both log types
- Data inconsistency when user names change
- Difficult to maintain referential integrity

#### Fix Implementation
**Phase 1: Immediate (Keep both, standardize access)**
```typescript
// Unified log retrieval function
const getUnifiedLogs = async () => {
  const dispensingLogs = await DispensingLog.findAll({
    include: [User],
    raw: false
  });
  
  const systemLogs = await Log.findAll();
  
  // Normalize both to same format
  const normalizedDispensing = dispensingLogs.map(log => ({
    ...log.toJSON(),
    logType: 'DISPENSING',
    userName: log.User?.name || 'ไม่ระบุผู้ใช้งาน'
  }));
  
  const normalizedSystem = systemLogs.map(log => ({
    ...log.toJSON(),
    logType: 'SYSTEM',
    userName: log.user || 'ไม่ระบุผู้ใช้งาน'
  }));
  
  return [...normalizedDispensing, ...normalizedSystem]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
```

**Phase 2: Long-term (Unify models)**
See database schema optimization guide.

---

### Bug #4: Missing Error Handling
**Severity**: Medium
**Impact**: Poor user experience, no failure feedback
**Status**: Identified

#### Problem Description
When log fetching fails, users see no indication of the error - logs simply don't appear.

#### Affected Files
- `renderer/pages/logs.tsx:17-32`
- `renderer/pages/management/index.tsx:66-69`
- `renderer/components/Logs/EnhancedLogsView.tsx`

#### Fix Implementation
```tsx
// Enhanced error handling pattern
const [error, setError] = useState<string | null>(null);

const fetchLogs = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const logs = await ipcRenderer.invoke("get_dispensing_logs");
    setLogs(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    const errorMessage = 'ไม่สามารถโหลดข้อมูล logs ได้ กรุณาลองใหม่';
    setError(errorMessage);
    toast.error(errorMessage);
    setLogs([]);
  } finally {
    setLoading(false);
  }
};

// Error display component
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center">
      <svg className="h-5 w-5 text-red-400 mr-2" /* error icon */>
      <p className="text-red-700">{error}</p>
      <button 
        onClick={fetchLogs}
        className="ml-auto text-red-600 hover:text-red-800"
      >
        ลองใหม่
      </button>
    </div>
  </div>
)}
```

---

### Bug #5: Export Location Inconsistency
**Severity**: Low
**Impact**: User confusion about file location
**Status**: Identified

#### Problem Description
Universal adapter exports to `/tmp` directory, while legacy exporter allows user to choose location.

#### Current Behavior
```typescript
// Universal adapter - fixed location
const filepath = `/tmp/${filename}`;

// Legacy exporter - user choice
const result = await dialog.showOpenDialog({
  properties: ["openDirectory"],
});
```

#### Fix Implementation
```typescript
// Unified export with user choice
ipcMain.handle('export_logs', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: `smc-logs-${new Date().toISOString().slice(0,10)}.csv`,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    const logs = await getUnifiedLogs();
    const fileExtension = path.extname(result.filePath);
    
    if (fileExtension === '.csv') {
      const csvContent = exportLogsAsCSV(logs);
      fs.writeFileSync(result.filePath, csvContent, 'utf8');
    } else {
      const jsonContent = JSON.stringify(logs, null, 2);
      fs.writeFileSync(result.filePath, jsonContent, 'utf8');
    }
    
    return {
      success: true,
      filePath: result.filePath,
      format: fileExtension.slice(1)
    };
  }
  
  return { success: false, error: 'การส่งออกถูกยกเลิก' };
});
```

---

## Minor Issues

### Issue #1: Performance - Loading All Logs
**Impact**: Slow loading with large datasets
**Fix**: Implement pagination (see roadmap)

### Issue #2: No Real-time Updates
**Impact**: Manual refresh required
**Fix**: WebSocket implementation (see roadmap)

### Issue #3: Limited Filtering
**Impact**: Difficult to find specific logs
**Fix**: Advanced filtering UI (see roadmap)

### Issue #4: No Data Validation
**Impact**: Potential data corruption
**Fix**: Add input validation and sanitization

---

## Testing Checklist

### Bug Fix Verification
- [ ] User names display correctly (including nulls)
- [ ] Export format matches UI description
- [ ] Error messages appear when operations fail
- [ ] Export file location is predictable
- [ ] All existing functionality preserved

### Regression Testing
- [ ] All log types still display
- [ ] Admin functions still work
- [ ] Hardware operations still log
- [ ] User permissions respected
- [ ] Database relationships intact

### Performance Testing
- [ ] Page load time acceptable
- [ ] Export operations complete
- [ ] Memory usage stable
- [ ] No memory leaks

### User Acceptance Testing
- [ ] UI is intuitive
- [ ] Error messages are helpful
- [ ] Export functionality works as expected
- [ ] No data loss occurs

---

## Implementation Priority

### Immediate (This Week)
1. Fix user name display (Bug #1)
2. Add error handling (Bug #4)
3. Update export tooltip (Bug #2 - Option 1)

### Short Term (Next 2 Weeks)
1. Implement CSV export (Bug #2 - Option 2)
2. Standardize user field access (Bug #3 - Phase 1)
3. Fix export location (Bug #5)

### Long Term (Next Month)
1. Unify database models (Bug #3 - Phase 2)
2. Implement performance improvements
3. Add advanced features

This comprehensive bug tracking ensures systematic resolution of all identified issues while maintaining system stability and medical device compliance.