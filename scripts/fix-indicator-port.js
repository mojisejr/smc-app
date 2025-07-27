const { execSync } = require('child_process');
const fs = require('fs');

const DB_PATH = 'resources/db/database.db';
const BACKUP_DIR = 'resources/db/backups';

async function fixIndicatorPort() {
  console.log('🔧 Fixing Indicator Port Configuration...');
  
  try {
    // Create backup
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${BACKUP_DIR}/indicator-fix-backup-${timestamp}.db`;
    console.log(`📦 Creating backup: ${backupPath}`);
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Check current indicator configuration
    console.log('🔍 Current indicator configuration:');
    const currentConfig = execSync(`sqlite3 "${DB_PATH}" "SELECT indi_port, indi_baudrate FROM Setting WHERE id = 1;"`, { encoding: 'utf8' });
    console.log(`Current: ${currentConfig.trim()}`);
    
    // Detect platform and set appropriate port
    const platform = process.platform;
    console.log(`🖥️ Detected platform: ${platform}`);
    
    let newPort;
    if (platform === 'darwin') {
      // macOS - use /dev/tty format or disable
      newPort = '/dev/tty.usbserial-indicator'; // Placeholder - will be skipped by our logic
      console.log('📝 Setting macOS-compatible indicator port (will be skipped if not available)');
    } else if (platform === 'win32') {
      // Windows - keep COM format
      newPort = 'COM5';
      console.log('📝 Keeping Windows COM port format');
    } else {
      // Linux - use /dev/ttyUSB format
      newPort = '/dev/ttyUSB1';
      console.log('📝 Setting Linux-compatible indicator port');
    }
    
    // Update indicator port in database
    const updateSQL = `
      UPDATE Setting 
      SET indi_port = '${newPort}'
      WHERE id = 1;
    `;
    
    execSync(`sqlite3 "${DB_PATH}" "${updateSQL}"`, { encoding: 'utf8' });
    console.log('✅ Indicator port updated successfully');
    
    // Verify the changes
    console.log('🔍 Updated indicator configuration:');
    const updatedConfig = execSync(`sqlite3 "${DB_PATH}" "SELECT indi_port, indi_baudrate FROM Setting WHERE id = 1;"`, { encoding: 'utf8' });
    console.log(`Updated: ${updatedConfig.trim()}`);
    
    console.log('💡 Note: The background.ts logic will automatically skip incompatible ports');
    console.log('💡 This prevents UnhandledPromiseRejectionWarning errors');
    
    console.log(`📦 Backup saved at: ${backupPath}`);
    console.log('🎉 Indicator port configuration fixed successfully!');
    
  } catch (error) {
    console.error('❌ Indicator port fix failed:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixIndicatorPort();