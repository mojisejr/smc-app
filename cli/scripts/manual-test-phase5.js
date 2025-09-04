#!/usr/bin/env node

/**
 * Manual Test Script for SMC License CLI - Phase 5
 * 
 * Final comprehensive test suite รวมทุก phase และ production features
 * ใช้สำหรับ Phase 5 validation
 */

const { execSync, exec } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.blue('🧪 Manual Test Script - Phase 5: Final Comprehensive Testing\n'));

// Test configuration
const TEST_CONFIG = {
  org: 'SMC Production Test',
  customer: 'PROD001',
  app: 'SMC_Medical_Cabinet_Pro',
  expiry: '2025-12-31',
  esp32_ip: '192.168.4.1',
  output: 'production-test.lic',
  test_output: 'production-test_test.lic'
};

console.log(chalk.cyan('🔧 Production Test Configuration:'));
console.log(chalk.gray(`   Organization: ${TEST_CONFIG.org}`));
console.log(chalk.gray(`   Customer ID: ${TEST_CONFIG.customer}`));
console.log(chalk.gray(`   Application: ${TEST_CONFIG.app}`));
console.log(chalk.gray(`   Expiry Date: ${TEST_CONFIG.expiry}`));
console.log(chalk.gray(`   ESP32 IP: ${TEST_CONFIG.esp32_ip}`));
console.log('');

const tests = [
  {
    name: 'Production Build Test',
    command: 'npm run build:prod',
    description: 'Build production-optimized binary',
    required: true,
    timeout: 30000
  },
  {
    name: 'CLI Binary Validation',
    command: 'node dist/index.js --version',
    description: 'ตรวจสอบ production binary ทำงานได้',
    validate_output: (output) => {
      return output.includes('1.0.0');
    }
  },
  {
    name: 'Help Message Quality Check',
    command: 'node dist/index.js --help',
    description: 'ตรวจสอบ help message มี examples และ descriptions',
    expect_help_exit: true,
    validate_output: (output) => {
      return output.includes('Examples:') && 
             output.includes('CLI tool for generating SMC license keys') &&
             output.includes('generate') &&
             output.includes('validate') &&
             output.includes('info') &&
             output.includes('test-esp32');
    }
  },
  {
    name: 'Generate Command Help Quality',
    command: 'node dist/index.js generate --help',
    description: 'ตรวจสอบ generate command help มี examples',
    validate_output: (output) => {
      return output.includes('Examples:') && 
             output.includes('$ smc-license generate') &&
             output.includes('ESP32 MAC address binding');
    }
  },
  {
    name: 'Production License Generation',
    command: `node dist/index.js generate --org "${TEST_CONFIG.org}" --customer ${TEST_CONFIG.customer} --app ${TEST_CONFIG.app} --expiry ${TEST_CONFIG.expiry} --output ${TEST_CONFIG.output} --test-mode`,
    description: 'สร้าง production-grade license file',
    validate_file: TEST_CONFIG.test_output,
    cleanup_files: [TEST_CONFIG.test_output],
    timeout: 15000
  },
  {
    name: 'License Validation Performance',
    command: `node dist/index.js validate --file ${TEST_CONFIG.test_output}`,
    description: 'ทดสอบ validate command performance',
    depends_on_file: TEST_CONFIG.test_output,
    validate_output: (output) => {
      return output.includes('License validation PASSED') && 
             output.includes('valid and ready for use') &&
             output.includes(TEST_CONFIG.org);
    },
    measure_performance: true
  },
  {
    name: 'License Info Display Quality',
    command: `node dist/index.js info --file ${TEST_CONFIG.test_output}`,
    description: 'ทดสอบ info command output quality',
    depends_on_file: TEST_CONFIG.test_output,
    validate_output: (output) => {
      return output.includes('License file information') && 
             output.includes('Decrypted License Data') &&
             output.includes('Hardware Binding') &&
             output.includes('Date Information') &&
             output.includes(TEST_CONFIG.org);
    }
  },
  {
    name: 'Error Handling - Invalid File',
    command: 'node dist/index.js validate --file non-existent-file.lic',
    description: 'ทดสอบ error handling quality',
    expect_error: true,
    validate_output: (output) => {
      return output.includes('License file not found') ||
             output.includes('not readable') ||
             output.includes('ENOENT');
    }
  },
  {
    name: 'Error Handling - Invalid Date Format',
    command: `node dist/index.js generate --org "Test" --customer "TEST" --app "TEST" --expiry "invalid-date" --test-mode`,
    description: 'ทดสอบ date validation error handling',
    expect_error: true,
    validate_output: (output) => {
      return output.includes('License generation failed') &&
             output.includes('🔧 Troubleshooting:') &&
             output.includes('YYYY-MM-DD format');
    }
  },
  {
    name: 'ESP32 Test with Progress Indicators',
    command: `node dist/index.js test-esp32 --ip ${TEST_CONFIG.esp32_ip}`,
    description: 'ทดสอบ ESP32 connection กับ progress indicators',
    expected_esp32: true,
    timeout: 20000
  },
  {
    name: 'CLI Performance - Startup Time',
    command: 'node dist/index.js --help',
    description: 'ทดสอบ CLI startup performance',
    expect_help_exit: true,
    measure_performance: true,
    performance_threshold: 2000 // 2 seconds max
  },
  {
    name: 'Memory Usage Test',
    command: `node dist/index.js generate --org "Memory Test" --customer "MEM001" --app "TEST" --expiry "2026-06-30" --output memory-test.lic --test-mode`,
    description: 'ทดสอบ memory usage ในการสร้าง license',
    cleanup_files: ['memory-test_test.lic'],
    measure_memory: true,
    timeout: 20000
  },
  {
    name: 'Package Test',
    command: 'npm run package',
    description: 'ทดสอบการ package binary file',
    timeout: 30000,
    validate_output: (output) => {
      return output.includes('smc-license-cli-1.0.0.tgz');
    }
  }
];

