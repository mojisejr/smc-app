// CU12 Database Migration - Main Entry Point
// Complete migration from KU16 (15-slot) to CU12 (12-slot) system

export { CU12Migration, MigrationResult } from './migrate-to-cu12';
export { CU12ConfigValidator } from './cu12-config-validator';
export { CU12SlotInitializer } from './cu12-slot-initializer';
export { CU12MigrationTester } from './cu12-migration-tester';

import { CU12Migration } from './migrate-to-cu12';
import { CU12ConfigValidator } from './cu12-config-validator';
import { CU12SlotInitializer } from './cu12-slot-initializer';
import { CU12MigrationTester } from './cu12-migration-tester';

export interface MigrationOptions {
  forceReset?: boolean;
  skipBackup?: boolean;
  testMode?: boolean;
  validateOnly?: boolean;
}

export interface MigrationSummary {
  success: boolean;
  phase: 'validation' | 'migration' | 'testing' | 'complete' | 'error';
  duration: number;
  changes: {
    schemaUpdated: boolean;
    settingsUpdated: boolean;
    slotsUpdated: number;
    backupCreated: boolean;
  };
  validation: {
    preValidation: boolean;
    postValidation: boolean;
    configurationValid: boolean;
    slotIntegrityValid: boolean;
  };
  testing?: {
    totalTests: number;
    passed: number;
    failed: number;
  };
  backupPath?: string;
  error?: string;
  recommendations: string[];
}

/**
 * Main CU12 Migration Runner
 * Coordinates all migration components for seamless KU16 to CU12 transition
 */
export class CU12MigrationRunner {
  private migration: CU12Migration;
  private tester: CU12MigrationTester;

  constructor() {
    this.migration = new CU12Migration();
    this.tester = new CU12MigrationTester();
  }

  /**
   * Execute complete CU12 migration process
   */
  async executeMigration(options: MigrationOptions = {}): Promise<MigrationSummary> {
    const startTime = Date.now();
    console.log('\n' + '🔄'.repeat(20));
    console.log('STARTING CU12 DATABASE MIGRATION');
    console.log('From KU16 (15-slot) to CU12 (12-slot) System');
    console.log('🔄'.repeat(20));

    const summary: MigrationSummary = {
      success: false,
      phase: 'validation',
      duration: 0,
      changes: {
        schemaUpdated: false,
        settingsUpdated: false,
        slotsUpdated: 0,
        backupCreated: false
      },
      validation: {
        preValidation: false,
        postValidation: false,
        configurationValid: false,
        slotIntegrityValid: false
      },
      recommendations: []
    };

    try {
      // Phase 1: Pre-migration validation
      console.log('\n📋 Phase 1: Pre-migration Validation');
      summary.phase = 'validation';
      
      const preValidation = await this.runPreValidation();
      summary.validation.preValidation = preValidation.isValid;
      
      if (!preValidation.isValid && !options.forceReset) {
        summary.recommendations.push(...preValidation.errors);
        summary.recommendations.push('Use forceReset option to bypass validation issues');
        throw new Error(`Pre-validation failed: ${preValidation.errors.join(', ')}`);
      }

      if (options.validateOnly) {
        console.log('✅ Validation complete - stopping as requested');
        summary.success = true;
        summary.phase = 'complete';
        return summary;
      }

      // Phase 2: Execute migration
      console.log('\n🔄 Phase 2: Database Migration');
      summary.phase = 'migration';
      
      const migrationResult = await this.migration.executeMigration();
      
      summary.changes = {
        schemaUpdated: migrationResult.changes.schemaUpdated,
        settingsUpdated: migrationResult.changes.settingsUpdated,
        slotsUpdated: migrationResult.changes.slotsDeactivated,
        backupCreated: !!migrationResult.backupPath
      };
      
      summary.backupPath = migrationResult.backupPath;

      // Phase 3: Post-migration validation
      console.log('\n✅ Phase 3: Post-migration Validation');
      const postValidation = await this.runPostValidation();
      summary.validation.postValidation = postValidation.isValid;
      summary.validation.configurationValid = postValidation.configurationValid;
      summary.validation.slotIntegrityValid = postValidation.slotIntegrityValid;

      if (!postValidation.isValid) {
        summary.recommendations.push(...postValidation.errors);
        throw new Error(`Post-validation failed: ${postValidation.errors.join(', ')}`);
      }

      // Phase 4: Testing (if not in test mode)
      if (!options.testMode) {
        console.log('\n🧪 Phase 4: Migration Testing');
        summary.phase = 'testing';
        
        const testResults = await this.tester.runCompleteTestSuite();
        summary.testing = {
          totalTests: testResults.totalTests,
          passed: testResults.passed,
          failed: testResults.failed
        };

        if (testResults.failed > 0) {
          summary.recommendations.push('Review failed tests before proceeding to production');
        }
      }

      // Phase 5: Generate recommendations
      const recommendations = await CU12ConfigValidator.generateRecommendations();
      summary.recommendations.push(...recommendations);

      summary.duration = Date.now() - startTime;
      summary.phase = 'complete';
      summary.success = true;

      console.log('\n🎉 CU12 Migration Completed Successfully!');
      this.printMigrationSummary(summary);

      return summary;

    } catch (error) {
      summary.duration = Date.now() - startTime;
      summary.phase = 'error';
      summary.error = error.message;
      summary.recommendations.push('Check logs for detailed error information');
      summary.recommendations.push('Consider using rollback if migration partially completed');

      console.error('\n❌ CU12 Migration Failed:', error.message);
      this.printMigrationSummary(summary);

      throw error;
    }
  }

