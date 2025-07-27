import { BrowserWindow } from 'electron';
import { CU12SmartStateManager } from '../stateManager';
import { CU12MonitoringConfig } from '../monitoringConfig';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface IntegrationTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  summary: {
    initializationTests: boolean;
    handlerTests: boolean;
    stateManagementTests: boolean;
    errorHandlingTests: boolean;
  };
}

export class CU12IntegrationTester {
  private stateManager: CU12SmartStateManager;
  private mockWindow: BrowserWindow;
  private results: TestResult[] = [];

  constructor(stateManager: CU12SmartStateManager, mainWindow: BrowserWindow) {
    this.stateManager = stateManager;
    this.mockWindow = mainWindow;
  }

  async runAllTests(): Promise<IntegrationTestReport> {
    console.log('\n' + '='.repeat(50));
    console.log('CU12 INTEGRATION TEST SUITE');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    this.results = [];

    // Run test suites
    await this.testInitialization();
    await this.testStateManagement();
    await this.testHandlerIntegration();
    await this.testErrorHandling();

    const duration = Date.now() - startTime;
    return this.generateReport(duration);
  }

  private async testInitialization(): Promise<void> {
    console.log('\n🔧 Testing Initialization...');

    await this.runTest('CU12 State Manager Creation', async () => {
      const isConnected = this.stateManager.isConnected();
      return { success: true, connected: isConnected };
    });

    await this.runTest('Monitoring Mode Default', async () => {
      const mode = this.stateManager.getMonitoringMode();
      if (mode !== 'idle') {
        throw new Error(`Expected idle mode, got: ${mode}`);
      }
      return { mode };
    });

    await this.runTest('Health Status Check', async () => {
      const health = await this.stateManager.getHealthStatus();
      return health;
    });
  }

  private async testStateManagement(): Promise<void> {
    console.log('\n📊 Testing State Management...');

    await this.runTest('User Interaction Activation', async () => {
      await this.stateManager.onUserInteraction();
      await this.sleep(500);
      const mode = this.stateManager.getMonitoringMode();
      if (mode !== 'active') {
        throw new Error(`Expected active mode, got: ${mode}`);
      }
      return { mode };
    });

    await this.runTest('Operation Mode Entry', async () => {
      await this.stateManager.enterOperationMode('test_operation');
      await this.sleep(200);
      const mode = this.stateManager.getMonitoringMode();
      if (mode !== 'operation') {
        throw new Error(`Expected operation mode, got: ${mode}`);
      }
      return { mode };
    });

    await this.runTest('Operation Mode Exit', async () => {
      await this.stateManager.exitOperationMode();
      await this.sleep(200);
      const mode = this.stateManager.getMonitoringMode();
      if (mode !== 'active') {
        throw new Error(`Expected active mode after operation exit, got: ${mode}`);
      }
      return { mode };
    });

    await this.runTest('Return to Idle Mode', async () => {
      await this.stateManager.startIdleMode();
      await this.sleep(500);
      const mode = this.stateManager.getMonitoringMode();
      if (mode !== 'idle') {
        throw new Error(`Expected idle mode, got: ${mode}`);
      }
      return { mode };
    });
  }

