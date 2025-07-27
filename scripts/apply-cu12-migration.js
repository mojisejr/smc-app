const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'resources/db/database.db';
const BACKUP_DIR = 'resources/db/backups';

async function applyCU12Migration() {
  console.log('🔄 Starting CU12 Database Migration...');
  
  try {
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${BACKUP_DIR}/database-backup-${timestamp}.db`;
    console.log(`📦 Creating backup: ${backupPath}`);
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Check if columns already exist
    console.log('🔍 Checking current database schema...');
    const schemaCheck = execSync(`sqlite3 "${DB_PATH}" ".schema Setting"`, { encoding: 'utf8' });
    
    if (schemaCheck.includes('cu_port') && schemaCheck.includes('cu_baudrate')) {
      console.log('✅ CU12 columns already exist. Migration not needed.');
      return;
    }
    
    // Apply schema changes
    console.log('🔧 Adding CU12 columns to Setting table...');
    
    const sqlCommands = [
      'ALTER TABLE Setting ADD COLUMN cu_port TEXT;',
      'ALTER TABLE Setting ADD COLUMN cu_baudrate INTEGER DEFAULT 19200;'
    ];
    
    for (const sql of sqlCommands) {
      try {
        execSync(`sqlite3 "${DB_PATH}" "${sql}"`, { encoding: 'utf8' });
        console.log(`✅ Executed: ${sql}`);
      } catch (error) {
        console.warn(`⚠️ SQL command failed (might already exist): ${sql}`);
      }
    }
    
    // Migrate KU16 settings to CU12 if needed
    console.log('📝 Migrating KU16 configuration to CU12...');
    const migrateDataSQL = `
      UPDATE Setting 
      SET cu_port = ku_port,
          cu_baudrate = CASE 
            WHEN ku_baudrate IS NOT NULL THEN ku_baudrate 
            ELSE 19200 
          END,
          available_slots = 12
      WHERE id = 1 AND cu_port IS NULL;
    `;
    
    execSync(`sqlite3 "${DB_PATH}" "${migrateDataSQL}"`, { encoding: 'utf8' });
    console.log('✅ Data migration completed');
    
    // Verify migration
    console.log('🔍 Verifying migration results...');
    const verifySQL = 'SELECT id, ku_port, ku_baudrate, cu_port, cu_baudrate, available_slots FROM Setting WHERE id = 1;';
    const result = execSync(`sqlite3 "${DB_PATH}" "${verifySQL}"`, { encoding: 'utf8' });
    console.log('📊 Current Setting record:', result.trim());
    
    console.log('🎉 CU12 Database Migration completed successfully!');
    console.log(`📦 Backup saved at: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
applyCU12Migration();