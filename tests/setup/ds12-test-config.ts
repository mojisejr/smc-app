import { MockDS12Config } from '../mocks/MockDS12Hardware';

/**
 * DS12 Test Configuration
 * 
 * MEDICAL DEVICE TESTING STANDARDS:
 * - Safe testing configurations for different scenarios
 * - Standardized test parameters for consistent validation
 * - Error simulation rates for robustness testing
 * - Performance benchmarks for medical device compliance
 * 
 * TESTING SCENARIOS SUPPORTED:
 * - Normal operation validation
 * - Error condition simulation
 * - Performance stress testing  
 * - Hardware failure simulation
 * - Connection stability validation
 */

/**
 * Standard test configuration for normal operation scenarios
 */
export const NORMAL_TEST_CONFIG: MockDS12Config = {
  address: 0x00,
  slotCount: 12,
  responseDelayMs: 10, // Fast response for unit testing
  timeoutErrorRate: 0.0,
  commErrorRate: 0.0,
  checksumErrorRate: 0.0,
  enableLogging: false // Disable for clean test output
};

/**
 * Error simulation configuration for robustness testing
 */
export const ERROR_TEST_CONFIG: MockDS12Config = {
  address: 0x00,
  slotCount: 12,
  responseDelayMs: 20,
  timeoutErrorRate: 0.1, // 10% timeout error rate
  commErrorRate: 0.05,   // 5% communication error rate
  checksumErrorRate: 0.02, // 2% checksum error rate
  enableLogging: true // Enable for error debugging
};

/**
 * Performance test configuration for stress testing
 */
export const PERFORMANCE_TEST_CONFIG: MockDS12Config = {
  address: 0x00,
  slotCount: 12,
  responseDelayMs: 1, // Minimal delay for performance testing
  timeoutErrorRate: 0.0,
  commErrorRate: 0.0,
  checksumErrorRate: 0.0,
  enableLogging: false
};

/**
 * Hardware failure simulation configuration
 */
export const FAILURE_TEST_CONFIG: MockDS12Config = {
  address: 0x00,
  slotCount: 12,
  responseDelayMs: 100,
  timeoutErrorRate: 0.3, // 30% timeout rate (high failure)
  commErrorRate: 0.2,    // 20% communication error rate
  checksumErrorRate: 0.1, // 10% checksum error rate
  enableLogging: true
};

/**
 * Test slot data configurations for different scenarios
 */
export const TEST_SLOT_DATA = {
  EMPTY_SLOT: {
    slotId: 1,
    hn: null,
    occupied: false,
    opening: false,
    isActive: true,
    timestamp: null
  },
  
  OCCUPIED_SLOT: {
    slotId: 1,
    hn: 'HN123456',
    occupied: true,
    opening: false,
    isActive: true,
    timestamp: Date.now()
  },
  
  OPENING_SLOT: {
    slotId: 1,
    hn: 'HN123456',
    occupied: false,
    opening: true,
    isActive: true,
    timestamp: Date.now()
  },
  
  INACTIVE_SLOT: {
    slotId: 1,
    hn: null,
    occupied: false,
    opening: false,
    isActive: false,
    timestamp: null
  }
};

/**
 * Test user data for authentication scenarios
 */
export const TEST_USER_DATA = {
  VALID_USER: {
    userId: 'testUser001',
    username: 'testOperator',
    passkey: 'validTestPasskey',
    role: 'operator'
  },
  
  ADMIN_USER: {
    userId: 'admin001',
    username: 'testAdmin',
    passkey: 'adminTestPasskey',
    role: 'admin'
  },
  
  INVALID_USER: null // Represents user not found
};

/**
 * Expected response times for performance validation (in milliseconds)
 */
