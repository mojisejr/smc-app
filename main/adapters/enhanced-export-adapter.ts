import { ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { logsExportService, ExportConfig, ExportProgress } from '../services/logs-export.service';
import { unifiedLoggingService } from '../services/unified-logging.service';

/**
 * Enhanced Export Adapter
 * Handles all export-related IPC communications with improved UI/UX
 */

// Store active progress callbacks
const progressCallbacks = new Map<string, (progress: ExportProgress) => void>();

/**
 * Handle export logs with folder selection and format choice
 */
ipcMain.handle('export_logs_enhanced', async (event, payload: {
  adminId?: string;
  adminName: string;
  config: ExportConfig;
}) => {
  try {
    const { adminName, config } = payload;

    // If no folder path specified, show folder selection dialog
    if (!config.folderPath) {
      const result = await dialog.showOpenDialog({
        title: 'เลือกโฟลเดอร์สำหรับบันทึกไฟล์',
        defaultPath: path.join(os.homedir(), 'Desktop'),
        properties: ['openDirectory'],
        buttonLabel: 'เลือกโฟลเดอร์'
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return {
          success: false,
          error: 'ไม่ได้เลือกโฟลเดอร์สำหรับบันทึกไฟล์'
        };
      }

      config.folderPath = result.filePaths[0];
    }

    // Generate unique export ID for progress tracking
    const exportId = `export_${Date.now()}`;

    // Set up progress callback
    const progressCallback = (progress: ExportProgress) => {
      event.sender.send('export_progress', { exportId, progress });
    };
    progressCallbacks.set(exportId, progressCallback);

    // Track admin operation - don't fail export if logging fails
    if (adminName) {
      try {
        await unifiedLoggingService.logAdminOperation({
          userId: 0, // System Admin user ID (created as fallback)
          operation: 'export_logs',
          details: {
            format: config.format,
            logType: config.logType,
            exportId: exportId,
            folderPath: config.folderPath,
            adminName: adminName,
            timestamp: new Date().toISOString()
          },
          message: `ส่งออกข้อมูล logs รูปแบบ ${config.format.toUpperCase()} โดย ${adminName}`
        });
      } catch (logError) {
        console.warn('Admin operation logging failed (export will continue):', logError);
        // Don't throw error - allow export to continue even if admin logging fails
      }
    }

    // Perform export
    const result = await logsExportService.exportLogs(config, progressCallback);

    // Clean up progress callback
    progressCallbacks.delete(exportId);

    return {
      ...result,
      exportId: exportId
    };

  } catch (error) {
    console.error('Enhanced export error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล'
    };
  }
});

/**
 * Handle folder selection for export
 */
ipcMain.handle('select_export_folder', async (event) => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'เลือกโฟลเดอร์สำหรับบันทึกไฟล์',
      defaultPath: path.join(os.homedir(), 'Desktop'),
      properties: ['openDirectory'],
      buttonLabel: 'เลือกโฟลเดอร์'
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return {
        success: false,
        canceled: true
      };
    }

    return {
      success: true,
      folderPath: result.filePaths[0],
      folderName: path.basename(result.filePaths[0])
    };

  } catch (error) {
    console.error('Folder selection error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเลือกโฟลเดอร์'
    };
  }
});

/**
 * Get available export formats
 */
ipcMain.handle('get_export_formats', async () => {
  try {
    return {
      success: true,
      formats: logsExportService.getAvailableFormats()
    };
  } catch (error) {
    console.error('Get export formats error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลรูปแบบไฟล์'
    };
  }
});


/**
 * Cancel active export
 */
ipcMain.handle('cancel_export', async (event, payload: { exportId: string }) => {
  try {
    const { exportId } = payload;

    const canceled = logsExportService.cancelExport(exportId);
    progressCallbacks.delete(exportId);

    return {
      success: canceled,
      message: canceled ? 'ยกเลิกการส่งออกเรียบร้อย' : 'ไม่พบการส่งออกที่ระบุ'
    };

  } catch (error) {
    console.error('Cancel export error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการส่งออก'
    };
  }
});

/**
 * Get export statistics
 */
ipcMain.handle('get_export_stats', async () => {
  try {
    return {
      success: true,
      activeExports: logsExportService.getActiveExportsCount(),
      availableFormats: logsExportService.getAvailableFormats().length
    };
  } catch (error) {
    console.error('Get export stats error:', error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการดึงสถิติการส่งออก'
    };
  }
});

// Legacy export handler removed to avoid duplication
// The existing handler in enhanced-logging-adapter.ts will handle legacy compatibility

console.log('Enhanced Export Adapter initialized with handlers:');
console.log('- export_logs_enhanced: Enhanced export with format selection');
console.log('- select_export_folder: Folder selection dialog');
console.log('- get_export_formats: Available export formats');
console.log('- cancel_export: Cancel active export');
console.log('- get_export_stats: Export statistics');
console.log('Note: export_logs_with_tracking handled by enhanced-logging-adapter.ts');