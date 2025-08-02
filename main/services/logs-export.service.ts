import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { unifiedLoggingService } from './unified-logging.service';
import { getHardwareType } from '../setting/getHardwareType';

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
}

/**
 * Enhanced Logs Export Service
 * Supports both CSV and XLSX formats with Thai encoding
 */
export class LogsExportService {
  private static instance: LogsExportService;
  private activeExports = new Map<string, boolean>();

  static getInstance(): LogsExportService {
    if (!LogsExportService.instance) {
      LogsExportService.instance = new LogsExportService();
    }
    return LogsExportService.instance;
  }

  /**
   * Export logs with progress tracking
   */
  async exportLogs(
    config: ExportConfig,
    progressCallback?: (progress: ExportProgress) => void
  ): Promise<ExportResult> {
    const exportId = `export_${Date.now()}`;
    this.activeExports.set(exportId, true);

    try {
      // Phase 1: Preparing
      this.reportProgress(progressCallback, {
        phase: 'preparing',
        progress: 0,
        message: 'เตรียมการส่งออกข้อมูล...'
      });

      // Validate config
      if (!config.folderPath) {
        throw new Error('ไม่ได้ระบุโฟลเดอร์สำหรับบันทึกไฟล์');
      }

      if (!fs.existsSync(config.folderPath)) {
        throw new Error('ไม่พบโฟลเดอร์ที่ระบุ');
      }

      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const hardwareInfo = await getHardwareType();
      const baseFilename = config.filename || `logs-export-${hardwareInfo.type}-${timestamp}`;
      const filename = `${baseFilename}.${config.format}`;
      const filePath = path.join(config.folderPath, filename);

      // Phase 2: Fetching data
      this.reportProgress(progressCallback, {
        phase: 'fetching',
        progress: 20,
        message: 'ดึงข้อมูล logs จากฐานข้อมูล...'
      });

      const { logs } = await unifiedLoggingService.getLogs({
        logType: config.logType,
        startDate: config.startDate,
        endDate: config.endDate,
        limit: 10000, // Large limit for export
        includeDebug: config.includeDebug || false
      });

      if (logs.length === 0) {
        throw new Error('ไม่พบข้อมูล logs ที่ตรงกับเงื่อนไขที่ระบุ');
      }

      // Phase 3: Processing
      this.reportProgress(progressCallback, {
        phase: 'processing',
        progress: 50,
        message: `กำลังประมวลผลข้อมูล ${logs.length} รายการ...`,
        recordCount: logs.length
      });

      // Phase 4: Writing file
      this.reportProgress(progressCallback, {
        phase: 'writing',
        progress: 80,
        message: `กำลังเขียนไฟล์ ${config.format.toUpperCase()}...`,
        filename: filename
      });

      let fileSize: number;

      if (config.format === 'csv') {
        fileSize = await this.exportToCSV(logs, filePath);
      } else if (config.format === 'xlsx') {
        fileSize = await this.exportToXLSX(logs, filePath);
      } else {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
      }

      // Phase 5: Completed
      this.reportProgress(progressCallback, {
        phase: 'completed',
        progress: 100,
        message: 'ส่งออกข้อมูลเรียบร้อย',
        recordCount: logs.length,
        filename: filename,
        filePath: filePath
      });

      return {
        success: true,
        filename: filename,
        filePath: filePath,
        recordCount: logs.length,
        format: config.format,
        fileSize: fileSize
      };

    } catch (error) {
      this.reportProgress(progressCallback, {
        phase: 'error',
        progress: 0,
        message: error.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
      });

      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
      };
    } finally {
      this.activeExports.delete(exportId);
    }
  }

  /**
   * Export to CSV with Thai encoding (UTF-8 with BOM)
   */
  private async exportToCSV(logs: any[], filePath: string): Promise<number> {
    const csvHeaders = [
      'วันที่',
      'เวลา',
      'ประเภท',
      'หมวดหมู่',
      'ระดับ',
      'ผู้ใช้งาน',
      'ช่องยา',
      'HN',
      'การดำเนินการ',
      'เหตุผล',
      'ข้อความ'
    ];

    const csvRows = logs.map((log) =>
      [
        new Date(log.timestamp).toLocaleDateString('th-TH'),
        new Date(log.timestamp).toLocaleTimeString('th-TH'),
        log.logTypeDisplayName || log.logType,
        log.categoryDisplayName || log.category,
        log.levelDisplayName || log.level,
        log.userName || '-',
        log.slotId || '-',
        log.hn || '-',
        log.operation || '-',
        log.reason || '-',
        log.message || '-'
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
    );

    // Add UTF-8 BOM for Thai text support in Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csvContent, 'utf8');
    return Buffer.byteLength(csvContent, 'utf8');
  }

  /**
   * Export to XLSX with Unicode support
   */
  private async exportToXLSX(logs: any[], filePath: string): Promise<number> {
    const worksheetData = [
      // Headers
      [
        'วันที่',
        'เวลา',
        'ประเภท',
        'หมวดหมู่',
        'ระดับ',
        'ผู้ใช้งาน',
        'ช่องยา',
        'HN',
        'การดำเนินการ',
        'เหตุผล',
        'ข้อความ'
      ],
      // Data rows
      ...logs.map((log) => [
        new Date(log.timestamp).toLocaleDateString('th-TH'),
        new Date(log.timestamp).toLocaleTimeString('th-TH'),
        log.logTypeDisplayName || log.logType,
        log.categoryDisplayName || log.category,
        log.levelDisplayName || log.level,
        log.userName || '-',
        log.slotId || '-',
        log.hn || '-',
        log.operation || '-',
        log.reason || '-',
        log.message || '-'
      ])
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // วันที่
      { wch: 10 }, // เวลา
      { wch: 15 }, // ประเภท
      { wch: 15 }, // หมวดหมู่
      { wch: 10 }, // ระดับ
      { wch: 20 }, // ผู้ใช้งาน
      { wch: 8 },  // ช่องยา
      { wch: 15 }, // HN
      { wch: 20 }, // การดำเนินการ
      { wch: 25 }, // เหตุผล
      { wch: 50 }  // ข้อความ
    ];
    worksheet['!cols'] = columnWidths;

    // Style the header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { bgColor: { indexed: 64 }, fgColor: { rgb: '4F81BD' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs Export');

    // Write file with proper encoding
    XLSX.writeFile(workbook, filePath, { 
      bookType: 'xlsx',
      type: 'buffer'
    });

    const stats = fs.statSync(filePath);
    return stats.size;
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): Array<{ value: string; label: string; description: string }> {
    return [
      {
        value: 'csv',
        label: 'CSV',
        description: 'ไฟล์ข้อมูลที่แยกด้วยเครื่องหมายจุลภาค เหมาะสำหรับ Excel และโปรแกรมอื่นๆ'
      },
      {
        value: 'xlsx',
        label: 'Excel (XLSX)',
        description: 'ไฟล์ Excel แบบใหม่ รองรับการจัดรูปแบบและสีสันต่างๆ'
      }
    ];
  }

  /**
   * Cancel active export (if supported)
   */
  cancelExport(exportId: string): boolean {
    if (this.activeExports.has(exportId)) {
      this.activeExports.delete(exportId);
      return true;
    }
    return false;
  }

  /**
   * Get active exports count
   */
  getActiveExportsCount(): number {
    return this.activeExports.size;
  }

  /**
   * Helper method to report progress
   */
  private reportProgress(
    callback: ((progress: ExportProgress) => void) | undefined,
    progress: ExportProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }
}

// Export singleton instance
export const logsExportService = LogsExportService.getInstance();