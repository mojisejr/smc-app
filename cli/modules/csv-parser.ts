import * as fs from 'fs';
import * as path from 'path';

export interface CSVDeploymentRow {
  timestamp: string;
  organization: string;
  customerId: string;
  applicationName: string;
  wifiSSID: string;
  wifiPassword: string;
  macAddress: string;
  ipAddress: string;
  expiryDate: string;
  licenseStatus: 'pending' | 'completed' | 'failed' | 'skipped';
  licenseFile: string;
  notes: string;
  noExpiry?: boolean; // Flag to indicate if this was originally a no-expiry record
}

export class CSVProcessor {
  private csvPath: string;
  private data: CSVDeploymentRow[] = [];
  private header: string[] = [];
  private backupPath: string;

  constructor(csvPath: string) {
    this.csvPath = csvPath;
    // สร้าง backup path สำหรับเก็บไฟล์เดิม
    this.backupPath = csvPath.replace('.csv', '.backup.csv');
  }

  async load(): Promise<void> {
    console.log(`info: Loading CSV file: ${this.csvPath}`);
    
    const content = await fs.promises.readFile(this.csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    this.header = this.parseCSVLine(lines[0]);
    console.log(`info: CSV header: ${this.header.join(', ')}`);
    
    // Validate required columns
    const requiredColumns = ['organization', 'customer_id', 'application_name', 'wifi_ssid', 'wifi_password', 'mac_address'];
    const missingColumns = requiredColumns.filter(col => !this.header.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === this.header.length) {
        const row = this.parseRowToObject(values);
        this.data.push(row);
      } else {
        console.log(`warn: Skipping malformed row ${i}: ${lines[i]}`);
      }
    }

    console.log(`info: Loaded ${this.data.length} deployment records from CSV`);
  }

  /**
   * Get records ที่ยังไม่ได้สร้าง license (status = pending)
   */
  getPendingRecords(): CSVDeploymentRow[] {
    const pending = this.data.filter(row => row.licenseStatus === 'pending');
    console.log(`info: Found ${pending.length} pending records out of ${this.data.length} total records`);
    return pending;
  }

  /**
   * Get all records
   */
  getAllRecords(): CSVDeploymentRow[] {
    return [...this.data];
  }

  /**
   * อัปเดตข้อมูลของ record ตาม customer ID
   */
  async updateRecord(customerId: string, updates: Partial<CSVDeploymentRow>): Promise<void> {
    const recordIndex = this.data.findIndex(row => row.customerId === customerId);
    if (recordIndex === -1) {
      throw new Error(`Customer ID ${customerId} not found in CSV`);
    }

    // Update record
    this.data[recordIndex] = { ...this.data[recordIndex], ...updates };
    
    console.log(`info: Updated CSV record for customer ${customerId}`);
    console.log(`info: New status: ${this.data[recordIndex].licenseStatus}`);
    if (updates.licenseFile) {
      console.log(`info: License file: ${updates.licenseFile}`);
    }
  }

