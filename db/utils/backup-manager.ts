import fs from 'fs';
import path from 'path';
import { sequelize } from '../sequelize';

/**
 * Database Backup Manager
 * Handles automatic backups before migrations and critical operations
 */
export class BackupManager {
  private backupDir: string;
  
  constructor() {
    // Create backup directory relative to project root
    this.backupDir = path.join(process.cwd(), 'data', 'backups');
    this.ensureBackupDirectory();
  }
  
  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`[BACKUP] Created backup directory: ${this.backupDir}`);
    }
  }
  
  /**
   * Create a database backup with timestamp and phase info
   */
  async createBackup(phase: string, description?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `database_${phase}_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFilename);
      
      // Get the current database path
      const dbPath = path.join(process.cwd(), 'resources', 'db', 'database.db');
      
      // Check if source database exists
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Source database not found: ${dbPath}`);
      }
      
      // Copy database file
      fs.copyFileSync(dbPath, backupPath);
      
      // Create metadata file
      const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
      const metadata = {
        phase,
        description: description || `Backup created before ${phase}`,
        timestamp: new Date().toISOString(),
        originalPath: dbPath,
        backupPath,
        fileSize: fs.statSync(backupPath).size
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`[BACKUP] Created: ${backupFilename} (${metadata.fileSize} bytes)`);
      console.log(`[BACKUP] Description: ${metadata.description}`);
      
      return backupPath;
      
    } catch (error) {
      console.error('[BACKUP] Failed to create backup:', error.message);
      throw error;
    }
  }
  
  /**
   * Restore database from backup
   */
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      const dbPath = path.join(process.cwd(), 'resources', 'db', 'database.db');
      
      // Close current database connection
      await sequelize.close();
      
      // Create restore point of current database
      const restorePointPath = `${dbPath}.restore-point.${Date.now()}.db`;
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, restorePointPath);
        console.log(`[BACKUP] Created restore point: ${path.basename(restorePointPath)}`);
      }
      
      // Restore from backup
      fs.copyFileSync(backupPath, dbPath);
      
      console.log(`[BACKUP] Database restored from: ${path.basename(backupPath)}`);
      console.log(`[BACKUP] Restore point saved as: ${path.basename(restorePointPath)}`);
      
      // Note: Application needs to be restarted for changes to take effect
      console.log('[BACKUP] Please restart the application for changes to take effect');
      
    } catch (error) {
      console.error('[BACKUP] Failed to restore backup:', error.message);
      throw error;
    }
  }
  
  /**
   * List available backups
   */
  listBackups(): Array<{filename: string, path: string, metadata?: any}> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.endsWith('.db'))
        .map(filename => {
          const filePath = path.join(this.backupDir, filename);
          const metadataPath = path.join(this.backupDir, `${filename}.meta.json`);
          
          let metadata = null;
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {
              console.warn(`[BACKUP] Could not read metadata for ${filename}`);
            }
          }
          
          return {
            filename,
            path: filePath,
            metadata
          };
        })
        .sort((a, b) => {
          // Sort by timestamp (newest first)
          const timeA = a.metadata?.timestamp || a.filename;
          const timeB = b.metadata?.timestamp || b.filename;
          return timeB.localeCompare(timeA);
        });
      
      return backups;
      
    } catch (error) {
      console.error('[BACKUP] Failed to list backups:', error.message);
      return [];
    }
  }
  
  /**
   * Clean up old backups (keep last N backups)
   */
  cleanupOldBackups(keepCount: number = 10): void {
    try {
      const backups = this.listBackups();
      
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        
        toDelete.forEach(backup => {
          try {
            fs.unlinkSync(backup.path);
            
            // Delete metadata file if exists
            const metadataPath = `${backup.path}.meta.json`;
            if (fs.existsSync(metadataPath)) {
              fs.unlinkSync(metadataPath);
            }
            
            console.log(`[BACKUP] Deleted old backup: ${backup.filename}`);
          } catch (error) {
            console.warn(`[BACKUP] Could not delete ${backup.filename}:`, error.message);
          }
        });
        
        console.log(`[BACKUP] Cleanup completed. Keeping ${keepCount} most recent backups.`);
      } else {
        console.log(`[BACKUP] No cleanup needed. ${backups.length} backups (limit: ${keepCount})`);
      }
      
    } catch (error) {
      console.error('[BACKUP] Cleanup failed:', error.message);
    }
  }
  
  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        console.error(`[BACKUP] Backup file not found: ${backupPath}`);
        return false;
      }
      
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        console.error(`[BACKUP] Backup file is empty: ${backupPath}`);
        return false;
      }
      
      // Try to read SQLite header
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(backupPath, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      
      const header = buffer.toString('ascii', 0, 15);
      if (!header.startsWith('SQLite format 3')) {
        console.error(`[BACKUP] Invalid SQLite format: ${backupPath}`);
        return false;
      }
      
      console.log(`[BACKUP] Backup verified: ${path.basename(backupPath)} (${stats.size} bytes)`);
      return true;
      
    } catch (error) {
      console.error(`[BACKUP] Verification failed for ${backupPath}:`, error.message);
      return false;
    }
  }
  
  /**
   * Get backup statistics
   */
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup?: string;
    newestBackup?: string;
  } {
    try {
      const backups = this.listBackups();
      
      if (backups.length === 0) {
        return { totalBackups: 0, totalSize: 0 };
      }
      
      const totalSize = backups.reduce((sum, backup) => {
        try {
          return sum + fs.statSync(backup.path).size;
        } catch {
          return sum;
        }
      }, 0);
      
      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: backups[backups.length - 1]?.metadata?.timestamp || backups[backups.length - 1]?.filename,
        newestBackup: backups[0]?.metadata?.timestamp || backups[0]?.filename
      };
      
    } catch (error) {
      console.error('[BACKUP] Failed to get stats:', error.message);
      return { totalBackups: 0, totalSize: 0 };
    }
  }
}

// Export singleton instance
export const backupManager = new BackupManager();