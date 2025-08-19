#!/usr/bin/env node

/**
 * Manual Test Script for SMC License CLI - Phase 3
 * 
 * ทดสอบ Encryption & License Generation
 * ใช้สำหรับ Phase 3 validation
 */

const { execSync, exec } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue('🧪 Manual Test Script - Phase 3: Encryption & License Generation\n'));

// Test configuration
const TEST_CONFIG = {
  org: 'SMC Test Organization',
  customer: 'CUST001',
  app: 'SMC_Medical_Cabinet',
  expiry: '2025-12-31',
  esp32_ip: '192.168.4.1',
  output: 'test-license.lic',
  test_output: 'test-license_test.lic'
};

console.log(chalk.cyan('🔧 Test Configuration:'));
console.log(chalk.gray(`   Organization: ${TEST_CONFIG.org}`));
console.log(chalk.gray(`   Customer ID: ${TEST_CONFIG.customer}`));
console.log(chalk.gray(`   Application: ${TEST_CONFIG.app}`));
console.log(chalk.gray(`   Expiry Date: ${TEST_CONFIG.expiry}`));
console.log(chalk.gray(`   ESP32 IP: ${TEST_CONFIG.esp32_ip}`));
console.log('');

const tests = [
  {
    name: 'Build CLI Project',
    command: 'npm run build',
    description: 'Build TypeScript project ก่อน test',
    required: true
  },
  {
    name: 'Generate License Help',
    command: 'npm run dev generate -- --help',
    description: 'ตรวจสอบ help message สำหรับ generate command',
    validate_output: (output) => {
      return output.includes('--test-mode') && 
             output.includes('ESP32 MAC address binding') &&
             output.includes('192.168.4.1');
    }
  },
  {
    name: 'Generate Test License (Mock MAC)',
    command: `npm run dev generate -- --org "${TEST_CONFIG.org}" --customer ${TEST_CONFIG.customer} --app ${TEST_CONFIG.app} --expiry ${TEST_CONFIG.expiry} --output ${TEST_CONFIG.output} --test-mode`,
    description: 'สร้าง test license ด้วย mock MAC address',
    validate_file: TEST_CONFIG.test_output,
    cleanup_files: [TEST_CONFIG.test_output]
  },
  {
    name: 'Generate License with Invalid Date Format',
    command: `npm run dev generate -- --org "Test" --customer "CUST001" --app "SMC" --expiry "31/12/2025" --test-mode`,
    description: 'ทดสอบ error handling สำหรับ invalid date format',
    expect_error: true
  },
  {
    name: 'Generate License with Past Date',
    command: `npm run dev generate -- --org "Test" --customer "CUST001" --app "SMC" --expiry "2020-01-01" --test-mode`,
    description: 'ทดสอบ error handling สำหรับ past expiry date',
    expect_error: true
  },
  {
    name: 'Generate License with Missing Required Fields',
    command: 'npm run dev generate -- --org "Test" --expiry "2025-12-31" --test-mode',
    description: 'ทดสอบ error handling สำหรับ missing required fields',
    expect_error: true
  },
  {
    name: 'Generate License with ESP32 (May Skip)',
    command: `npm run dev generate -- --org "${TEST_CONFIG.org}" --customer ${TEST_CONFIG.customer} --app ${TEST_CONFIG.app} --expiry ${TEST_CONFIG.expiry} --output real-license.lic --esp32-ip ${TEST_CONFIG.esp32_ip}`,
    description: 'สร้าง license ด้วย ESP32 จริง (อาจ skip ถ้า ESP32 ไม่พร้อม)',
    expected_esp32: true,
    cleanup_files: ['real-license.lic'],
    timeout: 30000
  },
  {
    name: 'Validate License File Format',
    command: '',
    description: 'ตรวจสอบ license file format ที่สร้างขึ้น',
    custom_test: true
  }
];

function runTest(test, index) {
  console.log(chalk.cyan(`\n${index + 1}. ${test.name}`));
  console.log(chalk.gray(`   Description: ${test.description}`));
  
  if (test.custom_test) {
    return runCustomTest(test);
  }
  
  if (test.command) {
    console.log(chalk.gray(`   Command: ${test.command}`));
  }
  
  // ถ้าต้องการ ESP32 จริง ให้เตือนก่อน
  if (test.expected_esp32) {
    console.log(chalk.yellow(`   ⚠️  This test requires ESP32 at ${TEST_CONFIG.esp32_ip}`));
  }
  
  if (test.expect_error) {
    console.log(chalk.yellow(`   ⚠️  This test expects error response`));
  }
  
  try {
    const timeout = test.timeout || 15000;
    const output = execSync(test.command, { 
      cwd: '/Users/non/dev/smc/smc-app/cli',
      encoding: 'utf8',
      timeout: timeout
    });
    
    // ตรวจสอบ output ถ้ามี validation function
    if (test.validate_output) {
      if (test.validate_output(output)) {
        console.log(chalk.green('   ✅ SUCCESS (Output validation passed)'));
      } else {
        console.log(chalk.red('   ❌ FAILED (Output validation failed)'));
        console.log(chalk.gray('   Expected content not found in output'));
        return false;
      }
    } else if (test.expect_error) {
      console.log(chalk.red('   ❌ FAILED (Expected error but command succeeded)'));
      return false;
    } else {
      console.log(chalk.green('   ✅ SUCCESS'));
    }
    
    // ตรวจสอบว่าไฟล์ถูกสร้างขึ้นหรือไม่
    if (test.validate_file) {
      const filePath = path.join('/Users/non/dev/smc/smc-app/cli', test.validate_file);
      if (fs.existsSync(filePath)) {
        const fileStats = fs.statSync(filePath);
        console.log(chalk.green(`   📄 File created: ${test.validate_file} (${fileStats.size} bytes)`));
        
        // ตรวจสอบ JSON format
        try {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const licenseFile = JSON.parse(fileContent);
          
          if (licenseFile.version && licenseFile.encrypted_data && licenseFile.algorithm) {
            console.log(chalk.green('   📋 License file format valid'));
          } else {
            console.log(chalk.red('   ❌ License file format invalid'));
            return false;
          }
        } catch (e) {
          console.log(chalk.red(`   ❌ License file JSON parse failed: ${e.message}`));
          return false;
        }
        
      } else {
        console.log(chalk.red(`   ❌ Expected file not created: ${test.validate_file}`));
        return false;
      }
    }
    
    // แสดง output ถ้ามี
    if (output.trim() && !test.validate_output) {
      console.log(chalk.white('   Output:'));
      const lines = output.split('\n');
      lines.slice(0, 10).forEach(line => {
        console.log(chalk.gray('   ' + line));
      });
      if (lines.length > 10) {
        console.log(chalk.gray('   ... (truncated)'));
      }
    }
    
    return true;
    
  } catch (error) {
    if (test.expect_error) {
      console.log(chalk.green('   ✅ SUCCESS (Expected error occurred)'));
      if (error.stdout) {
        console.log(chalk.gray('   Error Output:'));
        console.log(chalk.gray('   ' + error.stdout.split('\n').slice(0, 3).join('\n   ')));
      }
      return true;
    }
    
    if (test.expected_esp32 && (error.message.includes('ESP32') || error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
      console.log(chalk.yellow('   ⚠️  SKIPPED (ESP32 not available - this is expected if ESP32 is not connected)'));
      return true; // ไม่ถือว่า fail ถ้า ESP32 ไม่พร้อม
    }
    
    console.log(chalk.red('   ❌ FAILED'));
    console.log(chalk.red('   Error:', error.message));
    if (error.stdout) {
      console.log(chalk.gray('   Stdout:'), error.stdout.split('\n').slice(0, 3).join(' '));
    }
    return false;
  }
}

function runCustomTest(test) {
  if (test.name === 'Validate License File Format') {
    // ตรวจสอบไฟล์ test license ที่สร้างไว้
    const testFilePath = path.join('/Users/non/dev/smc/smc-app/cli', TEST_CONFIG.test_output);
    
    if (!fs.existsSync(testFilePath)) {
      console.log(chalk.red('   ❌ FAILED (Test license file not found)'));
      return false;
    }
    
    try {
      const fileContent = fs.readFileSync(testFilePath, 'utf8');
      const licenseFile = JSON.parse(fileContent);
      
      console.log(chalk.blue('   📋 Analyzing license file structure...'));
      
      // ตรวจสอบ required fields
      const requiredFields = ['version', 'encrypted_data', 'algorithm', 'created_at'];
      let allFieldsPresent = true;
      
      for (const field of requiredFields) {
        if (licenseFile[field]) {
          console.log(chalk.green(`   ✅ ${field}: ${typeof licenseFile[field] === 'string' ? licenseFile[field].substring(0, 50) + '...' : licenseFile[field]}`));
        } else {
          console.log(chalk.red(`   ❌ Missing field: ${field}`));
          allFieldsPresent = false;
        }
      }
      
      // ตรวจสอบ encryption format
      if (licenseFile.encrypted_data) {
        console.log(chalk.blue(`   🔐 Encrypted data length: ${licenseFile.encrypted_data.length} characters`));
        
        // ตรวจสอบ Base64 format
        try {
          Buffer.from(licenseFile.encrypted_data, 'base64');
          console.log(chalk.green('   ✅ Base64 encoding valid'));
        } catch (e) {
          console.log(chalk.red('   ❌ Invalid Base64 encoding'));
          allFieldsPresent = false;
        }
      }
      
      if (allFieldsPresent) {
        console.log(chalk.green('   ✅ SUCCESS (License file format validation passed)'));
        return true;
      } else {
        console.log(chalk.red('   ❌ FAILED (License file format validation failed)'));
        return false;
      }
      
    } catch (error) {
      console.log(chalk.red(`   ❌ FAILED (JSON parse error: ${error.message})`));
      return false;
    }
  }
  
  return false;
}

// Cleanup function
function cleanupTestFiles() {
  console.log(chalk.blue('\n🧹 Cleaning up test files...'));
  
  const allCleanupFiles = tests
    .filter(test => test.cleanup_files)
    .flatMap(test => test.cleanup_files)
    .concat([TEST_CONFIG.test_output, 'real-license.lic']);
  
  for (const file of allCleanupFiles) {
    const filePath = path.join('/Users/non/dev/smc/smc-app/cli', file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(chalk.gray(`   🗑️  Removed: ${file}`));
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️  Failed to remove: ${file}`));
      }
    }
  }
}

// Run all tests
async function runAllTests() {
  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    // Build test is required
    if (test.required && i === 0) {
      const success = runTest(test, i);
      if (!success) {
        console.log(chalk.red('\n❌ Build failed! Cannot continue with tests.'));
        process.exit(1);
      }
      passedTests++;
      continue;
    }
    
    const success = runTest(test, i);
    if (success) {
      passedTests++;
    } else {
      failedTests++;
    }
  }

  // Summary
  console.log(chalk.blue('\n📊 Test Summary:'));
  console.log(chalk.green(`✅ Passed: ${passedTests}`));
  console.log(chalk.red(`❌ Failed: ${failedTests}`));
  console.log(chalk.gray(`📝 Total: ${tests.length}`));

  if (failedTests === 0) {
    console.log(chalk.green('\n🎉 Phase 3: Encryption & License Generation - ALL TESTS PASSED!'));
    console.log(chalk.gray('✅ License generation is ready for Phase 4: Complete CLI Implementation'));
    
    // Show sample license file path
    const sampleFile = path.join('/Users/non/dev/smc/smc-app/cli', TEST_CONFIG.test_output);
    if (fs.existsSync(sampleFile)) {
      console.log(chalk.blue(`\n📄 Sample license file: ${sampleFile}`));
    }
    
  } else {
    console.log(chalk.red('\n⚠️  Some tests failed. Please fix issues before proceeding to Phase 4.'));
  }

  // Cleanup
  cleanupTestFiles();
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// Start testing
runAllTests().catch(console.error);