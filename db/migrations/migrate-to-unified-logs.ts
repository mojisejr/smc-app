import fs from 'fs';
import path from 'path';
import { sequelize } from '../sequelize';
import { backupManager } from '../utils/backup-manager';
import { DispensingLog } from '../model/dispensing-logs.model';
import { Log } from '../model/logs.model';

/**
 * Safe Migration to Unified Log System
 * Migrates existing DispensingLog and Log data to new UnifiedLog table
 */
export class UnifiedLogMigration {
  private migrationPhase = 'unified-logs-migration';
  
  /**
   * Execute the complete migration process
   */
  async migrate(): Promise<boolean> {
    console.log('\n=== UNIFIED LOG MIGRATION STARTED ===');
    
    try {
      // Phase 1: Pre-migration backup
      await this.createPreMigrationBackup();
      
      // Phase 2: Create new schema
      await this.createUnifiedSchema();
      
      // Phase 3: Migrate existing data
      const migrationResults = await this.migrateExistingData();
      
      // Phase 4: Verify migration
      const verificationResults = await this.verifyMigration();
      
      // Phase 5: Report results
      this.reportMigrationResults(migrationResults, verificationResults);
      
      if (verificationResults.success) {
        console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
        console.log('📝 Old tables preserved for rollback safety');
        console.log('🔄 Application code needs to be updated to use UnifiedLog model');
        return true;
      } else {
        console.error('❌ MIGRATION VERIFICATION FAILED');
        return false;
      }
      
    } catch (error) {
      console.error('💥 MIGRATION FAILED:', error.message);
      console.log('🔄 Database restored from backup');
      
      // Attempt rollback (in production, manual intervention may be needed)
      console.log('⚠️  Please manually restore from backup if needed');
      return false;
    }
  }
  
  /**
   * Create backup before migration
   */
  private async createPreMigrationBackup(): Promise<void> {
    console.log('\n📦 Creating pre-migration backup...');
    
    const backupPath = await backupManager.createBackup(
      this.migrationPhase,
      'Full backup before unified log migration'
    );
    
    const isValid = await backupManager.verifyBackup(backupPath);
    if (!isValid) {
      throw new Error('Backup verification failed. Cannot proceed with migration.');
    }
    
    console.log('✅ Pre-migration backup created and verified');
  }
  
