import { BrowserWindow } from "electron";
import { DS12Controller } from "./ds12/DS12Controller";
import { KuControllerBase } from "./base/KuControllerBase";
import { BuildConstants, DeviceType, DeviceConfig } from "../../config/constants/BuildConstants";
import { runtimeLogger } from "../logger/runtime-logger";

/**
 * BuildTimeController - Factory for Medical Device Controller Management
 * 
 * MEDICAL DEVICE COMPLIANCE PATTERN:
 * - Singleton pattern ensures single device controller instance
 * - Build-time device configuration for predictable hardware setup
 * - Complete audit logging for all controller operations
 * - Thread-safe initialization and cleanup procedures
 * 
 * PHASE 4.1 IMPLEMENTATION SCOPE:
 * - DS12 only configuration (12-slot medication cabinet)
 * - Factory pattern enables future device type expansion
 * - Maintains exact KU16 API compatibility for zero regression
 * - Preserves all Thai language error messages and audit logging
 * 
 * CRITICAL REQUIREMENTS:
 * - Zero functionality regression from KU16 implementation
 * - Medical compliance preserved (audit trails, error handling)
 * - Thai language strings maintained exactly
 * - Authentication patterns unchanged (passkey validation)
 * - Database operations identical (Slot.update(), logDispensing() calls)
 * - IPC timing maintained (same sleep patterns and response timing)
 * 
 * SINGLETON SAFETY:
 * - Single controller instance prevents hardware conflicts
 * - Thread-safe initialization with connection state validation
 * - Graceful cleanup on application shutdown
 * - Emergency disconnect capabilities for hardware protection
 * 
 * USAGE PATTERN FOR IPC HANDLERS:
 * ```typescript
 * // Replace KU16 usage in IPC handlers with:
 * const controller = BuildTimeController.getCurrentController();
 * if (!controller) {
 *   // Handle no controller error - same as KU16 not connected
 *   return;
 * }
 * 
 * // Use controller methods that match KU16 API:
 * await controller.sendUnlock(payload);
 * controller.sendCheckState();
 * const isConnected = controller.isConnected();
 * ```
 */
export class BuildTimeController {
  // SINGLETON INSTANCE: Single controller for medical device safety
  private static instance: KuControllerBase | null = null;
  private static isInitialized: boolean = false;
  private static deviceConfig: DeviceConfig | null = null;
  
