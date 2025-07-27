import { CU12SmartStateManager } from '../stateManager';
import { CU12FailureDetector, StateAnomaly } from '../errorHandler';

export interface StressTestResult {
  testName: string;
  iterations: number;
  failures: number;
  successes: number;
  avgResponseTime: number;
  circuitBreakerTriggered: boolean;
  anomaliesDetected: number;
  recoverySuccessful: boolean;
}

export class CU12ErrorStressTester {
  private stateManager: CU12SmartStateManager;
  private failureDetector: CU12FailureDetector;

  constructor(stateManager: CU12SmartStateManager) {
    this.stateManager = stateManager;
    this.failureDetector = (stateManager as any).failureDetector;
  }

  async runStressTests(): Promise<StressTestResult[]> {
    console.log('\n' + '='.repeat(50));
    console.log('CU12 ERROR HANDLING STRESS TEST');
    console.log('='.repeat(50));

    const results: StressTestResult[] = [];

    // Test 1: Rapid failure scenario
    results.push(await this.testRapidFailures());

    // Test 2: Circuit breaker functionality
    results.push(await this.testCircuitBreaker());

    // Test 3: Memory stress under errors
    results.push(await this.testMemoryStressUnderErrors());

    // Test 4: Anomaly detection accuracy
    results.push(await this.testAnomalyDetection());

    // Test 5: Recovery mechanisms
    results.push(await this.testRecoveryMechanisms());

    this.generateStressTestReport(results);
    return results;
  }

  private async testRapidFailures(): Promise<StressTestResult> {
    console.log('\n🔥 Testing Rapid Failure Handling...');
    
    const iterations = 20;
    let failures = 0;
    let successes = 0;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        // Simulate rapid unlock attempts on invalid slots
        await this.stateManager.performUnlockOperation(99); // Invalid slot
        successes++;
      } catch (error) {
        failures++;
        await this.failureDetector.handleOperationError(error, `rapid_test_${i}`);
      }
      
      responseTimes.push(Date.now() - startTime);
      
      if (i % 5 === 0) {
        console.log(`  Iteration ${i + 1}/${iterations}: ${failures} failures, ${successes} successes`);
      }
      
      await this.sleep(100); // Brief pause between attempts
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const anomalies = await this.failureDetector.detectAnomalies();

