/**
 * KU16 Smart State Manager
 * Adapted from CU12SmartStateManager for architectural consistency
 * Implements 3-mode adaptive monitoring system
 */

import { BrowserWindow } from "electron";
import { KU16Device } from "./device";
import { KU16Protocol } from "./protocol";
import { KU16SlotStatus, KU16Config, OperationResult, UnlockPayload, DispensePayload } from "./types";
import { KU16MonitoringConfig, DEFAULT_KU16_CONFIG } from "./monitoringConfig";
import { KU16FailureDetector } from "./errorHandler";
import { Slot } from "../../../db/model/slot.model";
import { unifiedLoggingService } from "../../services/unified-logging.service";

export interface KU16StructuredLogger {
  trace(message: string, metadata?: Record<string, any>): Promise<void>;
  debug(message: string, metadata?: Record<string, any>): Promise<void>;
  info(message: string, metadata?: Record<string, any>): Promise<void>;
  warn(message: string, metadata?: Record<string, any>): Promise<void>;
  error(message: string, metadata?: Record<string, any>): Promise<void>;
  fatal(message: string, metadata?: Record<string, any>): Promise<void>;
}

export interface StateChange {
  slotId: number;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export interface ResourceOptimizer {
  cache: Map<string, { data: any; timestamp: number; hits: number }>;
  getCachedResponse<T>(key: string, ttl?: number): T | null;
  setCachedResponse(key: string, data: any, ttl?: number): void;
  batchOperations(operations: any[]): Promise<any[]>;
  optimizeMemoryUsage(): Promise<void>;
}

export class KU16SmartStateManager {
  private device: KU16Device | null = null;
  private protocol: KU16Protocol;
  private mainWindow: BrowserWindow;
  private failureDetector: KU16FailureDetector;
  private resourceOptimizer: ResourceOptimizer;

  // State management
  private monitoringMode: "idle" | "active" | "operation" = "idle";
  private lastSyncTime: number = 0;
  private currentOperation: string | null = null;
  private slotStates: Map<number, KU16SlotStatus> = new Map();

  // Timers and intervals
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private userActivityTimeout: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private config: KU16MonitoringConfig;

  // Structured logger
  private structuredLogger: KU16StructuredLogger;

  constructor(
    mainWindow: BrowserWindow,
    config?: Partial<KU16MonitoringConfig>
  ) {
    this.mainWindow = mainWindow;
    this.config = { ...DEFAULT_KU16_CONFIG, ...config };
    this.protocol = new KU16Protocol();
    this.failureDetector = new KU16FailureDetector(this.config);
    this.resourceOptimizer = this.createResourceOptimizer();
    this.structuredLogger = this.createStructuredLogger();
  }

  /**
   * Initialize the KU16 Smart State Manager
   */
  async initialize(deviceConfig: KU16Config): Promise<boolean> {
    try {
      await this.structuredLogger.info(
        "Initializing KU16 Smart State Manager",
        {
          port: deviceConfig.port,
          baudRate: deviceConfig.baudRate,
          maxSlots: deviceConfig.maxSlots,
          monitoringMode: this.monitoringMode,
        }
      );

      // Create and initialize device
      this.device = new KU16Device(deviceConfig, this.mainWindow);
      const deviceInitialized = await this.device.initialize();

      if (!deviceInitialized) {
        throw new Error("Failed to initialize KU16 device");
      }

      // Start in idle mode for maximum resource efficiency
      await this.startIdleMode();

      // Set up memory cleanup
      this.setupMemoryCleanup();

      await this.structuredLogger.info(
        "KU16 Smart State Manager initialized successfully",
        {
          mode: this.monitoringMode,
          healthCheckInterval: this.config.healthCheckInterval / 1000 + "s",
        }
      );

      return true;
    } catch (error) {
      await this.structuredLogger.error("KU16 initialization failed", {
        error: error.message,
        port: deviceConfig.port,
      });
      return false;
    }
  }

