import { BrowserWindow } from 'electron';
import { KU16 } from '../ku16';
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';

// Import all universal adapters
import { registerUniversalInitHandler } from './initAdapter';
import { registerUniversalPortListHandler } from './portListAdapter';
import { registerUniversalLoggingHandlers } from './loggingAdapter';
import { 
  registerUniversalDeactivateAdminHandler,
  registerUniversalDeactivateAllHandler,
  registerUniversalReactivateAdminHandler,
  registerUniversalReactivateAllHandler
} from './adminAdapters';
import { 
  registerUniversalGetAllSlotsHandler,
  registerUniversalSlotStatusHandler
} from './slotsAdapter';

/**
 * Universal IPC Adapter System
 * 
 * This module provides a compatibility layer between the frontend and backend
 * hardware-specific IPC handlers. It automatically detects the current hardware
 * type (KU16 or CU12) and routes IPC calls to the appropriate implementation.
 * 
 * Benefits:
 * - Maintains backward compatibility with existing frontend code
 * - Eliminates need to modify frontend for hardware switching
 * - Provides seamless hardware abstraction layer
 * - Centralizes hardware detection logic
 */

export const registerUniversalAdapters = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  console.log('[ADAPTER] Registering universal IPC adapters...');
  
  // Core system adapters
  registerUniversalInitHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalPortListHandler(ku16Instance);
  registerUniversalLoggingHandlers();
  
  // Admin management adapters
  registerUniversalDeactivateAdminHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalDeactivateAllHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalReactivateAdminHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalReactivateAllHandler(ku16Instance, cu12StateManager, mainWindow);
  
  // Slot management adapters
  // Note: Using existing getAllSlotsHandler instead of universal adapter to avoid conflicts
  // registerUniversalGetAllSlotsHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalSlotStatusHandler(ku16Instance, cu12StateManager, mainWindow);
  
  console.log('[ADAPTER] All universal IPC adapters registered successfully');
  console.log('[ADAPTER] Admin dashboard now supports both KU16 and CU12 hardware');
  console.log('[ADAPTER] Frontend can now use standard IPC calls regardless of hardware type');
};

// Export individual adapters for selective registration if needed
export {
  registerUniversalInitHandler,
  registerUniversalPortListHandler,
  registerUniversalLoggingHandlers,
  registerUniversalDeactivateAdminHandler,
  registerUniversalDeactivateAllHandler,
  registerUniversalReactivateAdminHandler,
  registerUniversalReactivateAllHandler,
  registerUniversalGetAllSlotsHandler,
  registerUniversalSlotStatusHandler
};