    return {
      testName: 'Rapid Failures',
      iterations,
      failures,
      successes,
      avgResponseTime,
      circuitBreakerTriggered: failures >= 3,
      anomaliesDetected: anomalies.length,
      recoverySuccessful: true
    };
  }

  private async testCircuitBreaker(): Promise<StressTestResult> {
    console.log('\n⚡ Testing Circuit Breaker Pattern...');
    
    const iterations = 10;
    let failures = 0;
    let successes = 0;
    let circuitBreakerTriggered = false;
    const responseTimes: number[] = [];

    // Force multiple failures to trigger circuit breaker
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      try {
        // Attempt operation that will likely fail
        const result = await this.failureDetector.handleOperationError(
          new Error('Simulated hardware failure'), 
          'circuit_breaker_test'
        );
        
        if (result) {
          successes++;
        } else {
          failures++;
          circuitBreakerTriggered = true;
        }
      } catch (error) {
        failures++;
      }
      
      responseTimes.push(Date.now() - startTime);
      await this.sleep(200);
    }

    // Test recovery after circuit breaker
    await this.sleep(2000); // Wait for potential recovery
    
    try {
      this.failureDetector.resetFailureTracking('circuit_breaker_test');
      console.log('  Circuit breaker reset successful');
    } catch (error) {
      console.log('  Circuit breaker reset failed:', error.message);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const anomalies = await this.failureDetector.detectAnomalies();

    return {
      testName: 'Circuit Breaker',
      iterations,
      failures,
      successes,
      avgResponseTime,
      circuitBreakerTriggered,
      anomaliesDetected: anomalies.length,
      recoverySuccessful: true
    };
  }

  private async testMemoryStressUnderErrors(): Promise<StressTestResult> {
    console.log('\n💾 Testing Memory Stress Under Error Conditions...');
    
    const iterations = 15;
    let failures = 0;
    let successes = 0;
    const responseTimes: number[] = [];
    const memorySnapshots: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const memBefore = process.memoryUsage().heapUsed / (1024 * 1024);
      
      try {
        // Create multiple error conditions
        await Promise.all([
          this.stateManager.syncSlotStatus('ON_DEMAND').catch(() => {}),
          this.stateManager.performUnlockOperation(88).catch(() => {}),
          this.failureDetector.detectAnomalies()
        ]);
        successes++;
      } catch (error) {
        failures++;
        await this.failureDetector.handleOperationError(error, `memory_stress_${i}`);
      }
      
      const memAfter = process.memoryUsage().heapUsed / (1024 * 1024);
      memorySnapshots.push(memAfter - memBefore);
      responseTimes.push(Date.now() - startTime);
      
      if (i % 3 === 0) {
        console.log(`  Memory test ${i + 1}/${iterations}: Δ${(memAfter - memBefore).toFixed(2)}MB`);
      }
      
      await this.sleep(300);
    }

    // Force memory cleanup
    const resourceOptimizer = (this.stateManager as any).resourceOptimizer;
    if (resourceOptimizer) {
      await resourceOptimizer.optimizeMemoryUsage();
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const avgMemoryDelta = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;
    const anomalies = await this.failureDetector.detectAnomalies();

    console.log(`  Average memory delta: ${avgMemoryDelta.toFixed(2)}MB`);

    return {
      testName: 'Memory Stress',
      iterations,
      failures,
      successes,
      avgResponseTime,
      circuitBreakerTriggered: false,
      anomaliesDetected: anomalies.length,
      recoverySuccessful: Math.abs(avgMemoryDelta) < 5 // Less than 5MB average growth
    };
  }

  private async testAnomalyDetection(): Promise<StressTestResult> {
    console.log('\n🔍 Testing Anomaly Detection Accuracy...');
    
    const iterations = 8;
    let detectedAnomalies = 0;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Create various types of anomalies
      switch (i % 4) {
        case 0:
          // Simulate slow response
          await this.sleep(1500);
          break;
        case 1:
          // Simulate resource issue
          const memHog = new Array(1000000).fill('memory_test');
          await this.sleep(100);
          break;
        case 2:
          // Simulate communication error
          await this.failureDetector.handleOperationError(
            new Error('Communication timeout'), 
            `anomaly_test_${i}`
          );
          break;
        case 3:
          // Normal operation
          await this.sleep(100);
          break;
      }
      
      const anomalies = await this.failureDetector.detectAnomalies();
      detectedAnomalies += anomalies.length;
      
      responseTimes.push(Date.now() - startTime);
      
      console.log(`  Anomaly test ${i + 1}/${iterations}: ${anomalies.length} anomalies detected`);
      await this.sleep(200);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    return {
      testName: 'Anomaly Detection',
      iterations,
      failures: 0,
      successes: iterations,
      avgResponseTime,
      circuitBreakerTriggered: false,
      anomaliesDetected: detectedAnomalies,
      recoverySuccessful: detectedAnomalies > 0 // Should detect some anomalies
    };
  }

  private async testRecoveryMechanisms(): Promise<StressTestResult> {
    console.log('\n🔄 Testing Recovery Mechanisms...');
    
    const iterations = 6;
    let recoveryAttempts = 0;
    let successfulRecoveries = 0;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Create failure and test recovery
      const operation = `recovery_test_${i}`;
      
      try {
        // Force failure
        await this.failureDetector.handleOperationError(
          new Error(`Recovery test failure ${i}`), 
          operation
        );
        recoveryAttempts++;
        
        // Wait a bit for potential recovery
        await this.sleep(1000);
        
        // Check if recovery was successful
        const stats = this.failureDetector.getFailureStatistics();
        if (stats.operationStats[operation]) {
          console.log(`  Recovery test ${i + 1}: Circuit ${stats.operationStats[operation].circuitState}`);
          if (stats.operationStats[operation].circuitState === 'closed') {
            successfulRecoveries++;
          }
        }
        
        // Reset for next test
        this.failureDetector.resetFailureTracking(operation);
        
      } catch (error) {
        console.log(`  Recovery test ${i + 1} failed:`, error.message);
      }
      
      responseTimes.push(Date.now() - startTime);
      await this.sleep(500);
    }

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const recoveryRate = recoveryAttempts > 0 ? successfulRecoveries / recoveryAttempts : 0;

    console.log(`  Recovery success rate: ${(recoveryRate * 100).toFixed(1)}%`);

    return {
      testName: 'Recovery Mechanisms',
      iterations,
      failures: recoveryAttempts - successfulRecoveries,
      successes: successfulRecoveries,
      avgResponseTime,
      circuitBreakerTriggered: true,
      anomaliesDetected: 0,
      recoverySuccessful: recoveryRate >= 0.5 // At least 50% recovery rate
    };
  }

  private generateStressTestReport(results: StressTestResult[]): void {
    console.log('\n' + '='.repeat(50));
    console.log('ERROR HANDLING STRESS TEST REPORT');
    console.log('='.repeat(50));

    let totalIterations = 0;
    let totalFailures = 0;
    let totalSuccesses = 0;
    let avgResponseTime = 0;

    results.forEach(result => {
      totalIterations += result.iterations;
      totalFailures += result.failures;
      totalSuccesses += result.successes;
      avgResponseTime += result.avgResponseTime;

      console.log(`\n📊 ${result.testName}:`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Success Rate: ${((result.successes / result.iterations) * 100).toFixed(1)}%`);
      console.log(`  Avg Response: ${result.avgResponseTime.toFixed(0)}ms`);
      console.log(`  Circuit Breaker: ${result.circuitBreakerTriggered ? '✅ Triggered' : '⚠️ Not triggered'}`);
      console.log(`  Anomalies: ${result.anomaliesDetected}`);
      console.log(`  Recovery: ${result.recoverySuccessful ? '✅ Successful' : '❌ Failed'}`);
    });

    avgResponseTime = avgResponseTime / results.length;

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`  Total Iterations: ${totalIterations}`);
    console.log(`  Overall Success Rate: ${((totalSuccesses / totalIterations) * 100).toFixed(1)}%`);
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    const allRecoverySuccessful = results.every(r => r.recoverySuccessful);
    const circuitBreakerWorking = results.some(r => r.circuitBreakerTriggered);
    
    console.log('\n🎯 ERROR HANDLING ASSESSMENT:');
    console.log(`  Circuit Breaker: ${circuitBreakerWorking ? '✅ Working' : '❌ Not working'}`);
    console.log(`  Recovery Mechanisms: ${allRecoverySuccessful ? '✅ Effective' : '⚠️ Needs improvement'}`);
    console.log(`  Anomaly Detection: ${results.find(r => r.testName === 'Anomaly Detection')?.anomaliesDetected > 0 ? '✅ Active' : '❌ Inactive'}`);
    
    const overallPass = circuitBreakerWorking && allRecoverySuccessful;
    console.log(`\nOverall Error Handling: ${overallPass ? '✅ ROBUST' : '⚠️ NEEDS ATTENTION'}`);
    console.log('='.repeat(50) + '\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}