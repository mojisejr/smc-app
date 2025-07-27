// CU12 IPC Handlers - Adaptive Smart State Management
// These handlers integrate with CU12SmartStateManager for resource-efficient 24/7 operation

export { cu12InitHandler } from './init';
export { cu12UnlockHandler } from './unlock';
export { cu12DispenseHandler } from './dispensing';
export { cu12DispenseContinueHandler } from './dispensing-continue';
export { cu12ResetHandler } from './reset';
export { cu12ForceResetHandler } from './forceReset';
export { 
  cu12DeactivateHandler, 
  cu12DeactivateAllHandler 
} from './deactivate';
export { 
  cu12ReactivateAllHandler, 
  cu12ReactivateAdminHandler 
} from './reactivate';
export { 
  cu12StatusHandler, 
  cu12CheckLockedBackHandler, 
  cu12HealthCheckHandler 
} from './status';

// Utility function to register all CU12 IPC handlers
import { BrowserWindow } from 'electron';
import { CU12SmartStateManager } from '../stateManager';

export const registerCU12Handlers = (
  stateManager: CU12SmartStateManager, 
  mainWindow: BrowserWindow
) => {
  // Core operation handlers
  cu12InitHandler(stateManager, mainWindow);
  cu12UnlockHandler(stateManager);
  cu12DispenseHandler(stateManager);
  cu12DispenseContinueHandler(stateManager);
  
  // Reset and recovery handlers
  cu12ResetHandler(stateManager);
  cu12ForceResetHandler(stateManager);
  
  // Activation management handlers
  cu12DeactivateHandler(stateManager);
  cu12DeactivateAllHandler(stateManager);
  cu12ReactivateAllHandler(stateManager);
  cu12ReactivateAdminHandler(stateManager);
  
  // Status and monitoring handlers
  cu12StatusHandler(stateManager);
  cu12CheckLockedBackHandler(stateManager);
  cu12HealthCheckHandler(stateManager);
  
  console.log('[CU12] All IPC handlers registered with adaptive state management');
};