  /**
   * Start idle mode - minimal resource usage with periodic health checks
   */
  async startIdleMode(): Promise<void> {
    if (this.monitoringMode === "idle") return;

    await this.structuredLogger.debug("Entering idle mode", {
      previousMode: this.monitoringMode,
      healthCheckInterval: this.config.healthCheckInterval / 1000 + "s",
    });

    this.monitoringMode = "idle";
    this.stopAllActiveMonitoring();

    // Lightweight health check every 5 minutes (configurable)
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.quickHealthCheck();
      } catch (error) {
        await this.handleHealthCheckError(error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Activate monitoring when user interacts
   */
  async onUserInteraction(): Promise<void> {
    if (this.monitoringMode === "operation") return; // Don't interrupt operations

    await this.structuredLogger.debug(
      "User interaction detected, entering active mode",
      {
        previousMode: this.monitoringMode,
        userTimeout: this.config.userInactiveTimeout / 1000 + "s",
      }
    );

    this.monitoringMode = "active";
    this.stopIdleMode();

    // Immediate sync when user becomes active
    await this.syncSlotStatus("ON_DEMAND");

    // Set timeout to return to idle mode
    this.userActivityTimeout = setTimeout(async () => {
      if (this.monitoringMode === "active") {
        await this.structuredLogger.debug(
          "User inactive timeout, returning to idle mode"
        );
        await this.startIdleMode();
      }
    }, this.config.userInactiveTimeout);
  }

  /**
   * Enter operation mode for focused monitoring during unlock/dispense
   */
  async enterOperationMode(operation: string): Promise<void> {
    await this.structuredLogger.debug("Entering operation mode", {
      operation,
      previousMode: this.monitoringMode,
    });

    this.monitoringMode = "operation";
    this.currentOperation = operation;
    this.stopAllActiveMonitoring();
  }

  /**
   * Exit operation mode and return to active monitoring
   */
  async exitOperationMode(): Promise<void> {
    const operation = this.currentOperation;

    await this.structuredLogger.debug("Exiting operation mode", {
      operation,
      returningTo: "active",
    });

    this.currentOperation = null;
    this.monitoringMode = "active";
    
    // Reset user activity timer
    await this.onUserInteraction();
  }

  /**
   * Perform unlock operation with comprehensive state management
   */
  async performUnlockOperation(payload: UnlockPayload): Promise<OperationResult> {
    const startTime = Date.now();
    
    try {
      await this.enterOperationMode("unlock");
      
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      // Execute unlock with failure detection
      const result = await this.executeWithCircuitBreaker(
        async () => await this.device!.unlock(payload),
        "unlock"
      );

      // Record successful operation
      if (result.success) {
        this.failureDetector.recordSuccess("unlock");
        
        // Update cache with new state
        this.resourceOptimizer.cache.delete('slot_status');
        
        // Trigger frontend sync
        await this.triggerFrontendSync();
      }

      const responseTime = Date.now() - startTime;
      this.failureDetector.recordResponseTime(responseTime);

      return result;
    } catch (error) {
      await this.structuredLogger.error("Unlock operation failed", {
        slotId: payload.slotId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      await this.exitOperationMode();
    }
  }

  /**
   * Perform dispense operation with comprehensive state management
   */
  async performDispenseOperation(payload: DispensePayload): Promise<OperationResult> {
    const startTime = Date.now();
    
    try {
      await this.enterOperationMode("dispense");
      
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      // Execute dispense with failure detection
      const result = await this.executeWithCircuitBreaker(
        async () => await this.device!.dispense(payload),
        "dispense"
      );

      // Record successful operation
      if (result.success) {
        this.failureDetector.recordSuccess("dispense");
        
        // Update cache with new state
        this.resourceOptimizer.cache.delete('slot_status');
        
        // Trigger frontend sync
        await this.triggerFrontendSync();
      }

      const responseTime = Date.now() - startTime;
      this.failureDetector.recordResponseTime(responseTime);

      return result;
    } catch (error) {
      await this.structuredLogger.error("Dispense operation failed", {
        slotId: payload.slotId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      await this.exitOperationMode();
    }
  }

  /**
   * Get slot status with caching and monitoring
   */
  async getSlotStatus(slotId?: number): Promise<KU16SlotStatus | KU16SlotStatus[]> {
    try {
      // Try cache first
      const cacheKey = slotId ? `slot_${slotId}` : 'all_slots';
      const cached = this.resourceOptimizer.getCachedResponse<KU16SlotStatus | KU16SlotStatus[]>(
        cacheKey,
        this.config.cacheTimeout
      );
      
      if (cached) {
        return cached;
      }

      // Get from device
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      const allSlots = await this.device.getStatus();
      
      // Cache the result
      this.resourceOptimizer.setCachedResponse('all_slots', allSlots, this.config.cacheTimeout);
      
      // Cache individual slots
      allSlots.forEach(slot => {
        this.resourceOptimizer.setCachedResponse(
          `slot_${slot.slotId}`,
          slot,
          this.config.cacheTimeout
        );
      });

      return slotId ? allSlots.find(s => s.slotId === slotId) || allSlots[0] : allSlots;
    } catch (error) {
      await this.structuredLogger.error("Get slot status failed", {
        slotId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Synchronize slot status (similar to CU12's syncSlotStatus)
   */
  async syncSlotStatus(trigger: 'PERIODIC' | 'USER_INTERACTION' | 'ON_DEMAND'): Promise<KU16SlotStatus[]> {
    try {
      await this.structuredLogger.debug("Syncing slot status", { trigger });

      // Clear cache for fresh data
      this.resourceOptimizer.cache.delete('slot_status');
      this.resourceOptimizer.cache.delete('all_slots');

      // Get current status
      const currentStatus = await this.getSlotStatus() as KU16SlotStatus[];
      
      // Update internal state
      currentStatus.forEach(slot => {
        this.slotStates.set(slot.slotId, slot);
      });

      this.lastSyncTime = Date.now();
      
      return currentStatus;
    } catch (error) {
      await this.structuredLogger.error("Slot status sync failed", {
        trigger,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Trigger frontend synchronization (like CU12's triggerFrontendSync)
   */
  async triggerFrontendSync(): Promise<void> {
    try {
      await this.structuredLogger.debug("Triggering frontend sync");

      // Clear cache to ensure fresh data
      this.resourceOptimizer.cache.delete('slot_status');
      this.resourceOptimizer.cache.delete('all_slots');

      // Get current status and send to frontend
      const currentStatus = await this.syncSlotStatus('ON_DEMAND');

      // Send events for frontend updates (KU16 format - no transformation needed)
      this.mainWindow.webContents.send("init-res", currentStatus);
      this.mainWindow.webContents.send("admin-sync-complete", {
        message: "Admin operation completed - UI updated",
        timestamp: Date.now()
      });

      await this.structuredLogger.debug("Frontend sync completed", {
        slotsUpdated: currentStatus.length
      });
    } catch (error) {
      await this.structuredLogger.error("Frontend sync failed", {
        error: error.message,
      });
    }
  }

  /**
   * Deactivate slot with state management
   */
  async deactivateSlot(slotId: number): Promise<OperationResult> {
    try {
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      const result = await this.device.deactivateSlot(slotId);
      
      if (result.success) {
        // Clear cache and trigger sync
        this.resourceOptimizer.cache.delete('slot_status');
        await this.triggerFrontendSync();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reactivate slot with state management
   */
  async reactivateSlot(slotId: number): Promise<OperationResult> {
    try {
      if (!this.device) {
        throw new Error("Device not initialized");
      }

      const result = await this.device.reactivateSlot(slotId);
      
      if (result.success) {
        // Clear cache and trigger sync
        this.resourceOptimizer.cache.delete('slot_status');
        await this.triggerFrontendSync();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute operation with circuit breaker protection
   */
  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const result = await operation();
      this.failureDetector.recordSuccess(operationName);
      return result;
    } catch (error) {
      const canRetry = await this.failureDetector.handleOperationError(error, operationName);
      if (!canRetry) {
        throw error;
      }
      // Retry once after circuit breaker recovery
      return await operation();
    }
  }

  /**
   * Quick health check for idle mode
   */
  private async quickHealthCheck(): Promise<void> {
    if (!this.device || !this.device.isConnected()) {
      await this.structuredLogger.warn("Device not connected during health check");
      return;
    }

    try {
      // Simple connectivity check
      this.device.sendStatusCheck();
      
      // Check for anomalies
      const anomalies = await this.failureDetector.detectAnomalies();
      if (anomalies.length > 0) {
        await this.structuredLogger.warn("Health check detected anomalies", {
          anomalies: anomalies.length,
          details: anomalies
        });
      }
    } catch (error) {
      await this.handleHealthCheckError(error);
    }
  }

  /**
   * Handle health check errors
   */
  private async handleHealthCheckError(error: any): Promise<void> {
    await this.structuredLogger.error("Health check failed", {
      error: error.message,
      mode: this.monitoringMode
    });
    
    // Record failure for circuit breaker
    await this.failureDetector.handleOperationError(error, "health_check");
  }

  /**
   * Stop all active monitoring
   */
  private stopAllActiveMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.userActivityTimeout) {
      clearTimeout(this.userActivityTimeout);
      this.userActivityTimeout = null;
    }
  }

  /**
   * Stop idle mode monitoring
   */
  private stopIdleMode(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Set up memory cleanup interval
   */
  private setupMemoryCleanup(): void {
    this.memoryCleanupInterval = setInterval(async () => {
      try {
        await this.resourceOptimizer.optimizeMemoryUsage();
        await this.structuredLogger.debug("Memory cleanup completed");
      } catch (error) {
        await this.structuredLogger.error("Memory cleanup failed", {
          error: error.message,
        });
      }
    }, this.config.memoryCleanupInterval);
  }

  /**
   * Create resource optimizer
   */
  private createResourceOptimizer(): ResourceOptimizer {
    const cache = new Map<string, { data: any; timestamp: number; hits: number }>();

    return {
      cache,
      getCachedResponse<T>(key: string, ttl: number = this.config.cacheTimeout): T | null {
        const cached = cache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > ttl) {
          cache.delete(key);
          return null;
        }
        
        cached.hits++;
        return cached.data as T;
      },
      
      setCachedResponse(key: string, data: any, ttl: number = this.config.cacheTimeout): void {
        cache.set(key, {
          data,
          timestamp: Date.now(),
          hits: 0
        });
        
        // Clean up old entries if cache is too large
        if (cache.size > this.config.maxCacheSize) {
          const entries = Array.from(cache.entries());
          entries.sort((a, b) => a[1].hits - b[1].hits);
          const toDelete = entries.slice(0, Math.floor(cache.size * 0.3));
          toDelete.forEach(([key]) => cache.delete(key));
        }
      },
      
      async batchOperations(operations: any[]): Promise<any[]> {
        return Promise.all(operations);
      },
      
      async optimizeMemoryUsage(): Promise<void> {
        const now = Date.now();
        const expired = [];
        
        cache.forEach((value, key) => {
          if (now - value.timestamp > this.config.cacheTimeout) {
            expired.push(key);
          }
        });
        
        expired.forEach(key => cache.delete(key));
      }
    };
  }

  /**
   * Create structured logger
   */
  private createStructuredLogger(): KU16StructuredLogger {
    return {
      async trace(message: string, metadata?: Record<string, any>): Promise<void> {
        if (this.config.detailedLogging) {
          await unifiedLoggingService.logInfo({
            message: `[TRACE] ${message}`,
            component: "KU16StateManager",
            details: metadata || {},
          });
        }
      },
      
      async debug(message: string, metadata?: Record<string, any>): Promise<void> {
        if (this.config.detailedLogging) {
          await unifiedLoggingService.logInfo({
            message: `[DEBUG] ${message}`,
            component: "KU16StateManager",
            details: metadata || {},
          });
        }
      },
      
      async info(message: string, metadata?: Record<string, any>): Promise<void> {
        await unifiedLoggingService.logInfo({
          message,
          component: "KU16StateManager",
          details: metadata || {},
        });
      },
      
      async warn(message: string, metadata?: Record<string, any>): Promise<void> {
        await unifiedLoggingService.logWarning({
          message,
          component: "KU16StateManager",
          details: metadata || {},
        });
      },
      
      async error(message: string, metadata?: Record<string, any>): Promise<void> {
        await unifiedLoggingService.logError({
          message,
          component: "KU16StateManager",
          details: metadata || {},
        });
      },
      
      async fatal(message: string, metadata?: Record<string, any>): Promise<void> {
        await unifiedLoggingService.logError({
          message: `[FATAL] ${message}`,
          component: "KU16StateManager",
          details: metadata || {},
        });
      }
    };
  }

  /**
   * Get current monitoring mode
   */
  getMonitoringMode(): "idle" | "active" | "operation" {
    return this.monitoringMode;
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    const deviceConnected = this.device?.isConnected() || false;
    const failureDetectorStatus = this.failureDetector.getHealthStatus();
    
    return {
      deviceConnected,
      monitoringMode: this.monitoringMode,
      lastSyncTime: this.lastSyncTime,
      currentOperation: this.currentOperation,
      cacheSize: this.resourceOptimizer.cache.size,
      ...failureDetectorStatus
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.structuredLogger.info("Cleaning up KU16 Smart State Manager");
    
    this.stopAllActiveMonitoring();
    
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = null;
    }
    
    if (this.device) {
      await this.device.close();
    }
    
    this.resourceOptimizer.cache.clear();
  }
}