  /**
   * Check current migration status
   */
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    currentConfiguration: 'KU16' | 'CU12' | 'MIXED' | 'UNKNOWN';
    migrationStatus: any;
    slotSummary: any;
    recommendations: string[];
  }> {
    console.log('🔍 Checking CU12 migration status...');

    const migrationStatus = await this.migration.getMigrationStatus();
    const slotSummary = await CU12SlotInitializer.getConfigurationSummary();
    const recommendations = await CU12ConfigValidator.generateRecommendations();

    const needsMigration = !migrationStatus.isMigrated || 
                          slotSummary.configuration !== 'CU12' ||
                          slotSummary.details.activeSlots !== 12;

    console.log(`Current Configuration: ${slotSummary.configuration}`);
    console.log(`Migration Needed: ${needsMigration ? 'YES' : 'NO'}`);
    console.log(`Active Slots: ${slotSummary.details.activeSlots}`);

    return {
      needsMigration,
      currentConfiguration: slotSummary.configuration,
      migrationStatus,
      slotSummary,
      recommendations
    };
  }

  /**
   * Rollback migration using backup
   */
  async rollbackMigration(backupPath: string): Promise<boolean> {
    console.log('\n🔄 Rolling back CU12 migration...');
    
    try {
      const success = await this.migration.rollbackMigration(backupPath);
      
      if (success) {
        console.log('✅ Migration rollback completed successfully');
        console.log('⚠️ System restored to KU16 configuration');
      } else {
        console.error('❌ Migration rollback failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Rollback error:', error.message);
      return false;
    }
  }

  /**
   * Initialize fresh CU12 configuration (for new installations)
   */
  async initializeFreshCU12(): Promise<boolean> {
    console.log('\n🆕 Initializing fresh CU12 configuration...');

    try {
      // Initialize slot configuration
      const slotResult = await CU12SlotInitializer.initializeSlotConfiguration();
      if (!slotResult.success) {
        throw new Error(`Slot initialization failed: ${slotResult.errors.join(', ')}`);
      }

      console.log(`✅ Initialized ${slotResult.created} slots, updated ${slotResult.updated} slots`);

      // Validate configuration
      const validation = await CU12ConfigValidator.validateSystemConfiguration();
      if (!validation.isValid) {
        console.warn('⚠️ Configuration validation warnings:', validation.warnings);
        if (validation.errors.length > 0) {
          console.error('❌ Configuration errors:', validation.errors);
        }
      }

      console.log('✅ Fresh CU12 configuration initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Fresh CU12 initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Quick migration validation
   */
  async quickValidation(): Promise<{ passed: boolean; issues: string[] }> {
    return await this.tester.runQuickValidation();
  }

  // Private helper methods

  private async runPreValidation(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check database connectivity
      const migrationStatus = await this.migration.getMigrationStatus();
      
      // Check if already migrated
      if (migrationStatus.isMigrated) {
        warnings.push('System appears to already be migrated to CU12');
      }

      // Validate current slot configuration
      const slotValidation = await CU12SlotInitializer.validateSlotIntegrity();
      if (!slotValidation.isValid) {
        warnings.push(...slotValidation.issues);
      }

      return { isValid: errors.length === 0, errors, warnings };
    } catch (error) {
      errors.push(`Pre-validation failed: ${error.message}`);
      return { isValid: false, errors, warnings };
    }
  }

  private async runPostValidation(): Promise<{
    isValid: boolean;
    configurationValid: boolean;
    slotIntegrityValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate system configuration
    const configValidation = await CU12ConfigValidator.validateSystemConfiguration();
    if (!configValidation.isValid) {
      errors.push(...configValidation.errors);
    }

    // Validate slot integrity
    const slotValidation = await CU12SlotInitializer.validateSlotIntegrity();
    if (!slotValidation.isValid) {
      errors.push(...slotValidation.issues);
    }

    return {
      isValid: errors.length === 0,
      configurationValid: configValidation.isValid,
      slotIntegrityValid: slotValidation.isValid,
      errors
    };
  }

  private printMigrationSummary(summary: MigrationSummary): void {
    console.log('\n' + '='.repeat(50));
    console.log('CU12 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Status: ${summary.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Phase: ${summary.phase.toUpperCase()}`);
    console.log(`Duration: ${(summary.duration / 1000).toFixed(1)}s`);
    
    if (summary.changes.backupCreated && summary.backupPath) {
      console.log(`Backup: ${summary.backupPath}`);
    }

    console.log('\n📊 Changes Made:');
    console.log(`  Schema Updated: ${summary.changes.schemaUpdated ? '✅' : '❌'}`);
    console.log(`  Settings Updated: ${summary.changes.settingsUpdated ? '✅' : '❌'}`);
    console.log(`  Slots Modified: ${summary.changes.slotsUpdated}`);

    console.log('\n🔍 Validation Results:');
    console.log(`  Pre-validation: ${summary.validation.preValidation ? '✅' : '❌'}`);
    console.log(`  Post-validation: ${summary.validation.postValidation ? '✅' : '❌'}`);
    console.log(`  Configuration: ${summary.validation.configurationValid ? '✅' : '❌'}`);
    console.log(`  Slot Integrity: ${summary.validation.slotIntegrityValid ? '✅' : '❌'}`);

    if (summary.testing) {
      console.log('\n🧪 Testing Results:');
      console.log(`  Total Tests: ${summary.testing.totalTests}`);
      console.log(`  Passed: ${summary.testing.passed} ✅`);
      console.log(`  Failed: ${summary.testing.failed} ${summary.testing.failed > 0 ? '❌' : '✅'}`);
    }

    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    if (summary.error) {
      console.log(`\n❌ Error: ${summary.error}`);
    }

    console.log('='.repeat(50) + '\n');
  }
}

// Export convenience functions
export const migrationRunner = new CU12MigrationRunner();

export const runCU12Migration = (options?: MigrationOptions) => 
  migrationRunner.executeMigration(options);

export const checkMigrationStatus = () => 
  migrationRunner.checkMigrationStatus();

export const validateCU12Configuration = () => 
  migrationRunner.quickValidation();

export const initializeCU12 = () => 
  migrationRunner.initializeFreshCU12();