  /**
   * Initialize BuildTimeController with device-specific configuration
   * 
   * INITIALIZATION PATTERN:
   * - Create DS12Controller instance with BrowserWindow for IPC
   * - Store as singleton to prevent multiple hardware connections
   * - Log initialization for medical device audit compliance
   * - Validate BrowserWindow for secure IPC communication
   * 
   * MEDICAL DEVICE SAFETY:
   * - Single controller instance prevents hardware conflicts
   * - Comprehensive error handling for initialization failures
   * - Audit logging for regulatory compliance requirements
   * - Window validation ensures secure renderer communication
   * 
   * @param win - BrowserWindow instance for IPC communication with renderer
   * @param port - Serial port path for device connection
   * @param baudRate - Communication baud rate (19200 for DS12)
   * @returns Promise<boolean> - Initialization success status
   */
  static async initialize(
    win: BrowserWindow,
    port: string,
    baudRate?: number
  ): Promise<boolean> {
    const startTime = Date.now();
    
    await runtimeLogger({
      user: "system",
      message: "BuildTimeController initialization started",
      logType: "system",
      component: "BuildTimeController",
      level: "info",
      metadata: {
        operation: "controller_initialize",
        port,
        baudRate: baudRate || 19200,
        hasWindow: !!win && !win?.isDestroyed()
      }
    });
    
    try {
      // VALIDATION: Ensure BrowserWindow is valid for IPC
      if (!win || win.isDestroyed()) {
        const error = "BuildTimeController: Invalid BrowserWindow provided";
        console.error(error);
        await runtimeLogger({
          user: "system",
          message: "BuildTimeController initialization failed - invalid window",
          logType: "error",
          component: "BuildTimeController",
          level: "error",
          metadata: {
            operation: "controller_initialize",
            error,
            duration: Date.now() - startTime
          }
        });
        return false;
      }

      // BUILD CONFIGURATION: Load and validate build-time device configuration
      try {
        this.deviceConfig = BuildConstants.getCurrentConfig();
        console.log("BuildTimeController: Loaded device configuration:", this.deviceConfig.deviceType);
        
        await runtimeLogger({
          user: "system",
          message: "Device configuration loaded successfully",
          logType: "system",
          component: "BuildTimeController",
          level: "info",
          metadata: {
            operation: "controller_initialize",
            deviceType: this.deviceConfig.deviceType,
            baudRate: this.deviceConfig.baudRate,
            auditSummary: BuildConstants.getAuditSummary()
          }
        });
        
        // Log audit summary for compliance
        console.log("BuildTimeController: Configuration audit:", BuildConstants.getAuditSummary());
      } catch (configError) {
        console.error("BuildTimeController: Configuration error:", configError);
        await runtimeLogger({
          user: "system",
          message: "Device configuration loading failed",
          logType: "error",
          component: "BuildTimeController",
          level: "error",
          metadata: {
            operation: "controller_initialize",
            error: configError instanceof Error ? configError.message : String(configError),
            stack: configError instanceof Error ? configError.stack : undefined,
            duration: Date.now() - startTime
          }
        });
        return false;
      }

      // CONFIGURATION VALIDATION: Ensure build configuration is valid
      if (!BuildConstants.validateConfiguration()) {
        console.error("BuildTimeController: Invalid build configuration");
        return false;
      }

      // CLEANUP: Ensure clean initialization by disposing existing instance
      if (this.instance) {
        await this.cleanup();
      }

      // BAUD RATE RESOLUTION: Use build config if not provided
      const effectiveBaudRate = baudRate || this.deviceConfig.baudRate;
      
      // BAUD RATE VALIDATION: Ensure provided baud rate matches device config
      if (baudRate && baudRate !== this.deviceConfig.baudRate) {
        console.warn(
          `BuildTimeController: Baud rate mismatch. Provided: ${baudRate}, Expected: ${this.deviceConfig.baudRate}. Using config value.`
        );
      }

      // DEVICE CREATION: Initialize controller based on build configuration
      await runtimeLogger({
        user: "system",
        message: "Creating device controller instance",
        logType: "system",
        component: "BuildTimeController",
        level: "info",
        metadata: {
          operation: "controller_initialize",
          deviceType: this.deviceConfig.deviceType,
          port,
          baudRate: this.deviceConfig.baudRate
        }
      });
      
      switch (this.deviceConfig.deviceType) {
        case 'DS12':
          this.instance = new DS12Controller(win);
          break;
        case 'DS16':
          // Future implementation: DS16Controller
          throw new Error("DS16Controller not yet implemented");
        default:
          throw new Error(`Unsupported device type: ${this.deviceConfig.deviceType}`);
      }
      
      // CONNECTION ESTABLISHMENT: Connect to hardware device
      await runtimeLogger({
        user: "system",
        message: "Attempting hardware connection",
        logType: "system",
        component: "BuildTimeController",
        level: "info",
        metadata: {
          operation: "controller_initialize",
          deviceType: this.deviceConfig.deviceType,
          port,
          baudRate: this.deviceConfig.baudRate
        }
      });
      
      const connectionResult = await this.instance.connect(port, this.deviceConfig.baudRate);
      
      if (!connectionResult) {
        // CONNECTION FAILED: Log error and cleanup
        const errorMsg = `BuildTimeController: Failed to connect to ${this.deviceConfig.deviceType} on ${port} at ${this.deviceConfig.baudRate} baud`;
        console.error(errorMsg);
        
        await runtimeLogger({
          user: "system",
          message: "Hardware connection failed",
          logType: "error",
          component: "BuildTimeController",
          level: "error",
          metadata: {
            operation: "controller_initialize",
            error: errorMsg,
            deviceType: this.deviceConfig.deviceType,
            port,
            baudRate: this.deviceConfig.baudRate,
            duration: Date.now() - startTime
          }
        });
        
        this.instance = null;
        this.isInitialized = false;
        return false;
      }

      // SUCCESS: Mark as initialized and log for audit
      this.isInitialized = true;
      
      const successMsg = `BuildTimeController: ${this.deviceConfig.deviceType} initialized successfully on ${port} at ${this.deviceConfig.baudRate} baud`;
      console.log(successMsg);
      
      await runtimeLogger({
        user: "system",
        message: "BuildTimeController initialization completed successfully",
        logType: "system",
        component: "BuildTimeController",
        level: "info",
        metadata: {
          operation: "controller_initialize",
          deviceType: this.deviceConfig.deviceType,
          port,
          baudRate: this.deviceConfig.baudRate,
          isInitialized: this.isInitialized,
          hasInstance: !!this.instance,
          duration: Date.now() - startTime
        }
      });
      
      return true;
    } catch (error) {
      // EXCEPTION HANDLING: Log initialization errors
      console.error("BuildTimeController initialization error:", error);
      
      await runtimeLogger({
        user: "system",
        message: "BuildTimeController initialization failed with exception",
        logType: "error",
        component: "BuildTimeController",
        level: "error",
        metadata: {
          operation: "controller_initialize",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          port,
          baudRate: baudRate || 19200,
          deviceType: this.deviceConfig?.deviceType || 'unknown',
          duration: Date.now() - startTime
        }
      });
      
      this.instance = null;
      this.isInitialized = false;
      this.deviceConfig = null;
      return false;
    }
  }

