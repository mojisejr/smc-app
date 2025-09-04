/**
 * BuildConstants.ts - Build-Time Device Configuration System
 * 
 * MEDICAL DEVICE COMPLIANCE:
 * - Build-time device type selection eliminates runtime switching complexity
 * - Environment-based configuration for predictable deployment behavior
 * - Compile-time validation prevents device type mismatches
 * - Audit trail support for regulatory compliance
 * 
 * PHASE 4.1 IMPLEMENTATION:
 * - DS12 (12-slot) and DS16 (16-slot) device type definitions
 * - Environment variable driven configuration (DEVICE_TYPE)
 * - Hardware specification constants for each device type
 * - Validation functions for build-time configuration checks
 * 
 * USAGE PATTERN:
 * ```typescript
 * import { BuildConstants } from './config/constants/BuildConstants';
 * 
 * // Get current build configuration
 * const config = BuildConstants.getCurrentConfig();
 * if (config.deviceType === 'DS12') {
 *   // DS12-specific logic
 * }
 * 
 * // Validate configuration
 * const isValid = BuildConstants.validateConfiguration();
 * ```
 */

// Environment variable for device type selection
const DEVICE_TYPE = process.env.DEVICE_TYPE || 'DS12';

/**
 * Device Type Enumeration
 * Defines supported medical device types
 */
export type DeviceType = 'DS12' | 'DS16';

/**
 * Device Configuration Interface
 * Comprehensive device specifications for build-time configuration
 */
export interface DeviceConfig {
  deviceType: DeviceType;
  slotCount: number;
  baudRate: number;
  protocolVersion: string;
  maxConcurrentOperations: number;
  communicationTimeout: number;
  hardwareRevision: string;
  supportedCommands: string[];
  description: string;
}

/**
 * DS12 Device Configuration (12-slot medication cabinet)
 * Hardware specifications and operational parameters
 */
const DS12_CONFIG: DeviceConfig = {
  deviceType: 'DS12',
  slotCount: 12,
  baudRate: 19200,
  protocolVersion: '1.2',
  maxConcurrentOperations: 4,
  communicationTimeout: 5000,
  hardwareRevision: 'Rev-C',
  supportedCommands: [
    'UNLOCK_SLOT',
    'LOCK_SLOT', 
    'CHECK_STATE',
    'GET_STATUS',
    'RESET_SLOT',
    'EMERGENCY_STOP',
    'DISPENSE_MEDICATION',
    'ACTIVATE_ADMIN',
    'DEACTIVATE_ADMIN'
  ],
  description: '12-slot Smart Medication Cabinet with DS12 Controller'
};

/**
 * DS16 Device Configuration (16-slot medication cabinet)
 * Hardware specifications and operational parameters
 */
const DS16_CONFIG: DeviceConfig = {
  deviceType: 'DS16',
  slotCount: 16,
  baudRate: 38400,
  protocolVersion: '2.0',
  maxConcurrentOperations: 6,
  communicationTimeout: 3000,
  hardwareRevision: 'Rev-A',
  supportedCommands: [
    'UNLOCK_SLOT',
    'LOCK_SLOT',
    'CHECK_STATE',
    'GET_STATUS',
    'RESET_SLOT',
    'EMERGENCY_STOP',
    'DISPENSE_MEDICATION',
    'ACTIVATE_ADMIN',
    'DEACTIVATE_ADMIN',
    'BULK_OPERATION',
    'ADVANCED_DIAGNOSTICS'
  ],
  description: '16-slot Smart Medication Cabinet with DS16 Controller'
};

/**
 * Device Configuration Registry
 * Maps device types to their configurations
 */
const DEVICE_CONFIGS: Record<DeviceType, DeviceConfig> = {
  DS12: DS12_CONFIG,
  DS16: DS16_CONFIG
};

/**
 * BuildConstants Class - Central Build Configuration Management
 * 
 * ARCHITECTURE PATTERN:
 * - Static methods for build-time configuration access
 * - Environment variable driven device type selection
 * - Compile-time validation and error detection
 * - Medical device compliance through predictable configuration
 * 
 * MEDICAL DEVICE SAFETY:
 * - Build-time device selection prevents runtime device mismatches
 * - Configuration validation ensures proper hardware setup
 * - Audit logging for regulatory compliance requirements
 * - Error handling for invalid configuration scenarios
 */
export class BuildConstants {
  
  /**
   * Get current device configuration based on build environment
   * 
   * CONFIGURATION RESOLUTION:
   * - Read DEVICE_TYPE environment variable
   * - Return corresponding device configuration
   * - Default to DS12 for backward compatibility
   * - Validate configuration before returning
   * 
   * @returns DeviceConfig - Current device configuration
   * @throws Error if device type is invalid or unsupported
   */
  static getCurrentConfig(): DeviceConfig {
    const deviceType = DEVICE_TYPE as DeviceType;
    
    if (!this.isValidDeviceType(deviceType)) {
      throw new Error(
        `Invalid device type: ${deviceType}. Supported types: ${Object.keys(DEVICE_CONFIGS).join(', ')}`
      );
    }
    
    return DEVICE_CONFIGS[deviceType];
  }
  
  /**
   * Get current device type from environment
   * 
   * @returns DeviceType - Current device type (DS12 or DS16)
   */
  static getCurrentDeviceType(): DeviceType {
    return this.getCurrentConfig().deviceType;
  }
  