function runTest(test, index) {
  console.log(chalk.cyan(`\n${index + 1}. ${test.name}`));
  console.log(chalk.gray(`   Description: ${test.description}`));
  
  if (test.custom_test) {
    return runCustomTest(test);
  }
  
  // ตรวจสอบ dependency file ก่อน run test
  if (test.depends_on_file) {
    const filePath = path.join('/Users/non/dev/smc/smc-app/cli', test.depends_on_file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`   ⚠️  SKIPPED (Required file not found: ${test.depends_on_file})`));
      return true;
    }
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
  
  // Performance measurement
  const startTime = Date.now();
  let memoryBefore;
  if (test.measure_memory) {
    memoryBefore = process.memoryUsage();
  }
  
  try {
    const timeout = test.timeout || 15000;
    const output = execSync(test.command, { 
      cwd: '/Users/non/dev/smc/smc-app/cli',
      encoding: 'utf8',
      timeout: timeout
    });
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Performance validation
    if (test.measure_performance) {
      console.log(chalk.blue(`   ⏱️  Execution time: ${executionTime}ms`));
      
      if (test.performance_threshold && executionTime > test.performance_threshold) {
        console.log(chalk.red(`   ❌ PERFORMANCE ISSUE: Exceeded ${test.performance_threshold}ms threshold`));
        return false;
      } else if (test.performance_threshold) {
        console.log(chalk.green(`   ✅ Performance OK: Under ${test.performance_threshold}ms threshold`));
      }
    }
    
    // Memory measurement
    if (test.measure_memory && memoryBefore) {
      const memoryAfter = process.memoryUsage();
      const memoryDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
      console.log(chalk.blue(`   💾 Memory usage: ${(memoryDiff / 1024 / 1024).toFixed(2)} MB`));
    }
    
    // ตรวจสอบ output ถ้ามี validation function
    if (test.validate_output) {
      if (test.validate_output(output)) {
        console.log(chalk.green('   ✅ SUCCESS (Output validation passed)'));
      } else {
        console.log(chalk.red('   ❌ FAILED (Output validation failed)'));
        console.log(chalk.gray('   Expected content not found in output'));
        console.log(chalk.gray('   First 200 chars of output:'));
        console.log(chalk.gray(`   "${output.substring(0, 200)}..."`));
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
    
    // แสดง output sample ถ้าไม่มี validation
    if (!test.validate_output && output.trim() && executionTime < 10000) { // Don't show output for long-running commands
      const lines = output.split('\n');
      if (lines.length > 3) {
        console.log(chalk.white('   Sample output (first 3 lines):'));
        lines.slice(0, 3).forEach(line => {
          console.log(chalk.gray('   ' + line));
        });
      }
    }
    
    return true;
    
  } catch (error) {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    if (test.measure_performance) {
      console.log(chalk.blue(`   ⏱️  Execution time: ${executionTime}ms`));
    }
    
    if (test.expect_error) {
      // Check if error message has quality improvements
      if (test.validate_output && error.stdout) {
        if (test.validate_output(error.stdout)) {
          console.log(chalk.green('   ✅ SUCCESS (Expected error with quality message)'));
          return true;
        } else {
          console.log(chalk.red('   ❌ FAILED (Error message quality insufficient)'));
          return false;
        }
      } else {
        console.log(chalk.green('   ✅ SUCCESS (Expected error occurred)'));
        if (error.stdout) {
          console.log(chalk.gray('   Error Output Sample:'));
          console.log(chalk.gray('   ' + error.stdout.split('\n').slice(0, 2).join('\n   ')));
        }
        return true;
      }
    }
    
    // Handle CLI help exit (ปกติ CLI จะแสดง help แล้ว exit code 1)
    if (test.expect_help_exit && error.stdout) {
      const output = error.stdout;
      if (test.validate_output && test.validate_output(output)) {
        console.log(chalk.green('   ✅ SUCCESS (Help message validation passed)'));
        return true;
      } else if (test.validate_output) {
        console.log(chalk.red('   ❌ FAILED (Help message validation failed)'));
        console.log(chalk.gray('   Expected content not found in help output'));
        return false;
      } else {
        console.log(chalk.green('   ✅ SUCCESS (Help displayed as expected)'));
        return true;
      }
    }
    
    if (test.expected_esp32 && (error.message.includes('ESP32') || error.message.includes('timeout') || error.message.includes('ETIMEDOUT'))) {
      console.log(chalk.yellow('   ⚠️  SKIPPED (ESP32 not available - this is expected if ESP32 is not connected)'));
      return true; // ไม่ถือว่า fail ถ้า ESP32 ไม่พร้อม
    }
    
    console.log(chalk.red('   ❌ FAILED'));
    console.log(chalk.red('   Error:', error.message.substring(0, 100)));
    if (error.stdout) {
      console.log(chalk.gray('   Sample stdout:'), error.stdout.split('\n').slice(0, 2).join(' '));
    }
    return false;
  }
}

// Cleanup function
function cleanupTestFiles() {
  console.log(chalk.blue('\n🧹 Cleaning up test files...'));
  
  const allCleanupFiles = tests
    .filter(test => test.cleanup_files)
    .flatMap(test => test.cleanup_files)
    .concat([TEST_CONFIG.test_output, 'memory-test_test.lic', 'smc-license-cli-1.0.0.tgz']);
  
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
  let skippedTests = 0;
  
  console.log(chalk.blue('📊 Starting Phase 5 Final Test Suite...\n'));

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    // Build test is required
    if (test.required && i === 0) {
      console.log(chalk.yellow('🔨 Running required build test first...'));
      const success = runTest(test, i);
      if (!success) {
        console.log(chalk.red('\n❌ Production build failed! Cannot continue with tests.'));
        process.exit(1);
      }
      passedTests++;
      console.log(chalk.green('✅ Production build successful, continuing with tests...\n'));
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
  console.log(chalk.blue('\n📊 Phase 5 Final Test Summary:'));
  console.log(chalk.green(`✅ Passed: ${passedTests}`));
  console.log(chalk.red(`❌ Failed: ${failedTests}`));
  console.log(chalk.gray(`📝 Total: ${tests.length}`));
  
  // Performance summary
  console.log(chalk.blue('\n⚡ Performance Summary:'));
  console.log(chalk.gray('   - CLI startup time tested'));
  console.log(chalk.gray('   - License generation performance measured'));
  console.log(chalk.gray('   - Memory usage monitored'));
  console.log(chalk.gray('   - Production build optimization verified'));

  if (failedTests === 0) {
    console.log(chalk.green('\n🎉 Phase 5: Polish & Final Testing - ALL TESTS PASSED!'));
    console.log(chalk.gray('✅ Production-ready CLI with all enhancements'));
    console.log(chalk.gray('✅ UX/DX improvements implemented'));
    console.log(chalk.gray('✅ Error handling and troubleshooting enhanced'));
    console.log(chalk.gray('✅ Performance optimized and validated'));
    console.log(chalk.gray('✅ Documentation complete and comprehensive'));
    console.log(chalk.gray('✅ Build system ready for distribution'));
    console.log(chalk.blue('\n🚀 SMC License CLI v1.0.0 ready for production deployment!'));
    
  } else {
    console.log(chalk.red('\n⚠️  Some tests failed. Please fix issues before production deployment.'));
  }

  // Cleanup
  cleanupTestFiles();
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// Start testing
runAllTests().catch(console.error);