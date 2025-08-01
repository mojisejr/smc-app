# Logging System Refactoring Roadmap

## Executive Summary

This roadmap outlines a systematic approach to refactor the Smart Medication Cart's logging system to eliminate redundancy, fix critical bugs, and improve maintainability while ensuring medical device compliance.

## Current State Assessment

### Critical Issues (Must Fix)
1. **Missing User Names in UI** - Users see blank fields instead of names
2. **Export Format Mismatch** - UI promises CSV but delivers JSON
3. **Dual Logging Models** - DispensingLog and Log models cause confusion
4. **Handler Duplication** - Legacy and universal handlers do identical work
5. **Poor Error Handling** - No user feedback on failures

### Technical Debt
- Legacy code coexists with new universal adapters
- Inconsistent data types across models
- No caching or performance optimization
- Missing real-time updates

## Phase 1: Critical Bug Fixes (Week 1-2)

### Priority 1: UI User Display Fix
**Problem**: `renderer/pages/logs.tsx:78` shows blank when user is null

**Current Code**:
```tsx
<td>{log.user}</td>
```

**Solution**:
```tsx
<td>{log.user || 'ไม่ระบุผู้ใช้งาน'}</td>
```

**Files to Update**:
- `renderer/pages/logs.tsx:78`
- `renderer/components/Logs/LegacyLogsView.tsx:104`
- `renderer/components/Logs/EnhancedLogTable.tsx` (if exists)

### Priority 2: Export Format Consistency
**Problem**: `renderer/components/Settings/LogsSetting.tsx:46` promises CSV but exports JSON

**Current Code**:
```tsx
<Tooltip text={"ส่ง logs ทั้งหมดไปยังไฟล์ .csv"} />
```

**Options**:
1. **Update UI** (Quick fix): Change tooltip to mention JSON
2. **Update Backend** (Better): Implement actual CSV export

**Recommended Solution** (Update Backend):
```typescript
// In loggingAdapter.ts
const csvContent = logs.map(log => [
  new Date(log.createdAt).toLocaleString('th-TH'),
  log.User?.name || 'ไม่ระบุ',
  log.slotId,
  log.message,
  log.process
].join(',')).join('\n');

const csvHeaders = ['วันที่', 'ผู้ใช้งาน', 'ช่องยา', 'ข้อความ', 'กระบวนการ'];
const fullCsv = [csvHeaders.join(','), csvContent].join('\n');
```

### Priority 3: Error Handling
**Problem**: No user feedback when log fetching fails

**Current Code**:
```tsx
try {
  const logs = await ipcRenderer.invoke("get_dispensing_logs");
  setLogs(logs);
} catch (error) {
  console.error('Error fetching dispensing logs:', error);
  setLogs([]);
}
```

**Solution**:
```tsx
try {
  const logs = await ipcRenderer.invoke("get_dispensing_logs");
  setLogs(logs);
} catch (error) {
  console.error('Error fetching dispensing logs:', error);
  toast.error('ไม่สามารถโหลดข้อมูล logs ได้ กรุณาลองใหม่');
  setLogs([]);
}
```

## Phase 2: Architecture Cleanup (Week 3-4)

### Step 1: Remove Handler Duplication

**Files to Modify**:
```
main/logger/index.ts                     - Remove logDispensingHanlder
main/background.ts                       - Remove legacy handler registration
main/adapters/loggingAdapter.ts          - Keep as single source
```

**Migration Process**:
1. Verify universal adapters handle all cases
2. Update any remaining KU16-specific references
3. Remove legacy handler registrations
4. Test all log operations

### Step 2: Database Model Consolidation

**Current State**:
- `DispensingLog`: Full featured with User relationship
- `Log`: Simple string-based user field

**Target State**: Single unified model

**Migration Strategy**:
```sql
-- Create unified log table
CREATE TABLE UnifiedLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  userId INTEGER,
  category VARCHAR(50) NOT NULL, -- 'DISPENSING', 'SYSTEM', 'HARDWARE'
  slotId INTEGER,
  hn TEXT,
  process VARCHAR(50),
  message TEXT NOT NULL,
  metadata JSON, -- For extensibility
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id)
);

-- Migrate existing data
INSERT INTO UnifiedLog (timestamp, userId, category, slotId, hn, process, message)
SELECT timestamp, userId, 'DISPENSING', slotId, hn, process, message 
FROM DispensingLog;

INSERT INTO UnifiedLog (timestamp, category, message, createdAt)
SELECT 
  strftime('%s', createdAt) * 1000, 
  'SYSTEM', 
  message, 
  createdAt 
FROM Log;
```

## Phase 3: Performance & Features (Week 5-6)

