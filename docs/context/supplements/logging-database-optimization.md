# Logging Database Schema Optimization

## Current Schema Analysis

### Existing Models

#### DispensingLog Table
```sql
CREATE TABLE DispensingLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER,                    -- Unix timestamp
  userId INTEGER,                       -- Foreign key to User
  slotId INTEGER,                       -- Hardware slot identifier
  hn TEXT,                             -- Hospital number
  process TEXT,                        -- Operation type
  message TEXT,                        -- Log message
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME,                  -- Currently disabled
  FOREIGN KEY (userId) REFERENCES User(id)
);
```

#### Log Table
```sql
CREATE TABLE Log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user VARCHAR(255),                   -- Direct string storage (problematic)
  message TEXT,                        -- Log message
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME                   -- Currently disabled
);
```

#### User Table
```sql
CREATE TABLE User (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255),
  role VARCHAR(255),
  passkey TEXT
);
```

### Current Issues

1. **Inconsistent User References**
   - DispensingLog uses foreign key (userId)
   - Log uses direct string storage (user)
   - Cannot join across tables effectively

2. **Missing Indexes**
   - No indexes on frequently queried fields
   - Poor performance for date range queries
   - Slow user-based filtering

3. **Data Type Inconsistencies**
   - Mixed timestamp formats (integer vs datetime)
   - No standardized categorization
   - Limited extensibility

4. **Audit Trail Gaps**
   - No tracking of who accessed logs
   - No modification history
   - Limited metadata storage

## Optimized Schema Design

### Unified Log Table
```sql
CREATE TABLE UnifiedLog (
  -- Primary identification
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,    -- For distributed systems
  
  -- Temporal data
  timestamp BIGINT NOT NULL,           -- Unix timestamp (milliseconds)
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- User and session tracking
  userId INTEGER,                      -- Foreign key to User
  sessionId VARCHAR(64),               -- Session identifier
  ipAddress VARCHAR(45),               -- IPv4/IPv6 support
  
  -- Categorization and classification
  category VARCHAR(50) NOT NULL,       -- 'DISPENSING', 'SYSTEM', 'HARDWARE', 'AUDIT'
  subcategory VARCHAR(50),             -- 'UNLOCK', 'DISPENSE', 'ERROR', etc.
  severity VARCHAR(20) DEFAULT 'INFO', -- 'DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'
  
  -- Medical and hardware context
  slotId INTEGER,                      -- Hardware slot
  hn VARCHAR(50),                      -- Hospital number
  hardwareType VARCHAR(20),            -- 'KU16', 'CU12'
  hardwareVersion VARCHAR(20),         -- Hardware version
  
  -- Content and metadata
  message TEXT NOT NULL,               -- Primary log message
  details JSON,                        -- Structured details
  metadata JSON,                       -- Extensible metadata
  
  -- Data integrity
  checksum VARCHAR(64),                -- SHA-256 of critical fields
  isDeleted BOOLEAN DEFAULT FALSE,     -- Soft delete flag
  deletedAt DATETIME,                  -- Deletion timestamp
  deletedBy INTEGER,                   -- Who deleted (admin only)
  
  -- Foreign key constraints
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (deletedBy) REFERENCES User(id),
  
  -- Indexes for performance
  INDEX idx_timestamp (timestamp),
  INDEX idx_created_at (createdAt),
  INDEX idx_category (category),
  INDEX idx_user_id (userId),
  INDEX idx_slot_id (slotId),
  INDEX idx_hn (hn),
  INDEX idx_category_timestamp (category, timestamp),
  INDEX idx_user_timestamp (userId, timestamp),
  INDEX idx_not_deleted (isDeleted, timestamp)
);
```

### Audit Log Table (New)
```sql
CREATE TABLE AuditLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  
  -- Who, what, when
  userId INTEGER NOT NULL,             -- Who performed the action
  action VARCHAR(50) NOT NULL,         -- 'VIEW', 'EXPORT', 'DELETE', 'MODIFY'
  targetType VARCHAR(50) NOT NULL,     -- 'LOG', 'USER', 'SYSTEM', 'HARDWARE'
  targetId VARCHAR(50),                -- ID of affected resource
  
  -- Request context
  sessionId VARCHAR(64),
  ipAddress VARCHAR(45),
  userAgent TEXT,
  endpoint VARCHAR(255),               -- API endpoint called
  
  -- Change tracking
  oldValues JSON,                      -- Previous state
  newValues JSON,                      -- New state
  changeSet JSON,                      -- Computed differences
  
  -- Result
  success BOOLEAN NOT NULL,
  errorCode VARCHAR(50),
  errorMessage TEXT,
  
  -- Temporal
  timestamp BIGINT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  FOREIGN KEY (userId) REFERENCES User(id),
  
  -- Indexes
  INDEX idx_user_id (userId),
  INDEX idx_timestamp (timestamp),
  INDEX idx_action (action),
  INDEX idx_target (targetType, targetId),
  INDEX idx_user_action_timestamp (userId, action, timestamp)
);
```

