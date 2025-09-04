import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { CSVProcessor, CSVDeploymentRow } from './csv-parser';
import { generateSampleLicenseFile } from './license-generator';
import { GenerateOptions } from '../types';

export interface BatchOptions {
  inputCSV: string;
  outputDir?: string;
  updateCSV?: boolean;
  skipExisting?: boolean;
  expiryDays?: number;
  expiryMonths?: number;
  expiryYears?: number;
  noExpiry?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface BatchResult {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  errors: Array<{customerId: string, error: string}>;
}

/**
 * ประมวลผล CSV batch licenses
 */
export async function processBatchLicenses(options: BatchOptions): Promise<BatchResult> {
  const result: BatchResult = {
    total: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  console.log(chalk.blue('\n🚀 Starting CSV batch processing...'));
  console.log(chalk.gray(`Input CSV: ${options.inputCSV}`));

  // Load CSV data
  const csvProcessor = new CSVProcessor(options.inputCSV);
  await csvProcessor.load();

  // Get pending records
  const pendingRecords = csvProcessor.getPendingRecords();
  result.total = pendingRecords.length;

  console.log(chalk.cyan(`\n📊 Processing Summary:`));
  console.log(chalk.white(`   Total pending records: ${result.total}`));
  
  if (result.total === 0) {
    const stats = csvProcessor.getProcessingStats();
    console.log(chalk.yellow('\n⚠️  No pending records found to process'));
    console.log(chalk.gray(`   Total: ${stats.total}, Completed: ${stats.completed}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`));
    return result;
  }

  // Ensure output directory exists
  const outputDir = options.outputDir || path.dirname(options.inputCSV);
  await fs.mkdir(outputDir, { recursive: true });
  console.log(chalk.gray(`   Output directory: ${outputDir}`));

  if (options.dryRun) {
    console.log(chalk.yellow('\n🧪 DRY RUN MODE - No licenses will be generated'));
  }

  // Process each record
  for (let i = 0; i < pendingRecords.length; i++) {
    const record = pendingRecords[i];
    const progress = `[${i + 1}/${result.total}]`;
    
    try {
      console.log(chalk.cyan(`\n${progress} Processing ${record.customerId}...`));

      if (options.verbose) {
        console.log(chalk.gray(`   Organization: ${record.organization}`));
        console.log(chalk.gray(`   Application: ${record.applicationName}`));
        console.log(chalk.gray(`   MAC: ${record.macAddress}`));
        console.log(chalk.gray(`   Expiry: ${record.noExpiry ? 'No expiry (permanent)' : record.expiryDate}`));
      }

      // Check if license file already exists
      const licenseFileName = `${record.customerId}-license.lic`;
      const licenseFilePath = path.join(outputDir, licenseFileName);

      if (options.skipExisting && await fileExists(licenseFilePath)) {
        console.log(chalk.yellow(`${progress} Skipping ${record.customerId} - license file already exists`));
        result.skipped++;
        
        // Update CSV status if requested
        if (options.updateCSV) {
          await csvProcessor.updateRecord(record.customerId, {
            licenseStatus: 'completed',
            licenseFile: licenseFileName,
            notes: 'License already existed - skipped'
          });
        }
        continue;
      }

      // Determine expiry date
      const expiryDate = calculateExpiryDate(record.expiryDate, options);

      if (options.dryRun) {
        console.log(chalk.blue(`${progress} [DRY RUN] Would generate license for ${record.customerId}`));
        console.log(chalk.gray(`   Organization: ${record.organization}`));
        console.log(chalk.gray(`   Expiry: ${record.noExpiry ? 'No expiry (permanent)' : expiryDate}`));
        console.log(chalk.gray(`   Output: ${licenseFilePath}`));
        result.processed++;
        continue;
      }

      // Generate license
      console.log(chalk.blue(`${progress} Generating license for ${record.organization}...`));
      
      // สร้าง GenerateOptions จาก CSV record
      const generateOptions: GenerateOptions = {
        org: record.organization,
        customer: record.customerId,
        app: record.applicationName,
        expiry: expiryDate,
        esp32Ip: record.ipAddress || '192.168.4.1', // Default IP
        wifiSsid: record.wifiSSID,
        wifiPassword: record.wifiPassword,
        output: licenseFilePath
      };

      // ใช้ sample generator เพราะใน batch mode เราไม่มี ESP32 ที่เชื่อมต่อจริง
      // MAC address จะใช้จาก CSV
      const generatedPath = await generateSampleLicenseFile(generateOptions, record.macAddress);

      if (generatedPath) {
        console.log(chalk.green(`${progress} ✅ Successfully generated license for ${record.customerId}`));
        result.processed++;

        // Update CSV status
        if (options.updateCSV) {
          await csvProcessor.updateRecord(record.customerId, {
            licenseStatus: 'completed',
            licenseFile: licenseFileName,
            notes: `Generated on ${new Date().toISOString().split('T')[0]} via batch processing`
          });
        }

        if (options.verbose) {
          console.log(chalk.gray(`   License file: ${generatedPath}`));
          console.log(chalk.gray(`   Expiry date: ${record.noExpiry ? 'No expiry (permanent)' : expiryDate}`));
        }
      } else {
        throw new Error('License generation returned empty path');
      }

    } catch (error: any) {
      console.log(chalk.red(`${progress} ❌ Failed to process ${record.customerId}: ${error.message}`));
      result.failed++;
      result.errors.push({
        customerId: record.customerId,
        error: error.message
      });

      // Update CSV status
      if (options.updateCSV) {
        try {
          await csvProcessor.updateRecord(record.customerId, {
            licenseStatus: 'failed',
            notes: `Error: ${error.message}`
          });
        } catch (updateError) {
          console.log(chalk.red(`${progress} ❌ Failed to update CSV for ${record.customerId}: ${updateError}`));
        }
      }
    }
  }

  // Save updated CSV
  if (options.updateCSV && !options.dryRun) {
    try {
      await csvProcessor.save();
      console.log(chalk.green(`\n💾 Updated CSV file with processing results`));
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to save updated CSV: ${error}`));
    }
  }

  // Print summary
  console.log(chalk.blue(`\n📊 Batch Processing Summary:`));
  console.log(chalk.gray('====================================='));
  console.log(chalk.white(`   Total records: ${result.total}`));
  console.log(chalk.green(`   Processed: ${result.processed}`));
  console.log(chalk.yellow(`   Skipped: ${result.skipped}`));
  console.log(chalk.red(`   Failed: ${result.failed}`));

  if (result.errors.length > 0) {
    console.log(chalk.red(`\n❌ Processing Errors:`));
    result.errors.forEach(error => {
      console.log(chalk.red(`   ${error.customerId}: ${error.error}`));
    });
  }

  // Success/failure message
  if (result.failed === 0) {
    console.log(chalk.green(`\n🎉 Batch processing completed successfully!`));
  } else {
    console.log(chalk.yellow(`\n⚠️  Batch processing completed with ${result.failed} failures`));
  }

  // Next steps
  if (!options.dryRun && result.processed > 0) {
    console.log(chalk.blue(`\n📝 Next Steps:`));
    console.log(chalk.gray(`   1. Review generated license files in: ${outputDir}`));
    console.log(chalk.gray(`   2. Check updated CSV file: ${options.inputCSV}`));
    console.log(chalk.gray(`   3. Package license files with customer applications`));
    console.log(chalk.gray(`   4. Deploy to customer environments`));
  }

  return result;
}

/**
 * คำนวณ expiry date ตาม priority: CLI options > CSV record > default (1 year)
 */
function calculateExpiryDate(recordExpiry: string | undefined, options: BatchOptions): string {
  if (options.noExpiry) {
    return '2099-12-31'; // Far future date for "no expiry"
  }

  const baseDate = new Date();

  if (options.expiryDays) {
    baseDate.setDate(baseDate.getDate() + options.expiryDays);
  } else if (options.expiryMonths) {
    baseDate.setMonth(baseDate.getMonth() + options.expiryMonths);
  } else if (options.expiryYears) {
    baseDate.setFullYear(baseDate.getFullYear() + options.expiryYears);
  } else if (recordExpiry && recordExpiry !== '') {
    return recordExpiry; // Use expiry from CSV
  } else {
    baseDate.setFullYear(baseDate.getFullYear() + 1); // Default 1 year
  }

  return baseDate.toISOString().split('T')[0];
}

/**
 * ตรวจสอบว่าไฟล์มีอยู่หรือไม่
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate batch options
 */
export function validateBatchOptions(options: BatchOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check input CSV file
  if (!options.inputCSV) {
    errors.push('Input CSV file is required');
  }

  // Check expiry options (only one should be specified)
  const expiryOptions = [options.expiryDays, options.expiryMonths, options.expiryYears, options.noExpiry]
    .filter(Boolean).length;
  
  if (expiryOptions > 1) {
    errors.push('Only one expiry option can be specified (--expiry-days, --expiry-months, --expiry-years, or --no-expiry)');
  }

  // Validate expiry values
  if (options.expiryDays && (options.expiryDays <= 0 || options.expiryDays > 3650)) {
    errors.push('Expiry days must be between 1 and 3650 (10 years)');
  }

  if (options.expiryMonths && (options.expiryMonths <= 0 || options.expiryMonths > 120)) {
    errors.push('Expiry months must be between 1 and 120 (10 years)');
  }

  if (options.expiryYears && (options.expiryYears <= 0 || options.expiryYears > 10)) {
    errors.push('Expiry years must be between 1 and 10');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Preview batch processing (without generating licenses)
 */
export async function previewBatchProcessing(csvPath: string): Promise<{
  totalRecords: number;
  pendingRecords: number;
  stats: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  sampleRecords: CSVDeploymentRow[];
}> {
  const csvProcessor = new CSVProcessor(csvPath);
  await csvProcessor.load();

  const pendingRecords = csvProcessor.getPendingRecords();
  const stats = csvProcessor.getProcessingStats();
  const sampleRecords = pendingRecords.slice(0, 3); // แสดง 3 records แรก

  return {
    totalRecords: stats.total,
    pendingRecords: pendingRecords.length,
    stats,
    sampleRecords
  };
}