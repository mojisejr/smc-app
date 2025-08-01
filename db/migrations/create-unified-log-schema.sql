-- Unified Log Schema for Smart Medication Cart
-- Phase 2: Database Restructuring
-- This schema supports both using logs and system logs with proper categorization

-- Create the unified log table
CREATE TABLE IF NOT EXISTS UnifiedLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Temporal data
  timestamp BIGINT NOT NULL,                    -- Unix timestamp in milliseconds
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- User and session tracking
  userId INTEGER,                               -- Foreign key to User table
  
  -- Log categorization
  logType VARCHAR(20) NOT NULL,                 -- 'USING' or 'SYSTEM'
  category VARCHAR(50) NOT NULL,                -- 'unlock', 'dispensing', 'force-reset', 'deactive', 'admin', 'error'
  level VARCHAR(10) DEFAULT 'info',             -- 'error', 'warn', 'info', 'debug'
  
  -- Medical and hardware context
  slotId INTEGER,                               -- Hardware slot identifier
  hn VARCHAR(50),                               -- Hospital number
  
  -- Operation details
  operation VARCHAR(50),                        -- Specific operation performed
  reason TEXT,                                  -- Reason for force-reset, deactive, etc.
  
  -- Content
  message TEXT NOT NULL,                        -- Primary log message
  details JSON,                                 -- Additional structured data
  
  -- Constraints
  FOREIGN KEY (userId) REFERENCES User(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_log_timestamp ON UnifiedLog(timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_log_created_at ON UnifiedLog(createdAt);
CREATE INDEX IF NOT EXISTS idx_unified_log_user_id ON UnifiedLog(userId);
CREATE INDEX IF NOT EXISTS idx_unified_log_log_type ON UnifiedLog(logType);
CREATE INDEX IF NOT EXISTS idx_unified_log_category ON UnifiedLog(category);
CREATE INDEX IF NOT EXISTS idx_unified_log_level ON UnifiedLog(level);
CREATE INDEX IF NOT EXISTS idx_unified_log_slot_id ON UnifiedLog(slotId);
CREATE INDEX IF NOT EXISTS idx_unified_log_hn ON UnifiedLog(hn);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_unified_log_type_timestamp ON UnifiedLog(logType, timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_log_user_timestamp ON UnifiedLog(userId, timestamp);
CREATE INDEX IF NOT EXISTS idx_unified_log_category_timestamp ON UnifiedLog(category, timestamp);

-- Create log categories reference table for UI dropdowns
CREATE TABLE IF NOT EXISTS LogCategory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT,
  logType VARCHAR(20) NOT NULL,                -- 'USING' or 'SYSTEM'
  color VARCHAR(7) DEFAULT '#3B82F6',          -- Hex color for UI
  isActive BOOLEAN DEFAULT TRUE,
  sortOrder INTEGER DEFAULT 0,
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default log categories for using logs
INSERT OR IGNORE INTO LogCategory (name, displayName, description, logType, color, sortOrder) VALUES
('unlock', 'ปลดล็อกช่องยา', 'การปลดล็อกช่องยาเพื่อเติมยา', 'USING', '#10B981', 1),
('dispensing', 'จ่ายยา', 'การเอายาออกจากช่อง', 'USING', '#3B82F6', 2),
('force-reset', 'รีเซ็ตบังคับ', 'การรีเซ็ตช่องยาด้วยเหตุผลพิเศษ', 'USING', '#F59E0B', 3),
('deactive', 'ปิดการใช้งาน', 'การปิดช่องยาเนื่องจากข้อผิดพลาด', 'USING', '#EF4444', 4),
('admin', 'การจัดการ', 'การใช้งานฟังก์ชันผู้ดูแลระบบ', 'USING', '#8B5CF6', 5);

-- Insert default log categories for system logs  
INSERT OR IGNORE INTO LogCategory (name, displayName, description, logType, color, sortOrder) VALUES
('error', 'ข้อผิดพลาด', 'ข้อผิดพลาดของระบบ', 'SYSTEM', '#DC2626', 1),
('warning', 'คำเตือน', 'คำเตือนจากระบบ', 'SYSTEM', '#F59E0B', 2),
('info', 'ข้อมูล', 'ข้อมูลทั่วไปของระบบ', 'SYSTEM', '#3B82F6', 3),
('debug', 'ดีบัก', 'ข้อมูลสำหรับการแก้ไขปัญหา (ไม่แสดงใน UI)', 'SYSTEM', '#6B7280', 4);

-- Create admin operations reference table
CREATE TABLE IF NOT EXISTS AdminOperation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT,
  trackDetails BOOLEAN DEFAULT TRUE,           -- Whether to track detailed information
  
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin operations
INSERT OR IGNORE INTO AdminOperation (name, displayName, description, trackDetails) VALUES
('slot_management', 'จัดการช่องยา', 'การเปิด/ปิดช่องยา การตั้งค่าช่องยา', TRUE),
('export_logs', 'ส่งออกข้อมูล', 'การส่งออกข้อมูล logs', TRUE),
('user_management', 'จัดการผู้ใช้', 'การเพิ่ม/ลบ/แก้ไขผู้ใช้งาน', TRUE),
('system_settings', 'ตั้งค่าระบบ', 'การแก้ไขการตั้งค่าระบบ', TRUE);

-- Create a view for easy querying of logs with user names
CREATE VIEW IF NOT EXISTS LogsWithUser AS
SELECT 
  ul.*,
  u.name as userName,
  u.role as userRole,
  lc.displayName as categoryDisplayName,
  lc.color as categoryColor
FROM UnifiedLog ul
LEFT JOIN User u ON ul.userId = u.id  
LEFT JOIN LogCategory lc ON ul.category = lc.name
ORDER BY ul.timestamp DESC;