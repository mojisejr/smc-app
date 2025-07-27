import { CU12SmartStateManager } from '../stateManager';
import { CU12MonitoringConfig } from '../monitoringConfig';

export interface PerformanceMetrics {
  cpuUsage: {
    idle: number;
    active: number;
    operation: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  modeSwitching: {
    idleToActive: number;
    activeToOperation: number;
    operationToActive: number;
    activeToIdle: number;
  };
  cacheEfficiency: {
    hitRate: number;
    entryCount: number;
    cleanupFrequency: number;
  };
  timestamps: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export class CU12PerformanceValidator {
  private stateManager: CU12SmartStateManager;
  private performanceData: PerformanceMetrics;
  private cpuUsageHistory: number[] = [];
  private memoryUsageHistory: any[] = [];
  private startTime: number = 0;

  constructor(stateManager: CU12SmartStateManager) {
    this.stateManager = stateManager;
    this.performanceData = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      cpuUsage: { idle: 0, active: 0, operation: 0 },
      memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      modeSwitching: { idleToActive: 0, activeToOperation: 0, operationToActive: 0, activeToIdle: 0 },
      cacheEfficiency: { hitRate: 0, entryCount: 0, cleanupFrequency: 0 },
      timestamps: { startTime: 0, endTime: 0, duration: 0 }
    };
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(): Promise<void> {
    this.startTime = Date.now();
    this.performanceData.timestamps.startTime = this.startTime;
    
    console.log('[PERF] Starting CU12 performance validation...');
    console.log('[PERF] Target: <5% CPU idle, <15% active, <100ms mode switching');
  }

  /**
   * Measure CPU usage in idle mode
   */
  async measureIdleCpuUsage(durationMs: number = 30000): Promise<number> {
    console.log('[PERF] Measuring idle CPU usage for', durationMs / 1000, 'seconds...');
    
    // Ensure we're in idle mode
    const initialMode = this.stateManager.getMonitoringMode();
    if (initialMode !== 'idle') {
      await this.stateManager.startIdleMode();
      await this.waitForMode('idle', 5000);
    }

    const measurements: number[] = [];
    const interval = 1000; // Measure every second
    const iterations = Math.floor(durationMs / interval);

    for (let i = 0; i < iterations; i++) {
      const startUsage = process.cpuUsage();
      await this.sleep(interval);
      const endUsage = process.cpuUsage(startUsage);
      
      // Calculate CPU percentage
      const totalUsage = endUsage.user + endUsage.system;
      const cpuPercent = (totalUsage / (interval * 1000)) * 100; // Convert to percentage
      
      measurements.push(cpuPercent);
      
      if (i % 5 === 0) {
        console.log(`[PERF] Idle CPU sample ${i + 1}/${iterations}: ${cpuPercent.toFixed(2)}%`);
      }
    }

    const avgCpuUsage = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    this.performanceData.cpuUsage.idle = avgCpuUsage;
    
    console.log(`[PERF] Idle CPU Usage: ${avgCpuUsage.toFixed(2)}% (Target: <5%)`);
    console.log(`[PERF] Idle Mode Status: ${avgCpuUsage < 5 ? '✅ PASS' : '❌ FAIL'}`);
    
    return avgCpuUsage;
  }

  /**
   * Measure CPU usage in active mode
   */
  async measureActiveCpuUsage(durationMs: number = 20000): Promise<number> {
    console.log('[PERF] Measuring active CPU usage for', durationMs / 1000, 'seconds...');
    
    // Trigger user interaction to enter active mode
    await this.stateManager.onUserInteraction();
    await this.waitForMode('active', 3000);

    const measurements: number[] = [];
    const interval = 1000;
    const iterations = Math.floor(durationMs / interval);

    for (let i = 0; i < iterations; i++) {
      const startUsage = process.cpuUsage();
      
      // Simulate user activity every few seconds
      if (i % 3 === 0) {
        await this.stateManager.onUserInteraction();
      }
      
      await this.sleep(interval);
      const endUsage = process.cpuUsage(startUsage);
      
      const totalUsage = endUsage.user + endUsage.system;
      const cpuPercent = (totalUsage / (interval * 1000)) * 100;
      
      measurements.push(cpuPercent);
      
      if (i % 3 === 0) {
        console.log(`[PERF] Active CPU sample ${i + 1}/${iterations}: ${cpuPercent.toFixed(2)}%`);
      }
    }

    const avgCpuUsage = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    this.performanceData.cpuUsage.active = avgCpuUsage;
    
    console.log(`[PERF] Active CPU Usage: ${avgCpuUsage.toFixed(2)}% (Target: <15%)`);
    console.log(`[PERF] Active Mode Status: ${avgCpuUsage < 15 ? '✅ PASS' : '❌ FAIL'}`);
    
    return avgCpuUsage;
  }

  /**
   * Measure mode switching performance
   */
  async measureModeSwitching(): Promise<{ [key: string]: number }> {
    console.log('[PERF] Measuring mode switching performance...');
    
    const results: { [key: string]: number } = {};

    // Idle to Active
    await this.stateManager.startIdleMode();
    await this.waitForMode('idle', 2000);
    const idleToActiveStart = Date.now();
    await this.stateManager.onUserInteraction();
    await this.waitForMode('active', 2000);
    results.idleToActive = Date.now() - idleToActiveStart;

    // Active to Operation
    const activeToOpStart = Date.now();
    await this.stateManager.enterOperationMode('test_operation');
    await this.waitForMode('operation', 2000);
    results.activeToOperation = Date.now() - activeToOpStart;

    // Operation to Active
    const opToActiveStart = Date.now();
    await this.stateManager.exitOperationMode();
    await this.waitForMode('active', 2000);
    results.operationToActive = Date.now() - opToActiveStart;

    // Active to Idle (wait for timeout)
    const activeToIdleStart = Date.now();
    // Don't trigger user interaction, let it timeout naturally
    await this.sleep(3000); // Wait a bit longer than timeout
    results.activeToIdle = Date.now() - activeToIdleStart;

    this.performanceData.modeSwitching = {
      idleToActive: results.idleToActive,
      activeToOperation: results.activeToOperation,
      operationToActive: results.operationToActive,
      activeToIdle: results.activeToIdle
    };

    console.log('[PERF] Mode Switching Results:');
    console.log(`  Idle → Active: ${results.idleToActive}ms (Target: <100ms) ${results.idleToActive < 100 ? '✅' : '❌'}`);
    console.log(`  Active → Operation: ${results.activeToOperation}ms (Target: <100ms) ${results.activeToOperation < 100 ? '✅' : '❌'}`);
    console.log(`  Operation → Active: ${results.operationToActive}ms (Target: <100ms) ${results.operationToActive < 100 ? '✅' : '❌'}`);
    console.log(`  Active → Idle: ${results.activeToIdle}ms (Timeout-based)`);

    return results;
  }

  /**
   * Measure memory usage and validate leak prevention
   */
  async measureMemoryUsage(durationMs: number = 15000): Promise<any> {
    console.log('[PERF] Measuring memory usage for', durationMs / 1000, 'seconds...');
    
    const measurements: any[] = [];
    const interval = 3000; // Every 3 seconds
    const iterations = Math.floor(durationMs / interval);

    for (let i = 0; i < iterations; i++) {
      const memUsage = process.memoryUsage();
      measurements.push({
        timestamp: Date.now(),
        heapUsed: memUsage.heapUsed / (1024 * 1024), // MB
        heapTotal: memUsage.heapTotal / (1024 * 1024), // MB
        external: memUsage.external / (1024 * 1024), // MB
        rss: memUsage.rss / (1024 * 1024) // MB
      });

      // Simulate some activity to test memory management
      if (i % 2 === 0) {
        await this.stateManager.onUserInteraction();
        await this.stateManager.syncSlotStatus('ON_DEMAND');
      }

      console.log(`[PERF] Memory sample ${i + 1}/${iterations}: Heap ${measurements[i].heapUsed.toFixed(1)}MB`);
      await this.sleep(interval);
    }

    // Check for memory leaks (heap should not grow continuously)
    const startHeap = measurements[0].heapUsed;
    const endHeap = measurements[measurements.length - 1].heapUsed;
    const memoryGrowth = endHeap - startHeap;
    const avgHeapUsed = measurements.reduce((sum, m) => sum + m.heapUsed, 0) / measurements.length;

    this.performanceData.memoryUsage = {
      heapUsed: avgHeapUsed,
      heapTotal: measurements[measurements.length - 1].heapTotal,
      external: measurements[measurements.length - 1].external,
      rss: measurements[measurements.length - 1].rss
    };

    console.log('[PERF] Memory Analysis:');
    console.log(`  Average Heap Used: ${avgHeapUsed.toFixed(1)}MB`);
    console.log(`  Memory Growth: ${memoryGrowth > 0 ? '+' : ''}${memoryGrowth.toFixed(1)}MB`);
    console.log(`  Leak Detection: ${Math.abs(memoryGrowth) < 10 ? '✅ No significant growth' : '❌ Potential leak detected'}`);

    this.memoryUsageHistory = measurements;
    return measurements;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<PerformanceMetrics> {
    this.performanceData.timestamps.endTime = Date.now();
    this.performanceData.timestamps.duration = this.performanceData.timestamps.endTime - this.performanceData.timestamps.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('CU12 PERFORMANCE VALIDATION REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📊 CPU USAGE METRICS:');
    console.log(`  Idle Mode: ${this.performanceData.cpuUsage.idle.toFixed(2)}% ${this.performanceData.cpuUsage.idle < 5 ? '✅ PASS' : '❌ FAIL'} (Target: <5%)`);
    console.log(`  Active Mode: ${this.performanceData.cpuUsage.active.toFixed(2)}% ${this.performanceData.cpuUsage.active < 15 ? '✅ PASS' : '❌ FAIL'} (Target: <15%)`);
    
    console.log('\n⚡ MODE SWITCHING PERFORMANCE:');
    console.log(`  Idle → Active: ${this.performanceData.modeSwitching.idleToActive}ms ${this.performanceData.modeSwitching.idleToActive < 100 ? '✅' : '❌'}`);
    console.log(`  Active → Operation: ${this.performanceData.modeSwitching.activeToOperation}ms ${this.performanceData.modeSwitching.activeToOperation < 100 ? '✅' : '❌'}`);
    console.log(`  Operation → Active: ${this.performanceData.modeSwitching.operationToActive}ms ${this.performanceData.modeSwitching.operationToActive < 100 ? '✅' : '❌'}`);
    
    console.log('\n💾 MEMORY USAGE:');
    console.log(`  Average Heap: ${this.performanceData.memoryUsage.heapUsed.toFixed(1)}MB`);
    console.log(`  Total RSS: ${this.performanceData.memoryUsage.rss.toFixed(1)}MB`);
    
    console.log('\n⏱️ TEST DURATION:');
    console.log(`  Total Time: ${(this.performanceData.timestamps.duration / 1000).toFixed(1)}s`);
    
    const overallPass = 
      this.performanceData.cpuUsage.idle < 5 &&
      this.performanceData.cpuUsage.active < 15 &&
      this.performanceData.modeSwitching.idleToActive < 100 &&
      this.performanceData.modeSwitching.activeToOperation < 100 &&
      this.performanceData.modeSwitching.operationToActive < 100;
    
    console.log('\n🎯 OVERALL RESULT:');
    console.log(`  ${overallPass ? '✅ ALL PERFORMANCE TARGETS MET' : '❌ SOME TARGETS NOT MET'}`);
    console.log('='.repeat(60) + '\n');

    return this.performanceData;
  }

  /**
   * Run complete performance validation suite
   */
  async runCompleteValidation(): Promise<PerformanceMetrics> {
    await this.startMonitoring();
    
    try {
      // Test idle mode CPU usage
      await this.measureIdleCpuUsage(30000); // 30 seconds
      
      // Test active mode CPU usage  
      await this.measureActiveCpuUsage(20000); // 20 seconds
      
      // Test mode switching performance
      await this.measureModeSwitching();
      
      // Test memory usage and leak prevention
      await this.measureMemoryUsage(15000); // 15 seconds
      
      // Generate final report
      return await this.generatePerformanceReport();
      
    } catch (error) {
      console.error('[PERF] Performance validation failed:', error.message);
      throw error;
    }
  }

  // Helper methods
  private async waitForMode(expectedMode: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.stateManager.getMonitoringMode() === expectedMode) {
        return;
      }
      await this.sleep(100);
    }
    throw new Error(`Timeout waiting for mode: ${expectedMode}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}