  /**
   * Get current controller instance for IPC handler usage
   * 
   * SINGLETON ACCESS PATTERN:
   * - Return initialized controller instance
   * - Validate controller is connected and ready
   * - Provide null for error handling (same as KU16 pattern)
   * - Ensure thread-safe access to singleton
   * 
   * USAGE IN IPC HANDLERS:
   * - Replace `ku16` parameter with `BuildTimeController.getCurrentController()`
   * - Check for null return (same as checking `ku16.connected`)
   * - Use returned controller methods (sendUnlock, dispense, etc.)
   * - Maintain exact same error handling patterns
   * 
   * @returns KuControllerBase | null - Controller instance or null if not initialized
   */
  static getCurrentController(): KuControllerBase | null {
    // VALIDATION: Ensure controller is initialized and connected
    if (!this.isInitialized || !this.instance) {
      return null;
    }

    // CONNECTION CHECK: Verify controller is still connected to hardware
    // This matches KU16.connected check pattern in existing IPC handlers
    if (!this.instance.isConnected()) {
      return null;
    }

    return this.instance;
  }

  /**
   * Check if controller is initialized and ready for operations
   * 
   * READY STATE VALIDATION:
   * - Verify singleton instance exists
   * - Check initialization flag status
   * - Validate hardware connection state
   * - Provide boolean result for IPC handler decisions
   * 
   * @returns boolean - True if controller is ready for operations
   */
  static isReady(): boolean {
    return (
      this.isInitialized &&
      this.instance !== null &&
      this.instance.isConnected()
    );
  }

  /**
   * Get current device type for logging and diagnostics
   * 
   * DEVICE TYPE IDENTIFICATION:
   * - Return configured device type from build configuration
   * - Used for logging, error messages, and audit trails
   * - Enables future device type expansion
   * - Maintains consistency with existing logging patterns
   * 
   * @returns string - Current device type identifier
   */
  static getDeviceType(): DeviceType {
    return this.deviceConfig?.deviceType || BuildConstants.getCurrentDeviceType();
  }

