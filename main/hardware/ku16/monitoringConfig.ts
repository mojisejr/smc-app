/**
 * KU16 Monitoring Configuration
 * Following CU12 pattern for consistency
 */

export interface KU16MonitoringConfig {
  // Health check intervals
  healthCheckInterval: number; // milliseconds
  userInactiveTimeout: number; // milliseconds
  operationTimeout: number; // milliseconds

  // Resource optimization
  cacheTimeout: number; // milliseconds
  memoryCleanupInterval: number; // milliseconds
  maxCacheSize: number; // number of entries

  // Failure detection
  failureThreshold: number; // consecutive failures before circuit breaker opens
  recoveryTimeout: number; // milliseconds to wait before trying to close circuit breaker
  
  // Performance monitoring
  performanceMonitoring: boolean;
  detailedLogging: boolean;
  
  // KU16 specific settings
  maxSlots: 15;
  serialTimeout: number; // milliseconds
  retryAttempts: number;
}

// Default configuration optimized for KU16 hardware
export const DEFAULT_KU16_CONFIG: KU16MonitoringConfig = {
  // Health monitoring
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes in idle mode
  userInactiveTimeout: 2 * 60 * 1000, // 2 minutes
  operationTimeout: 30 * 1000, // 30 seconds
  
  // Resource optimization
  cacheTimeout: 30 * 1000, // 30 seconds
  memoryCleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxCacheSize: 100,
  
  // Failure detection
  failureThreshold: 3, // 3 consecutive failures
  recoveryTimeout: 60 * 1000, // 1 minute
  
  // Performance monitoring
  performanceMonitoring: true,
  detailedLogging: false,
  
  // KU16 specific
  maxSlots: 15,
  serialTimeout: 5000, // 5 seconds
  retryAttempts: 3,
};

// Development configuration with more verbose logging
export const DEVELOPMENT_KU16_CONFIG: KU16MonitoringConfig = {
  ...DEFAULT_KU16_CONFIG,
  healthCheckInterval: 30 * 1000, // 30 seconds (more frequent)
  userInactiveTimeout: 5 * 60 * 1000, // 5 minutes (longer for development)
  detailedLogging: true,
  performanceMonitoring: true,
  cacheTimeout: 10 * 1000, // 10 seconds (shorter for testing)
};

// Production configuration optimized for performance
export const PRODUCTION_KU16_CONFIG: KU16MonitoringConfig = {
  ...DEFAULT_KU16_CONFIG,
  healthCheckInterval: 10 * 60 * 1000, // 10 minutes (less frequent)
  detailedLogging: false,
  performanceMonitoring: false,
  cacheTimeout: 60 * 1000, // 1 minute (longer cache)
  maxCacheSize: 50, // Smaller cache for production
};

/**
 * Validate configuration settings
 */
export function validateKU16Config(config: Partial<KU16MonitoringConfig>): KU16MonitoringConfig {
  const validated = { ...DEFAULT_KU16_CONFIG, ...config };

  // Validate intervals
  if (validated.healthCheckInterval < 1000) {
    console.warn('KU16: healthCheckInterval too low, setting to 1 second minimum');
    validated.healthCheckInterval = 1000;
  }

  if (validated.userInactiveTimeout < 10000) {
    console.warn('KU16: userInactiveTimeout too low, setting to 10 seconds minimum');
    validated.userInactiveTimeout = 10000;
  }

  // Validate failure detection
  if (validated.failureThreshold < 1) {
    console.warn('KU16: failureThreshold too low, setting to 1 minimum');
    validated.failureThreshold = 1;
  }

  if (validated.recoveryTimeout < 1000) {
    console.warn('KU16: recoveryTimeout too low, setting to 1 second minimum');
    validated.recoveryTimeout = 1000;
  }

  // Validate cache settings
  if (validated.maxCacheSize < 10) {
    console.warn('KU16: maxCacheSize too low, setting to 10 minimum');
    validated.maxCacheSize = 10;
  }

  // Ensure KU16 specific values
  validated.maxSlots = 15; // Always 15 for KU16

  return validated;
}

/**
 * Get configuration based on environment
 */
export function getKU16Config(environment?: string): KU16MonitoringConfig {
  switch (environment?.toLowerCase()) {
    case 'development':
    case 'dev':
      return DEVELOPMENT_KU16_CONFIG;
    case 'production':
    case 'prod':
      return PRODUCTION_KU16_CONFIG;
    default:
      return DEFAULT_KU16_CONFIG;
  }
}