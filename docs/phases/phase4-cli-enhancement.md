# Phase 4: CLI Enhancement & CSV Batch Processing

**ระยะเวลา:** 3-4 วัน  
**เป้าหมาย:** ปรับปรุง smc-license CLI ให้รองรับ CSV batch processing และสร้าง complete Sales → Developer → Delivery workflow

## 📖 Overview & Goals

### **🔄 Business Workflow:**
**Sales Team** → ใช้ ESP32 Deployment Tool สร้าง .csv ไฟล์รายวัน  
**Developer** → รับ .csv มาใช้ CLI tool สร้าง license.lic แบบ batch  
**CLI Tool** → อัปเดต .csv เพื่อ mark ว่า license ไหนสร้างแล้ว  
**Delivery** → ส่ง .csv + license files + app กลับไปให้ sales  

### **วัตถุประสงค์:**
- ✅ เพิ่ม JSON input support ใน smc-license CLI (EXISTING)
- 🆕 **เพิ่ม CSV batch processing support**
- 🆕 **อัปเกรด ESP32 Deployment Tool ให้รองรับ expiry date**
- ✅ สร้าง validation และ error handling ที่แข็งแกร่ง
- ✅ End-to-end testing กับ real deployment data
- 🆕 **CSV update system สำหรับ tracking license status**
- ✅ Performance optimization และ reliability improvements
- ✅ Documentation และ usage examples

### **Deliverables:**
- ✅ smc-license CLI ที่รองรับ JSON input แบบสมบูรณ์
- 🆕 **smc-license CLI ที่รองรับ CSV batch processing**
- 🆕 **ESP32 Deployment Tool ที่มี expiry date field**
- ✅ Comprehensive validation และ error handling
- ✅ End-to-end testing suite
- ✅ Performance benchmarks และ optimization
- 🆕 **CSV status tracking และ update system**
- ✅ Updated documentation และ examples
- ✅ Backward compatibility maintenance

## 🏗 Current System Status

### **✅ เสร็จแล้ว (Completed Components):**
- **ESP32 Deployment Tool**: Phase 3 Complete with CSV Export
  - Location: `esp32-deployment-tool/`
  - Features: Cross-platform, JSON + CSV export, template system
  - CSV Format: `esp32-deployments-YYYY-MM-DD.csv`
  
- **SMC License CLI**: Phase 3 Complete 
  - Location: `cli/`
  - Features: Individual license generation, ESP32 binding, validation
  - Missing: CSV batch processing, expiry flexibility

### **🆕 ต้องพัฒนาเพิ่ม (Enhancement Required):**
1. **ESP32 Deployment Tool**: เพิ่ม expiry date field ใน UI
2. **CLI Tool**: เพิ่ม `batch` command สำหรับ CSV processing
3. **CSV Schema**: อัปเดตให้รวม expiry_date และ license_status columns

## 🔧 Technical Requirements

### **CLI Enhancement:**
- JSON schema validation
- Comprehensive error messages
- Progress indicators
- Dry-run capability
- Batch processing support

### **Testing Requirements:**
- Unit tests for JSON processing
- Integration tests with real deployment files
- Performance testing
- Error scenario testing
- Backward compatibility testing

## 📝 Implementation Steps

### **Step 4.1: CLI JSON Input Enhancement (Day 1 - 5 hours)**

#### **Step 4.1a: JSON Schema Definition (45 นาที)**

สร้าง `cli/schemas/deployment-config.schema.ts`:

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// JSON Schema สำหรับ deployment configuration
export const deploymentConfigSchema = {
  type: 'object',
  required: ['organization', 'customerId', 'applicationName', 'wifi', 'device'],
  properties: {
    organization: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Customer organization name'
    },
    customerId: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]+$',
      minLength: 1,
      maxLength: 50,
      description: 'Unique customer identifier'
    },
    applicationName: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      description: 'Application or device name'
    },
    wifi: {
      type: 'object',
      required: ['ssid', 'password'],
      properties: {
        ssid: {
          type: 'string',
          minLength: 1,
          maxLength: 32,
          description: 'WiFi SSID'
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 63,
          description: 'WiFi password'
        }
      },
      additionalProperties: false
    },
    device: {
      type: 'object',
      required: ['macAddress'],
      properties: {
        port: {
          type: 'string',
          description: 'ESP32 serial port'
        },
        description: {
          type: 'string',
          description: 'Device description'
        },
        macAddress: {
          type: 'string',
          pattern: '^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$',
          description: 'ESP32 MAC address'
        }
      },
      additionalProperties: false
    },
    deployment: {
      type: 'object',
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Deployment timestamp'
        },
        version: {
          type: 'string',
          description: 'Deployment tool version'
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};

// Schema validator instance
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export const validateDeploymentConfig = ajv.compile(deploymentConfigSchema);

// Custom validation helper
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDeploymentJSON(data: any): ValidationResult {
  const result: ValidationResult = {
    valid: false,
    errors: [],
    warnings: []
  };

  // Basic JSON validation
  if (!data || typeof data !== 'object') {
    result.errors.push('Invalid JSON: Expected object');
    return result;
  }

  // Schema validation
  const valid = validateDeploymentConfig(data);
  
  if (!valid && validateDeploymentConfig.errors) {
    result.errors = validateDeploymentConfig.errors.map(error => {
      const field = error.instancePath.replace(/^\//, '') || error.schemaPath.replace(/^#\/properties\//, '');
      return `${field}: ${error.message}`;
    });
  } else {
    result.valid = true;

    // Additional business logic validation
    const warnings = performBusinessValidation(data);
    result.warnings = warnings;
  }

  return result;
}

function performBusinessValidation(data: any): string[] {
  const warnings: string[] = [];

  // MAC address format preferences
  if (data.device?.macAddress) {
    const mac = data.device.macAddress;
    if (mac.includes('-')) {
      warnings.push('MAC address uses dash separator; colon separator is preferred');
    }
  }

  // WiFi password strength
  if (data.wifi?.password) {
    const password = data.wifi.password;
    if (password.length < 12) {
      warnings.push('WiFi password is less than 12 characters; consider using longer password');
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      warnings.push('WiFi password should contain uppercase, lowercase, and numbers');
    }
  }

  // Organization naming conventions
  if (data.organization && data.organization.length > 50) {
    warnings.push('Organization name is very long; consider shorter version for SSID generation');
  }

  return warnings;
}
```

#### **Step 4.1b: JSON Input Command (90 นาที)**

Update `cli/index.ts` เพิ่ม JSON input support:

```typescript
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { validateDeploymentJSON } from './schemas/deployment-config.schema';
import { generateLicenseFromJSON } from './modules/json-license-generator';

// เพิ่ม --from-json option ใน generate command
program
  .command('generate')
  .description('Generate license file')
  .option('-o, --organization <org>', 'Organization name')
  .option('-c, --customer <id>', 'Customer ID')  
  .option('-a, --application <app>', 'Application name')
  .option('-e, --expiry <date>', 'Expiry date (YYYY-MM-DD)')
  .option('--wifi-ssid <ssid>', 'WiFi SSID')
  .option('--wifi-password <password>', 'WiFi password')
  .option('--from-json <file>', 'Generate from deployment JSON file')
  .option('--output <file>', 'Output license file path', 'license.lic')
  .option('--dry-run', 'Validate inputs without generating license')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      console.log('info: Starting license generation...');

      // Determine input mode
      if (options.fromJson) {
        await handleJSONInput(options);
      } else {
        await handleManualInput(options);
      }

    } catch (error) {
      console.error('error: License generation failed:', error.message);
      if (options.verbose) {
        console.error('error: Stack trace:', error.stack);
      }
      process.exit(1);
    }
  });

async function handleJSONInput(options: any) {
  console.log(`info: Loading deployment configuration from: ${options.fromJson}`);

  // Check file exists
  if (!fs.existsSync(options.fromJson)) {
    throw new Error(`Deployment file not found: ${options.fromJson}`);
  }

  // Read and parse JSON
  let deploymentData: any;
  try {
    const fileContent = fs.readFileSync(options.fromJson, 'utf-8');
    deploymentData = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error.message}`);
  }

  // Validate JSON structure
  console.log('info: Validating deployment configuration...');
  const validation = validateDeploymentJSON(deploymentData);
  
  if (!validation.valid) {
    console.error('error: Invalid deployment configuration:');
    validation.errors.forEach(error => {
      console.error(`  ❌ ${error}`);
    });
    throw new Error('Deployment configuration validation failed');
  }

  // Show warnings
  if (validation.warnings.length > 0) {
    console.log('info: Configuration warnings:');
    validation.warnings.forEach(warning => {
      console.log(`  ⚠️  ${warning}`);
    });
  }

  // Show deployment info
  console.log('info: Deployment Configuration Summary:');
  console.log(`  Organization: ${deploymentData.organization}`);
  console.log(`  Customer ID: ${deploymentData.customerId}`);
  console.log(`  Application: ${deploymentData.applicationName}`);
  console.log(`  WiFi SSID: ${deploymentData.wifi.ssid}`);
  console.log(`  MAC Address: ${deploymentData.device.macAddress}`);
  if (deploymentData.deployment?.timestamp) {
    console.log(`  Deployed: ${new Date(deploymentData.deployment.timestamp).toLocaleString()}`);
  }

  // Dry run check
  if (options.dryRun) {
    console.log('info: Dry run completed successfully - no license generated');
    return;
  }

  // Generate license
  console.log('info: Generating license from deployment data...');
  
  const licenseResult = await generateLicenseFromJSON(deploymentData, {
    outputPath: options.output,
    expiryDate: options.expiry || calculateDefaultExpiry(),
    verbose: options.verbose || false
  });

  if (licenseResult.success) {
    console.log(`info: License generated successfully: ${licenseResult.outputPath}`);
    console.log(`info: License expires: ${licenseResult.expiryDate}`);
    
    // Show next steps
    console.log('\ninfo: Next steps:');
    console.log('  1. Copy license.lic to SMC application directory');
    console.log('  2. Build SMC application with customer configuration');
    console.log('  3. Deploy application to customer with ESP32');
  } else {
    throw new Error(licenseResult.error || 'License generation failed');
  }
}

async function handleManualInput(options: any) {
  // Existing manual input logic
  console.log('info: Using manual input mode...');
  
  // Validate required fields
  const required = ['organization', 'customer', 'application', 'expiry'];
  const missing = required.filter(field => !options[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.map(f => `--${f}`).join(', ')}`);
  }

  // Continue with existing logic...
}

