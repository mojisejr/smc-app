/**
 * Admin IPC Handlers - Phase 4.2 Migration
 * 
 * MIGRATION PATTERN SUMMARY:
 * - Remove ku16: KU16 parameter dependency 
 * - Use BrowserWindow.fromWebContents(event.sender) for IPC communication
 * - Replace ku16 calls with BuildTimeController.getCurrentController()
 * - Preserve exact same IPC event names and Thai error messages
 * - Maintain same timing patterns (1-second delays)
 * - Keep all logging and audit functionality
 * 
 * ADMIN OPERATIONS COVERED:
 * - deactivate: Single slot deactivation (user-level)
 * - deactivateAll: All slots deactivation (admin-only)  
 * - deactivate-admin: Single slot deactivation (admin-level)
 * - reactivate-admin: Single slot reactivation (admin-only)
 * - reactivate-all: All slots reactivation (admin-only)
 * 
 * CRITICAL REQUIREMENTS PRESERVED:
 * - Admin role validation for sensitive operations
 * - Hardware connection checks before operations
 * - 1-second sleep + sendCheckState() timing patterns
 * - Exact Thai language error messages
 * - Complete audit logging to logs and dispensing-logs tables
 * - Same IPC error event names for frontend compatibility
 */

// Admin operation handlers
export { deactivateHandler } from './deactivate';
export { deactivateAllHandler } from './deactivateAll';
export { deactivateAdminHandler } from './deactivate-admin';
export { reactivateAdminHandler } from './reactivate-admin';
export { reactiveAllHandler } from './reactiveAll';

/**
 * Register all admin IPC handlers
 * 
 * USAGE PATTERN:
 * import { registerAdminHandlers } from './admin';
 * registerAdminHandlers();
 */
export const registerAdminHandlers = () => {
  deactivateHandler();
  deactivateAllHandler();
  deactivateAdminHandler();
  reactivateAdminHandler();
  reactiveAllHandler();
};