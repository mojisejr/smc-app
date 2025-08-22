import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExportData } from './export';

export interface CSVExportData {
  timestamp: string;
  organization: string;
  customer_id: string;
  application_name: string;
  wifi_ssid: string;
  wifi_password: string;
  mac_address: string;
  ip_address: string;
}

export interface CSVExportResult {
  success: boolean;
  filePath: string;
  filename: string;
  isNewFile: boolean;
  rowsTotal: number;
  error?: string;
}

export class CSVExporter {
  // CSV Header สำหรับไฟล์ใหม่
  private static readonly CSV_HEADER = 'timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address';

  /**
   * Export data to daily CSV file with date rollover and append functionality
   */
  static async exportDailyCSV(data: ExportData): Promise<CSVExportResult> {
    try {
      console.log('info: Starting CSV export process...');
      
      // สร้าง filename แบบ daily (YYYY-MM-DD)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `esp32-deployments-${today}.csv`;
      
      // Container-aware path selection (same logic as JSON export)
      const isContainer = !!process.env.DOCKER_CONTAINER;
      let exportPath: string;
      
      if (isContainer) {
        // In container: use /app/exports which is mapped to host Desktop
        exportPath = path.join(process.cwd(), 'exports');
        console.log('info: Using container CSV export path (mapped to host Desktop):', exportPath);
      } else {
        // Local development: use actual Desktop path with subdirectory
        exportPath = path.join(os.homedir(), 'Desktop', 'esp32-exports');
        console.log('info: Using local Desktop CSV export path:', exportPath);
      }
      
      // Ensure export directory exists
      await fs.promises.mkdir(exportPath, { recursive: true });
      
      const filePath = path.join(exportPath, filename);
      
      // ตรวจสอบว่าไฟล์มีอยู่แล้วหรือไม่
      const fileExists = await fs.promises.access(filePath)
        .then(() => true)
        .catch(() => false);
      
      console.log(`info: CSV file ${fileExists ? 'exists' : 'does not exist'}: ${filePath}`);
      
      // แปลง ExportData เป็น CSV format
      const csvData = CSVExporter.convertExportDataToCSV(data);
      const csvRow = CSVExporter.formatDataAsCSVRow(csvData);
      
      let csvContent: string;
      let rowsTotal = 1; // เพิ่ม 1 row ใหม่
      
      if (!fileExists) {
        // ไฟล์ใหม่: เพิ่ม header
        csvContent = CSVExporter.CSV_HEADER + '\n' + csvRow + '\n';
        console.log('info: Creating new CSV file with header');
      } else {
        // ไฟล์เดิม: append ต่อท้าย
        csvContent = csvRow + '\n';
        
        // นับจำนวน rows ที่มีอยู่
        try {
          const existingContent = await fs.promises.readFile(filePath, 'utf8');
          const existingRows = existingContent.split('\n').filter(line => line.trim() !== '');
          rowsTotal = existingRows.length; // total after adding new row
          console.log(`info: Appending to existing CSV file (${existingRows.length - 1} data rows + header)`);
        } catch (error) {
          console.log('warn: Could not count existing rows, using default count');
        }
      }
      
      // เขียนไฟล์ (create new หรือ append)
      await fs.promises.writeFile(filePath, csvContent, { 
        flag: fileExists ? 'a' : 'w',
        encoding: 'utf8' 
      });
      
      console.log('info: CSV export completed successfully');
      console.log(`info: File: ${filePath}`);
      console.log(`info: Total rows: ${rowsTotal} (including header)`);
      
      return {
        success: true,
        filePath,
        filename,
        isNewFile: !fileExists,
        rowsTotal
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('error: CSV export failed:', errorMessage);
      
      return {
        success: false,
        filePath: '',
        filename: '',
        isNewFile: false,
        rowsTotal: 0,
        error: errorMessage
      };
    }
  }
  
  /**
   * แปลง ExportData เป็น CSVExportData format
   */
  private static convertExportDataToCSV(data: ExportData): CSVExportData {
    return {
      timestamp: data.deployment.timestamp,
      organization: data.customer.organization,
      customer_id: data.customer.customerId,
      application_name: data.customer.applicationName,
      wifi_ssid: data.wifi.ssid,
      wifi_password: data.wifi.password,
      mac_address: data.esp32.macAddress,
      ip_address: data.esp32.ipAddress
    };
  }
  
  /**
   * แปลง CSVExportData เป็น CSV row string
   */
  static formatDataAsCSVRow(data: CSVExportData): string {
    const fields = [
      data.timestamp,
      data.organization,
      data.customer_id,
      data.application_name,
      data.wifi_ssid,
      data.wifi_password,
      data.mac_address,
      data.ip_address
    ];
    
    return fields.map(field => CSVExporter.escapeCSVField(field)).join(',');
  }
  
  /**
   * Escape CSV field เพื่อจัดการ commas, quotes, newlines
   */
  static escapeCSVField(field: string): string {
    if (!field) return '';
    
    const fieldStr = String(field);
    
    // ตรวจสอบว่าต้อง escape หรือไม่ (มี comma, quote, newline)
    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
      // Escape quotes โดยการ double quotes และ wrap ด้วย quotes
      const escapedField = fieldStr.replace(/"/g, '""');
      return `"${escapedField}"`;
    }
    
    return fieldStr;
  }
  
  /**
   * ตรวจสอบว่า CSV file มี format ที่ถูกต้อง
   */
  static async validateCSVFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        console.error('error: CSV file is empty');
        return false;
      }
      
      // ตรวจสอบ header
      const header = lines[0];
      if (header !== CSVExporter.CSV_HEADER) {
        console.error('error: CSV header does not match expected format');
        console.error(`Expected: ${CSVExporter.CSV_HEADER}`);
        console.error(`Found: ${header}`);
        return false;
      }
      
      // ตรวจสอบ data rows
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const fields = row.split(',');
        
        // Basic field count check (อาจมี quotes ทำให้ count ไม่ตรง แต่เป็น basic validation)
        if (fields.length < 8) {
          console.error(`error: CSV row ${i} has insufficient fields: ${row}`);
          return false;
        }
      }
      
      console.log(`info: CSV file validation passed: ${lines.length} total lines (1 header + ${lines.length - 1} data)`);
      return true;
      
    } catch (error) {
      console.error('error: CSV file validation failed:', error);
      return false;
    }
  }
}