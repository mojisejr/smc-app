import { UnifiedLog } from "../../db/model/unified-log.model";
import { User } from "../../db/model/user.model";

/**
 * Unified Logging Service
 * Provides a single interface for all logging operations
 * Supports both using logs and system logs with proper categorization
 */
export class UnifiedLoggingService {
  /**
   * Log a using operation (user-initiated actions)
   */
  async logUsing(data: {
    category: "unlock" | "dispensing" | "force-reset" | "deactive" | "admin";
    userId?: number;
    slotId?: number;
    hn?: string;
    operation?: string;
    reason?: string;
    message: string;
    details?: any;
  }): Promise<UnifiedLog> {
    console.log(`[LOGGING] Using log: ${data.category} - ${data.message}`);

    return await UnifiedLog.createLog({
      logType: "USING",
      level: "info",
      ...data,
    });
  }

  /**
   * Log unlock phase
   */
  async logUnlock(data: {
    userId: number;
    slotId: number;
    hn?: string;
    message?: string;
  }): Promise<UnifiedLog> {
    return await this.logUsing({
      category: "unlock",
      userId: data.userId,
      slotId: data.slotId,
      hn: data.hn,
      operation: "unlock",
      message: data.message || `ปลดล็อกช่องยาช่องที่ ${data.slotId}`,
    });
  }

  /**
   * Log dispensing phase
   */
  async logDispensing(data: {
    userId: number;
    slotId: number;
    hn?: string;
    message?: string;
    operation?: "dispense" | "dispense-continue" | "dispense-end";
  }): Promise<UnifiedLog> {
    return await this.logUsing({
      category: "dispensing",
      userId: data.userId,
      slotId: data.slotId,
      hn: data.hn,
      operation: data.operation || "dispense",
      message: data.message || `จ่ายยาจากช่องที่ ${data.slotId}`,
    });
  }

  /**
   * Log force reset phase
   */
  async logForceReset(data: {
    userId: number;
    slotId: number;
    reason: string;
    message?: string;
  }): Promise<UnifiedLog> {
    return await this.logUsing({
      category: "force-reset",
      userId: data.userId,
      slotId: data.slotId,
      operation: "force-reset",
      reason: data.reason,
      message:
        data.message || `รีเซ็ตบังคับช่องที่ ${data.slotId}: ${data.reason}`,
    });
  }

  /**
   * Log deactive phase
   */
  async logDeactive(data: {
    userId: number;
    slotId: number;
    reason: string;
    message?: string;
  }): Promise<UnifiedLog> {
    return await this.logUsing({
      category: "deactive",
      userId: data.userId,
      slotId: data.slotId,
      operation: "deactivate",
      reason: data.reason,
      message:
        data.message || `ปิดการใช้งานช่องที่ ${data.slotId}: ${data.reason}`,
    });
  }

  /**
   * Log admin operation
   */
  async logAdminOperation(data: {
    userId: number;
    operation:
      | "slot_management"
      | "export_logs"
      | "user_management"
      | "system_settings";
    details: any;
    message?: string;
  }): Promise<UnifiedLog> {
    const operationMessages = {
      slot_management: "จัดการช่องยา",
      export_logs: "ส่งออกข้อมูล logs",
      user_management: "จัดการผู้ใช้งาน",
      system_settings: "ตั้งค่าระบบ",
    };

    return await this.logUsing({
      category: "admin",
      userId: data.userId,
      operation: data.operation,
      message: data.message || operationMessages[data.operation],
      details: data.details,
    });
  }

  /**
   * Log system error
   */
  async logError(data: {
    message: string;
    details?: any;
    component?: string;
  }): Promise<UnifiedLog> {
    console.error(`[SYSTEM ERROR] ${data.message}`, data.details);

    return await UnifiedLog.createLog({
      logType: "SYSTEM",
      category: "error",
      level: "error",
      message: data.message,
      details: {
        component: data.component,
        timestamp: new Date().toISOString(),
        ...data.details,
      },
    });
  }