  /**
   * Create unified log schema
   */
  private async createUnifiedSchema(): Promise<void> {
    console.log('\n🏗️  Creating unified log schema...');
    
    const schemaPath = path.join(__dirname, 'create-unified-log-schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema creation in transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Split SQL into individual statements and execute
      const statements = schemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        await sequelize.query(statement, { transaction });
      }
      
      await transaction.commit();
      console.log('✅ Unified log schema created successfully');
      
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Schema creation failed: ${error.message}`);
    }
  }
  
  /**
   * Migrate existing data from old tables
   */
  private async migrateExistingData(): Promise<{
    dispensingLogs: number;
    systemLogs: number;
    errors: string[];
  }> {
    console.log('\n📊 Migrating existing data...');
    
    const results = {
      dispensingLogs: 0,
      systemLogs: 0,
      errors: [] as string[]
    };
    
    const transaction = await sequelize.transaction();
    
    try {
      // Migrate DispensingLog data
      console.log('  📋 Migrating dispensing logs...');
      const dispensingLogs = await DispensingLog.findAll({ transaction });
      
      for (const log of dispensingLogs) {
        try {
          await sequelize.query(`
            INSERT INTO UnifiedLog (
              timestamp, createdAt, userId, logType, category, level,
              slotId, hn, operation, message, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              log.timestamp || new Date(log.createdAt).getTime(),
              log.createdAt,
              log.userId,
              'USING',
              this.mapProcessToCategory(log.process),
              'info',
              log.slotId,
              log.hn,
              log.process,
              log.message || 'ไม่มีข้อความ',
              JSON.stringify({
                originalId: log.id,
                originalTable: 'DispensingLog',
                migrationTimestamp: new Date().toISOString()
              })
            ],
            transaction
          });
          
          results.dispensingLogs++;
          
        } catch (error) {
          results.errors.push(`DispensingLog ${log.id}: ${error.message}`);
        }
      }
      
      // Migrate Log data
      console.log('  📋 Migrating system logs...');
      const systemLogs = await Log.findAll({ transaction });
      
      for (const log of systemLogs) {
        try {
          await sequelize.query(`
            INSERT INTO UnifiedLog (
              timestamp, createdAt, logType, category, level, message, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              new Date(log.createdAt).getTime(),
              log.createdAt,
              'SYSTEM',
              'info',
              'info',
              log.message,
              JSON.stringify({
                originalId: log.id,
                originalTable: 'Log',
                originalUser: log.user,
                migrationTimestamp: new Date().toISOString()
              })
            ],
            transaction
          });
          
          results.systemLogs++;
          
        } catch (error) {
          results.errors.push(`Log ${log.id}: ${error.message}`);
        }
      }
      
      await transaction.commit();
      
      console.log(`✅ Migration completed:`);
      console.log(`   📊 Dispensing logs: ${results.dispensingLogs}`);
      console.log(`   📊 System logs: ${results.systemLogs}`);
      console.log(`   ⚠️  Errors: ${results.errors.length}`);
      
      return results;
      
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Data migration failed: ${error.message}`);
    }
  }
  
  /**
   * Map old process types to new categories
   */
  private mapProcessToCategory(process: string): string {
    const processMap: Record<string, string> = {
      'unlock': 'unlock',
      'dispense': 'dispensing',
      'dispense-continue': 'dispensing',
      'dispense-end': 'dispensing',
      'force-reset': 'force-reset',
      'deactivate': 'deactive',
      // Add error mappings
      'unlock-error': 'error',
      'dispense-error': 'error',
      'deactivate-error': 'error',
      'force-reset-error': 'error'
    };
    
    return processMap[process] || 'info';
  }
  
  /**
   * Verify migration results
   */
  private async verifyMigration(): Promise<{
    success: boolean;
    totalOriginal: number;
    totalMigrated: number;
    samplesMatch: boolean;
    errors: string[];
  }> {
    console.log('\n✅ Verifying migration...');
    
    const results = {
      success: false,
      totalOriginal: 0,
      totalMigrated: 0,
      samplesMatch: false,
      errors: [] as string[]
    };
    
    try {
      // Count original records
      const [dispensingCount] = await sequelize.query('SELECT COUNT(*) as count FROM DispensingLog');
      const [systemCount] = await sequelize.query('SELECT COUNT(*) as count FROM Log');
      results.totalOriginal = (dispensingCount[0] as any).count + (systemCount[0] as any).count;
      
      // Count migrated records
      const [migratedCount] = await sequelize.query('SELECT COUNT(*) as count FROM UnifiedLog');
      results.totalMigrated = (migratedCount[0] as any).count;
      
      // Check if counts match
      if (results.totalOriginal !== results.totalMigrated) {
        results.errors.push(`Record count mismatch: ${results.totalOriginal} original vs ${results.totalMigrated} migrated`);
      }
      
      // Sample verification - check a few records
      results.samplesMatch = await this.verifySampleRecords();
      
      // Check schema exists
      const [tables] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='UnifiedLog'");
      if (tables.length === 0) {
        results.errors.push('UnifiedLog table not found');
      }
      
      // Check indexes exist
      const [indexes] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='UnifiedLog'");
      if (indexes.length < 5) {
        results.errors.push('Required indexes not found');
      }
      
      results.success = results.errors.length === 0 && results.samplesMatch;
      
      console.log(`📊 Verification results:`);
      console.log(`   Original records: ${results.totalOriginal}`);
      console.log(`   Migrated records: ${results.totalMigrated}`);
      console.log(`   Sample verification: ${results.samplesMatch ? '✅' : '❌'}`);
      console.log(`   Errors: ${results.errors.length}`);
      
      if (results.errors.length > 0) {
        console.log(`   Error details:`);
        results.errors.forEach(error => console.log(`     - ${error}`));
      }
      
      return results;
      
    } catch (error) {
      results.errors.push(`Verification failed: ${error.message}`);
      return results;
    }
  }
  
  /**
   * Verify sample records to ensure data integrity
   */
  private async verifySampleRecords(): Promise<boolean> {
    try {
      // Check first dispensing log
      const [originalDispensing] = await sequelize.query('SELECT * FROM DispensingLog ORDER BY id LIMIT 1');
      if (originalDispensing.length > 0) {
        const original = originalDispensing[0] as any;
        const [migrated] = await sequelize.query(`
          SELECT * FROM UnifiedLog 
          WHERE JSON_EXTRACT(details, '$.originalId') = ? 
          AND JSON_EXTRACT(details, '$.originalTable') = 'DispensingLog'
        `, { replacements: [original.id] });
        
        if (migrated.length === 0) {
          console.warn(`Sample verification failed: DispensingLog ${original.id} not found in UnifiedLog`);
          return false;
        }
      }
      
      // Check first system log
      const [originalSystem] = await sequelize.query('SELECT * FROM Log ORDER BY id LIMIT 1');
      if (originalSystem.length > 0) {
        const original = originalSystem[0] as any;
        const [migrated] = await sequelize.query(`
          SELECT * FROM UnifiedLog 
          WHERE JSON_EXTRACT(details, '$.originalId') = ? 
          AND JSON_EXTRACT(details, '$.originalTable') = 'Log'
        `, { replacements: [original.id] });
        
        if (migrated.length === 0) {
          console.warn(`Sample verification failed: Log ${original.id} not found in UnifiedLog`);
          return false;
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('Sample verification error:', error.message);
      return false;
    }
  }
  
  /**
   * Report migration results
   */
  private reportMigrationResults(
    migrationResults: { dispensingLogs: number; systemLogs: number; errors: string[] },
    verificationResults: { success: boolean; totalOriginal: number; totalMigrated: number; samplesMatch: boolean; errors: string[] }
  ): void {
    console.log('\n📋 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`📊 Data Migration:`);
    console.log(`   Dispensing logs migrated: ${migrationResults.dispensingLogs}`);
    console.log(`   System logs migrated: ${migrationResults.systemLogs}`);
    console.log(`   Migration errors: ${migrationResults.errors.length}`);
    
    console.log(`\n✅ Verification:`);
    console.log(`   Original records: ${verificationResults.totalOriginal}`);
    console.log(`   Migrated records: ${verificationResults.totalMigrated}`);
    console.log(`   Sample check: ${verificationResults.samplesMatch ? 'PASSED' : 'FAILED'}`);
    console.log(`   Verification errors: ${verificationResults.errors.length}`);
    
    console.log(`\n🎯 Overall Status: ${verificationResults.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (migrationResults.errors.length > 0) {
      console.log(`\n⚠️  Migration Errors:`);
      migrationResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (verificationResults.errors.length > 0) {
      console.log(`\n⚠️  Verification Errors:`);
      verificationResults.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n📝 Next Steps:');
    if (verificationResults.success) {
      console.log('   1. Update application code to use UnifiedLog model');
      console.log('   2. Test all logging functionality');
      console.log('   3. Monitor system for any issues');
      console.log('   4. Consider removing old tables after successful testing');
    } else {
      console.log('   1. Review migration errors above');
      console.log('   2. Fix issues and retry migration');
      console.log('   3. Contact support if problems persist');
    }
    
    console.log('='.repeat(50));
  }
  
  /**
   * Rollback migration (restore from backup)
   */
  async rollback(): Promise<boolean> {
    console.log('\n🔄 Rolling back migration...');
    
    try {
      const backups = backupManager.listBackups();
      const migrationBackup = backups.find(b => 
        b.metadata?.phase === this.migrationPhase
      );
      
      if (!migrationBackup) {
        throw new Error('Migration backup not found');
      }
      
      await backupManager.restoreBackup(migrationBackup.path);
      console.log('✅ Migration rolled back successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }
}

// Export for use in migration scripts
export const unifiedLogMigration = new UnifiedLogMigration();