# Phase 4: CLI Enhancement & Testing

**ระยะเวลา:** 2-3 วัน  
**เป้าหมาย:** ปรับปรุง smc-license CLI ให้รองรับ JSON input และทำ end-to-end testing

## 📖 Overview & Goals

### **วัตถุประสงค์:**
- เพิ่ม JSON input support ใน smc-license CLI
- สร้าง validation และ error handling ที่แข็งแกร่ง
- End-to-end testing กับ real deployment data
- Performance optimization และ reliability improvements
- Documentation และ usage examples

### **Deliverables:**
- ✅ smc-license CLI ที่รองรับ JSON input แบบสมบูรณ์
- ✅ Comprehensive validation และ error handling
- ✅ End-to-end testing suite
- ✅ Performance benchmarks และ optimization
- ✅ Updated documentation และ examples
- ✅ Backward compatibility maintenance

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

## ⏭️ Next Phase

Phase 4 เสร็จแล้ว จะได้ robust CLI system พร้อม comprehensive testing

**Phase 5: Polish & Production Ready** จะ focus ที่:
- Application packaging และ distribution
- User documentation และ manuals
- Production deployment guidelines
- Final testing และ validation

**Expected Output จาก Phase 4:** Production-ready CLI ที่รองรับ JSON input, มี comprehensive error handling, และผ่าน thorough testing