  /**
   * Get device configuration by type
   * 
   * @param deviceType - Specific device type to get configuration for
   * @returns DeviceConfig - Device configuration
   * @throws Error if device type is invalid
   */
  static getConfigByType(deviceType: DeviceType): DeviceConfig {
    if (!this.isValidDeviceType(deviceType)) {
      throw new Error(`Invalid device type: ${deviceType}`);
    }
    
    return DEVICE_CONFIGS[deviceType];
  }
  
  /**
   * Get all supported device types
   * 
   * @returns DeviceType[] - Array of supported device types
   */
  static getSupportedDeviceTypes(): DeviceType[] {
    return Object.keys(DEVICE_CONFIGS) as DeviceType[];
  }
  
  /**
   * Validate if device type is supported
   * 
   * @param deviceType - Device type to validate
   * @returns boolean - True if device type is valid
   */
  static isValidDeviceType(deviceType: string): deviceType is DeviceType {
    return Object.keys(DEVICE_CONFIGS).includes(deviceType);
  }
  
  /**
   * Validate current build configuration
   * 
   * VALIDATION CHECKS:
   * - Verify device type is supported
   * - Check configuration completeness
   * - Validate hardware specifications
   * - Ensure command set compatibility
   * 
   * @returns boolean - True if configuration is valid
   */
  static validateConfiguration(): boolean {
    try {
      const config = this.getCurrentConfig();
      
      // Validate required fields
      if (!config.deviceType || !config.slotCount || !config.baudRate) {
        console.error('BuildConstants: Incomplete device configuration');
        return false;
      }
      
      // Validate slot count bounds
      if (config.slotCount < 1 || config.slotCount > 32) {
        console.error(`BuildConstants: Invalid slot count: ${config.slotCount}`);
        return false;
      }
      
      // Validate baud rate
      const validBaudRates = [9600, 19200, 38400, 57600, 115200];
      if (!validBaudRates.includes(config.baudRate)) {
        console.error(`BuildConstants: Invalid baud rate: ${config.baudRate}`);
        return false;
      }
      
      // Validate command set
      if (!config.supportedCommands || config.supportedCommands.length === 0) {
        console.error('BuildConstants: Empty command set');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('BuildConstants: Configuration validation error:', error);
      return false;
    }
  }
  
  /**
   * Get build information for logging and diagnostics
   * 
   * BUILD INFORMATION:
   * - Current device type and configuration
   * - Environment variables
   * - Validation status
   * - Supported features
   * 
   * @returns object - Build information for diagnostics
   */
  static getBuildInfo(): {
    deviceType: DeviceType;
    config: DeviceConfig;
    environment: string;
    isValid: boolean;
    buildTimestamp: string;
  } {
    const config = this.getCurrentConfig();
    
    return {
      deviceType: config.deviceType,
      config: config,
      environment: DEVICE_TYPE,
      isValid: this.validateConfiguration(),
      buildTimestamp: new Date().toISOString()
    };
  }
  
  /**
   * Check if current configuration supports a specific command
   * 
   * @param command - Command to check support for
   * @returns boolean - True if command is supported
   */
  static supportsCommand(command: string): boolean {
    try {
      const config = this.getCurrentConfig();
      return config.supportedCommands.includes(command);
    } catch (error) {
      console.error('BuildConstants: Error checking command support:', error);
      return false;
    }
  }
  
  /**
   * Get hardware-specific timing parameters
   * 
   * TIMING CONFIGURATION:
   * - Communication timeouts
   * - Operation delays
   * - Hardware-specific timing requirements
   * - Device response time expectations
   * 
   * @returns object - Timing parameters for current device
   */
  static getTimingConfig(): {
    communicationTimeout: number;
    operationDelay: number;
    responseTimeout: number;
    retryInterval: number;
  } {
    const config = this.getCurrentConfig();
    
    return {
      communicationTimeout: config.communicationTimeout,
      operationDelay: config.deviceType === 'DS12' ? 100 : 50, // milliseconds
      responseTimeout: config.deviceType === 'DS12' ? 2000 : 1500, // milliseconds
      retryInterval: config.deviceType === 'DS12' ? 500 : 300 // milliseconds
    };
  }
  
  /**
   * Generate configuration summary for audit logging
   * 
   * AUDIT COMPLIANCE:
   * - Complete device configuration record
   * - Build environment information
   * - Validation results
   * - Timestamp for audit trail
   * 
   * @returns string - Configuration summary for audit logs
   */
  static getAuditSummary(): string {
    const buildInfo = this.getBuildInfo();
    const timing = this.getTimingConfig();
    
    return `
BUILD CONFIGURATION AUDIT:
==========================
Device Type: ${buildInfo.deviceType}
Slot Count: ${buildInfo.config.slotCount}
Baud Rate: ${buildInfo.config.baudRate}
Protocol Version: ${buildInfo.config.protocolVersion}
Hardware Revision: ${buildInfo.config.hardwareRevision}
Max Concurrent Operations: ${buildInfo.config.maxConcurrentOperations}
Communication Timeout: ${timing.communicationTimeout}ms
Validation Status: ${buildInfo.isValid ? 'PASSED' : 'FAILED'}
Build Timestamp: ${buildInfo.buildTimestamp}
Environment: ${buildInfo.environment}
Supported Commands: ${buildInfo.config.supportedCommands.join(', ')}
==========================
`.trim();
  }
}

// Export device configurations for direct access if needed
export { DS12_CONFIG, DS16_CONFIG, DEVICE_CONFIGS };