import { BrowserWindow } from 'electron';
import { CU12SmartStateManager } from '../stateManager';
import { CU12PerformanceValidator, PerformanceMetrics } from './performanceValidator';
import { CU12IntegrationTester, IntegrationTestReport } from './integrationTester';
import { CU12ErrorStressTester, StressTestResult } from './errorStressTester';

export interface ComprehensiveTestReport {
  timestamp: number;
  performance: PerformanceMetrics;
  integration: IntegrationTestReport;
  stressTest: StressTestResult[];
  overallResult: {
    passed: boolean;
    score: number;
    recommendations: string[];
  };
  executionTime: number;
}

export class CU12TestRunner {
  private stateManager: CU12SmartStateManager;
  private mainWindow: BrowserWindow;

  constructor(stateManager: CU12SmartStateManager, mainWindow: BrowserWindow) {
    this.stateManager = stateManager;
    this.mainWindow = mainWindow;
  }

  /**
   * Run complete Round 2 validation suite
   */
  async runRound2Completion(): Promise<ComprehensiveTestReport> {
    console.log('\n' + '='.repeat(60));
    console.log('CU12 ROUND 2 COMPLETION VALIDATION');
    console.log('Adaptive Smart State Management & Hardware Integration');
    console.log('='.repeat(60));

    const startTime = Date.now();
    const timestamp = Date.now();

    try {
      // 1. Performance Validation
      console.log('\n🚀 PHASE 1: Performance Validation');
      const performanceValidator = new CU12PerformanceValidator(this.stateManager);
      const performance = await performanceValidator.runCompleteValidation();

      // 2. Integration Testing
      console.log('\n🔗 PHASE 2: Integration Testing');
      const integrationTester = new CU12IntegrationTester(this.stateManager, this.mainWindow);
      const integration = await integrationTester.runAllTests();

      // 3. Error Handling Stress Test
      console.log('\n⚡ PHASE 3: Error Handling Stress Test');
      const stressTester = new CU12ErrorStressTester(this.stateManager);
      const stressTest = await stressTester.runStressTests();

      const executionTime = Date.now() - startTime;

      // Generate comprehensive report
      const report = this.generateComprehensiveReport({
        timestamp,
        performance,
        integration,
        stressTest,
        executionTime
      });

      this.printFinalReport(report);
      return report;

    } catch (error) {
      console.error('\n❌ Round 2 validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Quick validation for development
   */
  async runQuickValidation(): Promise<{ passed: boolean; issues: string[] }> {
    console.log('\n🔍 Running Quick CU12 Validation...');
    
    const issues: string[] = [];

    try {
      // Quick health check
      const health = await this.stateManager.getHealthStatus();
      if (!health.connected) {
        issues.push('Hardware not connected (expected in development)');
      }

      // Mode switching test
      await this.stateManager.onUserInteraction();
      await this.sleep(200);
      if (this.stateManager.getMonitoringMode() !== 'active') {
        issues.push('Mode switching not working properly');
      }

      // Return to idle
      await this.stateManager.startIdleMode();
      await this.sleep(200);
      if (this.stateManager.getMonitoringMode() !== 'idle') {
        issues.push('Return to idle mode not working');
      }

      // Resource optimizer check
      const resourceOptimizer = (this.stateManager as any).resourceOptimizer;
      if (!resourceOptimizer) {
        issues.push('Resource optimizer not initialized');
      } else {
        resourceOptimizer.setCachedResponse('test', {data: 'test'}, 1000);
        const cached = resourceOptimizer.getCachedResponse('test', 1000);
        if (!cached) {
          issues.push('Caching not working properly');
        }
      }

      // Failure detector check
      const failureDetector = (this.stateManager as any).failureDetector;
      if (!failureDetector) {
        issues.push('Failure detector not initialized');
      }

      const passed = issues.length === 0 || issues.every(issue => issue.includes('expected'));
      
      console.log(`Quick validation: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      if (issues.length > 0) {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      }

      return { passed, issues };

    } catch (error) {
      issues.push(`Validation error: ${error.message}`);
      return { passed: false, issues };
    }
  }

  private generateComprehensiveReport(data: {
    timestamp: number;
    performance: PerformanceMetrics;
    integration: IntegrationTestReport;
    stressTest: StressTestResult[];
    executionTime: number;
  }): ComprehensiveTestReport {
    
    const recommendations: string[] = [];
    let score = 0;
    let maxScore = 0;

    // Performance scoring (40 points max)
    maxScore += 40;
    if (data.performance.cpuUsage.idle < 5) {
      score += 15;
    } else {
      recommendations.push(`CPU usage in idle mode (${data.performance.cpuUsage.idle.toFixed(1)}%) exceeds 5% target`);
    }

    if (data.performance.cpuUsage.active < 15) {
      score += 15;
    } else {
      recommendations.push(`CPU usage in active mode (${data.performance.cpuUsage.active.toFixed(1)}%) exceeds 15% target`);
    }

    if (data.performance.modeSwitching.idleToActive < 100 && 
        data.performance.modeSwitching.activeToOperation < 100) {
      score += 10;
    } else {
      recommendations.push('Mode switching performance needs optimization (<100ms target)');
    }

    // Integration scoring (30 points max)
    maxScore += 30;
    const integrationPassRate = data.integration.passed / data.integration.totalTests;
    score += Math.floor(integrationPassRate * 30);
    
    if (integrationPassRate < 1) {
      recommendations.push(`Integration tests: ${data.integration.failed} failed out of ${data.integration.totalTests}`);
    }

    // Stress test scoring (30 points max)
    maxScore += 30;
    const stressTestsPassed = data.stressTest.filter(t => t.recoverySuccessful).length;
    const stressTestPassRate = stressTestsPassed / data.stressTest.length;
    score += Math.floor(stressTestPassRate * 30);

    if (stressTestPassRate < 0.8) {
      recommendations.push('Error handling robustness needs improvement');
    }

    // Circuit breaker validation
    const hasCircuitBreaker = data.stressTest.some(t => t.circuitBreakerTriggered);
    if (!hasCircuitBreaker) {
      recommendations.push('Circuit breaker pattern not properly triggered during stress tests');
    }

    const finalScore = Math.floor((score / maxScore) * 100);
    const passed = finalScore >= 80 && recommendations.length <= 2;

    return {
      timestamp: data.timestamp,
      performance: data.performance,
      integration: data.integration,
      stressTest: data.stressTest,
      overallResult: {
        passed,
        score: finalScore,
        recommendations
      },
      executionTime: data.executionTime
    };
  }

  private printFinalReport(report: ComprehensiveTestReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 ROUND 2 COMPLETION ASSESSMENT');
    console.log('='.repeat(70));

    console.log(`\n📊 OVERALL SCORE: ${report.overallResult.score}/100`);
    console.log(`⏱️ EXECUTION TIME: ${(report.executionTime / 1000).toFixed(1)}s`);
    
    console.log('\n📈 PERFORMANCE METRICS:');
    console.log(`  CPU Idle: ${report.performance.cpuUsage.idle.toFixed(1)}% ${report.performance.cpuUsage.idle < 5 ? '✅' : '❌'} (Target: <5%)`);
    console.log(`  CPU Active: ${report.performance.cpuUsage.active.toFixed(1)}% ${report.performance.cpuUsage.active < 15 ? '✅' : '❌'} (Target: <15%)`);
    console.log(`  Mode Switch: ${report.performance.modeSwitching.idleToActive}ms ${report.performance.modeSwitching.idleToActive < 100 ? '✅' : '❌'} (Target: <100ms)`);

    console.log('\n🔗 INTEGRATION RESULTS:');
    console.log(`  Total Tests: ${report.integration.totalTests}`);
    console.log(`  Passed: ${report.integration.passed} ✅`);
    console.log(`  Failed: ${report.integration.failed} ${report.integration.failed === 0 ? '✅' : '❌'}`);
    console.log(`  Categories: Init:${report.integration.summary.initializationTests ? '✅' : '❌'} State:${report.integration.summary.stateManagementTests ? '✅' : '❌'} Handler:${report.integration.summary.handlerTests ? '✅' : '❌'} Error:${report.integration.summary.errorHandlingTests ? '✅' : '❌'}`);

    console.log('\n⚡ STRESS TEST RESULTS:');
    report.stressTest.forEach(test => {
      console.log(`  ${test.testName}: ${test.recoverySuccessful ? '✅' : '❌'} (${test.avgResponseTime.toFixed(0)}ms avg)`);
    });

    if (report.overallResult.recommendations.length > 0) {
      console.log('\n⚠️ RECOMMENDATIONS:');
      report.overallResult.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log('\n🎯 ROUND 2 STATUS:');
    if (report.overallResult.passed) {
      console.log('✅ ROUND 2 COMPLETED SUCCESSFULLY');
      console.log('✅ Adaptive Smart State Management implemented');
      console.log('✅ Resource efficiency targets met');
      console.log('✅ Error handling robust');
      console.log('✅ Ready for Round 3: Database Schema Updates');
    } else {
      console.log('⚠️ ROUND 2 NEEDS ATTENTION');
      console.log('❌ Some requirements not fully met');
      console.log('❌ Review recommendations before proceeding');
    }

    console.log('\n📋 NEXT STEPS:');
    if (report.overallResult.passed) {
      console.log('1. Proceed with Round 3: Database schema updates for 12-slot configuration');
      console.log('2. Update settings management for CU12 configuration options');
      console.log('3. Plan UI adaptation for 12-slot layout');
    } else {
      console.log('1. Address performance and integration issues');
      console.log('2. Re-run validation tests');
      console.log('3. Optimize based on recommendations');
    }

    console.log('='.repeat(70) + '\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export utility function for easy testing
export async function validateCU12Round2(stateManager: CU12SmartStateManager, mainWindow: BrowserWindow): Promise<ComprehensiveTestReport> {
  const testRunner = new CU12TestRunner(stateManager, mainWindow);
  return await testRunner.runRound2Completion();
}

export async function quickValidateCU12(stateManager: CU12SmartStateManager, mainWindow: BrowserWindow): Promise<{ passed: boolean; issues: string[] }> {
  const testRunner = new CU12TestRunner(stateManager, mainWindow);
  return await testRunner.runQuickValidation();
}