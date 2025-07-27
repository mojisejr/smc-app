const { execSync } = require('child_process');
const fs = require('fs');

const DB_PATH = 'resources/db/database.db';
const BACKUP_DIR = 'resources/db/backups';

async function fixSlotConfiguration() {
  console.log('🔧 Fixing slot configuration for CU12 (12-slot system)...');
  
  try {
    // Create backup
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${BACKUP_DIR}/slot-fix-backup-${timestamp}.db`;
    console.log(`📦 Creating backup: ${backupPath}`);
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Check current slot configuration
    console.log('🔍 Current slot configuration:');
    const currentSlots = execSync(`sqlite3 "${DB_PATH}" "SELECT slotId, isActive FROM Slot ORDER BY slotId;"`, { encoding: 'utf8' });
    console.log(currentSlots);
    
    // Deactivate slots 13-15 for CU12 system
    console.log('📴 Deactivating slots 13-15 for CU12 system...');
    
    const deactivateSQL = `
      UPDATE Slot 
      SET isActive = 0 
      WHERE slotId > 12;
    `;
    
    execSync(`sqlite3 "${DB_PATH}" "${deactivateSQL}"`, { encoding: 'utf8' });
    console.log('✅ Slots 13-15 deactivated successfully');
    
    // Verify the changes
    console.log('🔍 Updated slot configuration:');
    const updatedSlots = execSync(`sqlite3 "${DB_PATH}" "SELECT slotId, isActive FROM Slot ORDER BY slotId;"`, { encoding: 'utf8' });
    console.log(updatedSlots);
    
    // Get summary
    const activeSlots = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM Slot WHERE isActive = 1;"`, { encoding: 'utf8' });
    const inactiveSlots = execSync(`sqlite3 "${DB_PATH}" "SELECT COUNT(*) FROM Slot WHERE isActive = 0;"`, { encoding: 'utf8' });
    
    console.log('📊 Summary:');
    console.log(`  Active slots: ${activeSlots.trim()}`);
    console.log(`  Inactive slots: ${inactiveSlots.trim()}`);
    
    if (activeSlots.trim() === '12') {
      console.log('🎉 Slot configuration fixed successfully! CU12 now has 12 active slots.');
    } else {
      console.log('⚠️ Unexpected active slot count. Expected 12.');
    }
    
    console.log(`📦 Backup saved at: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Slot configuration fix failed:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixSlotConfiguration();