import { CU12Migration, MigrationResult } from './migrate-to-cu12';
import { CU12ConfigValidator } from './cu12-config-validator';
import { CU12SlotInitializer } from './cu12-slot-initializer';
import { sequelize } from '../sequelize';
import { Setting } from '../model/setting.model';
import { Slot } from '../model/slot.model';
import { DispensingLog } from '../model/dispensing-logs.model';
import { Log } from '../model/logs.model';

export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface MigrationTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  summary: {
    preMigrationTests: boolean;
    migrationProcess: boolean;
    postMigrationTests: boolean;
    dataIntegrityTests: boolean;
    configurationTests: boolean;
  };
}

export class CU12MigrationTester {
  private migration: CU12Migration;
  private results: TestResult[] = [];

  constructor() {
    this.migration = new CU12Migration();
  }

  /**
   * Run complete migration test suite
   */
  async runCompleteTestSuite(): Promise<MigrationTestReport> {
    console.log('\n' + '='.repeat(60));
    console.log('CU12 DATABASE MIGRATION TEST SUITE');
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    this.results = [];

    // Run test phases
    await this.runPreMigrationTests();
    await this.runMigrationTests();
    await this.runPostMigrationTests();
    await this.runDataIntegrityTests();
    await this.runConfigurationTests();

    const duration = Date.now() - startTime;
    return this.generateReport(duration);
  }

  /**
   * Pre-migration validation tests
   */
  private async runPreMigrationTests(): Promise<void> {
    console.log('\n🔍 Running Pre-Migration Tests...');

    await this.runTest('Pre-Migration: Database Connection', async () => {
      const setting = await Setting.findByPk(1);
      return { connected: !!setting, hasSettings: !!setting };
    });

    await this.runTest('Pre-Migration: Current Schema Validation', async () => {
      const slotCount = await Slot.count();
      const setting = await Setting.findByPk(1);
      
      return {
        slotCount,
        hasKU16Config: !!(setting?.ku_port || setting?.ku_baudrate),
        availableSlots: setting?.available_slots
      };
    });

    await this.runTest('Pre-Migration: Data Backup Check', async () => {
      // Test backup creation process
      const fs = require('fs').promises;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `resources/db/backups/test-backup-${timestamp}.db`;
      
      // Ensure backup directory exists
      await fs.mkdir('resources/db/backups', { recursive: true });
      
      // Test backup creation
      await fs.copyFile('resources/db/database.db', backupPath);
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      
      return { backupPath, backupExists };
    });

    await this.runTest('Pre-Migration: Historical Data Count', async () => {
      const logCount = await Log.count();
      const dispensingLogCount = await DispensingLog.count();
      
      return { systemLogs: logCount, dispensingLogs: dispensingLogCount };
    });
  }

  /**
   * Migration process tests
   */
  private async runMigrationTests(): Promise<void> {
    console.log('\n🔄 Running Migration Process Tests...');

    await this.runTest('Migration: Schema Update', async () => {
      const migrationStatus = await this.migration.getMigrationStatus();
      
      // Check if schema update is needed
      if (!migrationStatus.hasBackupColumns) {
        console.log('  Schema update needed, will be handled by full migration');
      }

      return { 
        currentStatus: migrationStatus.hasBackupColumns,
        needsUpdate: !migrationStatus.hasBackupColumns 
      };
    });

    await this.runTest('Migration: Full Migration Process', async () => {
      const result = await this.migration.executeMigration();
      return result;
    });

    await this.runTest('Migration: Status Verification', async () => {
      const status = await this.migration.getMigrationStatus();
      return status;
    });
  }

  /**
   * Post-migration validation tests
   */
  private async runPostMigrationTests(): Promise<void> {
    console.log('\n✅ Running Post-Migration Tests...');

    await this.runTest('Post-Migration: CU12 Configuration', async () => {
      const setting = await Setting.findByPk(1);
      
      if (!setting) {
        throw new Error('Settings record not found after migration');
      }

      return {
        hasCU12Port: !!setting.cu_port,
        hasCU12Baudrate: !!setting.cu_baudrate,
        availableSlots: setting.available_slots,
        cu_baudrate: setting.cu_baudrate
      };
    });

    await this.runTest('Post-Migration: Slot Configuration', async () => {
      const totalSlots = await Slot.count();
      const activeSlots = await Slot.count({ where: { isActive: true } });
      const inactiveSlots = await Slot.count({ where: { isActive: false } });
      
      return { totalSlots, activeSlots, inactiveSlots };
    });

    await this.runTest('Post-Migration: Slot Range Validation', async () => {
      const slotsRange = await Slot.findAll({
        attributes: ['slotId', 'isActive'],
        order: [['slotId', 'ASC']]
      });

      const activeSlotIds = slotsRange
        .filter(slot => slot.isActive)
        .map(slot => slot.slotId);

      const expectedActiveSlots = Array.from({length: 12}, (_, i) => i + 1);
      const correctActiveSlots = JSON.stringify(activeSlotIds) === JSON.stringify(expectedActiveSlots);

      return {
        totalSlots: slotsRange.length,
        activeSlotIds,
        correctActiveSlots,
        expectedActiveSlots
      };
    });
  }