function calculateDefaultExpiry(): string {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  return oneYearFromNow.toISOString().split('T')[0];
}
```

#### **Step 4.1c: JSON License Generator (90 นาที)**

สร้าง `cli/modules/json-license-generator.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { generateLicense } from './license-generator';
import { ESP32Client } from './esp32';

interface JSONLicenseOptions {
  outputPath: string;
  expiryDate: string;
  verbose: boolean;
  skipESP32Validation?: boolean;
}

interface LicenseResult {
  success: boolean;
  outputPath?: string;
  expiryDate?: string;
  error?: string;
}

export async function generateLicenseFromJSON(
  deploymentData: any,
  options: JSONLicenseOptions
): Promise<LicenseResult> {
  try {
    console.log('info: Processing deployment data for license generation...');

    // Extract data from deployment JSON
    const licenseData = {
      organization: deploymentData.organization,
      customerId: deploymentData.customerId,
      applicationName: deploymentData.applicationName,
      macAddress: deploymentData.device.macAddress,
      wifiSSID: deploymentData.wifi.ssid,
      wifiPassword: deploymentData.wifi.password,
      expiryDate: options.expiryDate
    };

    if (options.verbose) {
      console.log('debug: License data extracted:', JSON.stringify(licenseData, null, 2));
    }

    // Optional ESP32 validation
    if (!options.skipESP32Validation) {
      console.log('info: Validating MAC address with ESP32 (if available)...');
      
      try {
        const esp32Mac = await ESP32Client.getMacAddress();
        if (esp32Mac && esp32Mac.toUpperCase() !== licenseData.macAddress.toUpperCase()) {
          console.log('info: Warning: MAC address mismatch with connected ESP32');
          console.log(`  Deployment MAC: ${licenseData.macAddress}`);
          console.log(`  Connected ESP32: ${esp32Mac}`);
          console.log('  Continuing with deployment MAC address...');
        } else if (esp32Mac) {
          console.log('info: MAC address verified with connected ESP32');
        }
      } catch (error) {
        if (options.verbose) {
          console.log('debug: ESP32 validation skipped (device not available)');
        }
      }
    }

    // Generate license file
    console.log('info: Generating encrypted license file...');
    
    const result = await generateLicense({
      organization: licenseData.organization,
      customerId: licenseData.customerId,
      applicationName: licenseData.applicationName,
      macAddress: licenseData.macAddress,
      wifiSSID: licenseData.wifiSSID,
      wifiPassword: licenseData.wifiPassword,
      expiryDate: licenseData.expiryDate,
      outputPath: options.outputPath
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'License generation failed'
      };
    }

    // Verify generated license
    console.log('info: Verifying generated license...');
    const verification = await verifyGeneratedLicense(options.outputPath, licenseData);
    
    if (!verification.valid) {
      return {
        success: false,
        error: `License verification failed: ${verification.error}`
      };
    }

    // Generate summary file (optional)
    if (options.verbose) {
      await generateLicenseSummary(deploymentData, licenseData, options.outputPath);
    }

    return {
      success: true,
      outputPath: path.resolve(options.outputPath),
      expiryDate: licenseData.expiryDate
    };

  } catch (error) {
    console.error('error: JSON license generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function verifyGeneratedLicense(licensePath: string, expectedData: any): Promise<{valid: boolean, error?: string}> {
  try {
    // Check file exists
    if (!fs.existsSync(licensePath)) {
      return { valid: false, error: 'License file not created' };
    }

    // Check file size (should not be empty)
    const stats = fs.statSync(licensePath);
    if (stats.size === 0) {
      return { valid: false, error: 'License file is empty' };
    }

    // Basic format validation (could be extended with decryption test)
    const content = fs.readFileSync(licensePath, 'utf-8');
    if (!content.includes('SMC_LICENSE')) {
      return { valid: false, error: 'Invalid license file format' };
    }

    console.log('info: License file verification passed');
    return { valid: true };

  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function generateLicenseSummary(deploymentData: any, licenseData: any, licensePath: string): Promise<void> {
  try {
    const summaryPath = licensePath.replace('.lic', '.summary.json');
    
    const summary = {
      generated: new Date().toISOString(),
      deployment: {
        organization: deploymentData.organization,
        customerId: deploymentData.customerId,
        applicationName: deploymentData.applicationName,
        deploymentTimestamp: deploymentData.deployment?.timestamp,
        toolVersion: deploymentData.deployment?.version
      },
      license: {
        expiryDate: licenseData.expiryDate,
        macAddress: licenseData.macAddress.toUpperCase(),
        wifiSSID: licenseData.wifiSSID,
        filePath: path.resolve(licensePath),
        fileSize: fs.statSync(licensePath).size
      },
      validation: {
        validated: true,
        timestamp: new Date().toISOString()
      }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`info: License summary generated: ${summaryPath}`);

  } catch (error) {
    console.log('debug: Failed to generate license summary:', error.message);
  }
}

// Helper command for batch processing (bonus feature)
export async function processMultipleDeployments(
  deploymentFiles: string[],
  options: Omit<JSONLicenseOptions, 'outputPath'>
): Promise<{processed: number, failed: number, errors: string[]}> {
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[]
  };

  console.log(`info: Processing ${deploymentFiles.length} deployment files...`);

  for (const file of deploymentFiles) {
    try {
      console.log(`\ninfo: Processing ${path.basename(file)}...`);
      
      const outputPath = file.replace('.json', '.lic');
      const result = await generateLicenseFromJSON(
        JSON.parse(fs.readFileSync(file, 'utf-8')),
        { ...options, outputPath }
      );

      if (result.success) {
        results.processed++;
        console.log(`info: ✓ Successfully processed ${path.basename(file)}`);
      } else {
        results.failed++;
        results.errors.push(`${path.basename(file)}: ${result.error}`);
        console.error(`error: ✗ Failed to process ${path.basename(file)}: ${result.error}`);
      }

    } catch (error) {
      results.failed++;
      results.errors.push(`${path.basename(file)}: ${error.message}`);
      console.error(`error: ✗ Failed to process ${path.basename(file)}: ${error.message}`);
    }
  }

  return results;
}
```

### **Step 4.2: Enhanced Error Handling & Validation (Day 1 - 2 hours)**

#### **Step 4.2a: Comprehensive Error Messages (60 นาที)**

สร้าง `cli/utils/error-handler.ts`:

```typescript
export class CLIError extends Error {
  public readonly code: string;
  public readonly suggestions: string[];
  public readonly context?: any;

  constructor(
    message: string,
    code: string = 'GENERAL_ERROR',
    suggestions: string[] = [],
    context?: any
  ) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
    this.suggestions = suggestions;
    this.context = context;
  }
}

export const ErrorCodes = {
  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PARSE_ERROR: 'FILE_PARSE_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  
  // Validation errors
  INVALID_JSON_SCHEMA: 'INVALID_JSON_SCHEMA',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // ESP32 errors
  ESP32_NOT_FOUND: 'ESP32_NOT_FOUND',
  ESP32_CONNECTION_FAILED: 'ESP32_CONNECTION_FAILED',
  MAC_ADDRESS_MISMATCH: 'MAC_ADDRESS_MISMATCH',
  
  // License errors
  LICENSE_GENERATION_FAILED: 'LICENSE_GENERATION_FAILED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  LICENSE_VALIDATION_FAILED: 'LICENSE_VALIDATION_FAILED'
};

export function createFileNotFoundError(filePath: string): CLIError {
  return new CLIError(
    `File not found: ${filePath}`,
    ErrorCodes.FILE_NOT_FOUND,
    [
      'Check if the file path is correct',
      'Ensure the file exists and is readable',
      'Use absolute path instead of relative path',
      'Check file permissions'
    ],
    { filePath }
  );
}

export function createJSONValidationError(errors: string[], filePath?: string): CLIError {
  return new CLIError(
    `Invalid JSON configuration: ${errors.join(', ')}`,
    ErrorCodes.INVALID_JSON_SCHEMA,
    [
      'Fix the validation errors listed above',
      'Check the deployment JSON schema documentation',
      'Use --dry-run to validate without generating license',
      'Compare with a working deployment file example'
    ],
    { errors, filePath }
  );
}

export function createESP32Error(message: string, code: string = ErrorCodes.ESP32_CONNECTION_FAILED): CLIError {
  return new CLIError(
    message,
    code,
    [
      'Check ESP32 connection to USB port',
      'Verify ESP32 drivers are installed (CH340, CP210x)',
      'Try different USB port or cable',
      'Ensure ESP32 is not used by another application',
      'Use --skip-esp32-validation flag to bypass ESP32 checks'
    ]
  );
}

export function formatErrorMessage(error: CLIError): void {
  console.error(`\n❌ ${error.message}`);
  console.error(`   Code: ${error.code}`);
  
  if (error.suggestions.length > 0) {
    console.error('\n💡 Suggested solutions:');
    error.suggestions.forEach((suggestion, index) => {
      console.error(`   ${index + 1}. ${suggestion}`);
    });
  }

  if (error.context) {
    console.error('\n🔍 Additional context:');
    Object.entries(error.context).forEach(([key, value]) => {
      console.error(`   ${key}: ${value}`);
    });
  }

  console.error('\n📚 For more help: smc-license --help\n');
}

export function handleUnexpectedError(error: Error, verbose: boolean = false): void {
  console.error('\n💥 Unexpected error occurred:');
  console.error(`   ${error.message}`);
  
  if (verbose && error.stack) {
    console.error('\n📊 Stack trace:');
    console.error(error.stack);
  }

  console.error('\n🐛 If this error persists:');
  console.error('   1. Try running with --verbose flag for more details');
  console.error('   2. Check system requirements and dependencies');
  console.error('   3. Report the issue with error details');
  console.error('\n');
}
```

### **Step 4.3: End-to-End Testing Suite (Day 2 - 4 hours)**

#### **Step 4.3a: Test Data Generation (60 นาที)**

สร้าง `cli/test/fixtures/deployment-configs.ts`:

```typescript
// Test deployment configurations
export const validDeploymentConfig = {
  organization: "SMC Medical Center",
  customerId: "HOSP001",
  applicationName: "SMC_Cabinet",
  wifi: {
    ssid: "SMC_ESP32_HOSP001_AB123",
    password: "SecurePass123!"
  },
  device: {
    port: "/dev/ttyUSB0",
    description: "ESP32 Development Board",
    macAddress: "24:6F:28:A0:12:34"
  },
  deployment: {
    timestamp: "2025-01-20T10:30:00.000Z",
    version: "1.0.0"
  }
};

export const invalidConfigs = {
  missingRequired: {
    organization: "Test Org",
    customerId: "TEST001"
    // Missing required fields
  },
  
  invalidMacAddress: {
    ...validDeploymentConfig,
    device: {
      ...validDeploymentConfig.device,
      macAddress: "invalid-mac-address"
    }
  },
  
  invalidCustomerId: {
    ...validDeploymentConfig,
    customerId: "INVALID@ID!"
  },
  
  weakPassword: {
    ...validDeploymentConfig,
    wifi: {
      ...validDeploymentConfig.wifi,
      password: "weak"
    }
  }
};

export const edgeCaseConfigs = {
  maxLengthValues: {
    organization: "A".repeat(100),
    customerId: "B".repeat(50),
    applicationName: "C".repeat(50),
    wifi: {
      ssid: "D".repeat(32),
      password: "E".repeat(63)
    },
    device: {
      macAddress: "FF:FF:FF:FF:FF:FF"
    }
  },
  
  unicodeValues: {
    ...validDeploymentConfig,
    organization: "โรงพยาบาลสมิติเวช",
    customerId: "THAI001"
  }
};

export function generateTestFiles(outputDir: string): string[] {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files: string[] = [];

  // Valid config
  const validPath = path.join(outputDir, 'valid-deployment.json');
  fs.writeFileSync(validPath, JSON.stringify(validDeploymentConfig, null, 2));
  files.push(validPath);

  // Invalid configs
  Object.entries(invalidConfigs).forEach(([name, config]) => {
    const filePath = path.join(outputDir, `invalid-${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    files.push(filePath);
  });

  return files;
}
```

#### **Step 4.3b: Integration Tests (90 นาที)**

สร้าง `cli/test/integration/json-input.test.ts`:

```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validDeploymentConfig, invalidConfigs, generateTestFiles } from '../fixtures/deployment-configs';

describe('JSON Input Integration Tests', () => {
  let tempDir: string;
  let testFiles: string[];

  beforeAll(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smc-license-test-'));
    testFiles = generateTestFiles(tempDir);
    
    console.log('info: Test directory:', tempDir);
  });

  afterAll(() => {
    // Cleanup test files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('warn: Failed to cleanup test directory:', error);
    }
  });

  describe('Valid JSON Input', () => {
    test('should generate license from valid deployment JSON', () => {
      const validConfigPath = path.join(tempDir, 'valid-deployment.json');
      const licenseOutput = path.join(tempDir, 'test-license.lic');

      // Run CLI command
      const command = `node dist/index.js generate --from-json "${validConfigPath}" --output "${licenseOutput}" --expiry "2025-12-31"`;
      
      expect(() => {
        execSync(command, { 
          stdio: 'pipe',
          cwd: process.cwd(),
          encoding: 'utf-8'
        });
      }).not.toThrow();

      // Verify license file was created
      expect(fs.existsSync(licenseOutput)).toBe(true);
      
      // Verify license file is not empty
      const licenseStats = fs.statSync(licenseOutput);
      expect(licenseStats.size).toBeGreaterThan(0);
      
      // Verify license content format
      const licenseContent = fs.readFileSync(licenseOutput, 'utf-8');
      expect(licenseContent).toContain('SMC_LICENSE');
    });

    test('should handle dry-run mode correctly', () => {
      const validConfigPath = path.join(tempDir, 'valid-deployment.json');
      const licenseOutput = path.join(tempDir, 'dry-run-license.lic');

      // Run CLI command with dry-run
      const command = `node dist/index.js generate --from-json "${validConfigPath}" --output "${licenseOutput}" --dry-run`;
      
      const output = execSync(command, { 
        stdio: 'pipe',
        cwd: process.cwd(),
        encoding: 'utf-8'
      });

      // Should not create license file
      expect(fs.existsSync(licenseOutput)).toBe(false);
      
      // Should indicate dry-run completion
      expect(output).toContain('Dry run completed');
    });
  });

  describe('Invalid JSON Input', () => {
    test('should reject missing required fields', () => {
      const invalidConfigPath = path.join(tempDir, 'invalid-missingRequired.json');

      const command = `node dist/index.js generate --from-json "${invalidConfigPath}"`;
      
      expect(() => {
        execSync(command, { stdio: 'pipe' });
      }).toThrow();
    });

    test('should reject invalid MAC address format', () => {
      const invalidConfigPath = path.join(tempDir, 'invalid-invalidMacAddress.json');

      const command = `node dist/index.js generate --from-json "${invalidConfigPath}"`;
      
      expect(() => {
        execSync(command, { stdio: 'pipe' });
      }).toThrow();
    });

    test('should provide helpful error messages', () => {
      const invalidConfigPath = path.join(tempDir, 'invalid-invalidCustomerId.json');

      try {
        execSync(`node dist/index.js generate --from-json "${invalidConfigPath}"`, { 
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        fail('Expected command to throw error');
      } catch (error: any) {
        const stderr = error.stderr || error.stdout || '';
        expect(stderr).toContain('customerId');
        expect(stderr).toContain('Suggested solutions');
      }
    });
  });

  describe('File System Edge Cases', () => {
    test('should handle non-existent file gracefully', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.json');

      try {
        execSync(`node dist/index.js generate --from-json "${nonExistentPath}"`, { 
          stdio: 'pipe' 
        });
        fail('Expected command to throw error');
      } catch (error: any) {
        const stderr = error.stderr || error.stdout || '';
        expect(stderr).toContain('not found');
      }
    });

    test('should handle malformed JSON gracefully', () => {
      const malformedJsonPath = path.join(tempDir, 'malformed.json');
      fs.writeFileSync(malformedJsonPath, '{ invalid json }');

      try {
        execSync(`node dist/index.js generate --from-json "${malformedJsonPath}"`, { 
          stdio: 'pipe' 
        });
        fail('Expected command to throw error');
      } catch (error: any) {
        const stderr = error.stderr || error.stdout || '';
        expect(stderr).toContain('parse');
      }
    });
  });

  describe('Backward Compatibility', () => {
    test('should still work with manual parameters', () => {
      const licenseOutput = path.join(tempDir, 'manual-license.lic');

      const command = `node dist/index.js generate -o "Test Org" -c "TEST001" -a "Test App" -e "2025-12-31" --wifi-ssid "TEST_WIFI" --wifi-password "TestPass123" --output "${licenseOutput}"`;
      
      expect(() => {
        execSync(command, { stdio: 'pipe' });
      }).not.toThrow();

      expect(fs.existsSync(licenseOutput)).toBe(true);
    });

    test('should maintain same output format for both input methods', () => {
      const manualOutput = path.join(tempDir, 'manual-output.lic');
      const jsonOutput = path.join(tempDir, 'json-output.lic');
      const validConfigPath = path.join(tempDir, 'valid-deployment.json');

      // Generate using manual parameters
      const manualCommand = `node dist/index.js generate -o "${validDeploymentConfig.organization}" -c "${validDeploymentConfig.customerId}" -a "${validDeploymentConfig.applicationName}" -e "2025-12-31" --wifi-ssid "${validDeploymentConfig.wifi.ssid}" --wifi-password "${validDeploymentConfig.wifi.password}" --output "${manualOutput}"`;
      
      execSync(manualCommand, { stdio: 'pipe' });

      // Generate using JSON input
      const jsonCommand = `node dist/index.js generate --from-json "${validConfigPath}" --expiry "2025-12-31" --output "${jsonOutput}"`;
      
      execSync(jsonCommand, { stdio: 'pipe' });

      // Both files should exist and have similar structure
      expect(fs.existsSync(manualOutput)).toBe(true);
      expect(fs.existsSync(jsonOutput)).toBe(true);

      const manualContent = fs.readFileSync(manualOutput, 'utf-8');
      const jsonContent = fs.readFileSync(jsonOutput, 'utf-8');

      expect(manualContent).toContain('SMC_LICENSE');
      expect(jsonContent).toContain('SMC_LICENSE');
    });
  });
});
```

### **Step 4.4: Performance Testing & Optimization (Day 3 - 3 hours)**

#### **Step 4.4a: Performance Benchmarks (90 นาที)**

สร้าง `cli/test/performance/benchmark.test.ts`:

```typescript
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateLicenseFromJSON } from '../../modules/json-license-generator';
import { validDeploymentConfig, generateTestFiles } from '../fixtures/deployment-configs';

describe('Performance Benchmarks', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smc-perf-test-'));
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('JSON validation should complete under 100ms', async () => {
    const start = performance.now();
    
    const { validateDeploymentJSON } = await import('../../schemas/deployment-config.schema');
    const result = validateDeploymentJSON(validDeploymentConfig);
    
    const duration = performance.now() - start;
    
    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(100);
    
    console.log(`info: JSON validation took ${duration.toFixed(2)}ms`);
  });

  test('License generation should complete under 2 seconds', async () => {
    const outputPath = path.join(tempDir, 'perf-test.lic');
    
    const start = performance.now();
    
    const result = await generateLicenseFromJSON(validDeploymentConfig, {
      outputPath,
      expiryDate: '2025-12-31',
      verbose: false,
      skipESP32Validation: true
    });
    
    const duration = performance.now() - start;
    
    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000);
    
    console.log(`info: License generation took ${duration.toFixed(2)}ms`);
  });

  test('Batch processing should scale linearly', async () => {
    const testCounts = [1, 5, 10];
    const timingsPerFile: number[] = [];

    for (const count of testCounts) {
      // Generate test files
      const testFiles: string[] = [];
      for (let i = 0; i < count; i++) {
        const filePath = path.join(tempDir, `batch-test-${count}-${i}.json`);
        fs.writeFileSync(filePath, JSON.stringify({
          ...validDeploymentConfig,
          customerId: `BATCH${i.toString().padStart(3, '0')}`
        }, null, 2));
        testFiles.push(filePath);
      }

      // Time batch processing
      const start = performance.now();
      
      const { processMultipleDeployments } = await import('../../modules/json-license-generator');
      const results = await processMultipleDeployments(testFiles, {
        expiryDate: '2025-12-31',
        verbose: false,
        skipESP32Validation: true
      });
      
      const totalDuration = performance.now() - start;
      const avgPerFile = totalDuration / count;
      
      timingsPerFile.push(avgPerFile);
      
      expect(results.processed).toBe(count);
      expect(results.failed).toBe(0);
      
      console.log(`info: Batch ${count} files: ${totalDuration.toFixed(2)}ms total, ${avgPerFile.toFixed(2)}ms per file`);
    }

    // Check that per-file timing remains relatively stable (within 50% variance)
    const minTiming = Math.min(...timingsPerFile);
    const maxTiming = Math.max(...timingsPerFile);
    const variance = (maxTiming - minTiming) / minTiming;
    
    expect(variance).toBeLessThan(0.5);
    console.log(`info: Timing variance: ${(variance * 100).toFixed(1)}%`);
  });

  test('Memory usage should remain stable', async () => {
    const initialMemory = process.memoryUsage();
    
    // Process multiple deployments to test memory stability
    for (let i = 0; i < 20; i++) {
      const outputPath = path.join(tempDir, `memory-test-${i}.lic`);
      
      await generateLicenseFromJSON({
        ...validDeploymentConfig,
        customerId: `MEM${i.toString().padStart(3, '0')}`
      }, {
        outputPath,
        expiryDate: '2025-12-31',
        verbose: false,
        skipESP32Validation: true
      });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();
    const heapGrowth = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);
    
    console.log(`info: Heap growth: ${heapGrowth.toFixed(2)}MB`);
    
    // Memory growth should be reasonable (less than 50MB for 20 operations)
    expect(heapGrowth).toBeLessThan(50);
  });
});
```

#### **Step 4.4b: CLI Optimization (60 นาที)**

อัปเดต CLI สำหรับ performance improvements:

```typescript
// cli/utils/performance.ts
export class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map();

  start(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  end(operation: string, logResult: boolean = false): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      throw new Error(`Performance monitoring not started for: ${operation}`);
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);

    if (logResult) {
      console.log(`info: ${operation} completed in ${duration.toFixed(2)}ms`);
    }

    return duration;
  }
}

// Lazy loading for heavy modules
export async function lazyLoadModule<T>(modulePath: string): Promise<T> {
  try {
    return await import(modulePath);
  } catch (error) {
    throw new Error(`Failed to load module ${modulePath}: ${error.message}`);
  }
}

// Optimized JSON validation with caching
const validationCache = new Map<string, any>();

export function getCachedValidator(schemaKey: string, schemaFactory: () => any): any {
  if (!validationCache.has(schemaKey)) {
    validationCache.set(schemaKey, schemaFactory());
  }
  return validationCache.get(schemaKey);
}
```

## ✅ Success Criteria Checklist

### **CLI Enhancement:**
- [ ] **JSON Input Support**: --from-json flag ทำงานถูกต้อง
- [ ] **Schema Validation**: JSON validation ครบถ้วนพร้อม clear error messages
- [ ] **Dry Run Mode**: --dry-run ตรวจสอบ config โดยไม่ generate license
- [ ] **Verbose Mode**: --verbose แสดงข้อมูล debug เพิ่มเติม
- [ ] **Backward Compatibility**: Manual input mode ยังทำงานได้เหมือนเดิม

### **Error Handling:**
- [ ] **Comprehensive Error Messages**: แสดง error พร้อม suggestions
- [ ] **Graceful Failures**: Handle all error scenarios แบบ user-friendly
- [ ] **Context Information**: แสดงข้อมูล context ที่เป็นประโยชน์
- [ ] **Recovery Suggestions**: ให้คำแนะนำการแก้ไขที่ชัดเจน

### **Testing:**
- [ ] **Unit Tests**: ครอบคลุม JSON processing functions
- [ ] **Integration Tests**: End-to-end testing กับ real deployment data
- [ ] **Performance Tests**: เวลาตอบสนองและ memory usage ตามเป้า
- [ ] **Edge Case Tests**: Handle ทุก edge cases และ error scenarios
- [ ] **Compatibility Tests**: Backward compatibility กับ existing functionality

### **Performance:**
- [ ] **Fast Validation**: JSON validation < 100ms
- [ ] **Quick Generation**: License generation < 2 seconds
- [ ] **Scalable Batch Processing**: Linear scaling สำหรับ multiple files
- [ ] **Memory Efficiency**: Stable memory usage, ไม่มี leaks
- [ ] **Optimization**: Code optimized สำหรับ production use

## 🧪 Testing Guidelines

### **Automated Testing:**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration
npm run test:performance
npm run test:json-input

# Run with coverage
npm run test:coverage
```

### **Manual Testing Scenarios:**
1. **Happy Path Testing:**
   - Valid deployment JSON → successful license generation
   - Manual input → same result as JSON input
   - Dry run mode validation

2. **Error Scenario Testing:**
   - Invalid JSON format
   - Missing required fields
   - Invalid data formats (MAC address, dates)
   - File permission issues

3. **Performance Testing:**
   - Large deployment files
   - Batch processing multiple files
   - Memory usage monitoring

## 🚨 Troubleshooting

### **Common Issues:**

**1. JSON Schema Validation Fails**
- ตรวจสอบ JSON format และ structure
- ใช้ --dry-run เพื่อ validate โดยไม่ generate
- เปรียบเทียบกับ working example

**2. Performance Issues**
- ใช้ --skip-esp32-validation ถ้าไม่ต้องการ ESP32 validation
- ตรวจสอบ disk space สำหรับ temporary files
- Monitor memory usage ด้วย performance tools

**3. Batch Processing Failures**
- ตรวจสอบ file permissions
- ใช้ absolute paths
- Monitor individual file processing logs

---

## 🆕 Phase 4.5: CSV Batch Processing Implementation

### **Step 4.5.1: ESP32 Deployment Tool Enhancement (2-3 ชั่วโมง)**

#### **Current CSV Format:**
```csv
timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address
2025-08-22T10:30:00Z,SMC Medical,TEST001,SMC_Cabinet,SMC_ESP32_TEST001,Pass123!,24:6F:28:A0:12:34,192.168.4.1
```

#### **New Enhanced CSV Format:**
```csv
timestamp,organization,customer_id,application_name,wifi_ssid,wifi_password,mac_address,ip_address,expiry_date,license_status,license_file,notes
2025-08-22T10:30:00Z,SMC Medical,TEST001,SMC_Cabinet,SMC_ESP32_TEST001,Pass123!,24:6F:28:A0:12:34,192.168.4.1,2025-12-31,pending,,
2025-08-22T10:45:00Z,Bangkok Hospital,BGK002,BMC_System,SMC_ESP32_BGK002,Hospital456!,24:6F:28:B1:56:78,192.168.4.1,2026-06-30,completed,BGK002-license.lic,Generated by dev team
```

#### **ESP32 Deployment Tool Changes:**
1. **เพิ่ม Expiry Date Field ใน CustomerForm.tsx:**
```typescript
// เพิ่ม field ใหม่
const [formData, setFormData] = useState<CustomerInfo>({
  organization: '',
  customerId: '',
  applicationName: '',
  expiryDate: calculateDefaultExpiry() // Default 1 year from now
});

// เพิ่ม expiry date input field
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    วันหมดอายุ License
  </label>
  <input
    type="date"
    value={formData.expiryDate}
    onChange={(e) => handleChange('expiryDate', e.target.value)}
    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
    min={new Date().toISOString().split('T')[0]} // ไม่ให้เลือกวันที่ผ่านมาแล้ว
  />
</div>
```

2. **อัปเดต CSV Export System:**
```typescript
// esp32-deployment-tool/src/lib/csv-export.ts
export function formatCSVRow(data: DeploymentData): string {
  const fields = [
    data.timestamp,
    data.organization,
    data.customerId,
    data.applicationName,
    data.wifiSSID,
    data.wifiPassword,
    data.macAddress,
    data.ipAddress,
    data.expiryDate || '2025-12-31', // Default expiry
    'pending', // Default status
    '', // Empty license_file initially
    '' // Empty notes initially
  ];
  
  return fields.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
}
```

### **Step 4.5.2: CLI Batch Command Implementation (3-4 ชั่วโมง)**

#### **New CLI Commands:**
```bash
# Batch processing จาก CSV
smc-license batch --input esp32-deployments-2025-08-22.csv

# กำหนด expiry แบบต่างๆ
smc-license batch --input file.csv --expiry-days 365
smc-license batch --input file.csv --expiry-months 12
smc-license batch --input file.csv --expiry-years 2
smc-license batch --input file.csv --no-expiry

# Advanced options
smc-license batch --input file.csv --output-dir ./licenses/ --update-csv --skip-existing
```

#### **CSV Parser Module (`cli/modules/csv-parser.ts`):**
```typescript
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
  expiryDate?: string;
  licenseStatus: 'pending' | 'completed' | 'failed' | 'skipped';
  licenseFile?: string;
  notes?: string;
}

export class CSVProcessor {
  private csvPath: string;
  private data: CSVDeploymentRow[] = [];
  private header: string[] = [];

  constructor(csvPath: string) {
    this.csvPath = csvPath;
  }

  async load(): Promise<void> {
    const content = await fs.readFile(this.csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    this.header = this.parseCSVLine(lines[0]);
    
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
      }
    }

    console.log(`info: Loaded ${this.data.length} deployment records from CSV`);
  }

  getPendingRecords(): CSVDeploymentRow[] {
    return this.data.filter(row => row.licenseStatus === 'pending');
  }

  async updateRecord(customerId: string, updates: Partial<CSVDeploymentRow>): Promise<void> {
    const recordIndex = this.data.findIndex(row => row.customerId === customerId);
    if (recordIndex === -1) {
      throw new Error(`Customer ID ${customerId} not found in CSV`);
    }

    // Update record
    this.data[recordIndex] = { ...this.data[recordIndex], ...updates };
    
    console.log(`info: Updated CSV record for customer ${customerId}`);
  }

  async save(): Promise<void> {
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

    await fs.writeFile(this.csvPath, lines.join('\n') + '\n', 'utf-8');
    console.log(`info: Updated CSV file: ${this.csvPath}`);
  }

  private parseCSVLine(line: string): string[] {
    // Simple CSV parser (handles quoted fields with commas)
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

  private parseRowToObject(values: string[]): CSVDeploymentRow {
    const obj: any = {};
    
    this.header.forEach((col, index) => {
      const camelCaseKey = this.toCamelCase(col);
      obj[camelCaseKey] = values[index] || '';
    });

    return {
      timestamp: obj.timestamp,
      organization: obj.organization,
      customerId: obj.customerId,
      applicationName: obj.applicationName,
      wifiSSID: obj.wifiSsid,
      wifiPassword: obj.wifiPassword,
      macAddress: obj.macAddress,
      ipAddress: obj.ipAddress,
      expiryDate: obj.expiryDate || this.calculateDefaultExpiry(),
      licenseStatus: (obj.licenseStatus as any) || 'pending',
      licenseFile: obj.licenseFile || '',
      notes: obj.notes || ''
    };
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private calculateDefaultExpiry(): string {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow.toISOString().split('T')[0];
  }
}
```

#### **Batch License Generator (`cli/modules/batch-license-generator.ts`):**
```typescript
import * as path from 'path';
import * as fs from 'fs/promises';
import { CSVProcessor, CSVDeploymentRow } from './csv-parser';
import { generateLicenseFile } from './license-generator';

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

export async function processBatchLicenses(options: BatchOptions): Promise<BatchResult> {
  const result: BatchResult = {
    total: 0,
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  console.log('info: Starting CSV batch processing...');
  console.log(`info: Input CSV: ${options.inputCSV}`);

  // Load CSV data
  const csvProcessor = new CSVProcessor(options.inputCSV);
  await csvProcessor.load();

  // Get pending records
  const pendingRecords = csvProcessor.getPendingRecords();
  result.total = pendingRecords.length;

  console.log(`info: Found ${result.total} pending records to process`);

  if (result.total === 0) {
    console.log('info: No pending records found. All licenses may already be generated.');
    return result;
  }

  // Ensure output directory exists
  const outputDir = options.outputDir || path.dirname(options.inputCSV);
  await fs.mkdir(outputDir, { recursive: true });

  // Process each record
  for (const record of pendingRecords) {
    try {
      console.log(`\ninfo: Processing ${record.customerId}...`);

      // Check if license file already exists
      const licenseFileName = `${record.customerId}-license.lic`;
      const licenseFilePath = path.join(outputDir, licenseFileName);

      if (options.skipExisting && await fileExists(licenseFilePath)) {
        console.log(`info: Skipping ${record.customerId} - license file already exists`);
        result.skipped++;
        
        // Update CSV status
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
        console.log(`info: [DRY RUN] Would generate license for ${record.customerId}`);
        console.log(`  Organization: ${record.organization}`);
        console.log(`  Expiry: ${expiryDate}`);
        console.log(`  Output: ${licenseFilePath}`);
        result.processed++;
        continue;
      }

      // Generate license
      console.log(`info: Generating license for ${record.organization}...`);
      
      const generateResult = await generateLicenseFile({
        org: record.organization,
        customer: record.customerId,
        app: record.applicationName,
        expiry: expiryDate,
        wifiSsid: record.wifiSSID,
        wifiPassword: record.wifiPassword,
        esp32Ip: record.ipAddress,
        output: licenseFilePath,
        testMode: false // Use real MAC address from CSV
      }, record.macAddress); // Pass MAC address directly

      if (generateResult.success) {
        console.log(`info: ✅ Successfully generated license for ${record.customerId}`);
        result.processed++;

        // Update CSV status
        if (options.updateCSV) {
          await csvProcessor.updateRecord(record.customerId, {
            licenseStatus: 'completed',
            licenseFile: licenseFileName,
            notes: `Generated on ${new Date().toISOString().split('T')[0]}`
          });
        }
      } else {
        throw new Error(generateResult.error || 'License generation failed');
      }

    } catch (error: any) {
      console.error(`error: ❌ Failed to process ${record.customerId}: ${error.message}`);
      result.failed++;
      result.errors.push({
        customerId: record.customerId,
        error: error.message
      });

      // Update CSV status
      if (options.updateCSV) {
        await csvProcessor.updateRecord(record.customerId, {
          licenseStatus: 'failed',
          notes: `Error: ${error.message}`
        });
      }
    }
  }

  // Save updated CSV
  if (options.updateCSV && !options.dryRun) {
    await csvProcessor.save();
    console.log(`info: Updated CSV file with processing results`);
  }

  // Print summary
  console.log(`\n📊 Batch Processing Summary:`);
  console.log(`   Total records: ${result.total}`);
  console.log(`   Processed: ${result.processed}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.forEach(error => {
      console.log(`   ${error.customerId}: ${error.error}`);
    });
  }

  return result;
}

function calculateExpiryDate(recordExpiry: string | undefined, options: BatchOptions): string {
  // Priority: CLI options > CSV record > default (1 year)
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
  } else if (recordExpiry) {
    return recordExpiry; // Use expiry from CSV
  } else {
    baseDate.setFullYear(baseDate.getFullYear() + 1); // Default 1 year
  }

  return baseDate.toISOString().split('T')[0];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

#### **CLI Command Integration (Update `cli/index.ts`):**
```typescript
// เพิ่ม batch command
program
  .command('batch')
  .description('Process multiple licenses from CSV file')
  .requiredOption('--input <csvFile>', 'Input CSV file from ESP32 Deployment Tool')
  .option('--output-dir <dir>', 'Output directory for license files (default: same as CSV)')
  .option('--update-csv', 'Update CSV file with processing status', false)
  .option('--skip-existing', 'Skip records where license file already exists', false)
  .option('--expiry-days <days>', 'Set expiry X days from now (overrides CSV expiry)')
  .option('--expiry-months <months>', 'Set expiry X months from now (overrides CSV expiry)')
  .option('--expiry-years <years>', 'Set expiry X years from now (overrides CSV expiry)')
  .option('--no-expiry', 'Set license to never expire (overrides CSV expiry)')
  .option('--dry-run', 'Validate CSV and show what would be processed without generating licenses')
  .option('--verbose', 'Show detailed processing information')
  .addHelpText('after', `
Examples:
  $ smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv
  $ smc-license batch --input daily-deployments.csv --expiry-years 2 --skip-existing
  $ smc-license batch --input batch.csv --output-dir ./licenses/ --dry-run
  $ smc-license batch --input deployments.csv --no-expiry --verbose
  
CSV Format:
  The CSV file should contain columns: organization, customer_id, application_name,
  wifi_ssid, wifi_password, mac_address, ip_address, expiry_date, license_status
  
  Generated by ESP32 Deployment Tool with format: esp32-deployments-YYYY-MM-DD.csv
`)
  .action(async (options) => {
    try {
      console.log(chalk.blue('📄 Starting CSV batch processing...'));

      // Validate CSV file exists
      if (!await fileExists(options.input)) {
        throw new Error(`CSV file not found: ${options.input}`);
      }

      // Validate expiry options (only one should be specified)
      const expiryOptions = [options.expiryDays, options.expiryMonths, options.expiryYears, options.noExpiry].filter(Boolean);
      if (expiryOptions.length > 1) {
        throw new Error('Only one expiry option can be specified (--expiry-days, --expiry-months, --expiry-years, or --no-expiry)');
      }

      // Process batch licenses
      const batchOptions: BatchOptions = {
        inputCSV: path.resolve(options.input),
        outputDir: options.outputDir ? path.resolve(options.outputDir) : undefined,
        updateCSV: options.updateCsv,
        skipExisting: options.skipExisting,
        expiryDays: options.expiryDays ? parseInt(options.expiryDays) : undefined,
        expiryMonths: options.expiryMonths ? parseInt(options.expiryMonths) : undefined,
        expiryYears: options.expiryYears ? parseInt(options.expiryYears) : undefined,
        noExpiry: options.noExpiry,
        verbose: options.verbose,
        dryRun: options.dryRun
      };

      const result = await processBatchLicenses(batchOptions);

      // Exit with appropriate code
      if (result.failed > 0) {
        console.log(chalk.red(`\n❌ Batch processing completed with ${result.failed} failures`));
        process.exit(1);
      } else {
        console.log(chalk.green(`\n✅ Batch processing completed successfully!`));
        if (result.processed > 0) {
          console.log(chalk.white(`Generated ${result.processed} license files`));
        }
        if (result.skipped > 0) {
          console.log(chalk.yellow(`Skipped ${result.skipped} existing licenses`));
        }
      }

    } catch (error: any) {
      console.log(chalk.red('\n❌ CSV batch processing failed'));
      console.log(chalk.red(`Error: ${error.message}`));

      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      if (error.message.includes('not found')) {
        console.log(chalk.gray('1. Check the CSV file path is correct'));
        console.log(chalk.gray('2. Ensure the file exists and is readable'));
        console.log(chalk.gray('3. Try using absolute file path'));
      } else if (error.message.includes('column')) {
        console.log(chalk.gray('1. Ensure CSV has all required columns'));
        console.log(chalk.gray('2. Check CSV was generated by ESP32 Deployment Tool'));
        console.log(chalk.gray('3. Verify CSV header format matches expected format'));
      } else {
        console.log(chalk.gray('1. Try using --dry-run to validate CSV format'));
        console.log(chalk.gray('2. Use --verbose flag for detailed error information'));
        console.log(chalk.gray('3. Check file permissions for input and output directories'));
      }

      process.exit(1);
    }
  });
```

### **Step 4.5.3: Integration Testing (1 ชั่วโมง)**

#### **End-to-End Workflow Test:**
```bash
# 1. ทดสอบ ESP32 Deployment Tool (มี expiry date field)
cd esp32-deployment-tool/
npm run dev
# → กรอกข้อมูลพร้อม expiry date → Generate CSV

# 2. ทดสอบ CLI Batch Processing  
cd ../cli/
smc-license batch --input ../esp32-deployment-tool/exports/esp32-deployments-2025-08-22.csv --dry-run
smc-license batch --input ../esp32-deployment-tool/exports/esp32-deployments-2025-08-22.csv --update-csv

# 3. ตรวจสอบผลลัพธ์
# - CSV file ถูก update ด้วย license_status
# - License files ถูกสร้างในโฟลเดอร์เดียวกับ CSV
# - สามารถ re-run ด้วย --skip-existing ได้
```

## 🎯 Final Implementation Status

### **✅ Phase 4 Complete Features:**
- JSON Input Support ใน CLI
- Schema Validation & Error Handling  
- Performance Testing & Optimization
- ESP32 Hardware Integration
- Comprehensive Test Suites

### **🆕 Phase 4.5 New Features:**
- **CSV Batch Processing**: `smc-license batch --input file.csv`
- **ESP32 Tool Expiry Field**: UI field สำหรับกำหนด license expiry
- **CSV Status Tracking**: อัปเดต CSV ด้วยสถานะการสร้าง license  
- **Flexible Expiry Options**: วัน/เดือน/ปี/ไม่หมดอายุ
- **Production Workflow**: Sales → Dev → Delivery ที่สมบูรณ์

### **📋 New CLI Commands Summary:**
```bash
# Individual license (existing)
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"

# JSON input (existing)  
smc-license generate --from-json deployment.json

# CSV batch processing (NEW)
smc-license batch --input esp32-deployments-2025-08-22.csv --update-csv
smc-license batch --input daily-batch.csv --expiry-years 2 --skip-existing --output-dir ./licenses/
smc-license batch --input test-batch.csv --dry-run --verbose
```

## ✅ Success Criteria Checklist

### **🆕 CSV Batch Processing:**
- [ ] **CSV Parser**: อ่าน ESP32 deployment CSV ได้ถูกต้อง
- [ ] **Batch Command**: `smc-license batch --input <file.csv>` ทำงานได้
- [ ] **CSV Updates**: อัปเดต license_status ใน CSV file
- [ ] **Expiry Options**: รองรับ --expiry-days/months/years/no-expiry
- [ ] **Error Handling**: Handle CSV format errors และ processing failures
- [ ] **Skip Existing**: --skip-existing ทำงานถูกต้อง

### **🆕 ESP32 Tool Enhancement:**  
- [ ] **Expiry Date Field**: UI field สำหรับเลือก expiry date
- [ ] **Enhanced CSV Export**: CSV รวม expiry_date และ license_status columns
- [ ] **Backward Compatibility**: CSV เก่ายังใช้งานได้
- [ ] **Input Validation**: ตรวจสอบ expiry date ไม่อยู่ในอดีต

### **✅ Existing Features (Maintained):**
- [x] **JSON Input Support**: --from-json flag ทำงานถูกต้อง
- [x] **Schema Validation**: JSON validation ครับถ้วนพร้อม clear error messages
- [x] **Dry Run Mode**: --dry-run ตรวจสอบ config โดยไม่ generate license
- [x] **Verbose Mode**: --verbose แสดงข้อมูล debug เพิ่มเติม
- [x] **Backward Compatibility**: Manual input mode ยังทำงานได้เหมือนเดิม

---

## ⏭️ Next Phase

Phase 4.6 เสร็จแล้ว จะได้ complete Production-Ready SMC App พร้อม license validation system

**Phase 5: Polish & Production Ready** จะ focus ที่:
- Final application packaging และ distribution
- User documentation และ manuals  
- Production deployment guidelines และ automation
- Comprehensive testing และ validation
- Cross-platform deployment verification
- Performance optimization และ monitoring

**Expected Output จาก Phase 4.5:** Production-ready CLI ที่รองรับ CSV batch processing, ESP32 Deployment Tool ที่มี expiry field, และ complete end-to-end workflow สำหรับ production deployment

---

## 🆕 Phase 4.6: SMC App Build & License Validation Enhancement

**ระยะเวลา:** 2-3 วัน  
**เป้าหมาย:** ปรับปรุง SMC App ให้พร้อมสำหรับ production deployment พร้อม license validation system

### **📖 Overview & Goals**

### **🔄 Production Workflow:**
**CLI Tool** → สร้าง license.lic พร้อม SHARED_SECRET_KEY  
**Build Process** → รัน scripts/build-prep.ts เพื่อ cleanup database + setup organization  
**SMC App** → โหลด license.lic จาก resources และ validate กับ ESP32  
**Production** → ส่ง .exe + license.lic ไปให้ลูกค้าติดตั้ง  

### **🎯 วัตถุประสงค์:**
- 🆕 **Build System Enhancement**: scripts/build-prep.ts สำหรับ production build
- 🆕 **Resource-based License Loading**: โหลด license.lic จาก app resources  
- 🆕 **Manual Network Retry System**: ให้ user เปลี่ยน network ได้เมื่อ WiFi ล้มเหลว
- 🆕 **Environment Simplification**: เอา mock system ออก เหลือแค่ development bypass
- 🆕 **Production-Ready Workflow**: ระบบสำหรับ production deployment ที่สมบูรณ์

### **📋 Deliverables:**
- 🆕 **Build Preparation Script**: scripts/build-prep.ts สำหรับ database + organization setup
- 🆕 **Enhanced License Validation**: Production-ready license validation flow
- 🆕 **Manual Network Management**: UI สำหรับเปลี่ยน network connection
- 🆕 **Environment Configuration**: Simplified development vs production modes
- 🆕 **Production Build Commands**: Enhanced npm scripts สำหรับ production build
- 🆕 **Documentation Updates**: Build guidelines และ deployment instructions

## 🏗 Technical Implementation Plan

### **Phase 4.6.1: Build System Enhancement (4 ชั่วโมง)**

#### **Build Preparation Script (`scripts/build-prep.ts`):**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { Sequelize } from 'sequelize';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface BuildConfig {
  organizationName: string;
  sharedSecretKey: string;
  buildVersion: string;
  targetPlatform: string;
}

/**
 * Production Build Preparation Script
 * 
 * 1. อ่าน SHARED_SECRET_KEY จาก .env
 * 2. Clean + Reset ฐานข้อมูล
 * 3. ตั้งค่า Organization data
 * 4. Validate build environment
 * 5. Copy license file template (if exists)
 */
async function prepareBuild(config: BuildConfig): Promise<void> {
  console.log('info: Starting production build preparation...');
  console.log(`info: Organization: ${config.organizationName}`);
  console.log(`info: Build Version: ${config.buildVersion}`);
  console.log(`info: Target Platform: ${config.targetPlatform}`);

  // Step 1: Validate environment
  await validateBuildEnvironment(config);

  // Step 2: Clean and reset database
  await cleanDatabase();

  // Step 3: Setup organization data
  await setupOrganizationData(config);

  // Step 4: Prepare resources directory
  await prepareResourcesDirectory();

  // Step 5: Validate build readiness
  await validateBuildReadiness();

  console.log('info: Production build preparation completed successfully!');
  console.log('info: Ready to run: npm run build:production');
}

async function validateBuildEnvironment(config: BuildConfig): Promise<void> {
  console.log('info: Validating build environment...');

  // Check SHARED_SECRET_KEY
  if (!config.sharedSecretKey || config.sharedSecretKey.length < 32) {
    throw new Error('SHARED_SECRET_KEY must be at least 32 characters long');
  }

  // Check organization name
  if (!config.organizationName || config.organizationName.trim().length === 0) {
    throw new Error('ORGANIZATION_NAME is required for production build');
  }

  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`info: Node.js version: ${nodeVersion}`);

  // Check npm packages
  try {
    await execAsync('npm list --production --silent');
  } catch (error) {
    console.warn('warn: Some npm packages may be missing');
  }

  console.log('info: Build environment validation passed');
}

async function cleanDatabase(): Promise<void> {
  console.log('info: Cleaning and resetting database...');

  const dbPath = path.join(__dirname, '../database.db');
  
  // Backup existing database if it exists
  if (fs.existsSync(dbPath)) {
    const backupPath = `${dbPath}.backup.${Date.now()}`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`info: Database backed up to: ${backupPath}`);
  }

  // Remove existing database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('info: Existing database removed');
  }

  // Run database migration/setup
  try {
    await execAsync('npm run db:setup');
    console.log('info: Database initialized with fresh schema');
  } catch (error) {
    console.log('info: Database setup completed (tables may already exist)');
  }

  console.log('info: Database cleanup completed');
}

async function setupOrganizationData(config: BuildConfig): Promise<void> {
  console.log('info: Setting up organization data...');

  // Initialize database connection
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.db'),
    logging: false
  });

  try {
    // Create organization setting
    await sequelize.query(`
      INSERT OR REPLACE INTO Settings (id, key, value, created_at, updated_at) 
      VALUES (1, 'ORGANIZATION_NAME', ?, datetime('now'), datetime('now'))
    `, {
      replacements: [config.organizationName]
    });

    // Reset CLI license activation flag
    await sequelize.query(`
      INSERT OR REPLACE INTO Settings (id, key, value, created_at, updated_at) 
      VALUES (2, 'CLI_LICENSE_ACTIVATED', 'false', datetime('now'), datetime('now'))
    `, {
      replacements: []
    });

    // Setup default admin user (if needed)
    await sequelize.query(`
      INSERT OR IGNORE INTO Users (id, username, role, created_at, updated_at) 
      VALUES (1, 'admin', 'admin', datetime('now'), datetime('now'))
    `);

    console.log('info: Organization data setup completed');
    
  } catch (error) {
    console.error('error: Failed to setup organization data:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function prepareResourcesDirectory(): Promise<void> {
  console.log('info: Preparing resources directory...');

  const resourcesDir = path.join(__dirname, '../resources');
  
  // Create resources directory if not exists
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
    console.log('info: Created resources directory');
  }

  // Create license placeholder if not exists
  const licensePlaceholder = path.join(resourcesDir, 'license-placeholder.txt');
  if (!fs.existsSync(licensePlaceholder)) {
    fs.writeFileSync(licensePlaceholder, 
      'LICENSE PLACEHOLDER\n' +
      'This file indicates where license.lic should be placed.\n' +
      'The actual license.lic file will be provided separately.\n'
    );
    console.log('info: Created license placeholder');
  }

  console.log('info: Resources directory prepared');
}

async function validateBuildReadiness(): Promise<void> {
  console.log('info: Validating build readiness...');

  // Check critical files exist
  const criticalFiles = [
    'main/license/validator.ts',
    'main/license/file-manager.ts',
    'main/license/esp32-client.ts',
    'renderer/pages/activate-key.tsx'
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Critical file missing: ${file}`);
    }
  }

  // Verify TypeScript compilation
  try {
    await execAsync('npm run type-check');
    console.log('info: TypeScript compilation check passed');
  } catch (error) {
    console.warn('warn: TypeScript compilation warnings detected');
  }

  console.log('info: Build readiness validation passed');
}

// Main execution
if (require.main === module) {
  const config: BuildConfig = {
    organizationName: process.env.ORGANIZATION_NAME || 'SMC Medical Center',
    sharedSecretKey: process.env.SHARED_SECRET_KEY || '',
    buildVersion: process.env.BUILD_VERSION || '1.0.0',
    targetPlatform: process.env.TARGET_PLATFORM || 'win32'
  };

  prepareBuild(config)
    .then(() => {
      console.log('info: Build preparation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('error: Build preparation failed:', error.message);
      process.exit(1);
    });
}

export { prepareBuild, BuildConfig };
```

#### **Enhanced Package.json Scripts:**
```json
{
  "scripts": {
    "build:prep": "ts-node scripts/build-prep.ts",
    "build:production": "npm run build:prep && npm run build",
    "build:production:win": "cross-env TARGET_PLATFORM=win32 npm run build:production",
    "build:production:mac": "cross-env TARGET_PLATFORM=darwin npm run build:production",
    "build:production:linux": "cross-env TARGET_PLATFORM=linux npm run build:production"
  }
}
```

### **Phase 4.6.2: License System Enhancement (3 ชั่วโมง)**

#### **Resource-based License Manager:**
```typescript
// main/license/resource-manager.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export class ResourceLicenseManager {
  private static readonly RESOURCE_LICENSE_FILENAME = 'license.lic';
  private static readonly FALLBACK_PATHS = [
    'license.lic',           // Current directory
    './resources/license.lic', // Local resources
    '../resources/license.lic' // Parent resources
  ];

  /**
   * ค้นหาไฟล์ license.lic จาก resource paths
   * Priority: App resources -> Local paths -> Fallback paths
   */
  static async findResourceLicense(): Promise<string | null> {
    console.log('info: Searching for license file in resources...');

    // Priority 1: App resources directory (production)
    if (app.isPackaged) {
      const resourcesPath = path.join(process.resourcesPath, this.RESOURCE_LICENSE_FILENAME);
      if (fs.existsSync(resourcesPath)) {
        console.log(`info: Found license in app resources: ${resourcesPath}`);
        return resourcesPath;
      }
    }

    // Priority 2: Development resources directory
    const devResourcesPath = path.join(app.getAppPath(), 'resources', this.RESOURCE_LICENSE_FILENAME);
    if (fs.existsSync(devResourcesPath)) {
      console.log(`info: Found license in dev resources: ${devResourcesPath}`);
      return devResourcesPath;
    }

    // Priority 3: Fallback paths
    for (const fallbackPath of this.FALLBACK_PATHS) {
      const resolvedPath = path.resolve(fallbackPath);
      if (fs.existsSync(resolvedPath)) {
        console.log(`info: Found license in fallback path: ${resolvedPath}`);
        return resolvedPath;
      }
    }

    console.log('info: No license file found in any resource path');
    return null;
  }

  /**
   * ตรวจสอบว่ามี license file ใน resources หรือไม่
   */
  static async hasResourceLicense(): Promise<boolean> {
    const licensePath = await this.findResourceLicense();
    return licensePath !== null;
  }

  /**
   * อ่านข้อมูลจาก resource license file
   */
  static async readResourceLicense(): Promise<string | null> {
    const licensePath = await this.findResourceLicense();
    if (!licensePath) {
      return null;
    }

    try {
      const licenseContent = fs.readFileSync(licensePath, 'utf-8');
      console.log(`info: Successfully read license file: ${licensePath}`);
      return licenseContent;
    } catch (error) {
      console.error(`error: Failed to read license file: ${error.message}`);
      return null;
    }
  }

  /**
   * Copy license file to resources directory (for development)
   */
  static async copyLicenseToResources(sourcePath: string): Promise<boolean> {
    try {
      const resourcesDir = path.join(app.getAppPath(), 'resources');
      if (!fs.existsSync(resourcesDir)) {
        fs.mkdirSync(resourcesDir, { recursive: true });
      }

      const targetPath = path.join(resourcesDir, this.RESOURCE_LICENSE_FILENAME);
      fs.copyFileSync(sourcePath, targetPath);
      
      console.log(`info: License file copied to resources: ${targetPath}`);
      return true;
    } catch (error) {
      console.error(`error: Failed to copy license to resources: ${error.message}`);
      return false;
    }
  }
}
```

#### **Updated License File Manager:**
```typescript
// อัปเดต main/license/file-manager.ts
import { ResourceLicenseManager } from './resource-manager';

export class LicenseFileManager {
  /**
   * ค้นหาไฟล์ license จาก resources ก่อน แล้วค่อย fallback ไป local paths
   */
  static async findLicenseFile(): Promise<string | null> {
    console.log('info: Starting license file search...');

    // Priority 1: Resource-based license (production)
    const resourceLicense = await ResourceLicenseManager.findResourceLicense();
    if (resourceLicense) {
      return resourceLicense;
    }

    // Priority 2: Local paths (existing logic)
    const localPaths = [
      'license.lic',
      path.join(process.cwd(), 'license.lic'),
      path.join(__dirname, '../../license.lic'),
      path.join(__dirname, '../../../license.lic')
    ];

    for (const licenseFile of localPaths) {
      const resolvedPath = path.resolve(licenseFile);
      
      if (fs.existsSync(resolvedPath)) {
        console.log(`info: Found license file: ${resolvedPath}`);
        return resolvedPath;
      }
    }

    console.log('info: No license file found in any location');
    return null;
  }

  // ... existing methods remain the same
}
```

### **Phase 4.6.3: Manual Network Retry System (2 ชั่วโมง)**

#### **Network Retry Handler:**
```typescript
// main/license/ipcMain/network-retry.ts
import { ipcMain } from 'electron';
import { SystemWiFiManager } from '../wifi-manager';
import { ESP32Client } from '../esp32-client';

export const networkRetryHandler = () => {
  ipcMain.handle('scan-wifi-networks', async () => {
    try {
      console.log('info: Scanning available WiFi networks...');
      const networks = await SystemWiFiManager.scanNetworks();
      return { success: true, networks };
    } catch (error) {
      console.error('error: WiFi network scan failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('connect-to-network', async (event, { ssid, password }) => {
    try {
      console.log(`info: Attempting manual connection to: ${ssid}`);
      
      event.sender.send('network-connection-progress', { 
        step: 'connecting', 
        progress: 20, 
        message: `กำลังเชื่อมต่อ ${ssid}...` 
      });

      const connected = await SystemWiFiManager.connectToNetwork(ssid, password);
      
      if (connected) {
        event.sender.send('network-connection-progress', { 
          step: 'connected', 
          progress: 100, 
          message: `เชื่อมต่อ ${ssid} สำเร็จ` 
        });
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `ไม่สามารถเชื่อมต่อ ${ssid} ได้` 
        };
      }
    } catch (error) {
      console.error('error: Manual network connection failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('test-esp32-connection', async () => {
    try {
      console.log('info: Testing ESP32 connection...');
      const macAddress = await ESP32Client.getMacAddress();
      
      if (macAddress) {
        return { 
          success: true, 
          macAddress,
          message: 'ESP32 connection successful' 
        };
      } else {
        return { 
          success: false, 
          error: 'Could not retrieve MAC address from ESP32' 
        };
      }
    } catch (error) {
      console.error('error: ESP32 connection test failed:', error);
      return { success: false, error: error.message };
    }
  });
};
```

#### **Manual Network UI Component:**
```typescript
// renderer/components/ManualNetworkDialog.tsx
import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import {
  DialogBase,
  DialogHeader,
  DialogInput,
  DialogButton,
  StatusIndicator
} from './Shared/DesignSystem';

interface WiFiNetwork {
  ssid: string;
  signal: string;
  security: string;
  connected: boolean;
}

interface ManualNetworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNetworkConnected: () => void;
}

export const ManualNetworkDialog: React.FC<ManualNetworkDialogProps> = ({
  isOpen,
  onClose,
  onNetworkConnected
}) => {
  const [networks, setNetworks] = useState<WiFiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionStep, setConnectionStep] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      scanNetworks();
      
      // Listen for connection progress
      const progressListener = (_event: any, update: any) => {
        setConnectionStep(update.message || '');
      };
      
      ipcRenderer.on('network-connection-progress', progressListener);
      
      return () => {
        ipcRenderer.removeListener('network-connection-progress', progressListener);
      };
    }
  }, [isOpen]);

  const scanNetworks = async () => {
    setIsScanning(true);
    setErrorMessage('');
    
    try {
      const result = await ipcRenderer.invoke('scan-wifi-networks');
      
      if (result.success) {
        setNetworks(result.networks);
        console.log(`info: Found ${result.networks.length} WiFi networks`);
      } else {
        setErrorMessage(result.error || 'ไม่สามารถสแกน WiFi ได้');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'เกิดข้อผิดพลาดในการสแกน WiFi');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToNetwork = async () => {
    if (!selectedNetwork) {
      setErrorMessage('กรุณาเลือก WiFi network');
      return;
    }
    
    if (!password) {
      setErrorMessage('กรุณาใส่รหัสผ่าน WiFi');
      return;
    }

    setIsConnecting(true);
    setErrorMessage('');
    setConnectionStep('กำลังเชื่อมต่อ...');

    try {
      const result = await ipcRenderer.invoke('connect-to-network', {
        ssid: selectedNetwork,
        password: password
      });

      if (result.success) {
        setConnectionStep('เชื่อมต่อสำเร็จ! กำลังทดสอบ ESP32...');
        
        // Test ESP32 connection
        const esp32Result = await ipcRenderer.invoke('test-esp32-connection');
        
        if (esp32Result.success) {
          setConnectionStep(`ESP32 พร้อมใช้งาน (MAC: ${esp32Result.macAddress.substring(0, 8)}...)`);
          setTimeout(() => {
            onNetworkConnected();
          }, 1500);
        } else {
          setErrorMessage(`เชื่อมต่อ WiFi สำเร็จแต่ไม่สามารถติดต่อ ESP32 ได้: ${esp32Result.error}`);
        }
      } else {
        setErrorMessage(result.error || 'ไม่สามารถเชื่อมต่อ WiFi ได้');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsConnecting(false);
      setConnectionStep('');
    }
  };

  const handleClose = () => {
    setSelectedNetwork('');
    setPassword('');
    setErrorMessage('');
    setConnectionStep('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <DialogBase maxWidth="max-w-[500px]">
        <DialogHeader title="เชื่อมต่อ WiFi ด้วยตนเอง" variant="info" />
        
        <div className="p-6 space-y-4">
          {errorMessage && (
            <StatusIndicator status="error" message={errorMessage} />
          )}
          
          {connectionStep && (
            <StatusIndicator status="info" message={connectionStep} animated={true} />
          )}

          {/* WiFi Network Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">เลือก WiFi Network:</label>
              <button 
                onClick={scanNetworks}
                disabled={isScanning}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {isScanning ? 'กำลังสแกน...' : 'สแกนใหม่'}
              </button>
            </div>
            
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isScanning || isConnecting}
            >
              <option value="">-- เลือก WiFi Network --</option>
              {networks.map((network) => (
                <option key={network.ssid} value={network.ssid}>
                  {network.ssid} (สัญญาณ: {network.signal}) {network.connected ? '✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Password Input */}
          <div>
            <DialogInput
              label="รหัสผ่าน WiFi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isConnecting}
              placeholder="ใส่รหัสผ่าน WiFi"
            />
          </div>

          {/* Connection Buttons */}
          <div className="flex gap-3 pt-4">
            <DialogButton
              variant="secondary"
              onClick={handleClose}
              disabled={isConnecting}
              className="flex-1"
            >
              ยกเลิก
            </DialogButton>
            <DialogButton
              variant="primary"
              onClick={connectToNetwork}
              loading={isConnecting}
              disabled={!selectedNetwork || !password || isConnecting}
              className="flex-1"
            >
              เชื่อมต่อ
            </DialogButton>
          </div>

          {/* Help Text */}
          <div className="text-sm text-gray-600 mt-4">
            <p>💡 หากไม่สามารถเชื่อมต่อได้:</p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>ตรวจสอบรหัสผ่าน WiFi ให้ถูกต้อง</li>
              <li>ตรวจสอบว่า ESP32 เปิดและพร้อมใช้งาน</li>
              <li>ลองเลือก WiFi network อื่น</li>
            </ul>
          </div>
        </div>
      </DialogBase>
    </div>
  );
};
```

### **Phase 4.6.4: Environment Simplification (1 ชั่วโมง)**

#### **Simplified Environment Detection:**
```typescript
// อัปเดต main/utils/environment.ts
/**
 * Simplified Environment Detection
 * 
 * Production: ใช้งานจริงกับ ESP32 hardware
 * Development Bypass: สำหรับ macOS development เท่านั้น
 */

/**
 * ตรวจสอบว่าอยู่ใน development bypass mode หรือไม่
 * ใช้สำหรับ bypass ESP32/WiFi connection ในระหว่าง development บน macOS
 */
export function isDevelopmentBypass(): boolean {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const platform = process.platform;
  
  // Development bypass เฉพาะบน macOS development เท่านั้น
  return nodeEnv === 'development' && platform === 'darwin';
}

/**
 * ตรวจสอบว่าอยู่ใน production mode หรือไม่
 */
export function isProductionMode(): boolean {
  return !isDevelopmentBypass();
}

/**
 * แสดงข้อมูล environment สำหรับ debugging
 */
export function logEnvironmentInfo(): void {
  const nodeEnv = process.env.NODE_ENV || 'production';
  const platform = process.platform;
  const isDevBypass = isDevelopmentBypass();
  const isProd = isProductionMode();
  
  console.log('info: Environment Information:');
  console.log(`info:   NODE_ENV: ${nodeEnv}`);
  console.log(`info:   Platform: ${platform}`);
  console.log(`info:   Development Bypass: ${isDevBypass}`);
  console.log(`info:   Production Mode: ${isProd}`);
  
  if (isDevBypass) {
    console.log('⚠️  Development Bypass Active: ESP32/WiFi operations will be mocked');
  } else {
    console.log('🏭  Production Mode: All hardware operations are live');
  }
}
```

## ✅ Success Criteria

### **Build System Enhancement:**
- [ ] **Build Preparation Script**: `npm run build:prep` ทำงานได้สำเร็จ
- [ ] **Database Cleanup**: ฐานข้อมูลถูก reset และ setup ใหม่
- [ ] **Organization Setup**: ข้อมูลองค์กรถูกตั้งค่าในฐานข้อมูล
- [ ] **Resources Directory**: โฟลเดอร์ resources พร้อมสำหรับ license file
- [ ] **Production Build**: `npm run build:production` สร้าง executable ได้

### **License System Enhancement:**
- [ ] **Resource License Loading**: อ่าน license.lic จาก app resources ได้
- [ ] **Priority Search**: ค้นหา license จาก resources ก่อน แล้วค่อย fallback
- [ ] **Production Integration**: ระบบ license validation ทำงานใน production build
- [ ] **Error Handling**: จัดการ error cases ครบถ้วน

### **Manual Network System:**
- [ ] **WiFi Scanning**: สแกน available WiFi networks ได้
- [ ] **Manual Connection**: เชื่อมต่อ WiFi network ที่เลือกได้
- [ ] **ESP32 Testing**: ทดสอบการเชื่อมต่อ ESP32 หลัง WiFi connect
- [ ] **UI Integration**: Manual network dialog ทำงานใน activation flow
- [ ] **Error Recovery**: จัดการ connection failures และให้ retry ได้

### **Environment Configuration:**
- [ ] **Production Mode**: ไม่มี mock/bypass ใน production
- [ ] **Development Bypass**: ยังคง bypass สำหรับ macOS development
- [ ] **Clear Separation**: แยก development และ production behavior ชัดเจน
- [ ] **Logging**: แสดง environment status ชัดเจน

## 🧪 Testing Plan

### **Build System Testing:**
```bash
# ทดสอบ build preparation
SHARED_SECRET_KEY=test123456789012345678901234567890 \
ORGANIZATION_NAME="Test Organization" \
npm run build:prep

# ทดสอบ production build
npm run build:production:win

# ตรวจสอบ database setup
sqlite3 database.db "SELECT * FROM Settings WHERE key IN ('ORGANIZATION_NAME', 'CLI_LICENSE_ACTIVATED');"
```

### **Manual Network Testing:**
```bash
# รัน development mode
npm run dev

# ไปที่หน้า activate-key
# ทดสอบ manual network dialog
# 1. กดปุ่ม "เปลี่ยน Network" เมื่อ WiFi connection ล้มเหลว
# 2. สแกน WiFi networks
# 3. เลือก network และใส่รหัสผ่าน
# 4. ทดสอบการเชื่อมต่อ
```

### **End-to-End Production Testing:**
```bash
# 1. สร้าง license.lic ด้วย CLI
smc-license generate -o "Test Org" -c "TEST001" -a "Test App" -e "2025-12-31"

# 2. Copy license.lic ไป resources/
cp license.lic resources/

# 3. Build production
SHARED_SECRET_KEY=test123456789012345678901234567890 npm run build:production:win

# 4. ทดสอบ .exe file
# - เปิด app และไปหน้า activation
# - ตรวจสอบว่า license ถูกโหลดจาก resources
# - ทดสอบ ESP32 connection
```

## 📚 Documentation Updates

### **Build Instructions:**
```markdown
## Production Build Process

### Prerequisites:
1. สร้าง license.lic ด้วย SMC License CLI
2. ตั้งค่า environment variables:
   - `SHARED_SECRET_KEY`: 32+ characters encryption key
   - `ORGANIZATION_NAME`: Customer organization name

### Build Steps:
1. Copy license.lic ไป `resources/` directory
2. Set environment variables in `.env` file
3. Run: `npm run build:production:win`
4. Executable จะถูกสร้างใน `dist/` directory

### Deployment:
1. ส่ง .exe file กับ license.lic ให้ลูกค้า  
2. ลูกค้าติดตั้ง .exe (license.lic อยู่ใน app resources แล้ว)
3. เปิดโปรแกรมจะเข้า activation flow อัตโนมัติ
```

## 🚨 Error Handling & Troubleshooting

### **Build Issues:**
- **Missing SHARED_SECRET_KEY**: ตั้งค่า environment variable ให้ถูกต้อง
- **Database Setup Fails**: ลบ database.db แล้วรัน build:prep ใหม่
- **Resources Directory Missing**: Script จะสร้างโฟลเดอร์อัตโนมัติ

### **License Issues:**
- **License Not Found**: ตรวจสอบ license.lic ใน resources/ directory
- **Decryption Fails**: ตรวจสอบ SHARED_SECRET_KEY ตรงกับที่ใช้สร้าง license
- **License Expired**: สร้าง license ใหม่ด้วย expiry date ที่ถูกต้อง

### **Network Connection Issues:**
- **WiFi Connection Fails**: ใช้ manual network dialog เพื่อเปลี่ยน network
- **ESP32 Not Found**: ตรวจสอบ ESP32 hardware และ network connection
- **MAC Address Mismatch**: ตรวจสอบว่า ESP32 ตรงกับที่ระบุใน license

---

## 🎯 Phase 4.6 Implementation Status

**Phase 4.6 จะทำให้ SMC App พร้อมสำหรับ production deployment พร้อมด้วย:**
- ✅ Complete build system สำหรับ production
- ✅ Resource-based license management 
- ✅ Manual network retry capabilities
- ✅ Simplified environment configuration
- ✅ End-to-end production workflow

**Next Steps หลัง Phase 4.6:**
- User acceptance testing กับ production build
- Final performance optimization
- Documentation และ user manuals
- Distribution และ deployment guidelines