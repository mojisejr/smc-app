import { CU12MonitoringConfig } from './monitoringConfig';

export interface StateAnomaly {
  type: 'SLOW_RESPONSE' | 'STATE_INCONSISTENCY' | 'RESOURCE_ISSUE' | 'COMMUNICATION_ERROR';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export class CU12FailureDetector {
  private consecutiveFailures: Map<string, number> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private responseTimeHistory: number[] = [];
  private config: CU12MonitoringConfig;
  
  constructor(config: CU12MonitoringConfig) {
    this.config = config;
  }
  
  /**
   * Handle operation error with circuit breaker pattern
   */
  async handleOperationError(error: Error, operation: string): Promise<boolean> {
    const now = Date.now();
    
    console.log(`[WARN] CU12 operation error detected: ${operation} - ${error.message}`);
    
    // Check circuit breaker state
    if (this.isCircuitOpen(operation)) {
      console.log(`[WARN] Circuit breaker open, operation blocked: ${operation}`);
      return false;
    }
    
    // Update failure tracking
    const failures = this.consecutiveFailures.get(operation) || 0;
    this.consecutiveFailures.set(operation, failures + 1);
    this.lastFailureTime.set(operation, now);
    
    // Open circuit if too many failures
    if (failures + 1 >= this.config.maxConsecutiveFailures) {
      await this.openCircuit(operation);
    }
    
    // Attempt recovery with exponential backoff
    return await this.attemptRecovery(operation, failures);
  }
  
  /**
   * Check if circuit breaker is open for an operation
   */
  private isCircuitOpen(operation: string): boolean {
    const circuitState = this.circuitBreakers.get(operation);
    if (!circuitState) return false;
    
    const now = Date.now();
    
    if (circuitState.state === 'open') {
      // Check if it's time to try half-open
      if (now >= circuitState.nextRetryTime) {
        circuitState.state = 'half-open';
        this.circuitBreakers.set(operation, circuitState);
        console.log(`[INFO] Circuit breaker half-open: ${operation}`);
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Open circuit breaker for an operation
   */
  private async openCircuit(operation: string): Promise<void> {
    const now = Date.now();
    const failures = this.consecutiveFailures.get(operation) || 0;
    
    const circuitState: CircuitBreakerState = {
      state: 'open',
      failures,
      lastFailureTime: now,
      nextRetryTime: now + this.config.circuitBreakerTimeout
    };
    
    this.circuitBreakers.set(operation, circuitState);
    
    console.log(`[ERROR] Circuit breaker opened: ${operation} (failures: ${failures})`);
  }
  
  /**
   * Attempt recovery with exponential backoff
   */
  private async attemptRecovery(operation: string, failures: number): Promise<boolean> {
    const backoffTime = Math.min(
      this.config.initialBackoffDelay * Math.pow(2, failures),
      this.config.maxBackoffDelay
    );
    
    console.log(`[INFO] Attempting recovery for ${operation} after ${backoffTime}ms backoff`);
    
    await this.sleep(backoffTime);
    
    try {
      // Test hardware communication
      const isHealthy = await this.performHealthCheck();
      
      if (isHealthy) {
        // Reset failure counter on successful recovery
        this.consecutiveFailures.delete(operation);
        
        // Reset circuit breaker
        const circuitState = this.circuitBreakers.get(operation);
        if (circuitState) {
          circuitState.state = 'closed';
          circuitState.failures = 0;
          this.circuitBreakers.set(operation, circuitState);
        }
        
        console.log(`[INFO] Hardware recovery successful: ${operation}`);
        return true;
      }
    } catch (recoveryError) {
      console.log(`[ERROR] Recovery attempt failed: ${operation} - ${recoveryError.message}`);
    }
    
    return false;
  }
  
  /**
   * Perform basic health check
   */
  private async performHealthCheck(): Promise<boolean> {
    // This should be implemented to test actual hardware communication
    // For now, return true as placeholder
    return true;
  }
  
  /**
   * Detect system anomalies
   */
  async detectAnomalies(): Promise<StateAnomaly[]> {
    const anomalies: StateAnomaly[] = [];
    const now = Date.now();
    
    try {
      // 1. Communication timeout detection
      const responseTime = await this.measureResponseTime();
      if (responseTime > this.config.slowResponseThreshold) {
        anomalies.push({
          type: 'SLOW_RESPONSE',
          severity: 'WARNING',
          details: `Response time: ${responseTime}ms exceeds threshold: ${this.config.slowResponseThreshold}ms`,
          timestamp: now,
          metadata: { responseTime, threshold: this.config.slowResponseThreshold }
        });
      }
      
      // 2. Circuit breaker status check
      for (const [operation, circuit] of this.circuitBreakers) {
        if (circuit.state === 'open') {
          anomalies.push({
            type: 'COMMUNICATION_ERROR',
            severity: 'ERROR',
            details: `Circuit breaker open for operation: ${operation}`,
            timestamp: now,
            metadata: { operation, failures: circuit.failures }
          });
        }
      }
      
      // 3. Resource usage monitoring
      if (this.config.resourceUsageMonitoring) {
        const resourceIssues = await this.checkResourceUsage();
        anomalies.push(...resourceIssues);
      }
      
    } catch (error) {
      console.log(`[ERROR] Anomaly detection failed: ${error.message}`);
      
      anomalies.push({
        type: 'COMMUNICATION_ERROR',
        severity: 'ERROR',
        details: `Anomaly detection failed: ${error.message}`,
        timestamp: now,
        metadata: { error: error.message }
      });
    }
    
    return anomalies;
  }
  
  /**
   * Measure response time for performance monitoring
   */
  private async measureResponseTime(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate hardware communication time measurement
      await this.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      // Keep history for trending
      this.responseTimeHistory.push(responseTime);
      if (this.responseTimeHistory.length > 100) {
        this.responseTimeHistory.shift(); // Keep only last 100 measurements
      }
      
      return responseTime;
    } catch (error) {
      return Date.now() - startTime;
    }
  }
  
  /**
   * Check resource usage and detect issues
   */
  private async checkResourceUsage(): Promise<StateAnomaly[]> {
    const anomalies: StateAnomaly[] = [];
    const now = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Check memory usage (warning if > 100MB, error if > 500MB)
      const memoryMB = memoryUsage.heapUsed / (1024 * 1024);
      if (memoryMB > 500) {
        anomalies.push({
          type: 'RESOURCE_ISSUE',
          severity: 'ERROR',
          details: `High memory usage: ${memoryMB.toFixed(2)}MB`,
          timestamp: now,
          metadata: { memoryMB, heapUsed: memoryUsage.heapUsed }
        });
      } else if (memoryMB > 100) {
        anomalies.push({
          type: 'RESOURCE_ISSUE',
          severity: 'WARNING',
          details: `Elevated memory usage: ${memoryMB.toFixed(2)}MB`,
          timestamp: now,
          metadata: { memoryMB, heapUsed: memoryUsage.heapUsed }
        });
      }
      
    } catch (error) {
      anomalies.push({
        type: 'RESOURCE_ISSUE',
        severity: 'WARNING',
        details: `Resource monitoring failed: ${error.message}`,
        timestamp: now,
        metadata: { error: error.message }
      });
    }
    
    return anomalies;
  }
  
  /**
   * Detect state inconsistencies between hardware and database
   */
  async detectStateInconsistencies(hardwareStates: any[], dbStates: any[]): Promise<StateAnomaly[]> {
    const anomalies: StateAnomaly[] = [];
    const now = Date.now();
    
    if (!this.config.stateInconsistencyCheck) {
      return anomalies;
    }
    
    for (let i = 0; i < Math.min(hardwareStates.length, dbStates.length); i++) {
      const hardwareState = hardwareStates[i];
      const dbState = dbStates[i];
      
      if (hardwareState && dbState) {
        // Check for mismatches that shouldn't occur
        if (hardwareState.isLocked !== dbState.occupied) {
          anomalies.push({
            type: 'STATE_INCONSISTENCY',
            severity: 'WARNING',
            details: `Slot ${i + 1}: Hardware locked=${hardwareState.isLocked}, DB occupied=${dbState.occupied}`,
            timestamp: now,
            metadata: {
              slotId: i + 1,
              hardwareLocked: hardwareState.isLocked,
              dbOccupied: dbState.occupied
            }
          });
        }
      }
    }
    
    return anomalies;
  }
  
  /**
   * Reset failure tracking for an operation
   */
  resetFailureTracking(operation: string): void {
    this.consecutiveFailures.delete(operation);
    this.lastFailureTime.delete(operation);
    
    const circuitState = this.circuitBreakers.get(operation);
    if (circuitState) {
      circuitState.state = 'closed';
      circuitState.failures = 0;
      this.circuitBreakers.set(operation, circuitState);
    }
    
    console.log(`[INFO] Failure tracking reset for operation: ${operation}`);
  }
  
  /**
   * Get current failure statistics
   */
  getFailureStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [operation, failures] of this.consecutiveFailures) {
      const circuitState = this.circuitBreakers.get(operation);
      const lastFailure = this.lastFailureTime.get(operation);
      
      stats[operation] = {
        failures,
        circuitState: circuitState?.state || 'closed',
        lastFailureTime: lastFailure,
        timeSinceLastFailure: lastFailure ? Date.now() - lastFailure : null
      };
    }
    
    return {
      operationStats: stats,
      responseTimeStats: {
        count: this.responseTimeHistory.length,
        average: this.responseTimeHistory.length > 0 
          ? this.responseTimeHistory.reduce((a, b) => a + b, 0) / this.responseTimeHistory.length 
          : 0,
        latest: this.responseTimeHistory[this.responseTimeHistory.length - 1] || 0
      }
    };
  }
  