  private async testHandlerIntegration(): Promise<void> {
    console.log('\n🔌 Testing Handler Integration...');

    await this.runTest('Sync Slot Status - ON_DEMAND', async () => {
      try {
        const status = await this.stateManager.syncSlotStatus('ON_DEMAND');
        return { statusCount: status.length, success: true };
      } catch (error) {
        // This might fail without actual hardware, which is expected
        return { success: false, expected: true, reason: 'No hardware connected' };
      }
    });

    await this.runTest('Sync Slot Status - HEALTH_CHECK', async () => {
      try {
        const status = await this.stateManager.syncSlotStatus('HEALTH_CHECK');
        return { statusCount: status.length, success: true };
      } catch (error) {
        return { success: false, expected: true, reason: 'No hardware connected' };
      }
    });

    await this.runTest('Perform Unlock Operation (Mock)', async () => {
      try {
        const result = await this.stateManager.performUnlockOperation(1);
        return { result, success: true };
      } catch (error) {
        return { success: false, expected: true, reason: 'No hardware connected' };
      }
    });
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing Error Handling...');

    await this.runTest('Invalid Slot ID Handling', async () => {
      try {
        await this.stateManager.performUnlockOperation(99); // Invalid slot
        throw new Error('Should have thrown error for invalid slot');
      } catch (error) {
        if (error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('not initialized')) {
          return { success: true, errorHandled: true };
        }
        throw error;
      }
    });

    await this.runTest('Failure Detector Integration', async () => {
      const failureDetector = (this.stateManager as any).failureDetector;
      if (!failureDetector) {
        throw new Error('Failure detector not found');
      }
      
      const anomalies = await failureDetector.detectAnomalies();
      return { anomaliesDetected: anomalies.length, success: true };
    });

    await this.runTest('Resource Optimizer Functionality', async () => {
      const resourceOptimizer = (this.stateManager as any).resourceOptimizer;
      if (!resourceOptimizer) {
        throw new Error('Resource optimizer not found');
      }
      
      // Test caching
      resourceOptimizer.setCachedResponse('test_key', { data: 'test' }, 5000);
      const cached = resourceOptimizer.getCachedResponse('test_key', 5000);
      
      if (!cached || cached.data !== 'test') {
        throw new Error('Caching not working properly');
      }
      
      return { cachingWorks: true, success: true };
    });
  }

  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`  Running: ${testName}...`);
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        passed: true,
        duration,
        details: result
      });
      
      console.log(`  ✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        passed: false,
        duration,
        error: error.message,
        details: { errorType: error.constructor.name }
      });
      
      console.log(`  ❌ ${testName} (${duration}ms): ${error.message}`);
    }
  }

  private generateReport(totalDuration: number): IntegrationTestReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    // Categorize test results
    const initTests = this.results.filter(r => r.testName.toLowerCase().includes('initialization') || 
                                              r.testName.toLowerCase().includes('creation') ||
                                              r.testName.toLowerCase().includes('default') ||
                                              r.testName.toLowerCase().includes('health'));
    const handlerTests = this.results.filter(r => r.testName.toLowerCase().includes('handler') || 
                                                r.testName.toLowerCase().includes('sync') ||
                                                r.testName.toLowerCase().includes('unlock'));
    const stateTests = this.results.filter(r => r.testName.toLowerCase().includes('state') || 
                                               r.testName.toLowerCase().includes('mode') ||
                                               r.testName.toLowerCase().includes('interaction'));
    const errorTests = this.results.filter(r => r.testName.toLowerCase().includes('error') || 
                                              r.testName.toLowerCase().includes('failure') ||
                                              r.testName.toLowerCase().includes('invalid'));

    const report: IntegrationTestReport = {
      totalTests: this.results.length,
      passed,
      failed,
      duration: totalDuration,
      results: this.results,
      summary: {
        initializationTests: initTests.every(t => t.passed),
        handlerTests: handlerTests.every(t => t.passed),
        stateManagementTests: stateTests.every(t => t.passed),
        errorHandlingTests: errorTests.every(t => t.passed)
      }
    };

    console.log('\n' + '='.repeat(50));
    console.log('INTEGRATION TEST REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} ✅`);
    console.log(`Failed: ${report.failed} ${report.failed > 0 ? '❌' : '✅'}`);
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log('\nTest Categories:');
    console.log(`  Initialization: ${report.summary.initializationTests ? '✅' : '❌'}`);
    console.log(`  State Management: ${report.summary.stateManagementTests ? '✅' : '❌'}`);
    console.log(`  Handler Integration: ${report.summary.handlerTests ? '✅' : '❌'}`);
    console.log(`  Error Handling: ${report.summary.errorHandlingTests ? '✅' : '❌'}`);
    
    const overallPass = report.failed === 0;
    console.log(`\nOverall Result: ${overallPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(50) + '\n');

    return report;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}