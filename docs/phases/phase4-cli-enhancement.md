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

Phase 4.5 เสร็จแล้ว จะได้ complete Sales → Developer → Delivery workflow

**Phase 5: Polish & Production Ready** จะ focus ที่:
- Application packaging และ distribution
- User documentation และ manuals  
- Production deployment guidelines
- Final testing และ validation
- Cross-platform deployment verification

**Expected Output จาก Phase 4.5:** Production-ready CLI ที่รองรับ CSV batch processing, ESP32 Deployment Tool ที่มี expiry field, และ complete end-to-end workflow สำหรับ production deployment