#!/usr/bin/env node

/**
 * Manual Test Script for SMC License CLI
 * 
 * This script tests basic CLI commands และ structure
 * ใช้สำหรับ Phase 1 validation
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

console.log(chalk.blue('🧪 Manual Test Script - Phase 1: Foundation & Project Structure\n'));

const tests = [
  {
    name: 'CLI Help Command',
    command: 'npm run dev -- --help',
    description: 'ทดสอบการแสดง help message'
  },
  {
    name: 'CLI Version Command', 
    command: 'npm run dev -- --version',
    description: 'ทดสอบการแสดง version'
  },
  {
    name: 'Generate Command Help',
    command: 'npm run dev generate -- --help', 
    description: 'ทดสอบ help สำหรับ generate command'
  },
  {
    name: 'Validate Command Help',
    command: 'npm run dev validate -- --help',
    description: 'ทดสอบ help สำหรับ validate command'
  },
  {
    name: 'Info Command Help', 
    command: 'npm run dev info -- --help',
    description: 'ทดสอบ help สำหรับ info command'
  },
  {
    name: 'Test ESP32 Command Help',
    command: 'npm run dev test-esp32 -- --help',
    description: 'ทดสอบ help สำหรับ test-esp32 command'
  },
  {
    name: 'Generate Command (Dry Run)',
    command: 'npm run dev generate -- --org "Test Org" --customer "CUST001" --app "SMC" --expiry "2025-12-31"',
    description: 'ทดสอบ generate command พร้อม parameters (ยังไม่ implement logic)'
  },
  {
    name: 'Validate Command (Dry Run)',
    command: 'npm run dev validate -- --file "test.lic"',
    description: 'ทดสอบ validate command (ยังไม่ implement logic)'
  },
  {
    name: 'Info Command (Dry Run)',
    command: 'npm run dev info -- --file "test.lic"',
    description: 'ทดสอบ info command (ยังไม่ implement logic)'
  },
  {
    name: 'Test ESP32 Command (Dry Run)',
    command: 'npm run dev test-esp32 -- --ip "192.168.1.100"',
    description: 'ทดสอบ test-esp32 command (ยังไม่ implement logic)'
  },
  {
    name: 'Invalid Command',
    command: 'npm run dev invalid-command',
    description: 'ทดสอบ error handling สำหรับ invalid command'
  }
];

function runTest(test, index) {
  console.log(chalk.cyan(`\n${index + 1}. ${test.name}`));
  console.log(chalk.gray(`   Description: ${test.description}`));
  console.log(chalk.gray(`   Command: ${test.command}`));
  
  try {
    const output = execSync(test.command, { 
      cwd: '/Users/non/dev/smc/smc-app/cli',
      encoding: 'utf8',
      timeout: 10000
    });
    
    console.log(chalk.green('   ✅ SUCCESS'));
    if (output.trim()) {
      console.log(chalk.white('   Output:'));
      console.log(chalk.gray('   ' + output.split('\n').join('\n   ')));
    }
    
    return true;
  } catch (error) {
    if (test.name === 'Invalid Command' && error.status !== 0) {
      // Invalid command test should fail - this is expected
      console.log(chalk.green('   ✅ SUCCESS (Expected error for invalid command)'));
      console.log(chalk.gray('   Error Output:'));
      console.log(chalk.gray('   ' + error.stdout.split('\n').join('\n   ')));
      return true;
    }
    
    console.log(chalk.red('   ❌ FAILED'));
    console.log(chalk.red('   Error:', error.message));
    if (error.stdout) {
      console.log(chalk.gray('   Stdout:'), error.stdout);
    }
    if (error.stderr) {
      console.log(chalk.gray('   Stderr:'), error.stderr);
    }
    return false;
  }
}

// Build CLI ก่อน test
console.log(chalk.yellow('📦 Building CLI...'));
try {
  execSync('npm run build', { 
    cwd: '/Users/non/dev/smc/smc-app/cli',
    encoding: 'utf8'
  });
  console.log(chalk.green('✅ Build successful\n'));
} catch (error) {
  console.log(chalk.red('❌ Build failed:', error.message));
  process.exit(1);
}

// Run all tests
let passedTests = 0;
let failedTests = 0;

for (let i = 0; i < tests.length; i++) {
  const success = runTest(tests[i], i);
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
  console.log(chalk.green('\n🎉 Phase 1: Foundation & Project Structure - ALL TESTS PASSED!'));
  console.log(chalk.gray('✅ CLI structure is ready for Phase 2: ESP32 Communication Module'));
} else {
  console.log(chalk.red('\n⚠️  Some tests failed. Please fix issues before proceeding to Phase 2.'));
  process.exit(1);
}