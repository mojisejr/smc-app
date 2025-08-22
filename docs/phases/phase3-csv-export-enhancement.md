# Phase 3: CSV Export Enhancement & Daily Batch System

**ระยะเวลา:** 1-1.5 ชั่วโมง  
**เป้าหมาย:** เพิ่ม CSV export system เพื่อรองรับ batch processing และ sales workflow optimization

## 📖 Overview & Goals

### **วัตถุประสงค์:**
- เพิ่ม CSV export ควบคู่กับ JSON export ที่มีอยู่
- สร้าง daily batch file สำหรับ sales team workflow
- เตรียมพร้อมสำหรับ CLI batch processing (Phase 4)
- ไม่เปลี่ยนแปลง existing functionality

### **Deliverables:**
- ✅ Dual export system: JSON (individual) + CSV (daily batch)
- ✅ Daily CSV files with auto date rollover
- ✅ Append mode สำหรับ same-day deployments  
- ✅ CLI-ready CSV format for future batch processing
- ✅ Backward compatibility maintained

## 🔧 Technical Requirements

### **CSV Export Features:**
- Daily file management: `esp32-deployments-YYYY-MM-DD.csv`
- Auto date rollover เมื่อข้ามวัน
- Append mode สำหรับ multiple deployments ในวันเดียว
- Header management (สร้างครั้งแรก, skip ครั้งต่อไป)
- Export path เดิม: `~/Desktop/esp32-exports/`

### **File Output Strategy:**
```
~/Desktop/esp32-exports/
├── customer-ABC-2025-08-22.json      # Individual JSON (เดิม)
├── customer-XYZ-2025-08-22.json      # Individual JSON (เดิม)  
├── customer-DEF-2025-08-22.json      # Individual JSON (เดิม)
└── esp32-deployments-2025-08-22.csv  # Daily CSV (ใหม่ - รวมทั้ง 3 รายการ)
```

### **CSV Format Specification:**
```csv
timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address
2025-08-22T09:15:00.000Z,ABC,ABC,1234,SMC_ESP32_ABC,SMCABC198,f4:65:0b:58:66:a4,192.168.4.1
2025-08-22T14:30:00.000Z,XYZ Hospital,XYZ,SMC_Cabinet,SMC_ESP32_XYZ,SMCXYZ789,24:6f:28:a0:12:34,192.168.4.1
2025-08-22T16:45:00.000Z,DEF Clinic,DEF,Medical_Cart,SMC_ESP32_DEF,SMCDEF456,aa:bb:cc:dd:ee:ff,192.168.4.1
```

## 📝 Implementation Steps

### **Step 3.1: สร้าง CSV Export Module** (20 นาที)

#### **Step 3.1a: CSV Export Library (15 นาที)**

