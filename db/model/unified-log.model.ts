import { Model, DataTypes } from "sequelize";
import { sequelize } from "../sequelize";
import { User } from "./user.model";

/**
 * Unified Log Model
 * Consolidates both dispensing logs and system logs into a single table
 * Supports the new logging categorization system
 */
export class UnifiedLog extends Model {
  public id!: number;
  public timestamp!: number;
  public createdAt!: Date;
  
  // User tracking
  public userId?: number;
  
  // Log categorization
  public logType!: string;        // 'USING' or 'SYSTEM'
  public category!: string;       // 'unlock', 'dispensing', 'force-reset', 'deactive', 'admin', 'error', etc.
  public level!: string;          // 'error', 'warn', 'info', 'debug'
  
  // Medical and hardware context
  public slotId?: number;
  public hn?: string;
  
  // Operation details
  public operation?: string;      // Specific operation performed
  public reason?: string;         // Reason for force-reset, deactive, etc.
  
  // Content
  public message!: string;
  public details?: any;           // JSON field for additional structured data
  
  // Associations
  public User?: User;

  // Static method declaration
  static createLog: (data: {
    logType: 'USING' | 'SYSTEM';
    category: string;
    level?: string;
    userId?: number;
    slotId?: number;
    hn?: string;
    operation?: string;
    reason?: string;
    message: string;
    details?: any;
  }) => Promise<UnifiedLog>;
  
  // Virtual fields for UI
  public get userName(): string {
    return this.User?.name || 'ไม่ระบุผู้ใช้งาน';
  }
  
  public get categoryDisplayName(): string {
    const categoryMap: Record<string, string> = {
      'unlock': 'ปลดล็อกช่องยา',
      'dispensing': 'จ่ายยา',
      'force-reset': 'รีเซ็ตบังคับ',
      'deactive': 'ปิดการใช้งาน',
      'admin': 'การจัดการ',
      'error': 'ข้อผิดพลาด',
      'warning': 'คำเตือน',
      'info': 'ข้อมูล',
      'debug': 'ดีบัก'
    };
    
    return categoryMap[this.category] || this.category;
  }
  
  public get levelDisplayName(): string {
    const levelMap: Record<string, string> = {
      'error': 'ข้อผิดพลาด',
      'warn': 'คำเตือน', 
      'info': 'ข้อมูล',
      'debug': 'ดีบัก'
    };
    
    return levelMap[this.level] || this.level;
  }
  
  public get logTypeDisplayName(): string {
    return this.logType === 'USING' ? 'บันทึกการใช้งาน' : 'บันทึกระบบ';
  }
}

UnifiedLog.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    timestamp: { 
      type: DataTypes.BIGINT, 
      allowNull: false,
      comment: 'Unix timestamp in milliseconds'
    },
    userId: { 
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'id'
      }
    },
    logType: { 
      type: DataTypes.STRING(20), 
      allowNull: false,
      validate: {
        isIn: [['USING', 'SYSTEM']]
      },
      comment: 'Type of log: USING (user operations) or SYSTEM (system events)'
    },
    category: { 
      type: DataTypes.STRING(50), 
      allowNull: false,
      comment: 'Log category: unlock, dispensing, force-reset, deactive, admin, error, etc.'
    },
    level: { 
      type: DataTypes.STRING(10), 
      defaultValue: 'info',
      validate: {
        isIn: [['error', 'warn', 'info', 'debug']]
      },
      comment: 'Log level for system logs'
    },
    slotId: { 
      type: DataTypes.INTEGER,
      comment: 'Hardware slot identifier'
    },
    hn: { 
      type: DataTypes.STRING(50),
      comment: 'Hospital number'
    },
    operation: { 
      type: DataTypes.STRING(50),
      comment: 'Specific operation performed'
    },
    reason: { 
      type: DataTypes.TEXT,
      comment: 'Reason for force-reset, deactive, etc.'
    },
    message: { 
      type: DataTypes.TEXT, 
      allowNull: false,
      comment: 'Primary log message'
    },
    details: { 
      type: DataTypes.JSON,
      comment: 'Additional structured data in JSON format'
    }
  },
  {
    sequelize,
    modelName: "UnifiedLog",
    tableName: "UnifiedLog",
    createdAt: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['timestamp'],
        name: 'idx_unified_log_timestamp'
      },
      {
        fields: ['userId'],
        name: 'idx_unified_log_user_id'
      },
      {
        fields: ['logType'],
        name: 'idx_unified_log_log_type'
      },
      {
        fields: ['category'],
        name: 'idx_unified_log_category'
      },
      {
        fields: ['level'],
        name: 'idx_unified_log_level'
      },
      {
        fields: ['slotId'],
        name: 'idx_unified_log_slot_id'
      },
      {
        fields: ['logType', 'timestamp'],
        name: 'idx_unified_log_type_timestamp'
      },
      {
        fields: ['userId', 'timestamp'],
        name: 'idx_unified_log_user_timestamp'
      },
      {
        fields: ['category', 'timestamp'],
        name: 'idx_unified_log_category_timestamp'
      }
    ]
  }
);

// Define associations
UnifiedLog.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'User'
});

// Helper method to create logs with automatic timestamp
UnifiedLog.createLog = function(data: {
  logType: 'USING' | 'SYSTEM';
  category: string;
  level?: string;
  userId?: number;
  slotId?: number;
  hn?: string;
  operation?: string;
  reason?: string;
  message: string;
  details?: any;
}) {
  return this.create({
    timestamp: Date.now(),
    level: data.level || 'info',
    ...data
  });
};

export default UnifiedLog;