### Pagination Implementation
```typescript
// Backend: Add pagination to adapter
ipcMain.handle('get_dispensing_logs', async (event, options = {}) => {
  const { page = 1, limit = 50, filters = {} } = options;
  const offset = (page - 1) * limit;
  
  const logs = await DispensingLog.findAndCountAll({
    include: [User],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    where: buildWhereClause(filters)
  });
  
  return {
    logs: logs.rows,
    totalCount: logs.count,
    totalPages: Math.ceil(logs.count / limit),
    currentPage: page
  };
});
```

### Real-time Updates (WebSocket)
```typescript
// Add WebSocket for real-time log updates
class LoggingWebSocket {
  private wss: WebSocketServer;
  
  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.setupHandlers();
  }
  
  broadcast(logEntry: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'NEW_LOG',
          data: logEntry
        }));
      }
    });
  }
}
```

### Caching Layer
```typescript
// Add Redis-like in-memory cache
class LogCache {
  private cache = new Map<string, any>();
  private TTL = 5 * 60 * 1000; // 5 minutes
  
  get(key: string) {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.TTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

## Phase 4: Advanced Features (Week 7-8)

### Advanced Filtering
```typescript
interface LogFilters {
  dateRange: { start: Date; end: Date };
  categories: string[];
  users: number[];
  slots: number[];
  processes: string[];
  searchQuery: string;
}
```

### Audit Trail Enhancement
```typescript
interface AuditLog {
  id: number;
  userId: number;
  action: string;           // 'VIEW_LOGS', 'EXPORT_LOGS', 'DELETE_LOGS'
  targetType: string;       // 'LOG_ENTRY', 'USER', 'SYSTEM'
  targetId: number;
  oldValues: JSON;
  newValues: JSON;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

### Data Retention Policies
```typescript
class LogRetentionManager {
  async enforceRetention() {
    const retentionDays = await Setting.getValue('log_retention_days', 365);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    // Archive old logs before deletion
    await this.archiveOldLogs(cutoffDate);
    
    // Delete old logs
    await UnifiedLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate }
      }
    });
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('Logging System', () => {
  test('should handle null user gracefully', () => {
    const log = { id: 1, user: null, message: 'test' };
    const result = formatLogForDisplay(log);
    expect(result.userDisplay).toBe('ไม่ระบุผู้ใช้งาน');
  });
  
  test('should export correct CSV format', () => {
    const logs = [/* test data */];
    const csv = exportToCSV(logs);
    expect(csv).toContain('วันที่,ผู้ใช้งาน,ช่องยา');
  });
});
```

### Integration Tests
```typescript
describe('Log API Integration', () => {
  test('should fetch logs with pagination', async () => {
    const response = await ipcRenderer.invoke('get_dispensing_logs', {
      page: 1,
      limit: 10
    });
    
    expect(response.logs).toHaveLength(10);
    expect(response.totalCount).toBeGreaterThan(0);
  });
});
```

## Risk Mitigation

### Data Migration Risks
- **Backup Strategy**: Full database backup before migration
- **Rollback Plan**: Keep old tables until migration verified
- **Validation**: Compare record counts and spot-check data

### Performance Risks
- **Load Testing**: Test with 10,000+ log entries
- **Memory Monitoring**: Ensure no memory leaks
- **Fallback**: Legacy view as backup if new features fail

### Medical Compliance Risks
- **Audit Trail**: Maintain complete operation history
- **Data Integrity**: Ensure no log data is lost
- **Access Control**: Maintain existing permission model

## Success Metrics

### Phase 1 Success Criteria
- [ ] Zero null user displays in UI
- [ ] Export format matches UI description
- [ ] Error messages visible to users
- [ ] All existing functionality preserved

### Phase 2 Success Criteria
- [ ] Single logging model in use
- [ ] No duplicate handlers
- [ ] Performance same or better
- [ ] All tests passing

### Phase 3 Success Criteria
- [ ] Page load time < 1 second
- [ ] Real-time updates working
- [ ] Advanced filtering functional
- [ ] Memory usage optimized

### Final Success Criteria
- [ ] Code maintainability improved
- [ ] User experience enhanced
- [ ] System performance optimized
- [ ] Medical compliance maintained

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | 2 weeks | Critical bug fixes, UI improvements |
| Phase 2 | 2 weeks | Architecture cleanup, model unification |
| Phase 3 | 2 weeks | Performance optimization, new features |
| Phase 4 | 2 weeks | Advanced features, audit enhancements |

**Total Timeline**: 8 weeks
**Risk Buffer**: +2 weeks for unexpected issues
**Final Delivery**: 10 weeks from start

This roadmap provides a systematic approach to improving the logging system while minimizing risk and maintaining medical device operational requirements.