### Log Categories Table (New)
```sql
CREATE TABLE LogCategory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),                    -- Hex color for UI
  icon VARCHAR(50),                    -- Icon identifier
  retentionDays INTEGER DEFAULT 365,   -- Category-specific retention
  isActive BOOLEAN DEFAULT TRUE,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);

-- Default categories
INSERT INTO LogCategory (name, description, color, icon, retentionDays) VALUES
('DISPENSING', 'การจ่ายยาและการทำงานของอุปกรณ์', '#10B981', 'pill', 2555),  -- 7 years medical
('SYSTEM', 'เหตุการณ์ระบบและการตั้งค่า', '#3B82F6', 'cog', 365),
('HARDWARE', 'สถานะและการทำงานของฮาร์ดแวร์', '#F59E0B', 'cpu', 730),      -- 2 years
('AUDIT', 'การตรวจสอบและการเข้าถึง', '#EF4444', 'shield', 2555),          -- 7 years
('ERROR', 'ข้อผิดพลาดและการแจ้งเตือน', '#DC2626', 'exclamation', 1095);   -- 3 years
```

## Migration Strategy

### Phase 1: Schema Creation
```sql
-- Create new tables
-- (Tables defined above)

-- Add triggers for data integrity
CREATE TRIGGER tr_unified_log_uuid
BEFORE INSERT ON UnifiedLog
FOR EACH ROW
WHEN NEW.uuid IS NULL
BEGIN
  UPDATE UnifiedLog SET uuid = (
    SELECT lower(hex(randomblob(4))) || '-' || 
           lower(hex(randomblob(2))) || '-' || 
           '4' || substr(lower(hex(randomblob(2))), 2) || '-' || 
           substr('89ab', abs(random()) % 4 + 1, 1) || 
           substr(lower(hex(randomblob(2))), 2) || '-' || 
           lower(hex(randomblob(6)))
  ) WHERE id = NEW.id;
END;

-- Checksum calculation trigger
CREATE TRIGGER tr_unified_log_checksum
BEFORE INSERT ON UnifiedLog
FOR EACH ROW
BEGIN
  UPDATE UnifiedLog SET checksum = (
    SELECT hex(sha256(
      COALESCE(NEW.userId, '') || '|' ||
      NEW.category || '|' ||
      NEW.message || '|' ||
      NEW.timestamp
    ))
  ) WHERE id = NEW.id;
END;
```

### Phase 2: Data Migration
```sql
-- Migrate DispensingLog data
INSERT INTO UnifiedLog (
  timestamp, 
  userId, 
  category, 
  subcategory,
  slotId, 
  hn, 
  message,
  createdAt,
  hardwareType,
  details
)
SELECT 
  CASE 
    WHEN timestamp IS NOT NULL THEN timestamp
    ELSE strftime('%s', createdAt) * 1000
  END as timestamp,
  userId,
  'DISPENSING' as category,
  process as subcategory,
  slotId,
  hn,
  COALESCE(message, 'ไม่มีข้อความ') as message,
  createdAt,
  'UNKNOWN' as hardwareType,  -- Will be updated based on settings
  json_object(
    'originalId', id,
    'originalTable', 'DispensingLog',
    'process', process
  ) as details
FROM DispensingLog
WHERE NOT EXISTS (
  SELECT 1 FROM UnifiedLog 
  WHERE json_extract(details, '$.originalId') = DispensingLog.id 
  AND json_extract(details, '$.originalTable') = 'DispensingLog'
);

-- Migrate Log data
INSERT INTO UnifiedLog (
  timestamp,
  category,
  message,
  createdAt,
  details
)
SELECT
  strftime('%s', createdAt) * 1000 as timestamp,
  'SYSTEM' as category,
  message,
  createdAt,
  json_object(
    'originalId', id,
    'originalTable', 'Log',
    'originalUser', user
  ) as details
FROM Log
WHERE NOT EXISTS (
  SELECT 1 FROM UnifiedLog 
  WHERE json_extract(details, '$.originalId') = Log.id 
  AND json_extract(details, '$.originalTable') = 'Log'
);
```

### Phase 3: Application Updates
```typescript
// Updated model definition
export class UnifiedLog extends Model {
  public id!: number;
  public uuid!: string;
  public timestamp!: number;
  public userId?: number;
  public category!: string;
  public subcategory?: string;
  public severity!: string;
  public slotId?: number;
  public hn?: string;
  public message!: string;
  public details?: any;
  public metadata?: any;
  public hardwareType?: string;
  public isDeleted!: boolean;
  public createdAt!: Date;
  
  // Associations
  public User?: User;
}

UnifiedLog.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
  timestamp: { type: DataTypes.BIGINT, allowNull: false },
  userId: { type: DataTypes.INTEGER },
  category: { type: DataTypes.STRING(50), allowNull: false },
  subcategory: { type: DataTypes.STRING(50) },
  severity: { type: DataTypes.STRING(20), defaultValue: 'INFO' },
  slotId: { type: DataTypes.INTEGER },
  hn: { type: DataTypes.STRING(50) },
  message: { type: DataTypes.TEXT, allowNull: false },
  details: { type: DataTypes.JSON },
  metadata: { type: DataTypes.JSON },
  hardwareType: { type: DataTypes.STRING(20) },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  checksum: { type: DataTypes.STRING(64) }
}, {
  sequelize,
  modelName: 'UnifiedLog',
  tableName: 'UnifiedLog',
  paranoid: false, // We handle soft deletes manually
  indexes: [
    { fields: ['timestamp'] },
    { fields: ['category'] },
    { fields: ['userId'] },
    { fields: ['category', 'timestamp'] },
    { fields: ['isDeleted', 'timestamp'] }
  ]
});

// Associations
UnifiedLog.belongsTo(User, { foreignKey: 'userId' });
```

