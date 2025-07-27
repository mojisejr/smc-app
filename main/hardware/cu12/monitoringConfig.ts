export interface CU12MonitoringConfig {
  // Timing configurations
  healthCheckInterval: number;        // Health check frequency (ms)
  userInactiveTimeout: number;        // User inactivity timeout (ms)  
  operationTimeout: number;           // Max operation duration (ms)
  cacheTimeout: number;               // Cache TTL (ms)
  
  // Failure detection
  maxConsecutiveFailures: number;     // Max failures before circuit break
  circuitBreakerTimeout: number;      // Circuit breaker reset time (ms)
  initialBackoffDelay: number;        // Initial retry delay (ms)
  maxBackoffDelay: number;            // Maximum retry delay (ms)
  
  // Resource optimization
  enableIntelligentCaching: boolean;  // Enable response caching
  enableBatchOperations: boolean;     // Enable operation batching
  maxCacheEntries: number;            // Maximum cache size
  connectionPoolSize: number;         // Connection pool size
  
  // Logging configuration
  logLevel: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  enableStructuredLogging: boolean;   // Enable structured logging
  logBufferSize: number;              // Log buffer size before flush
  enableMonitoringReports: boolean;   // Enable monitoring reports
  
  // Anomaly detection
  enableAnomalyDetection: boolean;    // Enable anomaly detection
  slowResponseThreshold: number;      // Slow response threshold (ms)
  stateInconsistencyCheck: boolean;   // Check state inconsistencies
  resourceUsageMonitoring: boolean;   // Monitor resource usage
}

// Default configuration optimized for 24/7 stability
export const DEFAULT_CU12_CONFIG: CU12MonitoringConfig = {
  // Timing - Conservative for stability
  healthCheckInterval: 5 * 60 * 1000,    // 5 minutes
  userInactiveTimeout: 2 * 60 * 1000,    // 2 minutes
  operationTimeout: 30 * 1000,           // 30 seconds
  cacheTimeout: 5 * 1000,                // 5 seconds
  
  // Failure detection - Robust recovery
  maxConsecutiveFailures: 3,
  circuitBreakerTimeout: 30 * 1000,      // 30 seconds
  initialBackoffDelay: 1 * 1000,         // 1 second
  maxBackoffDelay: 30 * 1000,            // 30 seconds
  
  // Resource optimization - Efficient operation
  enableIntelligentCaching: true,
  enableBatchOperations: true,
  maxCacheEntries: 100,
  connectionPoolSize: 1,                 // Single device connection
  
  // Logging - Comprehensive monitoring
  logLevel: 'INFO',
  enableStructuredLogging: true,
  logBufferSize: 10,
  enableMonitoringReports: true,
  
  // Anomaly detection - Proactive monitoring
  enableAnomalyDetection: true,
  slowResponseThreshold: 3000,           // 3 seconds
  stateInconsistencyCheck: true,
  resourceUsageMonitoring: true
};

// Development configuration with more verbose logging
export const DEVELOPMENT_CU12_CONFIG: CU12MonitoringConfig = {
  ...DEFAULT_CU12_CONFIG,
  
  // More frequent monitoring for development
  healthCheckInterval: 30 * 1000,        // 30 seconds
  userInactiveTimeout: 30 * 1000,        // 30 seconds
  
  // Verbose logging for debugging
  logLevel: 'DEBUG',
  logBufferSize: 5,
  
  // Faster failure detection for development
  maxConsecutiveFailures: 2,
  circuitBreakerTimeout: 10 * 1000,      // 10 seconds
  
  // More sensitive anomaly detection
  slowResponseThreshold: 2000,           // 2 seconds
};

// Production configuration optimized for minimal resource usage
export const PRODUCTION_CU12_CONFIG: CU12MonitoringConfig = {
  ...DEFAULT_CU12_CONFIG,
  
  // Longer intervals for production stability
  healthCheckInterval: 10 * 60 * 1000,   // 10 minutes
  userInactiveTimeout: 5 * 60 * 1000,    // 5 minutes
  
  // Minimal logging for production
  logLevel: 'WARN',
  logBufferSize: 20,
  
  // Conservative failure handling
  maxConsecutiveFailures: 5,
  circuitBreakerTimeout: 60 * 1000,      // 1 minute
  maxBackoffDelay: 60 * 1000,            // 1 minute
  
  // Larger cache for better performance
  maxCacheEntries: 200,
  cacheTimeout: 10 * 1000,               // 10 seconds
};

export class CU12ConfigManager {
  private config: CU12MonitoringConfig;
  
  constructor(environment: 'development' | 'production' | 'custom' = 'production', customConfig?: Partial<CU12MonitoringConfig>) {
    switch (environment) {
      case 'development':
        this.config = DEVELOPMENT_CU12_CONFIG;
        break;
      case 'production':
        this.config = PRODUCTION_CU12_CONFIG;
        break;
      default:
        this.config = DEFAULT_CU12_CONFIG;
    }
    
    // Apply custom overrides if provided
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }
  
  getConfig(): CU12MonitoringConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<CU12MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  // Validate configuration for safety
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check timing values
    if (this.config.healthCheckInterval < 10000) {
      errors.push('Health check interval too low (minimum 10 seconds)');
    }
    
    if (this.config.operationTimeout < 5000) {
      errors.push('Operation timeout too low (minimum 5 seconds)');
    }
    
    if (this.config.cacheTimeout < 1000) {
      errors.push('Cache timeout too low (minimum 1 second)');
    }
    
    // Check failure detection values
    if (this.config.maxConsecutiveFailures < 1) {
      errors.push('Max consecutive failures must be at least 1');
    }
    
    if (this.config.circuitBreakerTimeout < 5000) {
      errors.push('Circuit breaker timeout too low (minimum 5 seconds)');
    }
    
    // Check resource limits
    if (this.config.maxCacheEntries < 10) {
      errors.push('Max cache entries too low (minimum 10)');
    }
    
    if (this.config.logBufferSize < 1) {
      errors.push('Log buffer size must be at least 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Get configuration summary for logging
  getConfigSummary(): Record<string, any> {
    return {
      environment: this.getEnvironmentType(),
      healthCheckInterval: `${this.config.healthCheckInterval / 1000}s`,
      userInactiveTimeout: `${this.config.userInactiveTimeout / 1000}s`,
      logLevel: this.config.logLevel,
      cachingEnabled: this.config.enableIntelligentCaching,
      anomalyDetectionEnabled: this.config.enableAnomalyDetection,
      maxFailures: this.config.maxConsecutiveFailures
    };
  }
  
  private getEnvironmentType(): string {
    if (this.config.logLevel === 'DEBUG') return 'development';
    if (this.config.healthCheckInterval >= 600000) return 'production';
    return 'default';
  }
}