  /**
   * บันทึก CSV file พร้อม backup เดิม
   */
  async save(): Promise<void> {
    try {
      // สร้าง backup ก่อน (ถ้ายังไม่มี)
      if (!await this.fileExists(this.backupPath)) {
        await fs.promises.copyFile(this.csvPath, this.backupPath);
        console.log(`info: Created backup: ${this.backupPath}`);
      }

      const lines: string[] = [];
      
      // Add header
      lines.push(this.header.map(h => `"${h}"`).join(','));
      
      // Add data rows
      for (const row of this.data) {
        const values = this.header.map(col => {
          const value = (row as any)[this.toCamelCase(col)] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        lines.push(values.join(','));
      }

      await fs.promises.writeFile(this.csvPath, lines.join('\n') + '\n', 'utf-8');
      console.log(`info: Updated CSV file: ${this.csvPath}`);
      console.log(`info: Total records: ${this.data.length}`);

    } catch (error) {
      throw new Error(`Failed to save CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ตรวจสอบสถิติการประมวลผล
   */
  getProcessingStats(): {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    skipped: number;
  } {
    const stats = {
      total: this.data.length,
      pending: 0,
      completed: 0,
      failed: 0,
      skipped: 0
    };

    this.data.forEach(row => {
      stats[row.licenseStatus]++;
    });

    return stats;
  }

  /**
   * Simple CSV parser (handles quoted fields with commas)
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"' && (i === 0 || line[i-1] === ',')) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && (i === line.length - 1 || line[i+1] === ',')) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (char !== '"' || inQuotes) {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * แปลง CSV row เป็น CSVDeploymentRow object
   */
  private parseRowToObject(values: string[]): CSVDeploymentRow {
    const obj: any = {};
    
    this.header.forEach((col, index) => {
      const camelCaseKey = this.toCamelCase(col);
      obj[camelCaseKey] = values[index] || '';
    });

    // Handle empty expiry date (indicates no expiry / permanent license)
    let expiryDate: string;
    let noExpiry = false;
    if (!obj.expiryDate || obj.expiryDate.trim() === '') {
      // Empty expiry date means no expiry - use far future date for processing
      expiryDate = '2099-12-31';
      noExpiry = true;
    } else {
      expiryDate = obj.expiryDate;
    }

    return {
      timestamp: obj.timestamp,
      organization: obj.organization,
      customerId: obj.customerId,
      applicationName: obj.applicationName,
      wifiSSID: obj.wifiSsid,
      wifiPassword: obj.wifiPassword,
      macAddress: obj.macAddress,
      ipAddress: obj.ipAddress,
      expiryDate: expiryDate,
      licenseStatus: (obj.licenseStatus as any) || 'pending',
      licenseFile: obj.licenseFile || '',
      notes: obj.notes || '',
      noExpiry: noExpiry
    };
  }

  /**
   * แปลง snake_case เป็น camelCase
   */
  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * คำนวณ default expiry date (1 ปี)
   */
  private calculateDefaultExpiry(): string {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0];
  }

  /**
   * ตรวจสอบว่าไฟล์มีอยู่หรือไม่
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Utility function สำหรับ validate CSV file format
 */
export async function validateCSVFormat(csvPath: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const result = {
    valid: false,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    const content = await fs.promises.readFile(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      result.errors.push('CSV file is empty');
      return result;
    }

    if (lines.length === 1) {
      result.errors.push('CSV file has no data rows (only header)');
      return result;
    }

    // ตรวจสอบ header format
    const header = lines[0];
    const expectedColumns = ['timestamp', 'organization', 'customer_id', 'application_name', 'wifi_ssid', 'wifi_password', 'mac_address', 'ip_address'];
    const headerColumns = header.split(',').map(col => col.replace(/"/g, '').trim());
    
    const missingColumns = expectedColumns.filter(col => !headerColumns.includes(col));
    if (missingColumns.length > 0) {
      result.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // ตรวจสอบ new columns (optional)
    const newColumns = ['expiry_date', 'license_status', 'license_file', 'notes'];
    const hasNewColumns = newColumns.every(col => headerColumns.includes(col));
    if (!hasNewColumns) {
      result.warnings.push('CSV file appears to be in old format (missing license management columns)');
      result.warnings.push('New columns will be added when processing');
    }

    // ตรวจสอบ data rows
    for (let i = 1; i < Math.min(lines.length, 6); i++) { // ตรวจสอบแค่ 5 rows แรก
      const row = lines[i];
      const fields = row.split(',');
      
      if (fields.length < expectedColumns.length) {
        result.errors.push(`Row ${i} has insufficient fields (${fields.length} < ${expectedColumns.length}): ${row.substring(0, 100)}...`);
      }
    }

    if (result.errors.length === 0) {
      result.valid = true;
    }

    console.log(`info: CSV validation completed - Valid: ${result.valid}, Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

  } catch (error) {
    result.errors.push(`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}