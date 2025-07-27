import { BrowserWindow } from 'electron';
import { CU12Device } from './device';
import { CU12Protocol } from './protocol';
import { SlotStatus, CU12Config } from './types';
import { CU12MonitoringConfig, DEFAULT_CU12_CONFIG } from './monitoringConfig';
import { CU12FailureDetector } from './errorHandler';
import { Slot } from '../../../db/model/slot.model';
import { logger } from '../../logger';

export interface CU12StructuredLogger {
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
  cache: Map<string, {data: any, timestamp: number, hits: number}>;
  getCachedResponse<T>(key: string, ttl?: number): T | null;
  setCachedResponse(key: string, data: any, ttl?: number): void;
  batchOperations(operations: any[]): Promise<any[]>;
  optimizeMemoryUsage(): Promise<void>;
}

export class CU12SmartStateManager {
  private device: CU12Device | null = null;
  private protocol: CU12Protocol;
  private mainWindow: BrowserWindow;
  private failureDetector: CU12FailureDetector;
  private resourceOptimizer: ResourceOptimizer;
  
  // State management
  private monitoringMode: 'idle' | 'active' | 'operation' = 'idle';
  private lastSyncTime: number = 0;
  private currentOperation: string | null = null;
  private slotStates: Map<number, SlotStatus> = new Map();
  
  // Timers and intervals
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private userActivityTimeout: NodeJS.Timeout | null = null;
  private memoryCleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private config: CU12MonitoringConfig;
  
  // Structured logger
  private structuredLogger: CU12StructuredLogger;
  
  constructor(mainWindow: BrowserWindow, config?: Partial<CU12MonitoringConfig>) {
    this.mainWindow = mainWindow;
    this.config = { ...DEFAULT_CU12_CONFIG, ...config };
    this.protocol = new CU12Protocol();
    this.failureDetector = new CU12FailureDetector(this.config);
    this.resourceOptimizer = this.createResourceOptimizer();
    this.structuredLogger = this.createStructuredLogger();
  }
  
  /**
   * Initialize the CU12 Smart State Manager
   */
  async initialize(deviceConfig: CU12Config): Promise<boolean> {
    try {
      await this.structuredLogger.info('Initializing CU12 Smart State Manager', {
        port: deviceConfig.port,
        baudRate: deviceConfig.baudRate,
        monitoringMode: this.monitoringMode
      });
      
      // Create and initialize device
      this.device = new CU12Device(deviceConfig);
      const deviceInitialized = await this.device.initialize();
      
      if (!deviceInitialized) {
        throw new Error('Failed to initialize CU12 device');
      }
      
      // Start in idle mode for maximum resource efficiency
      await this.startIdleMode();
      
      // Set up memory cleanup
      this.setupMemoryCleanup();
      
      await this.structuredLogger.info('CU12 Smart State Manager initialized successfully', {
        mode: this.monitoringMode,
        healthCheckInterval: this.config.healthCheckInterval / 1000 + 's'
      });
      
      return true;
    } catch (error) {
      await this.structuredLogger.error('CU12 initialization failed', {
        error: error.message,
        port: deviceConfig.port
      });
      return false;
    }
  }
  
  /**
   * Start idle mode - minimal resource usage with periodic health checks
   */
  async startIdleMode(): Promise<void> {
    if (this.monitoringMode === 'idle') return;
    
    await this.structuredLogger.debug('Entering idle mode', {
      previousMode: this.monitoringMode,
      healthCheckInterval: this.config.healthCheckInterval / 1000 + 's'
    });
    
    this.monitoringMode = 'idle';
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
    if (this.monitoringMode === 'operation') return; // Don't interrupt operations
    
    await this.structuredLogger.debug('User interaction detected, entering active mode', {
      previousMode: this.monitoringMode,
      userTimeout: this.config.userInactiveTimeout / 1000 + 's'
    });
    
    this.monitoringMode = 'active';
    this.stopIdleMode();
    
    // Immediate sync when user becomes active
    await this.syncSlotStatus('ON_DEMAND');
    
    // Set timeout to return to idle mode
    this.userActivityTimeout = setTimeout(async () => {
      if (this.monitoringMode === 'active') {
        await this.structuredLogger.debug('User inactive timeout, returning to idle mode');
        await this.startIdleMode();
      }
    }, this.config.userInactiveTimeout);
  }
  
  /**
   * Enter operation mode for focused monitoring during unlock/dispense
   */
  async enterOperationMode(operation: string): Promise<void> {
    await this.structuredLogger.debug('Entering operation mode', {
      operation,
      previousMode: this.monitoringMode
    });
    
    this.monitoringMode = 'operation';
    this.currentOperation = operation;
    this.stopAllActiveMonitoring();
  }
  
