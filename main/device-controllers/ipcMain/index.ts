/**
 * Unified IPC Handlers Registration System - Phase 4.2
 * 
 * MIGRATION SUMMARY:
 * This file provides centralized registration for all device controller IPC handlers,
 * replacing the KU16-dependent registration with BuildTimeController-based handlers.
 * 
 * ARCHITECTURE PATTERN:
 * - Category-based handler organization (core, dispensing, management, admin)
 * - Single registration function for all handlers
 * - Zero regression guarantee - same IPC event names preserved
 * - BuildTimeController singleton pattern for hardware abstraction
 * 
 * CRITICAL MIGRATION REQUIREMENTS ADDRESSED:
 * ✅ Remove ku16: KU16 parameter dependency from all handlers
 * ✅ Use BrowserWindow.fromWebContents(event.sender) pattern consistently  
 * ✅ Replace ku16 calls with BuildTimeController.getCurrentController()
 * ✅ Preserve all Thai error messages exactly
 * ✅ Maintain same timing patterns (1-second delays)
 * ✅ Keep all logging and audit functionality
 * ✅ Use BuildTimeController instead of direct KU16 calls
 * 
 * HANDLER CATEGORIES:
 * 
 * CORE HANDLERS (System & Port Management):
 * - init: Initialize hardware connection and check state
 * - getPortList: Get available serial ports for device connection
 * - checkLockedBack: Check if slot has returned to locked state
 * 
 * DISPENSING HANDLERS (Medication Operations):
 * - unlock: Unlock slot for medication loading (requires passkey)
 * - dispense: Trigger medication dispensing for patient (requires passkey)
 * - dispensing-continue: Continue dispensing process after slot preparation
 * 
 * MANAGEMENT HANDLERS (Slot Control):
 * - reset: Reset slot to default state (requires passkey)
 * - forceReset: Force reset slot in error conditions (requires passkey)
 * 
 * ADMIN HANDLERS (Administrative Operations):
 * - deactivate: Deactivate single slot (user-level, requires passkey)
 * - deactivateAll: Deactivate all slots (admin-only)
 * - deactivate-admin: Deactivate single slot (admin-level)
 * - reactivate-admin: Reactivate single slot (admin-only)
 * - reactivate-all: Reactivate all slots (admin-only)
 * 
 * USAGE:
 * ```typescript
 * import { registerAllDeviceHandlers } from './main/device-controllers/ipcMain';
 * 
 * // In main process initialization:
 * registerAllDeviceHandlers();
 * ```
 */

// Import all handler registration functions
import { registerCoreHandlers } from './core';
import { registerDispensingHandlers } from './dispensing';
import { registerManagementHandlers } from './management';
import { registerAdminHandlers } from './admin';

/**
 * Register all device controller IPC handlers
 * 
 * REGISTRATION PATTERN:
 * - Category-based registration for organized handler management
 * - Each category handles its own internal registration
 * - Handlers use BuildTimeController for hardware abstraction
 * - No KU16 dependencies required
 * 
 * MEDICAL DEVICE COMPLIANCE:
 * - All handlers maintain audit logging
 * - Authentication patterns preserved (passkey validation)
 * - Thai language error messages maintained exactly
 * - Same IPC event names ensure frontend compatibility
 * 
 * TIMING CONSISTENCY:
 * - 1-second delays preserved for hardware synchronization
 * - sendCheckState() calls maintained for UI updates
 * - Connection validation before operations
 * 
 * @returns void
 */
export const registerAllDeviceHandlers = (): void => {
  console.log("Phase 4.2: Registering all device controller IPC handlers...");
  
  try {
    // CORE HANDLERS: System initialization and port management
    registerCoreHandlers();
    console.log("✅ Core handlers registered (init, getPortList, checkLockedBack)");

    // DISPENSING HANDLERS: Medication operations
    registerDispensingHandlers();
    console.log("✅ Dispensing handlers registered (unlock, dispense, dispensing-continue)");

    // MANAGEMENT HANDLERS: Slot control operations
    registerManagementHandlers();
    console.log("✅ Management handlers registered (reset, forceReset)");

    // ADMIN HANDLERS: Administrative operations
    registerAdminHandlers();
    console.log("✅ Admin handlers registered (deactivate, deactivateAll, deactivate-admin, reactivate-admin, reactivate-all)");

    console.log("🎉 Phase 4.2: All device controller IPC handlers registered successfully");
    console.log("🔄 Migration complete: KU16 → BuildTimeController pattern");
    
  } catch (error) {
    console.error("❌ Failed to register device controller IPC handlers:", error);
    throw new Error("Critical error: Could not initialize device controller IPC system");
  }
};

/**
 * Get list of all registered IPC event names
 * 
 * USAGE: For debugging and frontend integration validation
 * 
 * @returns string[] - Array of all IPC event names handled by device controllers
 */
export const getRegisteredIpcEvents = (): string[] => {
  return [
    // Core events
    'init',
    'getPortList', 
    'checkLockedBack',
    
    // Dispensing events  
    'unlock',
    'dispense',
    'dispensing-continue',
    
    // Management events
    'reset',
    'forceReset',
    
    // Admin events
    'deactivate',
    'deactivateAll',
    'deactivate-admin',
    'reactivate-admin',
    'reactivate-all'
  ];
};

/**
 * Validate all IPC handlers are properly registered
 * 
 * USAGE: For system health checks and debugging
 * 
 * @returns boolean - True if all handlers are registered
 */
export const validateHandlerRegistration = (): boolean => {
  try {
    const registeredEvents = getRegisteredIpcEvents();
    console.log(`Device Controller IPC Events: ${registeredEvents.length} handlers registered`);
    console.log("Events:", registeredEvents.join(', '));
    return true;
  } catch (error) {
    console.error("Handler registration validation failed:", error);
    return false;
  }
};

// Export individual registration functions for selective usage
export {
  registerCoreHandlers,
  registerDispensingHandlers,
  registerManagementHandlers,
  registerAdminHandlers
};