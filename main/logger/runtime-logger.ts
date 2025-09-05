import { Log } from "../../db/model/logs.model";
import { logger } from "./index";

/**
 * Enhanced runtime logging interface for debugging build hang issues
 * Provides type-safe logging with categorization and metadata support
 */
export interface RuntimeLogData {
  user: string;
  message: string;
  logType:
    | "warning"
    | "system"
    | "build"
    | "license"
    | "hardware"
    | "error"
    | "debug";
  component: string;
  level: "info" | "warn" | "error" | "debug";
  metadata?: Record<string, any>;
}

/**
 * Runtime logger for debugging application startup and build hang issues
 * Logs to enhanced logs table with categorization and metadata
 *
 * @param data - Runtime log data with type, component, level, and optional metadata
 */
export const runtimeLogger = async (data: RuntimeLogData): Promise<void> => {
  try {
    // Prepare metadata as JSON string if provided
    const metadataString = data.metadata ? JSON.stringify(data.metadata) : null;

    // Create enhanced log entry with new fields
    await Log.create({
      user: data.user,
      message: `[${data.level.toUpperCase()}] ${data.message}`,
      logType: data.logType,
      component: data.component,
      level: data.level,
      metadata: metadataString,
    });

    // Also log to console for immediate debugging visibility
    const timestamp = new Date().toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const logPrefix = `[${timestamp}] [${data.logType.toUpperCase()}] [${
      data.component
    }]`;
    const logMessage = `${logPrefix} ${data.message}`;

    switch (data.level) {
      case "error":
        console.error(logMessage, data.metadata || "");
        break;
      case "warn":
        console.warn(logMessage, data.metadata || "");
        break;
      case "debug":
        console.debug(logMessage, data.metadata || "");
        break;
      default:
        console.log(logMessage, data.metadata || "");
    }
  } catch (error) {
    // Fallback logging if database write fails
    console.error("[RUNTIME-LOGGER-ERROR] Failed to write to database:", error);
    console.log(`[FALLBACK] ${data.component}: ${data.message}`);
  }
};

/**
 * Convenience functions for common logging scenarios
 */
export const logSystemInfo = (
  component: string,
  message: string,
  metadata?: Record<string, any>
) => {
  return runtimeLogger({
    user: "system",
    message,
    logType: "system",
    component,
    level: "info",
    metadata,
  });
};

export const logBuildProgress = (
  component: string,
  message: string,
  metadata?: Record<string, any>
) => {
  return runtimeLogger({
    user: "system",
    message,
    logType: "build",
    component,
    level: "info",
    metadata,
  });
};

export const logLicenseOperation = (
  component: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
  metadata?: Record<string, any>
) => {
  return runtimeLogger({
    user: "system",
    message,
    logType: "license",
    component,
    level,
    metadata,
  });
};

export const logHardwareOperation = (
  component: string,
  message: string,
  level: "info" | "warn" | "error" = "info",
  metadata?: Record<string, any>
) => {
  return runtimeLogger({
    user: "system",
    message,
    logType: "hardware",
    component,
    level,
    metadata,
  });
};

export const logError = (
  component: string,
  message: string,
  error?: Error,
  metadata?: Record<string, any>
) => {
  const errorMetadata = {
    ...metadata,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };

  return runtimeLogger({
    user: "system",
    message,
    logType: "error",
    component,
    level: "error",
    metadata: errorMetadata,
  });
};

export const logDebug = (
  component: string,
  message: string,
  metadata?: Record<string, any>
) => {
  return runtimeLogger({
    user: "system",
    message,
    logType: "debug",
    component,
    level: "debug",
    metadata,
  });
};

/**
 * Performance timing utility for tracking build hang issues
 */
export class PerformanceTimer {
  private startTime: number;
  private component: string;
  private operation: string;

  constructor(component: string, operation: string) {
    this.component = component;
    this.operation = operation;
    this.startTime = Date.now();

    logDebug(component, `Starting ${operation}`, {
      timestamp: this.startTime,
      operation,
    });
  }

  end(additionalMetadata?: Record<string, any>) {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    logSystemInfo(this.component, `Completed ${this.operation}`, {
      duration: `${duration}ms`,
      startTime: this.startTime,
      endTime,
      operation: this.operation,
      ...additionalMetadata,
    });

    return duration;
  }

  checkpoint(checkpointName: string, additionalMetadata?: Record<string, any>) {
    const checkpointTime = Date.now();
    const elapsed = checkpointTime - this.startTime;

    logDebug(
      this.component,
      `Checkpoint: ${checkpointName} in ${this.operation}`,
      {
        checkpoint: checkpointName,
        elapsed: `${elapsed}ms`,
        timestamp: checkpointTime,
        operation: this.operation,
        ...additionalMetadata,
      }
    );

    return elapsed;
  }
}