สร้าง `esp32-deployment-tool/src/lib/csv-export.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ExportData } from './export';

export interface CSVExportOptions {
  exportPath?: string;
  includeHeader?: boolean;
}

export class CSVExporter {
  private static readonly CSV_HEADER = 'timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address';

  /**
   * Export deployment data to daily CSV file
   * Auto-creates new file on date change, appends to existing file same day
   */
  static async exportDailyCSV(data: ExportData, options: CSVExportOptions = {}): Promise<string> {
    try {
      // Generate daily filename
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const csvFilename = `esp32-deployments-${today}.csv`;
      
      // Determine export path (container-aware)
      const isContainer = !!process.env.DOCKER_CONTAINER;
      let exportPath: string;
      
      if (options.exportPath) {
        exportPath = options.exportPath;
      } else if (isContainer) {
        // Container: use /app/exports (mapped to host Desktop)
        exportPath = path.join(process.cwd(), 'exports');
      } else {
        // Local development: use actual Desktop path
        exportPath = path.join(os.homedir(), 'Desktop', 'esp32-exports');
      }
      
      // Ensure export directory exists
      await fs.promises.mkdir(exportPath, { recursive: true });
      
      const csvPath = path.join(exportPath, csvFilename);
      
      // Check if file exists to determine if we need header
      const fileExists = fs.existsSync(csvPath);
      const needsHeader = !fileExists && options.includeHeader !== false;
      
      // Prepare CSV row
      const csvRow = this.formatDataAsCSVRow(data);
      
      // Write header if needed (new file)
      if (needsHeader) {
        await fs.promises.writeFile(csvPath, this.CSV_HEADER + '\n', 'utf8');
        console.log('info: Created new daily CSV file with header:', csvPath);
      }
      
      // Append data row
      await fs.promises.appendFile(csvPath, csvRow + '\n', 'utf8');
      
      console.log('info: Appended deployment data to daily CSV:', csvPath);
      
      return csvPath;
    } catch (error) {
      throw new Error(`Failed to export daily CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format ExportData as CSV row
   */
  private static formatDataAsCSVRow(data: ExportData): string {
    const fields = [
      data.deployment.timestamp,
      this.escapeCSVField(data.customer.organization),
      this.escapeCSVField(data.customer.customerId),
      this.escapeCSVField(data.customer.applicationName),
      this.escapeCSVField(data.wifi.ssid),
      this.escapeCSVField(data.wifi.password),
      data.esp32.macAddress,
      data.esp32.ipAddress || '192.168.4.1'
    ];
    
    return fields.join(',');
  }

  /**
   * Escape CSV field (handle commas, quotes, newlines)
   */
  private static escapeCSVField(field: string): string {
    if (!field) return '';
    
    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    
    return field;
  }

  /**
   * Validate CSV file format
   */
  static async validateCSVFile(csvPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const result = { valid: true, errors: [] as string[] };
    
    try {
      const content = await fs.promises.readFile(csvPath, 'utf8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) {
        result.valid = false;
        result.errors.push('CSV file is empty');
        return result;
      }
      
      // Check header
      const header = lines[0];
      if (header !== this.CSV_HEADER) {
        result.valid = false;
        result.errors.push('CSV header does not match expected format');
      }
      
      // Validate data rows (basic check)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const fields = this.parseCSVLine(line);
        if (fields.length !== 8) {
          result.valid = false;
          result.errors.push(`Line ${i + 1}: Expected 8 fields, got ${fields.length}`);
        }
        
        // Validate timestamp format (basic)
        const timestamp = fields[0];
        if (timestamp && !timestamp.includes('T') && !timestamp.includes('Z')) {
          result.valid = false;
          result.errors.push(`Line ${i + 1}: Invalid timestamp format`);
        }
      }
      
    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }

  /**
   * Simple CSV line parser (handles quoted fields)
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    fields.push(current);
    
    return fields;
  }

  /**
   * Get daily CSV statistics
   */
  static async getDailyStats(csvPath: string): Promise<{ totalDeployments: number; lastDeployment: string | null }> {
    try {
      const content = await fs.promises.readFile(csvPath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Subtract 1 for header
      const totalDeployments = Math.max(0, lines.length - 1);
      
      let lastDeployment: string | null = null;
      if (lines.length > 1) {
        const lastLine = lines[lines.length - 1];
        const fields = this.parseCSVLine(lastLine);
        lastDeployment = fields[0] || null; // timestamp
      }
      
      return { totalDeployments, lastDeployment };
    } catch (error) {
      return { totalDeployments: 0, lastDeployment: null };
    }
  }
}
```

#### **Step 3.1b: Type Definitions (5 นาที)**

อัปเดต `esp32-deployment-tool/src/types/index.ts`:

```typescript
// เพิ่ม interface สำหรับ CSV export
export interface CSVExportResult {
  success: boolean;
  csvPath?: string;
  csvFilename?: string;
  totalDeployments?: number;
  error?: string;
}

export interface DailyCSVStats {
  date: string;
  totalDeployments: number;
  lastDeployment: string | null;
  csvPath: string;
}
```

### **Step 3.2: อัปเดต Export API** (10 นาที)

#### **Step 3.2a: Enhanced Export Route (10 นาที)**

อัปเดต `esp32-deployment-tool/src/app/api/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { JSONExporter, ExportData } from '@/lib/export';
import { CSVExporter } from '@/lib/csv-export';