  /**
   * Exit operation mode and return to active monitoring
   */
  async exitOperationMode(): Promise<void> {
    const operation = this.currentOperation;
    
    await this.structuredLogger.debug('Exiting operation mode', {
      operation,
      returningTo: 'active'
    });
    
    this.currentOperation = null;
    this.monitoringMode = 'active';
    
    // Restart user activity monitoring
    await this.onUserInteraction();
  }
  
  /**
   * Sync slot status with different strategies
   */
  async syncSlotStatus(strategy: 'ON_DEMAND' | 'HEALTH_CHECK' | 'PRE_OPERATION' | 'POST_OPERATION'): Promise<SlotStatus[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first for frequent operations
      if (this.config.enableIntelligentCaching && strategy !== 'PRE_OPERATION') {
        const cached = this.resourceOptimizer.getCachedResponse<SlotStatus[]>('slot_status', this.config.cacheTimeout);
        if (cached) {
          await this.structuredLogger.trace('Slot status served from cache', { strategy, cached: true });
          return cached;
        }
      }
      
      if (!this.device) {
        throw new Error('CU12 device not initialized');
      }
      
      // Get status from hardware
      const deviceStatus = await this.device.getSlotStatus();
      
      // Compare with database state and detect changes
      const dbSlots = await Slot.findAll({ limit: 12 });
      const changes = this.detectStateChanges(deviceStatus, dbSlots);
      
      if (changes.length > 0) {
        await this.handleStateChanges(changes);
      }
      
      // Cache the result
      this.resourceOptimizer.setCachedResponse('slot_status', deviceStatus, this.config.cacheTimeout);
      
      this.lastSyncTime = Date.now();
      const duration = Date.now() - startTime;
      
      await this.structuredLogger.info('Slot status synchronized', {
        strategy,
        duration: duration + 'ms',
        changes: changes.length,
        slotsCount: deviceStatus.length
      });
      
      return deviceStatus;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.structuredLogger.error('Slot status sync failed', {
        strategy,
        duration: duration + 'ms',
        error: error.message
      });
      
      // Attempt failure recovery
      await this.failureDetector.handleOperationError(error, `syncSlotStatus_${strategy}`);
      throw error;
    }
  }
  
  /**
   * Perform unlock operation with operation mode management
   */
  async performUnlockOperation(slotId: number): Promise<boolean> {
    const operation = `unlock_slot_${slotId}`;
    
    try {
      await this.enterOperationMode(operation);
      
      if (!this.device) {
        throw new Error('CU12 device not initialized');
      }
      
      const success = await this.device.unlockSlot(slotId);
      
      if (success) {
        await this.structuredLogger.info('Slot unlock successful', {
          slotId,
          operation,
          timestamp: Date.now()
        });
      } else {
        await this.structuredLogger.warn('Slot unlock failed', {
          slotId,
          operation
        });
      }
      
      return success;
    } catch (error) {
      await this.structuredLogger.error('Slot unlock operation failed', {
        slotId,
        operation,
        error: error.message
      });
      
      await this.failureDetector.handleOperationError(error, operation);
      return false;
    } finally {
      await this.exitOperationMode();
    }
  }
  
  /**
   * Check if system is connected and responsive
   */
  isConnected(): boolean {
    return this.device?.isConnected() ?? false;
  }
  
  /**
   * Get current monitoring mode
   */
  getMonitoringMode(): string {
    return this.monitoringMode;
  }
  
  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    mode: string;
    lastSync: number;
    uptime: number;
    resourceUsage: any;
  }> {
    return {
      connected: this.isConnected(),
      mode: this.monitoringMode,
      lastSync: this.lastSyncTime,
      uptime: Date.now() - this.lastSyncTime,
      resourceUsage: await this.getResourceUsage()
    };
  }
  
  /**
   * Cleanup resources and stop all monitoring
   */
  async cleanup(): Promise<void> {
    await this.structuredLogger.info('Cleaning up CU12 Smart State Manager');
    
    this.stopAllActiveMonitoring();
    
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
    }
    
    if (this.device) {
      await this.device.disconnect();
    }
    
    await this.resourceOptimizer.optimizeMemoryUsage();
  }
  
  // Private helper methods
  
  private async quickHealthCheck(): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    
    const isHealthy = await this.device.testCommunication();
    if (!isHealthy) {
      throw new Error('Hardware not responding');
    }
    
    await this.structuredLogger.trace('Health check passed', {
      mode: this.monitoringMode,
      timestamp: Date.now()
    });
  }
  
  private async handleHealthCheckError(error: any): Promise<void> {
    await this.structuredLogger.warn('Health check failed', {
      error: error.message,
      mode: this.monitoringMode
    });
    
    await this.failureDetector.handleOperationError(error, 'health_check');
  }
  
  private detectStateChanges(deviceStatus: SlotStatus[], dbSlots: any[]): StateChange[] {
    const changes: StateChange[] = [];
    
    for (let i = 0; i < Math.min(deviceStatus.length, 12); i++) {
      const deviceSlot = deviceStatus[i];
      const dbSlot = dbSlots.find(s => s.slotId === i + 1);
      
      if (deviceSlot && dbSlot) {
        // Check for state mismatches
        if (deviceSlot.isLocked !== dbSlot.occupied) {
          changes.push({
            slotId: i + 1,
            field: 'occupied',
            oldValue: dbSlot.occupied,
            newValue: deviceSlot.isLocked,
            timestamp: Date.now()
          });
        }
      }
    }
    
    return changes;
  }
  
  private async handleStateChanges(changes: StateChange[]): Promise<void> {
    for (const change of changes) {
      try {
        // Update database
        await Slot.update(
          { [change.field]: change.newValue },
          { where: { slotId: change.slotId } }
        );
        
        // Notify renderer
        this.mainWindow.webContents.send('cu12-slot-update', {
          slotId: change.slotId,
          field: change.field,
          value: change.newValue,
          timestamp: change.timestamp
        });
        
        await this.structuredLogger.info('State change applied', change);
      } catch (error) {
        await this.structuredLogger.error('Failed to apply state change', {
          change,
          error: error.message
        });
      }
    }
  }
  
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
  
  private stopIdleMode(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  private setupMemoryCleanup(): void {
    // Clean up cache and memory every 10 minutes
    this.memoryCleanupInterval = setInterval(async () => {
      await this.resourceOptimizer.optimizeMemoryUsage();
    }, 10 * 60 * 1000);
  }
  
  private createResourceOptimizer(): ResourceOptimizer {
    const cache = new Map<string, {data: any, timestamp: number, hits: number}>();
    
    return {
      cache,
      
      getCachedResponse<T>(key: string, ttl: number = 5000): T | null {
        const cached = cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < ttl) {
          cached.hits++;
          return cached.data;
        }
        return null;
      },
      
      setCachedResponse(key: string, data: any, ttl: number = 5000): void {
        cache.set(key, {
          data,
          timestamp: Date.now(),
          hits: 0
        });
      },
      
      async batchOperations(operations: any[]): Promise<any[]> {
        // Implementation for batch operations
        return operations.map(op => op); // Placeholder
      },
      
      async optimizeMemoryUsage(): Promise<void> {
        const now = Date.now();
        let cleanedEntries = 0;
        
        for (const [key, value] of cache) {
          if (now - value.timestamp > 60000) { // 1 minute max age
            cache.delete(key);
            cleanedEntries++;
          }
        }
        
        if (cleanedEntries > 0) {
          console.log(`Cleaned ${cleanedEntries} expired cache entries`);
        }
      }
    };
  }
  
  private createStructuredLogger(): CU12StructuredLogger {
    const config = this.config; // Capture config in closure
    
    const log = async (level: string, message: string, metadata?: Record<string, any>) => {
      const entry = {
        level,
        timestamp: Date.now(),
        component: 'CU12SmartStateManager',
        message,
        metadata
      };
      
      // For now, use existing logger
      await logger({
        user: 'system',
        message: `[${level}] ${message} ${metadata ? JSON.stringify(metadata) : ''}`
      });
    };
    
    return {
      async trace(message: string, metadata?: Record<string, any>) {
        if (config.logLevel === 'TRACE') {
          await log('TRACE', message, metadata);
        }
      },
      
      async debug(message: string, metadata?: Record<string, any>) {
        if (['TRACE', 'DEBUG'].includes(config.logLevel)) {
          await log('DEBUG', message, metadata);
        }
      },
      
      async info(message: string, metadata?: Record<string, any>) {
        if (['TRACE', 'DEBUG', 'INFO'].includes(config.logLevel)) {
          await log('INFO', message, metadata);
        }
      },
      
      async warn(message: string, metadata?: Record<string, any>) {
        if (['TRACE', 'DEBUG', 'INFO', 'WARN'].includes(config.logLevel)) {
          await log('WARN', message, metadata);
        }
      },
      
      async error(message: string, metadata?: Record<string, any>) {
        if (['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'].includes(config.logLevel)) {
          await log('ERROR', message, metadata);
        }
      },
      
      async fatal(message: string, metadata?: Record<string, any>) {
        await log('FATAL', message, metadata);
      }
    };
  }
  
  private async getResourceUsage(): Promise<any> {
    // Placeholder for resource usage monitoring
    return {
      memoryUsage: process.memoryUsage(),
      cacheSize: this.resourceOptimizer.cache.size,
      uptime: process.uptime()
    };
  }
}