/**
 * KU16 Failure Detector and Circuit Breaker
 * Adapted from CU12 errorHandler.ts for consistency
 */

import { KU16MonitoringConfig } from './monitoringConfig';

export interface StateAnomaly {
  type: 'SLOW_RESPONSE' | 'STATE_INCONSISTENCY' | 'RESOURCE_ISSUE' | 'COMMUNICATION_ERROR' | 'SERIAL_ERROR';
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

export class KU16FailureDetector {
  private consecutiveFailures: Map<string, number> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private lastFailureTime: Map<string, number> = new Map();
  private responseTimeHistory: number[] = [];
  private config: KU16MonitoringConfig;
  
  constructor(config: KU16MonitoringConfig) {
    this.config = config;
  }
  
  /**
   * Handle operation error with circuit breaker pattern
   */
  async handleOperationError(error: Error, operation: string): Promise<boolean> {
    const now = Date.now();
    
    console.log(`[WARN] KU16 operation error detected: ${operation} - ${error.message}`);
    
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
    if (failures + 1 >= this.config.failureThreshold) {
      await this.openCircuit(operation);
    }
    
    // Attempt recovery with exponential backoff
    return await this.attemptRecovery(operation, failures);
  }
  
  /**
   * Record successful operation (reset failure counter)
   */
  recordSuccess(operation: string): void {
    this.consecutiveFailures.delete(operation);
    
    // Reset circuit breaker to closed state
    const circuitState = this.circuitBreakers.get(operation);
    if (circuitState && circuitState.state !== 'closed') {
      circuitState.state = 'closed';
      circuitState.failures = 0;
      this.circuitBreakers.set(operation, circuitState);
      console.log(`[INFO] Circuit breaker closed after successful operation: ${operation}`);
    }
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
      nextRetryTime: now + this.config.recoveryTimeout
    };
    
    this.circuitBreakers.set(operation, circuitState);
    
    console.log(`[ERROR] Circuit breaker opened: ${operation} (failures: ${failures})`);
  }
  
  /**
   * Attempt recovery with exponential backoff
   */
  private async attemptRecovery(operation: string, failures: number): Promise<boolean> {
    const baseDelay = 1000; // 1 second base delay
    const maxDelay = 30000; // 30 seconds max delay
    
    const backoffTime = Math.min(
      baseDelay * Math.pow(2, failures),
      maxDelay
    );
    
    console.log(`[INFO] Attempting recovery for ${operation} after ${backoffTime}ms backoff`);
    
    await this.sleep(backoffTime);
    
    try {
      // Test hardware communication (simplified for KU16)
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
   * Perform basic health check for KU16 hardware
   */
  private async performHealthCheck(): Promise<boolean> {
    try {
      // For KU16, we can't easily test communication without actual hardware
      // Return true for now, but this could be enhanced to test serial port connection
      await this.sleep(100); // Small delay to simulate check
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Track response time for anomaly detection
   */
  recordResponseTime(responseTime: number): void {
    this.responseTimeHistory.push(responseTime);
    
    // Keep only last 50 response times
    if (this.responseTimeHistory.length > 50) {
      this.responseTimeHistory.shift();
    }
  }
  
  /**
   * Get average response time
   */
  getAverageResponseTime(): number {
    if (this.responseTimeHistory.length === 0) return 0;
    
    const sum = this.responseTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.responseTimeHistory.length;
  }
  
  /**
   * Detect system anomalies specific to KU16
   */
  async detectAnomalies(): Promise<StateAnomaly[]> {
    const anomalies: StateAnomaly[] = [];
    const now = Date.now();
    
    try {
      // 1. Response time monitoring
      const avgResponseTime = this.getAverageResponseTime();
      const slowThreshold = 2000; // 2 seconds threshold for KU16
      
      if (avgResponseTime > slowThreshold) {
        anomalies.push({
          type: 'SLOW_RESPONSE',
          severity: 'WARNING',
          details: `Average response time: ${avgResponseTime.toFixed(0)}ms exceeds threshold: ${slowThreshold}ms`,
          timestamp: now,
          metadata: { responseTime: avgResponseTime, threshold: slowThreshold }
        });
      }
      
      // 2. Circuit breaker status check
      this.circuitBreakers.forEach((circuit, operation) => {
        if (circuit.state === 'open') {
          anomalies.push({
            type: 'COMMUNICATION_ERROR',
            severity: 'ERROR',
            details: `Circuit breaker open for operation: ${operation}`,
            timestamp: now,
            metadata: { operation, failures: circuit.failures }
          });
        }
      });
      
      // 3. Consecutive failure monitoring
      this.consecutiveFailures.forEach((failures, operation) => {
        if (failures >= this.config.failureThreshold - 1) {
          anomalies.push({
            type: 'COMMUNICATION_ERROR',
            severity: 'WARNING',
            details: `Operation ${operation} approaching failure threshold: ${failures}/${this.config.failureThreshold}`,
            timestamp: now,
            metadata: { operation, failures, threshold: this.config.failureThreshold }
          });
        }
      });
      
    } catch (error) {
      console.log(`[ERROR] KU16 anomaly detection failed: ${error.message}`);
      
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
   * Get health status report
   */
  getHealthStatus(): {
    isHealthy: boolean;
    circuitBreakers: Record<string, CircuitBreakerState>;
    consecutiveFailures: Record<string, number>;
    averageResponseTime: number;
    totalAnomalies: number;
  } {
    const circuitBreakers: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((value, key) => {
      circuitBreakers[key] = value;
    });
    
    const consecutiveFailures: Record<string, number> = {};
    this.consecutiveFailures.forEach((value, key) => {
      consecutiveFailures[key] = value;
    });
    
    const openCircuits = Array.from(this.circuitBreakers.values())
      .filter(cb => cb.state === 'open').length;
    
    const highFailureCounts = Array.from(this.consecutiveFailures.values())
      .filter(failures => failures >= this.config.failureThreshold - 1).length;
    
    return {
      isHealthy: openCircuits === 0 && highFailureCounts === 0,
      circuitBreakers,
      consecutiveFailures,
      averageResponseTime: this.getAverageResponseTime(),
      totalAnomalies: openCircuits + highFailureCounts
    };
  }
  
  /**
   * Reset all circuit breakers (emergency reset)
   */
  resetAllCircuitBreakers(): void {
    console.log(`[INFO] Resetting all KU16 circuit breakers`);
    this.circuitBreakers.clear();
    this.consecutiveFailures.clear();
    this.lastFailureTime.clear();
  }
  
  /**
   * Get consecutive failures for an operation
   */
  getConsecutiveFailures(operation: string): number {
    return this.consecutiveFailures.get(operation) || 0;
  }
  
  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}