import { ipcMain } from 'electron';
import { getHardwareType } from '../setting/getHardwareType';
// DispensingLog model removed - using UnifiedLog instead
// Legacy logger import removed

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
      
      // Legacy system - redirecting to enhanced logging
      console.log('[ADAPTER] Redirecting to Enhanced Logging System');
      return { error: 'Legacy system deprecated. Use get_enhanced_logs instead.' };
      
    } catch (error) {
      console.error('[ADAPTER] Error getting system logs:', error.message);
      return {
        error: error.message,
        logs: []
      };
    }
  });
  
  // NOTE: get_dispensing_logs handler moved to Enhanced Logging System
  
  // Universal export logs handler
  ipcMain.handle('export_logs', async () => {
    try {
      console.log('[ADAPTER] Universal export logs handler called');
      
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Exporting logs for ${hardwareInfo.type} system`);
      
      // Legacy export - redirect to enhanced system
      console.log('[ADAPTER] Export redirected to Enhanced Logging System');
      throw new Error('Legacy export deprecated. Use export_logs_with_tracking instead.');
      
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
      
      // Legacy dispensing log - redirect to enhanced system
      console.log('[ADAPTER] Dispensing log redirected to Enhanced Logging System');
      return { success: false, error: 'Legacy dispensing log deprecated. Use enhanced logging methods instead.' };
      
    } catch (error) {
      console.error('[ADAPTER] Error logging dispensing event:', error.message);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[ADAPTER] Universal logging handlers registered successfully');
};