export const PERFORMANCE_BENCHMARKS = {
  CONNECTION_TIMEOUT: 5000,      // 5 seconds maximum for connection
  COMMAND_RESPONSE_TIME: 1000,   // 1 second maximum for command response
  STATUS_CHECK_TIME: 500,        // 500ms maximum for status check
  UNLOCK_COMMAND_TIME: 2000,     // 2 seconds maximum for unlock operation
  DISPENSE_WORKFLOW_TIME: 10000  // 10 seconds maximum for complete dispense workflow
};

/**
 * Test validation helpers
 */
export const TEST_VALIDATORS = {
  /**
   * Validate DS12 device type and slot count
   */
  validateDS12Device: (deviceType: string, maxSlot: number): boolean => {
    return deviceType === 'DS12' && maxSlot === 12;
  },
  
  /**
   * Validate slot ID is within DS12 range (1-12)
   */
  validateSlotId: (slotId: number): boolean => {
    return slotId >= 1 && slotId <= 12;
  },
  
  /**
   * Validate medical device audit log format
   */
  validateAuditLogEntry: (logEntry: any): boolean => {
    return (
      logEntry.hasOwnProperty('timestamp') &&
      logEntry.hasOwnProperty('message') &&
      logEntry.hasOwnProperty('deviceType') &&
      logEntry.deviceType === 'DS12'
    );
  },
  
  /**
   * Validate IPC event structure
   */
  validateIPCEvent: (eventName: string, eventData: any): boolean => {
    return (
      typeof eventName === 'string' &&
      eventName.length > 0 &&
      eventData !== undefined &&
      eventData.hasOwnProperty('timestamp')
    );
  }
};

/**
 * Test scenario definitions for comprehensive testing
 */
export const TEST_SCENARIOS = {
  NORMAL_OPERATION: {
    name: 'Normal Operation',
    description: 'Standard DS12 operations without errors',
    config: NORMAL_TEST_CONFIG,
    expectedResults: {
      connectionSuccess: true,
      commandSuccess: true,
      errorRate: 0.0
    }
  },
  
  ERROR_HANDLING: {
    name: 'Error Handling',
    description: 'DS12 operations with simulated hardware errors',
    config: ERROR_TEST_CONFIG,
    expectedResults: {
      connectionSuccess: true, // Should succeed despite errors
      commandSuccess: true,    // Should handle errors gracefully
      errorRate: 0.17 // Combined error rate from config
    }
  },
  
  PERFORMANCE_STRESS: {
    name: 'Performance Stress',
    description: 'High-frequency DS12 operations for performance validation',
    config: PERFORMANCE_TEST_CONFIG,
    expectedResults: {
      connectionSuccess: true,
      commandSuccess: true,
      maxResponseTime: PERFORMANCE_BENCHMARKS.COMMAND_RESPONSE_TIME
    }
  },
  
  HARDWARE_FAILURE: {
    name: 'Hardware Failure',
    description: 'DS12 operations under severe hardware failure conditions',
    config: FAILURE_TEST_CONFIG,
    expectedResults: {
      connectionSuccess: false, // May fail due to high error rate
      gracefulFailure: true,    // Should fail gracefully
      errorRate: 0.6 // High combined error rate
    }
  }
};

/**
 * Medical device compliance test requirements
 */
export const COMPLIANCE_REQUIREMENTS = {
  AUDIT_LOGGING: {
    required: true,
    description: 'All operations must be logged for medical audit compliance'
  },
  
  USER_AUTHENTICATION: {
    required: true,
    description: 'All critical operations must authenticate user passkey'
  },
  
  DATABASE_CONSISTENCY: {
    required: true,
    description: 'Hardware state must synchronize with database state'
  },
  
  ERROR_RECOVERY: {
    required: true,
    description: 'System must recover gracefully from hardware errors'
  },
  
  UI_FEEDBACK: {
    required: true,
    description: 'All operations must provide UI feedback via IPC events'
  },
  
  HARDWARE_PROTECTION: {
    required: true,
    description: 'Hardware protection measures must prevent device damage'
  }
};