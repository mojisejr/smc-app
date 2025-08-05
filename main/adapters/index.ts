import { BrowserWindow } from 'electron';
import { KU16 } from '../ku16'; // Legacy - to be removed
import { KU16SmartStateManager } from '../hardware/ku16/stateManager'; // New modern KU16
import { CU12SmartStateManager } from '../hardware/cu12/stateManager';

// Import all universal adapters
import { registerUniversalInitHandler } from './initAdapter';
import { registerUniversalPortListHandler } from './portListAdapter';
import { registerUniversalLoggingHandlers } from './loggingAdapter';
import { 
  registerUniversalDeactivateAdminHandler,
  registerUniversalDeactivateAllHandler,
  registerUniversalReactivateAdminHandler,
  registerUniversalReactivateAllHandler,
  registerUniversalDeactivateHandler
} from './adminAdapters';
import { 
  registerUniversalGetAllSlotsHandler,
  registerUniversalSlotStatusHandler
} from './slotsAdapter';
import { registerUniversalUnlockHandler } from './unlockAdapter';
import { 
  registerUniversalDispenseHandler,
  registerUniversalDispenseContinueHandler
} from './dispenseAdapter';
import { 
  registerUniversalResetHandler,
  registerUniversalForceResetHandler
} from './resetAdapter';
import { registerUniversalCheckLockedBackHandler } from './statusAdapter';
import { registerUniversalClearSlotHandler } from './clearAdapter';
import { registerUniversalConnectionHandler } from './connectionAdapter';

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
  ku16Instance: KU16 | null, // Legacy - to be removed
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow,
  ku16StateManager?: KU16SmartStateManager | null // New modern KU16 - optional for transition
) => {
  console.log('[ADAPTER] Registering universal IPC adapters...');
  
  // Core system adapters
  registerUniversalInitHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalPortListHandler(ku16Instance);
  registerUniversalConnectionHandler(ku16Instance, cu12StateManager, mainWindow);
  // NOTE: Logging handlers now managed by Enhanced Logging System in background.ts
  
  // Core operation adapters (Critical for both KU16 and CU12 compatibility)
  registerUniversalUnlockHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalDispenseHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalDispenseContinueHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalResetHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalForceResetHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalCheckLockedBackHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  registerUniversalClearSlotHandler(ku16Instance, cu12StateManager, mainWindow, ku16StateManager);
  
  // Admin management adapters
  registerUniversalDeactivateAdminHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalDeactivateAllHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalReactivateAdminHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalReactivateAllHandler(ku16Instance, cu12StateManager, mainWindow);
  
  // User deactivation adapter (for dialog components)
  registerUniversalDeactivateHandler(ku16Instance, cu12StateManager, mainWindow);
  
  // Slot management adapters
  // Note: Using existing getAllSlotsHandler instead of universal adapter to avoid conflicts
  // registerUniversalGetAllSlotsHandler(ku16Instance, cu12StateManager, mainWindow);
  registerUniversalSlotStatusHandler(ku16Instance, cu12StateManager, mainWindow);
  
  console.log('[ADAPTER] All universal IPC adapters registered successfully');
  console.log('[ADAPTER] Core operations (unlock, dispense, reset) now support both KU16 and CU12');
  console.log('[ADAPTER] Admin dashboard now supports both KU16 and CU12 hardware');
  console.log('[ADAPTER] Frontend can now use standard IPC calls regardless of hardware type');
};

// Export individual adapters for selective registration if needed
export {
  registerUniversalInitHandler,
  registerUniversalPortListHandler,
  registerUniversalLoggingHandlers,
  registerUniversalUnlockHandler,
  registerUniversalDispenseHandler,
  registerUniversalDispenseContinueHandler,
  registerUniversalResetHandler,
  registerUniversalForceResetHandler,
  registerUniversalCheckLockedBackHandler,
  registerUniversalClearSlotHandler,
  registerUniversalDeactivateAdminHandler,
  registerUniversalDeactivateAllHandler,
  registerUniversalReactivateAdminHandler,
  registerUniversalReactivateAllHandler,
  registerUniversalDeactivateHandler,
  registerUniversalGetAllSlotsHandler,
  registerUniversalSlotStatusHandler,
  registerUniversalConnectionHandler
};