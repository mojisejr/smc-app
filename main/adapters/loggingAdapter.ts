// DEPRECATED: Universal Logging Adapter
// This file contained legacy logging redirects that have been replaced
// by the Enhanced Logging System (enhanced-logging-adapter.ts)

// Original functionality:
// - get_logs → redirected to enhanced logging
// - export_logs → redirected to enhanced logging  
// - log_dispensing → redirected to enhanced logging

// All logging functionality now handled by:
// - Enhanced Logging System (main/adapters/enhanced-logging-adapter.ts)
// - Unified Log Service (main/services/unified-logging.service.ts)
// - UnifiedLog Model (db/model/unified-log.model.ts)

// This file is kept for reference only
// No active functionality - all handlers have been moved

export const registerUniversalLoggingHandlers = () => {
  console.log('[DEPRECATED] Universal logging handlers are deprecated');
  console.log('[INFO] Use Enhanced Logging System instead');
  // No handlers registered - functionality moved to enhanced-logging-adapter.ts
};