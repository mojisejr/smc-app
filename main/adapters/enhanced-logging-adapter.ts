import { ipcMain, dialog } from "electron";
import { unifiedLoggingService } from "../services/unified-logging.service";
import { getHardwareType } from "../setting/getHardwareType";
import { User } from "../../db/model/user.model";
import path from "path";
import fs from "fs";

/**
 * Enhanced Logging Adapter
 * Replaces the universal logging adapter with full categorization support
 * Includes admin operations tracking and detailed export functionality
 */
export const registerEnhancedLoggingHandlers = () => {
  // Enhanced get logs handler with categorization support
  ipcMain.handle("get_enhanced_logs", async (event, options = {}) => {
    try {
      console.log("[ENHANCED-LOGGING] Get logs request:", options);

      const result = await unifiedLoggingService.getLogs({
        logType: options.logType,
        category: options.category,
        level: options.level,
        userId: options.userId,
        slotId: options.slotId,
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
        searchQuery: options.searchQuery,
        page: options.page,
        limit: options.limit,
        includeDebug: options.includeDebug || false,
      });

      console.log(
        `[ENHANCED-LOGGING] Retrieved ${result.logs.length} logs (page ${result.page}/${result.totalPages})`
      );

      return result;
    } catch (error) {
      console.error("[ENHANCED-LOGGING] Error getting logs:", error.message);
      return {
        logs: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
        error: error.message,
      };
    }
  });

  // Legacy compatibility handler (maps to enhanced system)
  ipcMain.handle("get_dispensing_logs", async () => {
    try {
      console.log("[ENHANCED-LOGGING] Legacy dispensing logs request");

      const result = await unifiedLoggingService.getLogs({
        logType: "USING",
        limit: 500, // Match original system limit
        includeDebug: false,
      });

      // Transform to legacy format for backward compatibility
      const legacyLogs = result.logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt,
        timestamp: log.timestamp,
        slotId: log.slotId,
        hn: log.hn,
        message: log.message,
        process: log.operation,
        user: log.userName,
        userId: log.userId,
      }));

      console.log(
        `[ENHANCED-LOGGING] Legacy format: ${legacyLogs.length} dispensing logs`
      );

      return legacyLogs;
    } catch (error) {
      console.error(
        "[ENHANCED-LOGGING] Error getting dispensing logs:",
        error.message
      );
      return [];
    }
  });

  // Enhanced export with tracking
  ipcMain.handle("export_logs_with_tracking", async (event, data) => {
    try {
      console.log("[ENHANCED-LOGGING] Export with tracking request:", data);

      const { adminId, adminName } = data;

      // Get hardware info for context
      const hardwareInfo = await getHardwareType();

      // Export logs
      const csvContent = await unifiedLoggingService.exportLogs({
        logType: undefined, // Export all types
      });

      // Count records (approximate)
      const recordCount = (csvContent.match(/\n/g) || []).length - 1; // Subtract header

      // Create filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `logs-export-${hardwareInfo.type}-${timestamp}.csv`;
      const filepath = `/tmp/${filename}`;

      // Write file
      fs.writeFileSync(filepath, csvContent, "utf8");

      // Track admin operation
      if (adminName) {
        try {
          // Find user by name for proper tracking
          const user = await User.findOne({ where: { name: adminName } });

          await unifiedLoggingService.logAdminOperation({
            userId: user?.id || 0,
            operation: "export_logs",
            details: {
              filename,
              recordCount,
              exportTimestamp: new Date().toISOString(),
              hardwareType: hardwareInfo.type,
              adminName: adminName,
            },
            message: `ส่งออกข้อมูล logs จำนวน ${recordCount} รายการ`,
          });

          console.log(
            `[ENHANCED-LOGGING] Admin operation tracked for ${adminName}`
          );
        } catch (trackingError) {
          console.warn(
            "[ENHANCED-LOGGING] Failed to track admin operation:",
            trackingError.message
          );
        }
      }

      console.log(
        `[ENHANCED-LOGGING] Export completed: ${filename} (${recordCount} records)`
      );

      return {
        success: true,
        filename,
        recordCount,
        filepath,
      };
    } catch (error) {
      console.error("[ENHANCED-LOGGING] Export failed:", error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Track admin operations
  ipcMain.handle("track_admin_operation", async (event, data) => {
    try {
      console.log("[ENHANCED-LOGGING] Track admin operation:", data);

      const { adminName, operation, details } = data;

      // Find user by name
      const user = await User.findOne({ where: { name: adminName } });

      if (!user) {
        console.warn(`[ENHANCED-LOGGING] User not found: ${adminName}`);
        return { success: false, error: "User not found" };
      }

      await unifiedLoggingService.logAdminOperation({
        userId: user.id,
        operation,
        details,
        message: `${adminName} ทำการ ${operation}: ${details.action}`,
      });

      console.log(
        `[ENHANCED-LOGGING] Admin operation tracked: ${adminName} -> ${operation}`
      );

      return { success: true };
    } catch (error) {
      console.error(
        "[ENHANCED-LOGGING] Failed to track admin operation:",
        error.message
      );
      return { success: false, error: error.message };
    }
  });

  // Log using operations (unlock, dispensing, etc.)
  ipcMain.handle("log_using_operation", async (event, data) => {
    try {
      console.log("[ENHANCED-LOGGING] Log using operation:", data);

      const {
        category,
        userId,
        slotId,
        hn,
        operation,
        reason,
        message,
        details,
      } = data;

      let logResult;

      switch (category) {
        case "unlock":
          logResult = await unifiedLoggingService.logUnlock({
            userId,
            slotId,
            hn,
            message,
          });
          break;

        case "dispensing":
          logResult = await unifiedLoggingService.logDispensing({
            userId,
            slotId,
            hn,
            message,
            operation,
          });
          break;

        case "force-reset":
          logResult = await unifiedLoggingService.logForceReset({
            userId,
            slotId,
            reason: reason || "ไม่ระบุเหตุผล",
            message,
          });
          break;

        case "deactive":
          logResult = await unifiedLoggingService.logDeactive({
            userId,
            slotId,
            reason: reason || "ไม่ระบุเหตุผล",
            message,
          });
          break;

        default:
          logResult = await unifiedLoggingService.logUsing({
            category: category as any,
            userId,
            slotId,
            hn,
            operation,
            reason,
            message,
            details,
          });
      }

      console.log(
        `[ENHANCED-LOGGING] Using operation logged: ${category} (ID: ${logResult.id})`
      );

      return { success: true, logId: logResult.id };
    } catch (error) {
      console.error(
        "[ENHANCED-LOGGING] Failed to log using operation:",
        error.message
      );
      return { success: false, error: error.message };
    }
  });

  // Log system events (error, warning, info)
  ipcMain.handle("log_system_event", async (event, data) => {
    try {
      const { level, message, details, component } = data;

      let logResult;

      switch (level) {
        case "error":
          logResult = await unifiedLoggingService.logError({
            message,
            details,
            component,
          });
          break;

        case "warn":
          logResult = await unifiedLoggingService.logWarning({
            message,
            details,
            component,
          });
          break;

        case "info":
          logResult = await unifiedLoggingService.logInfo({
            message,
            details,
            component,
          });
          break;

        case "debug":
          logResult = await unifiedLoggingService.logDebug({
            message,
            details,
            component,
          });
          break;

        default:
          throw new Error(`Unknown log level: ${level}`);
      }

      console.log(
        `[ENHANCED-LOGGING] System event logged: ${level} (ID: ${logResult.id})`
      );

      return { success: true, logId: logResult.id };
    } catch (error) {
      console.error(
        "[ENHANCED-LOGGING] Failed to log system event:",
        error.message
      );
      return { success: false, error: error.message };
    }
  });

  // Get log statistics
  ipcMain.handle("get_log_stats", async (event, options = {}) => {
    try {
      console.log("[ENHANCED-LOGGING] Get log stats request:", options);

      const stats = await unifiedLoggingService.getLogStats({
        logType: options.logType,
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        endDate: options.endDate ? new Date(options.endDate) : undefined,
      });

      console.log(
        `[ENHANCED-LOGGING] Stats retrieved: ${stats.totalLogs} total logs`
      );

      return stats;
    } catch (error) {
      console.error("[ENHANCED-LOGGING] Error getting stats:", error.message);
      return {
        totalLogs: 0,
        byCategory: [],
        byLevel: [],
        byUser: [],
      };
    }
  });

  console.log(
    "[ENHANCED-LOGGING] Enhanced logging handlers registered successfully"
  );
};

// Export for use in background.ts
export default registerEnhancedLoggingHandlers;