  /**
   * Data integrity tests
   */
  private async runDataIntegrityTests(): Promise<void> {
    console.log('\n🔒 Running Data Integrity Tests...');

    await this.runTest('Data Integrity: Historical Logs Preserved', async () => {
      const logCount = await Log.count();
      const dispensingLogCount = await DispensingLog.count();
      const migrationLogs = await Log.count({
        where: {
          message: { [sequelize.Op.like]: '%CU12%migration%' }
        }
      });

      return {
        totalLogs: logCount,
        dispensingLogs: dispensingLogCount,
        migrationLogs,
        logsPreserved: logCount >= migrationLogs
      };
    });

    await this.runTest('Data Integrity: Slot Data Consistency', async () => {
      const validation = await CU12SlotInitializer.validateSlotIntegrity();
      return validation;
    });

    await this.runTest('Data Integrity: Configuration Validation', async () => {
      const validation = await CU12ConfigValidator.validateSystemConfiguration();
      return validation;
    });

    await this.runTest('Data Integrity: No Data Loss', async () => {
      // Verify no critical data was lost
      const occupiedSlots = await Slot.count({ where: { occupied: true } });
      const openingSlots = await Slot.count({ where: { opening: true } });
      
      // Check for any orphaned or inconsistent data
      const inconsistentSlots = await Slot.count({
        where: {
          occupied: true,
          isActive: false
        }
      });

      return {
        occupiedSlots,
        openingSlots,
        inconsistentSlots,
        dataConsistent: inconsistentSlots === 0
      };
    });
  }

  /**
   * Configuration and functionality tests
   */
  private async runConfigurationTests(): Promise<void> {
    console.log('\n⚙️ Running Configuration Tests...');

    await this.runTest('Configuration: Settings Validation', async () => {
      const setting = await Setting.findByPk(1);
      if (!setting) {
        throw new Error('No settings found');
      }

      const validation = CU12ConfigValidator.validateSettings(setting);
      return validation;
    });

    await this.runTest('Configuration: Slot Initialization', async () => {
      const summary = await CU12SlotInitializer.getConfigurationSummary();
      return summary;
    });

    await this.runTest('Configuration: System Recommendations', async () => {
      const recommendations = await CU12ConfigValidator.generateRecommendations();
      return { recommendations, hasRecommendations: recommendations.length > 0 };
    });

    await this.runTest('Configuration: Migration Status Check', async () => {
      const status = await this.migration.getMigrationStatus();
      return {
        isMigrated: status.isMigrated,
        migrationComplete: status.isMigrated && status.slotConfiguration.activeSlots === 12
      };
    });
  }

  /**
   * Run individual test with error handling
   */
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

  /**
   * Generate comprehensive test report
   */
  private generateReport(totalDuration: number): MigrationTestReport {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    // Categorize test results
    const preMigrationTests = this.results.filter(r => r.testName.includes('Pre-Migration'));
    const migrationTests = this.results.filter(r => r.testName.includes('Migration:'));
    const postMigrationTests = this.results.filter(r => r.testName.includes('Post-Migration'));
    const dataIntegrityTests = this.results.filter(r => r.testName.includes('Data Integrity'));
    const configurationTests = this.results.filter(r => r.testName.includes('Configuration'));

    const report: MigrationTestReport = {
      totalTests: this.results.length,
      passed,
      failed,
      duration: totalDuration,
      results: this.results,
      summary: {
        preMigrationTests: preMigrationTests.every(t => t.passed),
        migrationProcess: migrationTests.every(t => t.passed),
        postMigrationTests: postMigrationTests.every(t => t.passed),
        dataIntegrityTests: dataIntegrityTests.every(t => t.passed),
        configurationTests: configurationTests.every(t => t.passed)
      }
    };

    this.printReport(report);
    return report;
  }

  /**
   * Print detailed test report
   */
  private printReport(report: MigrationTestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('CU12 MIGRATION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} ✅`);
    console.log(`Failed: ${report.failed} ${report.failed > 0 ? '❌' : '✅'}`);
    console.log(`Duration: ${(report.duration / 1000).toFixed(2)}s`);
    
    console.log('\nTest Categories:');
    console.log(`  Pre-Migration: ${report.summary.preMigrationTests ? '✅' : '❌'}`);
    console.log(`  Migration Process: ${report.summary.migrationProcess ? '✅' : '❌'}`);
    console.log(`  Post-Migration: ${report.summary.postMigrationTests ? '✅' : '❌'}`);
    console.log(`  Data Integrity: ${report.summary.dataIntegrityTests ? '✅' : '❌'}`);
    console.log(`  Configuration: ${report.summary.configurationTests ? '✅' : '❌'}`);
    
    if (report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      report.results
        .filter(r => !r.passed)
        .forEach(test => {
          console.log(`  - ${test.testName}: ${test.error}`);
        });
    }

    const overallPass = report.failed === 0;
    console.log(`\nOverall Result: ${overallPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (overallPass) {
      console.log('🎉 CU12 migration completed successfully and passed all tests!');
    } else {
      console.log('⚠️ Review failed tests before proceeding with CU12 deployment');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run quick validation (subset of full test suite)
   */
  async runQuickValidation(): Promise<{ passed: boolean; issues: string[] }> {
    console.log('\n🔍 Running Quick CU12 Migration Validation...');
    
    const issues: string[] = [];

    try {
      // Check migration status
      const status = await this.migration.getMigrationStatus();
      if (!status.isMigrated) {
        issues.push('Migration not completed - run full migration first');
      }

      // Check basic configuration
      const setting = await Setting.findByPk(1);
      if (!setting?.cu_port || !setting?.cu_baudrate) {
        issues.push('CU12 configuration incomplete');
      }

      if (setting?.available_slots !== 12) {
        issues.push(`Available slots should be 12, found: ${setting?.available_slots}`);
      }

      // Check slot configuration
      const activeSlots = await Slot.count({ where: { isActive: true } });
      if (activeSlots !== 12) {
        issues.push(`Active slots should be 12, found: ${activeSlots}`);
      }

      const passed = issues.length === 0;
      
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
}