  /**
   * Generate monitoring report
   */
  async generateMonitoringReport(): Promise<{
    anomalies: StateAnomaly[];
    failureStats: Record<string, any>;
    systemHealth: 'healthy' | 'warning' | 'error';
    recommendations: string[];
  }> {
    const anomalies = await this.detectAnomalies();
    const failureStats = this.getFailureStatistics();
    
    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy';
    const recommendations: string[] = [];
    
    const errorAnomalies = anomalies.filter(a => a.severity === 'ERROR' || a.severity === 'CRITICAL');
    const warningAnomalies = anomalies.filter(a => a.severity === 'WARNING');
    
    if (errorAnomalies.length > 0) {
      systemHealth = 'error';
      recommendations.push('Immediate attention required for critical errors');
    } else if (warningAnomalies.length > 0) {
      systemHealth = 'warning';
      recommendations.push('Monitor warning conditions closely');
    }
    
    // Add specific recommendations
    if (anomalies.some(a => a.type === 'SLOW_RESPONSE')) {
      recommendations.push('Consider optimizing hardware communication or checking network connectivity');
    }
    
    if (anomalies.some(a => a.type === 'RESOURCE_ISSUE')) {
      recommendations.push('Monitor memory usage and consider restarting application if issues persist');
    }
    
    return {
      anomalies,
      failureStats,
      systemHealth,
      recommendations
    };
  }
  
  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}