  /**
   * Log system warning
   */
  async logWarning(data: {
    message: string;
    details?: any;
    component?: string;
  }): Promise<UnifiedLog> {
    console.warn(`[SYSTEM WARNING] ${data.message}`, data.details);

    return await UnifiedLog.createLog({
      logType: "SYSTEM",
      category: "warning",
      level: "warn",
      message: data.message,
      details: {
        component: data.component,
        timestamp: new Date().toISOString(),
        ...data.details,
      },
    });
  }

  /**
   * Log system info
   */
  async logInfo(data: {
    message: string;
    details?: any;
    component?: string;
  }): Promise<UnifiedLog> {
    console.info(`[SYSTEM INFO] ${data.message}`, data.details);

    return await UnifiedLog.createLog({
      logType: "SYSTEM",
      category: "info",
      level: "info",
      message: data.message,
      details: {
        component: data.component,
        timestamp: new Date().toISOString(),
        ...data.details,
      },
    });
  }

  /**
   * Log system debug (not shown in UI)
   */
  async logDebug(data: {
    message: string;
    details?: any;
    component?: string;
  }): Promise<UnifiedLog> {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[SYSTEM DEBUG] ${data.message}`, data.details);
    }

    return await UnifiedLog.createLog({
      logType: "SYSTEM",
      category: "debug",
      level: "debug",
      message: data.message,
      details: {
        component: data.component,
        timestamp: new Date().toISOString(),
        ...data.details,
      },
    });
  }

  /**
   * Get logs with filtering and pagination
   */
  async getLogs(
    options: {
      logType?: "USING" | "SYSTEM";
      category?: string;
      level?: string;
      userId?: number;
      slotId?: number;
      startDate?: Date;
      endDate?: Date;
      searchQuery?: string;
      page?: number;
      limit?: number;
      includeDebug?: boolean;
    } = {}
  ): Promise<{
    logs: UnifiedLog[];
    totalCount: number;
    page: number;
    totalPages: number;
  }> {
    const {
      logType,
      category,
      level,
      userId,
      slotId,
      startDate,
      endDate,
      searchQuery,
      page = 1,
      limit = 50,
      includeDebug = false,
    } = options;

    const whereClause: any = {};

    // Filter by log type
    if (logType) {
      whereClause.logType = logType;
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by level
    if (level) {
      whereClause.level = level;
    }

    // Exclude debug logs by default
    if (!includeDebug) {
      whereClause.level = {
        [require("sequelize").Op.ne]: "debug",
      };
    }

    // Filter by user
    if (userId) {
      whereClause.userId = userId;
    }

    // Filter by slot
    if (slotId) {
      whereClause.slotId = slotId;
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[require("sequelize").Op.gte] =
          startDate.getTime();
      }
      if (endDate) {
        whereClause.timestamp[require("sequelize").Op.lte] = endDate.getTime();
      }
    }

    // Search query
    if (searchQuery) {
      const { Op } = require("sequelize");
      whereClause[Op.or] = [
        { message: { [Op.like]: `%${searchQuery}%` } },
        { reason: { [Op.like]: `%${searchQuery}%` } },
        { hn: { [Op.like]: `%${searchQuery}%` } },
      ];
    }

    const offset = (page - 1) * limit;

    const result = await UnifiedLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "User",
          attributes: ["id", "name", "role"],
        },
      ],
      order: [["timestamp", "DESC"]],
      limit,
      offset,
    });

    const logs = result.rows.map((log) => {
      const plainLog = log.toJSON(); // Converts the Sequelize instance to a plain object
      // If `user` is eager loaded and exists, also convert it to plain object
      if (plainLog.User && typeof plainLog.User.toJSON === "function") {
        plainLog.User = plainLog.User.toJSON();
      }

      // Or, if using `as: 'user'` and `raw: false`, access like this:
      // plainLog.userName = log.user ? log.user.name : null;
      // plainLog.user = log.user ? { id: log.user.id, name: log.user.name, role: log.user.role } : null;
      // Add display properties if they are computed or desired in the final output
      // Make sure these properties are simple data types (string, number, boolean, plain object)
      // These are examples based on your exportLogs logic, assuming they exist as getters or virtuals
      // or you want to compute them here before sending over IPC.
      plainLog.logTypeDisplayName = log.logTypeDisplayName || log.logType; // Replace with actual logic
      plainLog.categoryDisplayName = log.categoryDisplayName || log.category; // Replace with actual logic
      plainLog.levelDisplayName = log.levelDisplayName || log.level; // Replace with actual logic
      plainLog.userName = plainLog.User ? plainLog.User.name : "-"; // Assuming 'user' is the alias and it exists
      return plainLog;
    });

    // console.log(logs);

    return {
      // logs: result.rows,
      logs,
      totalCount: result.count,
      page,
      totalPages: Math.ceil(result.count / limit),
    };
  }

  /**
   * Get log statistics
   */
  async getLogStats(
    options: {
      logType?: "USING" | "SYSTEM";
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    totalLogs: number;
    byCategory: Array<{ category: string; count: number }>;
    byLevel: Array<{ level: string; count: number }>;
    byUser: Array<{ userId: number; userName: string; count: number }>;
  }> {
    const { logType, startDate, endDate } = options;

    const whereClause: any = {};

    if (logType) {
      whereClause.logType = logType;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp[require("sequelize").Op.gte] =
          startDate.getTime();
      }
      if (endDate) {
        whereClause.timestamp[require("sequelize").Op.lte] = endDate.getTime();
      }
    }

    // Get total count
    const totalLogs = await UnifiedLog.count({ where: whereClause });

    // Get counts by category
    const byCategory = (await UnifiedLog.findAll({
      where: whereClause,
      attributes: [
        "category",
        [require("sequelize").fn("COUNT", "*"), "count"],
      ],
      group: ["category"],
      raw: true,
    })) as any[];

    // Get counts by level
    const byLevel = (await UnifiedLog.findAll({
      where: whereClause,
      attributes: ["level", [require("sequelize").fn("COUNT", "*"), "count"]],
      group: ["level"],
      raw: true,
    })) as any[];

    // Get counts by user
    const byUser = (await UnifiedLog.findAll({
      where: {
        ...whereClause,
        userId: { [require("sequelize").Op.ne]: null },
      },
      attributes: ["userId", [require("sequelize").fn("COUNT", "*"), "count"]],
      include: [
        {
          model: User,
          attributes: ["name"],
        },
      ],
      group: ["userId", "User.id"],
      raw: true,
    })) as any[];

    return {
      totalLogs,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: parseInt(item.count),
      })),
      byLevel: byLevel.map((item) => ({
        level: item.level,
        count: parseInt(item.count),
      })),
      byUser: byUser.map((item) => ({
        userId: item.userId,
        userName: item["User.name"] || "Unknown",
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Export logs to CSV format
   */
  async exportLogs(
    options: {
      logType?: "USING" | "SYSTEM";
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<string> {
    const { logs } = await this.getLogs({
      ...options,
      limit: 10000, // Large limit for export
      includeDebug: false,
    });

    const csvHeaders = [
      "วันที่",
      "เวลา",
      "ประเภท",
      "หมวดหมู่",
      "ระดับ",
      "ผู้ใช้งาน",
      "ช่องยา",
      "HN",
      "การดำเนินการ",
      "เหตุผล",
      "ข้อความ",
    ];

    const csvRows = logs.map((log) =>
      [
        new Date(log.timestamp).toLocaleDateString("th-TH"),
        new Date(log.timestamp).toLocaleTimeString("th-TH"),
        log.logTypeDisplayName,
        log.categoryDisplayName,
        log.levelDisplayName,
        log.userName,
        log.slotId || "-",
        log.hn || "-",
        log.operation || "-",
        log.reason || "-",
        log.message,
      ].map((cell) => `"${cell}"`)
    );

    // Add BOM for Thai text support
    const BOM = "\uFEFF";
    const csvContent =
      BOM +
      [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    return csvContent;
  }
}

// Export singleton instance
export const unifiedLoggingService = new UnifiedLoggingService();