export async function POST(request: NextRequest) {
  try {
    const { customer, wifi, macAddress, ipAddress = '192.168.4.1' } = await request.json();
    
    console.log('info: Starting dual export process (JSON + CSV)...');
    
    // Prepare export data
    const exportData: ExportData = {
      customer,
      wifi,
      esp32: {
        macAddress,
        ipAddress
      },
      deployment: {
        timestamp: new Date().toISOString(),
        toolVersion: '1.0.0'
      }
    };

    // Step 1: Export to JSON file (existing functionality)
    console.log('info: Exporting individual JSON file...');
    const jsonFilePath = await JSONExporter.exportCustomerData(exportData);
    
    // Validate JSON export
    const isJSONValid = await JSONExporter.validateExportFile(jsonFilePath);
    if (!isJSONValid) {
      throw new Error('JSON export validation failed');
    }

    // Step 2: Export to daily CSV file (new functionality)
    console.log('info: Exporting to daily CSV file...');
    const csvFilePath = await CSVExporter.exportDailyCSV(exportData);
    
    // Validate CSV export
    const csvValidation = await CSVExporter.validateCSVFile(csvFilePath);
    if (!csvValidation.valid) {
      console.log('warning: CSV validation issues:', csvValidation.errors);
      // Don't fail the request, just warn
    }

    // Get daily stats
    const dailyStats = await CSVExporter.getDailyStats(csvFilePath);

    console.log('info: Dual export completed successfully');
    console.log('info: JSON export:', jsonFilePath);
    console.log('info: CSV export:', csvFilePath);
    console.log('info: Daily deployments:', dailyStats.totalDeployments);
    
    return NextResponse.json({
      success: true,
      
      // JSON export info (existing)
      filePath: jsonFilePath,
      filename: jsonFilePath.split('/').pop(),
      exportData,
      
      // CSV export info (new)
      csvPath: csvFilePath,
      csvFilename: csvFilePath.split('/').pop(),
      dailyStats,
      
      message: 'Customer data exported to both JSON and CSV successfully'
    });
  } catch (error) {
    console.error('error: Dual export failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### **Step 3.3: Testing & Validation** (15 นาที)

#### **Step 3.3a: CSV Export Testing Guide**

**Manual Testing Steps:**

1. **Single Deployment Test:**
```bash
cd esp32-deployment-tool/
npm run dev

# Deploy ESP32 1 ครั้ง
# ตรวจสอบ output:
ls ~/Desktop/esp32-exports/
# Expected: customer-{ID}-{date}.json + esp32-deployments-{date}.csv
```

2. **Multiple Same Day Test:**
```bash
# Deploy ESP32 หลายครั้งในวันเดียว
# ตรวจสอบ CSV file:
cat ~/Desktop/esp32-exports/esp32-deployments-$(date +%Y-%m-%d).csv
# Expected: Header + multiple data rows
```

3. **Date Rollover Test:**
```bash
# เปลี่ยนวันที่ system (หรือรอข้ามวัน)
# Deploy ESP32 ใหม่
# ตรวจสอบ: ไฟล์ CSV ใหม่ถูกสร้าง
```

4. **CSV Format Validation:**
```bash
# ตรวจสอบ CSV format ด้วย Excel หรือ text editor
# ตรวจสอบ special characters (comma, quotes) ใน data
```

#### **Step 3.3b: Error Handling Test**

```bash
# Test file permission issues
chmod 444 ~/Desktop/esp32-exports/  # Read-only
# Deploy และตรวจสอบ error handling

# Test disk space issues (ถ้าเป็นไปได้)
# Test invalid characters ใน customer data
```

## ✅ Success Criteria

### **CSV Export System:**
- [ ] **Daily CSV Files**: สร้างไฟล์ `esp32-deployments-YYYY-MM-DD.csv` ได้
- [ ] **Date Rollover**: สร้างไฟล์ใหม่เมื่อข้ามวัน
- [ ] **Append Mode**: เพิ่มข้อมูลในไฟล์เดิมสำหรับ same-day deployments
- [ ] **Header Management**: สร้าง header ครั้งแรก, skip ครั้งต่อไป
- [ ] **Data Integrity**: CSV format ถูกต้อง, เปิดด้วย Excel ได้

### **Dual Export Functionality:**
- [ ] **JSON Export**: ยังทำงานเหมือนเดิม (backward compatibility)
- [ ] **CSV Export**: ทำงานควบคู่โดยไม่กระทบ JSON
- [ ] **Error Handling**: หาก CSV export ล้มเหลว ไม่กระทบ JSON export
- [ ] **Performance**: Dual export ไม่ทำให้ response time ช้าเกินไป

### **File Organization:**
- [ ] **Export Path**: ใช้ path เดิม (`~/Desktop/esp32-exports/`)
- [ ] **Naming Convention**: `esp32-deployments-YYYY-MM-DD.csv`
- [ ] **File Structure**: Individual JSON + Daily CSV ในโฟลเดอร์เดียว
- [ ] **Container Compatibility**: ทำงานใน both local และ container modes

## 🧪 Manual Testing Checklist

### **CSV Export Workflow:**
- [ ] **New Day Test**: วันใหม่ → ไฟล์ CSV ใหม่
- [ ] **Same Day Test**: วันเดิม → append ข้อมูลเข้าไฟล์เดิม
- [ ] **Multiple Customers**: หลาย customers ในวันเดียว → รวมใน CSV เดียว
- [ ] **Special Characters**: Customer data มี comma, quotes → handle ถูกต้อง
- [ ] **Empty Fields**: บาง fields ว่าง → CSV format ยังถูกต้อง

### **Integration Testing:**
- [ ] **JSON + CSV**: ได้ทั้ง 2 format พร้อมกัน
- [ ] **Error Scenarios**: CSV fail แต่ JSON success → response ยังสำเร็จ
- [ ] **File Permissions**: Permission issues → error handling ดี
- [ ] **Container Mode**: ทำงานใน Docker container ได้

### **Data Validation:**
- [ ] **CSV Format**: เปิดด้วย Excel/Sheets ได้
- [ ] **Field Count**: ทุก row มี 8 fields
- [ ] **Timestamp Format**: ISO format ถูกต้อง
- [ ] **MAC Address**: Format valid
- [ ] **WiFi Credentials**: ข้อมูลครบถ้วน

## 🚨 Potential Issues & Solutions

### **Common Issues:**

**1. File Permission Errors**
```typescript
// Handle permission errors gracefully
try {
  await fs.promises.writeFile(csvPath, content);
} catch (error) {
  if (error.code === 'EACCES') {
    throw new Error('Permission denied: Cannot write to export directory');
  }
  throw error;
}
```

**2. CSV Format Issues**
```typescript
// Escape special characters properly
private static escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
```

**3. Date Rollover Edge Cases**
```typescript
// Use consistent date calculation
const today = new Date().toISOString().split('T')[0]; // Always UTC date
```

**4. Container Path Issues**
```typescript
// Container-aware path selection
const exportPath = process.env.DOCKER_CONTAINER 
  ? path.join(process.cwd(), 'exports')  // Container: mapped volume
  : path.join(os.homedir(), 'Desktop', 'esp32-exports'); // Local: actual Desktop
```

## ⏭️ Phase 4 Preparation

### **CLI Integration Ready:**
หลังจาก Phase 3 เสร็จ จะได้ CSV files พร้อมสำหรับ CLI batch processing:

```bash
# Phase 4 target commands (future):
smc-license batch --input esp32-deployments-2025-08-22.csv --expiry "2025-12-31"
# จะ generate license files ทั้งหมดในไฟล์ CSV

# Expected CLI workflow:
# 1. Sales team ใช้ ESP32 deployment tool ตลอดวัน
# 2. Copy daily CSV file ให้ developer  
# 3. Developer run CLI batch command เดียว
# 4. ได้ license files ทั้งหมด
```

### **CSV Format Compatibility:**
CSV format ที่สร้างใน Phase 3 จะ compatible กับ CLI batch processing requirements:
- Timestamp for audit trail
- Organization, customer_id, application_name for license generation
- WiFi credentials for ESP32 integration  
- MAC address for hardware binding

---

## 📊 Project Timeline

**Phase 3: CSV Export Enhancement** (1-1.5 ชั่วโมง)
- ✅ **Step 3.1**: CSV Export Module (20 นาที)
- ✅ **Step 3.2**: Export API Enhancement (10 นาที)  
- ✅ **Step 3.3**: Testing & Validation (15 นาที)
- ✅ **Documentation**: Phase documentation อัปเดต (15 นาที)

**Expected Output:** Dual export system (JSON + CSV) ทำงานสมบูรณ์, พร้อมสำหรับ Phase 4 CLI integration

**Next Phase:** CLI batch processing enhancement สำหรับรับ CSV input และ generate multiple license files