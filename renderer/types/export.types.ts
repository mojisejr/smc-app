/**
 * Export Configuration Types
 * Shared interfaces for logs export functionality
 */

export interface ExportFormat {
  value: 'csv' | 'xlsx';
  label: string;
  description: string;
  icon?: string;
}

export interface ExportConfig {
  format: 'csv' | 'xlsx';
  logType?: 'USING' | 'SYSTEM';
  startDate?: Date;
  endDate?: Date;
  includeDebug?: boolean;
  folderPath: string;
  filename?: string;
}

export interface ExportProgress {
  phase: 'preparing' | 'fetching' | 'processing' | 'writing' | 'completed' | 'error';
  progress: number;
  message: string;
  recordCount?: number;
  filename?: string;
  filePath?: string;
}

export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
  filePath?: string;
  recordCount?: number;
  format?: string;
  fileSize?: number;
  exportId?: string;
}


export interface ExportStats {
  activeExports: number;
  availableFormats: number;
}

export interface FolderSelectionResult {
  success: boolean;
  canceled?: boolean;
  error?: string;
  folderPath?: string;
  folderName?: string;
}

/**
 * Export Wizard Configuration
 * Used by the export wizard modal
 */
export interface ExportWizardConfig {
  step: 'format' | 'filters' | 'destination' | 'progress' | 'complete';
  config: Partial<ExportConfig>;
  progress?: ExportProgress;
  result?: ExportResult;
}

/**
 * Log Filter Options
 * For filtering logs before export
 */
export interface LogFilterOptions {
  logType?: 'USING' | 'SYSTEM';
  category?: string;
  level?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  includeDebug?: boolean;
}

/**
 * Export Presets
 * Common export configurations
 */
export const EXPORT_PRESETS = {
  ALL_LOGS: {
    name: 'ส่งออกทั้งหมด',
    description: 'ส่งออก logs ทั้งหมดในระบบ',
    config: {
      logType: undefined,
      includeDebug: false
    }
  },
  USING_LOGS_ONLY: {
    name: 'เฉพาะการใช้งาน',
    description: 'ส่งออกเฉพาะ logs การใช้งานของผู้ใช้',
    config: {
      logType: 'USING' as const,
      includeDebug: false
    }
  },
  SYSTEM_LOGS_ONLY: {
    name: 'เฉพาะระบบ',
    description: 'ส่งออกเฉพาะ logs ระบบและข้อผิดพลาด',
    config: {
      logType: 'SYSTEM' as const,
      includeDebug: false
    }
  },
  LAST_7_DAYS: {
    name: '7 วันที่แล้ว',
    description: 'ส่งออก logs ในช่วง 7 วันที่แล้ว',
    config: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      includeDebug: false
    }
  },
  LAST_30_DAYS: {
    name: '30 วันที่แล้ว',
    description: 'ส่งออก logs ในช่วง 30 วันที่แล้ว',
    config: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      includeDebug: false
    }
  }
} as const;

/**
 * Export Validation Rules
 */
export const EXPORT_VALIDATION = {
  MAX_RECORDS: 50000,
  MIN_RECORDS: 1,
  MAX_FILENAME_LENGTH: 100,
  ALLOWED_FILENAME_CHARS: /^[a-zA-Z0-9\u0E00-\u0E7F\s\-_().]+$/,
  REQUIRED_FOLDER_PERMISSIONS: ['read', 'write']
} as const;

/**
 * Default Export Settings
 */
export const DEFAULT_EXPORT_CONFIG: Partial<ExportConfig> = {
  format: 'csv',
  includeDebug: false,
  logType: undefined
};

/**
 * File Size Formatter
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Export Progress Messages
 */
export const EXPORT_MESSAGES = {
  PREPARING: 'เตรียมการส่งออกข้อมูล...',
  FETCHING: 'ดึงข้อมูล logs จากฐานข้อมูล...',
  PROCESSING: 'กำลังประมวลผลข้อมูล...',
  WRITING: 'กำลังเขียนไฟล์...',
  COMPLETED: 'ส่งออกข้อมูลเรียบร้อย',
  ERROR: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
} as const;