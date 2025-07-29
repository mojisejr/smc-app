import { ipcMain } from 'electron';
import { getHardwareType } from '../setting/getHardwareType';
import { DispensingLog } from '../../db/model/dispensing-logs.model';
import { getLogs } from '../logger';

/**
 * Universal Logging Adapter
 * Routes logging-related IPC calls to appropriate implementation
 * Provides unified logging functionality regardless of hardware type
 */
export const registerUniversalLoggingHandlers = () => {
  
  // Universal get system logs handler (for get_logs)
  ipcMain.handle('get_logs', async () => {
    try {
      console.log('[ADAPTER] Universal get_logs handler called');
      
      // Auto-detect current hardware type for logging context
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Getting system logs for ${hardwareInfo.type} system`);
      
      // Get all system logs regardless of hardware type
      const logs = await getLogs();
      const logsData = logs.map((log) => log.dataValues);
      
      console.log(`[ADAPTER] Retrieved ${logsData.length} system logs`);
      
      // Add hardware context to logs for consistency
      const logsWithContext = logsData.map(log => ({
        ...log,
        hardwareType: hardwareInfo.type,
        systemInfo: `${hardwareInfo.type} (${hardwareInfo.maxSlots} slots)`
      }));
      
      return logsWithContext;
      
    } catch (error) {
      console.error('[ADAPTER] Error getting system logs:', error.message);
      return {
        error: error.message,
        logs: []
      };
    }
  });
  
  // Universal get dispensing logs handler
  ipcMain.handle('get_dispensing_logs', async () => {
    try {
      console.log('[ADAPTER] Universal dispensing logs handler called');
      
      // Auto-detect current hardware type for logging context
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Getting dispensing logs for ${hardwareInfo.type} system`);
      
      // Get all dispensing logs regardless of hardware type
      // The logs table is hardware-agnostic and contains records from all systems
      const logs = await DispensingLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: 1000 // Limit to prevent memory issues with large log tables
      });
      
      console.log(`[ADAPTER] Retrieved ${logs.length} dispensing logs`);
      
      // Add hardware context to logs for UI display
      const logsWithContext = logs.map(log => ({
        ...log.toJSON(),
        hardwareType: hardwareInfo.type,
        systemInfo: `${hardwareInfo.type} (${hardwareInfo.maxSlots} slots)`
      }));
      
      return logsWithContext;
      
    } catch (error) {
      console.error('[ADAPTER] Error getting dispensing logs:', error.message);
      return {
        error: error.message,
        logs: []
      };
    }
  });
  
  // Universal export logs handler
  ipcMain.handle('export_logs', async () => {
    try {
      console.log('[ADAPTER] Universal export logs handler called');
      
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Exporting logs for ${hardwareInfo.type} system`);
      
      // Get all logs for export
      const logs = await DispensingLog.findAll({
        order: [['createdAt', 'DESC']]
      });
      
      // Create filename with hardware type and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `dispensing-logs-${hardwareInfo.type}-${timestamp}.json`;
      const filepath = `/tmp/${filename}`;
      
      // Export logs as JSON with hardware context
      const exportData = {
        exportDate: new Date().toISOString(),
        hardwareType: hardwareInfo.type,
        systemInfo: `${hardwareInfo.type} (${hardwareInfo.maxSlots} slots)`,
        totalLogs: logs.length,
        logs: logs.map(log => log.toJSON())
      };
      
      const fs = require('fs');
      fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
      
      console.log(`[ADAPTER] Logs exported to ${filename}`);
      return filename;
      
    } catch (error) {
      console.error('[ADAPTER] Error exporting logs:', error.message);
      throw error;
    }
  });
  
  // Universal log dispensing handler (for recording new dispensing events)
  ipcMain.handle('log_dispensing', async (event, data) => {
    try {
      console.log('[ADAPTER] Universal log dispensing handler called with data:', data);
      
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Logging dispensing event for ${hardwareInfo.type} system`);
      
      // Create log entry with hardware context
      const logEntry = await DispensingLog.create({
        ...data,
        hardwareType: hardwareInfo.type,
        systemInfo: `${hardwareInfo.type} (${hardwareInfo.maxSlots} slots)`,
        timestamp: new Date()
      });
      
      console.log(`[ADAPTER] Dispensing event logged with ID: ${logEntry.id}`);
      return { success: true, logId: logEntry.id };
      
    } catch (error) {
      console.error('[ADAPTER] Error logging dispensing event:', error.message);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[ADAPTER] Universal logging handlers registered successfully');
};