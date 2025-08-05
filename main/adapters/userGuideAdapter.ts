import { ipcMain } from 'electron';
import { 
  getHardwareContentFilter, 
  getHardwareDisplayInfo,
  getHardwareCacheStats,
  clearHardwareCache 
} from '../setting/getHardwareType';

/**
 * User Guide Documentation System IPC Adapters
 * 
 * Provides IPC handlers for the UserGuideView component to access
 * hardware detection and content filtering functionality.
 */

export const registerUserGuideAdapters = () => {
  console.log('[UserGuideAdapter] Registering user guide IPC handlers...');

  /**
   * Get hardware-specific content filter for documentation display
   */
  ipcMain.handle('get-hardware-content-filter', async () => {
    try {
      console.log('[UserGuideAdapter] Getting hardware content filter...');
      const filter = await getHardwareContentFilter();
      
      console.log('[UserGuideAdapter] Content filter generated:', {
        hardware: filter.currentHardware,
        showCU12: filter.showCU12Content,
        showKU16: filter.showKU16Content,
        slotCount: filter.slotCount,
        features: filter.features.length
      });
      
      return filter;
    } catch (error) {
      console.error('[UserGuideAdapter] Error getting content filter:', error.message);
      // Return fallback filter to show all content
      return {
        showCU12Content: true,
        showKU16Content: true,
        showUniversalContent: true,
        currentHardware: 'UNKNOWN',
        slotCount: 0,
        features: ['all-features']
      };
    }
  });

  /**
   * Get formatted hardware display information for UI
   */
  ipcMain.handle('get-hardware-display-info', async () => {
    try {
      console.log('[UserGuideAdapter] Getting hardware display info...');
      const displayInfo = await getHardwareDisplayInfo();
      
      console.log('[UserGuideAdapter] Display info generated:', {
        displayName: displayInfo.displayName,
        statusColor: displayInfo.statusColor,
        slotInfo: displayInfo.slotInfo
      });
      
      return displayInfo;
    } catch (error) {
      console.error('[UserGuideAdapter] Error getting display info:', error.message);
      // Return fallback display info
      return {
        displayName: 'ไม่ทราบประเภท Hardware',
        statusColor: 'red',
        description: 'ไม่สามารถตรวจสอบประเภท Hardware ได้',
        slotInfo: 'ไม่ทราบจำนวนช่อง',
        protocolInfo: 'ไม่ได้เชื่อมต่อ'
      };
    }
  });

  /**
   * Get hardware detection cache statistics (for performance monitoring)
   */
  ipcMain.handle('get-hardware-cache-stats', async () => {
    try {
      const stats = getHardwareCacheStats();
      console.log('[UserGuideAdapter] Cache stats:', stats);
      return stats;
    } catch (error) {
      console.error('[UserGuideAdapter] Error getting cache stats:', error.message);
      return {
        hits: 0,
        misses: 0,
        detections: 0,
        cacheActive: false,
        cacheAge: 0,
        cacheHits: 0
      };
    }
  });

  /**
   * Clear hardware detection cache (for manual refresh)
   */
  ipcMain.handle('clear-hardware-cache', async () => {
    try {
      console.log('[UserGuideAdapter] Clearing hardware cache...');
      clearHardwareCache();
      return { success: true };
    } catch (error) {
      console.error('[UserGuideAdapter] Error clearing cache:', error.message);
      return { success: false, error: error.message };
    }
  });

  /**
   * Refresh hardware detection (clears cache and re-detects)
   */
  ipcMain.handle('refresh-hardware-detection', async () => {
    try {
      console.log('[UserGuideAdapter] Refreshing hardware detection...');
      
      // Clear cache to force fresh detection
      clearHardwareCache();
      
      // Get fresh hardware info
      const filter = await getHardwareContentFilter();
      const displayInfo = await getHardwareDisplayInfo();
      
      console.log('[UserGuideAdapter] Hardware detection refreshed:', {
        hardware: filter.currentHardware,
        cached: false // Fresh detection
      });
      
      return {
        success: true,
        filter,
        displayInfo
      };
    } catch (error) {
      console.error('[UserGuideAdapter] Error refreshing hardware detection:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[UserGuideAdapter] User guide IPC handlers registered successfully');
  console.log('[UserGuideAdapter] Available handlers:');
  console.log('  - get-hardware-content-filter: Get content filtering rules');
  console.log('  - get-hardware-display-info: Get formatted hardware display info');
  console.log('  - get-hardware-cache-stats: Get cache performance statistics');
  console.log('  - clear-hardware-cache: Clear detection cache');
  console.log('  - refresh-hardware-detection: Force fresh hardware detection');
};