## Performance Optimizations

### Query Optimization
```typescript
// Optimized log retrieval with proper indexing
const getLogsOptimized = async (options: LogQueryOptions) => {
  const {
    page = 1,
    limit = 50,
    category,
    userId,
    startDate,
    endDate,
    searchQuery,
    includeDeleted = false
  } = options;

  const whereClause: any = {};
  
  // Use indexed fields for filtering
  if (category) whereClause.category = category;
  if (userId) whereClause.userId = userId;
  if (!includeDeleted) whereClause.isDeleted = false;
  
  // Date range optimization
  if (startDate || endDate) {
    whereClause.timestamp = {};
    if (startDate) whereClause.timestamp[Op.gte] = startDate.getTime();
    if (endDate) whereClause.timestamp[Op.lte] = endDate.getTime();
  }
  
  // Full-text search optimization
  if (searchQuery) {
    whereClause[Op.or] = [
      { message: { [Op.like]: `%${searchQuery}%` } },
      { hn: { [Op.like]: `%${searchQuery}%` } }
    ];
  }

  return await UnifiedLog.findAndCountAll({
    where: whereClause,
    include: [{
      model: User,
      attributes: ['id', 'name', 'role']
    }],
    order: [['timestamp', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    raw: false
  });
};
```

### Caching Strategy
```typescript
class LogCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  
  generateKey(options: LogQueryOptions): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(options))
      .digest('hex');
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.TTL) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  invalidateUserLogs(userId: number): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.data.userId === userId) {
        this.cache.delete(key);
      }
    }
  }
}
```

## Data Retention & Archival

### Automated Retention Policy
```typescript
class LogRetentionManager {
  async enforceRetentionPolicies(): Promise<void> {
    const categories = await LogCategory.findAll();
    
    for (const category of categories) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - category.retentionDays);
      
      // Archive logs before deletion
      await this.archiveLogs(category.name, cutoffDate);
      
      // Soft delete old logs
      await UnifiedLog.update(
        { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: 1 // System user
        },
        {
          where: {
            category: category.name,
            timestamp: { [Op.lt]: cutoffDate.getTime() },
            isDeleted: false
          }
        }
      );
    }
  }
  
  private async archiveLogs(category: string, beforeDate: Date): Promise<void> {
    const logs = await UnifiedLog.findAll({
      where: {
        category,
        timestamp: { [Op.lt]: beforeDate.getTime() },
        isDeleted: false
      }
    });
    
    if (logs.length > 0) {
      const archiveFile = `logs_archive_${category}_${beforeDate.toISOString().split('T')[0]}.json`;
      const archivePath = path.join(process.cwd(), 'data', 'archives', archiveFile);
      
      await fs.promises.writeFile(
        archivePath, 
        JSON.stringify(logs, null, 2),
        'utf8'
      );
      
      console.log(`Archived ${logs.length} ${category} logs to ${archiveFile}`);
    }
  }
}
```

## Security Enhancements

### Data Integrity Verification
```typescript
class LogIntegrityChecker {
  async verifyLogIntegrity(logId: number): Promise<boolean> {
    const log = await UnifiedLog.findByPk(logId);
    if (!log) return false;
    
    const expectedChecksum = this.calculateChecksum(log);
    return log.checksum === expectedChecksum;
  }
  
  private calculateChecksum(log: UnifiedLog): string {
    const data = [
      log.userId || '',
      log.category,
      log.message,
      log.timestamp.toString()
    ].join('|');
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  async auditLogAccess(userId: number, action: string, logIds: number[]): Promise<void> {
    await AuditLog.create({
      userId,
      action,
      targetType: 'LOG',
      targetId: logIds.join(','),
      timestamp: Date.now(),
      success: true
    });
  }
}
```

## Migration Timeline

### Week 1: Schema Preparation
- [ ] Create new table schemas
- [ ] Set up migration scripts
- [ ] Test migration on copy of production data

### Week 2: Data Migration
- [ ] Run migration scripts
- [ ] Verify data integrity
- [ ] Update application models

### Week 3: Application Updates
- [ ] Update service layer
- [ ] Modify API endpoints
- [ ] Update frontend components

### Week 4: Testing & Optimization
- [ ] Performance testing
- [ ] Index optimization
- [ ] Query tuning

This database optimization provides a solid foundation for scalable, maintainable, and secure logging while maintaining medical device compliance requirements.