  /**
   * Get controller connection status for diagnostics
   * 
   * CONNECTION DIAGNOSTICS:
   * - Check singleton instance existence
   * - Validate hardware connection state
   * - Provide detailed status for troubleshooting
   * - Match KU16 connection reporting patterns
   * 
   * @returns object - Connection status with diagnostics
   */
  static getConnectionStatus(): {
    initialized: boolean;
    connected: boolean;
    deviceType: DeviceType;
    instance: boolean;
    config: DeviceConfig | null;
    configValid: boolean;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.instance ? this.instance.isConnected() : false,
      deviceType: this.getDeviceType(),
      instance: this.instance !== null,
      config: this.deviceConfig,
      configValid: BuildConstants.validateConfiguration(),
    };
  }

  /**
   * Emergency cleanup and disconnection
   * 
   * EMERGENCY PROCEDURES:
   * - Immediate disconnection from hardware device
   * - Reset singleton state to allow reinitialization
   * - Log emergency action for medical audit
   * - Provide graceful degradation for system stability
   * 
   * USAGE SCENARIOS:
   * - Application shutdown sequence
   * - Hardware error recovery
   * - Emergency stop procedures
   * - Controller reinitialization
   * 
   * @param reason - Reason for emergency cleanup (for audit logging)
   */
  static async emergencyCleanup(reason: string = "Emergency cleanup requested"): Promise<void> {
    const startTime = Date.now();
    
    await runtimeLogger({
      user: "system",
      message: "Emergency cleanup initiated",
      logType: "system",
      component: "BuildTimeController",
      level: "info",
      metadata: {
        operation: "emergency_cleanup",
        reason,
        hasInstance: !!this.instance,
        isInitialized: this.isInitialized,
        deviceType: this.deviceConfig?.deviceType || 'unknown'
      }
    });
    
    try {
      console.log(`BuildTimeController: Emergency cleanup initiated - ${reason}`);
      
      if (this.instance) {
        // IMMEDIATE DISCONNECTION: Use DS12Controller's emergency disconnect if available
        if ('emergencyDisconnect' in this.instance && typeof (this.instance as any).emergencyDisconnect === 'function') {
          await (this.instance as any).emergencyDisconnect(reason);
        } else {
          // FALLBACK: Standard disconnect if emergency method not available
          await this.instance.disconnect();
        }
      }
      
      await runtimeLogger({
        user: "system",
        message: "Emergency cleanup completed successfully",
        logType: "system",
        component: "BuildTimeController",
        level: "info",
        metadata: {
          operation: "emergency_cleanup",
          reason,
          duration: Date.now() - startTime
        }
      });
    } catch (error) {
      console.error("BuildTimeController: Emergency cleanup error:", error);
      
      await runtimeLogger({
        user: "system",
        message: "Emergency cleanup failed",
        logType: "error",
        component: "BuildTimeController",
        level: "error",
        metadata: {
          operation: "emergency_cleanup",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          reason,
          duration: Date.now() - startTime
        }
      });
    } finally {
      // FORCE RESET: Ensure clean state regardless of errors
      this.instance = null;
      this.isInitialized = false;
      this.deviceConfig = null;
    }
  }

  /**
   * Graceful cleanup and disconnection
   * 
   * GRACEFUL SHUTDOWN PATTERN:
   * - Allow pending operations to complete
   * - Disconnect from hardware device properly
   * - Reset singleton state for clean reinitialization
   * - Log cleanup action for audit trail
   * 
   * USAGE IN APPLICATION LIFECYCLE:
   * - Normal application shutdown
   * - Device reconfiguration
   * - Port/baudrate changes
   * - Controlled system maintenance
   */
  static async cleanup(): Promise<void> {
    const startTime = Date.now();
    
    await runtimeLogger({
      user: "system",
      message: "Graceful cleanup initiated",
      logType: "system",
      component: "BuildTimeController",
      level: "info",
      metadata: {
        operation: "cleanup",
        hasInstance: !!this.instance,
        isInitialized: this.isInitialized,
        deviceType: this.deviceConfig?.deviceType || 'unknown'
      }
    });
    
    try {
      if (this.instance) {
        console.log("BuildTimeController: Graceful cleanup initiated");
        
        // GRACEFUL DISCONNECTION: Allow operations to complete
        await this.instance.disconnect();
        
        console.log("BuildTimeController: Cleanup completed successfully");
        
        await runtimeLogger({
          user: "system",
          message: "Graceful cleanup completed successfully",
          logType: "system",
          component: "BuildTimeController",
          level: "info",
          metadata: {
            operation: "cleanup",
            deviceType: this.deviceConfig?.deviceType || 'unknown',
            duration: Date.now() - startTime
          }
        });
      } else {
        await runtimeLogger({
          user: "system",
          message: "Cleanup skipped - no instance to clean",
          logType: "system",
          component: "BuildTimeController",
          level: "info",
          metadata: {
            operation: "cleanup",
            duration: Date.now() - startTime
          }
        });
      }
    } catch (error) {
      console.error("BuildTimeController: Cleanup error:", error);
      
      await runtimeLogger({
        user: "system",
        message: "Graceful cleanup failed",
        logType: "error",
        component: "BuildTimeController",
        level: "error",
        metadata: {
          operation: "cleanup",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          deviceType: this.deviceConfig?.deviceType || 'unknown',
          duration: Date.now() - startTime
        }
      });
    } finally {
      // RESET STATE: Ensure clean state for reinitialization
      this.instance = null;
      this.isInitialized = false;
      this.deviceConfig = null;
    }
  }

  /**
   * Reinitialize controller with new settings
   * 
   * REINITIALIZATION PATTERN:
   * - Cleanup existing instance gracefully
   * - Initialize new controller with updated parameters
   * - Maintain singleton pattern integrity
   * - Provide seamless hardware reconfiguration
   * 
   * USAGE SCENARIOS:
   * - Port/baudrate configuration changes
   * - Device type switching (future phases)
   * - Connection recovery procedures
   * - Settings update operations
   * 
   * @param win - BrowserWindow instance for IPC communication
   * @param port - Serial port path for device connection
   * @param baudRate - Communication baud rate
   * @returns Promise<boolean> - Reinitialization success status
   */
  static async reinitialize(
    win: BrowserWindow,
    port: string,
    baudRate?: number
  ): Promise<boolean> {
    const startTime = Date.now();
    
    await runtimeLogger({
      user: "system",
      message: "Controller reinitialization requested",
      logType: "system",
      component: "BuildTimeController",
      level: "info",
      metadata: {
        operation: "reinitialize",
        port,
        baudRate: baudRate || 'default',
        currentDeviceType: this.deviceConfig?.deviceType || 'none',
        wasInitialized: this.isInitialized
      }
    });
    
    console.log("BuildTimeController: Reinitialization requested");
    
    try {
      // CLEANUP: Gracefully cleanup existing instance
      await this.cleanup();
      
      // REINITIALIZE: Create new instance with updated parameters
      const result = await this.initialize(win, port, baudRate);
      
      await runtimeLogger({
        user: "system",
        message: "Controller reinitialization completed",
        logType: "system",
        component: "BuildTimeController",
        level: "info",
        metadata: {
          operation: "reinitialize",
          success: result,
          port,
          baudRate: baudRate || 'default',
          newDeviceType: this.deviceConfig?.deviceType || 'unknown',
          duration: Date.now() - startTime
        }
      });
      
      return result;
    } catch (error) {
      await runtimeLogger({
        user: "system",
        message: "Controller reinitialization failed",
        logType: "error",
        component: "BuildTimeController",
        level: "error",
        metadata: {
          operation: "reinitialize",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          port,
          baudRate: baudRate || 'default',
          duration: Date.now() - startTime
        }
      });
      
      throw error;
    }
  }

  /**
   * Get current device configuration
   * 
   * @returns DeviceConfig | null - Current device configuration
   */
  static getDeviceConfig(): DeviceConfig | null {
    return this.deviceConfig;
  }

  /**
   * Get build information for diagnostics and audit logging
   * 
   * @returns object - Comprehensive build and runtime information
   */
  static getBuildInfo(): {
    buildConfig: any;
    runtimeStatus: any;
    validationResults: any;
  } {
    const buildInfo = BuildConstants.getBuildInfo();
    const connectionStatus = this.getConnectionStatus();
    
    return {
      buildConfig: buildInfo,
      runtimeStatus: connectionStatus,
      validationResults: {
        configValid: BuildConstants.validateConfiguration(),
        controllerReady: this.isReady(),
        hasValidInstance: this.instance !== null,
        deviceTypeMatch: this.deviceConfig?.deviceType === BuildConstants.getCurrentDeviceType()
      }
    };
  }

  /**
   * Validate current build and runtime configuration
   * 
   * @returns boolean - True if all validations pass
   */
  static validateBuildConfiguration(): boolean {
    try {
      // Build configuration validation
      if (!BuildConstants.validateConfiguration()) {
        console.error("BuildTimeController: Build configuration validation failed");
        return false;
      }

      // Runtime consistency checks
      if (this.deviceConfig && this.deviceConfig.deviceType !== BuildConstants.getCurrentDeviceType()) {
        console.error("BuildTimeController: Device type mismatch between build and runtime");
        return false;
      }

      // Instance validation if initialized
      if (this.isInitialized && !this.instance) {
        console.error("BuildTimeController: Marked as initialized but no instance exists");
        return false;
      }

      return true;
    } catch (error) {
      console.error("BuildTimeController: Validation error:", error);
      return false;
    }
  }

  /**
   * Check if specific command is supported by current device configuration
   * 
   * @param command - Command to check support for
   * @returns boolean - True if command is supported
   */
  static supportsCommand(command: string): boolean {
    return BuildConstants.supportsCommand(command);
  }

  /**
   * Get timing configuration for current device
   * 
   * @returns object - Device-specific timing parameters
   */
  static getTimingConfig(): {
    communicationTimeout: number;
    operationDelay: number;
    responseTimeout: number;
    retryInterval: number;
  } {
    return BuildConstants.getTimingConfig();
  }

  /**
   * Reactivate a slot using the current controller instance
   * Delegates to the underlying controller's reactivate method
   * 
   * @param slotId - Target slot number
   * @param passkey - User authentication passkey
   * @returns Promise<void>
   */
  static async reactivate(slotId: number, passkey: string): Promise<void> {
    if (!this.instance) {
      throw new Error("BuildTimeController: No controller instance available for reactivate operation");
    }

    if (!this.instance.isConnected()) {
      throw new Error("BuildTimeController: Controller not connected for reactivate operation");
    }

    // Check if the controller has reactivate method
    if ('reactivate' in this.instance && typeof (this.instance as any).reactivate === 'function') {
      return await (this.instance as any).reactivate(slotId, passkey);
    } else {
      throw new Error(`BuildTimeController: Reactivate method not supported by ${this.deviceConfig?.deviceType} controller`);
    }
  }

  /**
   * Perform emergency state reset using the current controller instance
   * Delegates to the underlying controller's emergencyStateReset method
   */
  static emergencyStateReset(): void {
    if (!this.instance) {
      console.warn("BuildTimeController: No controller instance available for emergency state reset");
      return;
    }

    // Check if the controller has emergencyStateReset method
    if ('emergencyStateReset' in this.instance && typeof (this.instance as any).emergencyStateReset === 'function') {
      (this.instance as any).emergencyStateReset();
    } else {
      console.warn(`BuildTimeController: Emergency state reset not supported by ${this.deviceConfig?.deviceType} controller`);
    }
  }

  /**
   * Reactivate all slots using the current controller instance
   * Delegates to the underlying controller's reactiveAllSlots method
   * 
   * @param passkey - User authentication passkey
   * @returns Promise<void>
   */
  static async reactiveAllSlots(passkey: string): Promise<void> {
    if (!this.instance) {
      throw new Error("BuildTimeController: No controller instance available for reactive all slots operation");
    }

    if (!this.instance.isConnected()) {
      throw new Error("BuildTimeController: Controller not connected for reactive all slots operation");
    }

    // Check if the controller has reactiveAllSlots method
    if ('reactiveAllSlots' in this.instance && typeof (this.instance as any).reactiveAllSlots === 'function') {
      return await (this.instance as any).reactiveAllSlots(passkey);
    } else {
      throw new Error(`BuildTimeController: Reactive all slots method not supported by ${this.deviceConfig?.deviceType} controller`);
    }
  }

  /**
   * Send check state command using the current controller instance
   * Delegates to the underlying controller's sendCheckState method
   * 
   * @returns Promise<void>
   */
  static async sendCheckState(): Promise<void> {
    if (!this.instance) {
      throw new Error("BuildTimeController: No controller instance available for send check state operation");
    }

    if (!this.instance.isConnected()) {
      throw new Error("BuildTimeController: Controller not connected for send check state operation");
    }

    // Check if the controller has sendCheckState method
    if ('sendCheckState' in this.instance && typeof (this.instance as any).sendCheckState === 'function') {
      return await (this.instance as any).sendCheckState();
    } else {
      throw new Error(`BuildTimeController: Send check state method not supported by ${this.deviceConfig?.deviceType} controller`);
    }
  }
}