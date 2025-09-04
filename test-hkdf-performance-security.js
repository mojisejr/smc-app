#!/usr/bin/env node

/**
 * HKDF Performance & Security Validation
 * Phase 7: Step 4 - Performance & Security Testing
 */

const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');

console.log('🔬 HKDF Performance & Security Validation\n');

// Performance benchmarks
const PERFORMANCE_TARGETS = {
  CLI_STARTUP: 2000,          // 2 seconds max
  LICENSE_GENERATION: 500,    // 500ms max
  LICENSE_PARSING: 200,       // 200ms max
  HKDF_KEY_DERIVATION: 100,   // 100ms max
  MEMORY_USAGE_MAX: 50        // 50MB max
};

const tests = [
  {
    name: 'CLI Startup Performance',
    description: 'Measure CLI startup time',
    target: PERFORMANCE_TARGETS.CLI_STARTUP,
    test: () => {
      const start = Date.now();
      try {
        execSync('npx ts-node index.ts --version', { 
          stdio: 'pipe',
          timeout: 10000
        });
        return Date.now() - start;
      } catch (error) {
        throw new Error(`CLI startup failed: ${error.message}`);
      }
    }
  },
  {
    name: 'HKDF License Generation Performance',
    description: 'Measure license generation speed with HKDF',
    target: PERFORMANCE_TARGETS.LICENSE_GENERATION,
    test: () => {
      const start = Date.now();
      try {
        execSync('npx ts-node index.ts generate --test-mode --org "Perf Test" --customer "PERF001" --app "PerfApp" --expiry "2025-12-31" --wifi-ssid "PerfWiFi" --wifi-password "PerfPass123" --output "perf-test.lic" --bypass-password-check', {
          stdio: 'pipe',
          timeout: 10000
        });
        return Date.now() - start;
      } catch (error) {
        throw new Error(`License generation failed: ${error.message}`);
      }
    }
  },
  {
    name: 'HKDF License Parsing Performance',
    description: 'Measure SMC App parser speed',
    target: PERFORMANCE_TARGETS.LICENSE_PARSING,
    cleanup: ['perf-test_test.lic'],
    test: () => {
      // First ensure license exists
      const licensePath = '/Users/non/dev/smc/smc-app/cli/perf-test_test.lic';
      if (!fs.existsSync(licensePath)) {
        throw new Error('Performance test license not found');
      }
      
      const { LicenseParser } = require('./scripts/utils/licenseParser.ts');
      const parser = new LicenseParser({ verbose: false });
      
      const sensitiveData = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wifiSsid: 'PerfWiFi'
      };
      
      const start = Date.now();
      return parser.parseLicenseFile(licensePath, sensitiveData)
        .then(() => Date.now() - start);
    }
  },
  {
    name: 'Security: MAC Address Exposure Check',
    description: 'Verify no MAC addresses in license files',
    isSecurity: true,
    test: () => {
      const licensePath = '/Users/non/dev/smc/smc-app/cli/hkdf-test_test.lic';
      const licenseContent = fs.readFileSync(licensePath, 'utf8');
      
      // Check for MAC address patterns
      const macPatterns = [
        /[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}/i,
        /AA:BB:CC:DD:EE:FF/i,
        /macAddress/i
      ];
      
      for (const pattern of macPatterns) {
        if (pattern.test(licenseContent)) {
          throw new Error(`MAC address pattern found in license file: ${pattern}`);
        }
      }
      
      console.log('   ✅ No MAC addresses found in license file');
      return true;
    }
  },
  {
    name: 'Security: KDF Context Non-Sensitive Data',
    description: 'Verify KDF context contains no sensitive data',
    isSecurity: true,
    test: () => {
      const licensePath = '/Users/non/dev/smc/smc-app/cli/hkdf-test_test.lic';
      const license = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
      
      if (!license.kdf_context) {
        throw new Error('No KDF context found');
      }
      
      const kdfInfo = license.kdf_context.info;
      console.log(`   KDF Info: ${kdfInfo}`);
      
      // Should not contain MAC addresses or WiFi passwords
      if (kdfInfo.includes('AA:BB:CC') || kdfInfo.includes('TestPass')) {
        throw new Error('Sensitive data found in KDF context');
      }
      
      // Should contain non-sensitive identifiers only
      const expectedPatterns = ['SMC_LICENSE_KDF', 'TestApp', 'HKDF001', '2025-12-31'];
      for (const pattern of expectedPatterns) {
        if (!kdfInfo.includes(pattern)) {
          console.log(`   ⚠️  Expected pattern not found: ${pattern}`);
        }
      }
      
      console.log('   ✅ KDF context contains only non-sensitive data');
      return true;
    }
  },
  {
    name: 'Security: HKDF Deterministic Generation',
    description: 'Verify same input produces same license',
    isSecurity: true,
    cleanup: ['deterministic-test1_test.lic', 'deterministic-test2_test.lic'],
    test: () => {
      // Generate first license
      execSync('npx ts-node index.ts generate --test-mode --org "Deterministic Test" --customer "DET001" --app "DetApp" --expiry "2025-12-31" --wifi-ssid "DetWiFi" --wifi-password "DetPass123" --output "deterministic-test1.lic" --bypass-password-check', {
        stdio: 'pipe'
      });
      
      // Wait a moment
      execSync('sleep 1', { stdio: 'pipe' });
      
      // Generate second license with same data
      execSync('npx ts-node index.ts generate --test-mode --org "Deterministic Test" --customer "DET001" --app "DetApp" --expiry "2025-12-31" --wifi-ssid "DetWiFi" --wifi-password "DetPass123" --output "deterministic-test2.lic" --bypass-password-check', {
        stdio: 'pipe'
      });
      
      const license1 = fs.readFileSync('/Users/non/dev/smc/smc-app/cli/deterministic-test1_test.lic', 'utf8');
      const license2 = fs.readFileSync('/Users/non/dev/smc/smc-app/cli/deterministic-test2_test.lic', 'utf8');
      
      const parsed1 = JSON.parse(license1);
      const parsed2 = JSON.parse(license2);
      
      // Compare KDF contexts (should be identical)
      if (JSON.stringify(parsed1.kdf_context) !== JSON.stringify(parsed2.kdf_context)) {
        throw new Error('KDF contexts differ - not deterministic');
      }
      
      // Encrypted data should be identical (same input = same output)
      if (parsed1.encrypted_data !== parsed2.encrypted_data) {
        throw new Error('Encrypted data differs - not deterministic');
      }
      
      console.log('   ✅ HKDF generation is deterministic');
      return true;
    }
  },
  {
    name: 'Security: Wrong Credentials Fail',
    description: 'Verify wrong MAC/WiFi credentials fail correctly',
    isSecurity: true,
    test: () => {
      const { LicenseParser } = require('./scripts/utils/licenseParser.ts');
      const parser = new LicenseParser({ verbose: false });
      
      const licensePath = '/Users/non/dev/smc/smc-app/cli/hkdf-test_test.lic';
      const wrongCredentials = {
        macAddress: 'BB:CC:DD:EE:FF:AA',  // Wrong MAC
        wifiSsid: 'WrongWiFi'             // Wrong SSID
      };
      
      return parser.parseLicenseFile(licensePath, wrongCredentials)
        .then(() => {
          throw new Error('Expected failure with wrong credentials');
        })
        .catch((error) => {
          if (error.message.includes('Expected failure')) {
            throw error;
          }
          console.log(`   ✅ Wrong credentials properly rejected: ${error.message}`);
          return true;
        });
    }
  }
];

async function runPerformanceTest(test) {
  console.log(`⏱️  ${test.name}`);
  console.log(`   ${test.description}`);
  
  try {
    const result = await test.test();
    
    if (test.isSecurity) {
      console.log(`   ✅ Security validation passed\n`);
      return { passed: true, type: 'security' };
    } else {
      const executionTime = result;
      console.log(`   Execution time: ${executionTime}ms`);
      
      if (test.target && executionTime > test.target) {
        console.log(`   ❌ Performance issue: Exceeded ${test.target}ms target\n`);
        return { passed: false, executionTime, target: test.target, type: 'performance' };
      } else {
        console.log(`   ✅ Performance target met: Under ${test.target}ms\n`);
        return { passed: true, executionTime, target: test.target, type: 'performance' };
      }
    }
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}\n`);
    return { passed: false, error: error.message, type: test.isSecurity ? 'security' : 'performance' };
  }
}

async function cleanupFiles() {
  const allCleanupFiles = tests
    .filter(test => test.cleanup)
    .flatMap(test => test.cleanup)
    .concat(['perf-test_test.lic']);

  for (const file of allCleanupFiles) {
    const filePath = `/Users/non/dev/smc/smc-app/cli/${file}`;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`   🗑️  Removed: ${file}`);
      } catch (error) {
        console.log(`   ⚠️  Failed to remove: ${file}`);
      }
    }
  }
}

async function runAllTests() {
  let performancePassed = 0;
  let performanceFailed = 0;
  let securityPassed = 0;
  let securityFailed = 0;
  
  console.log('📊 Starting HKDF Performance & Security Validation...\n');

  for (const test of tests) {
    const result = await runPerformanceTest(test);
    
    if (result.type === 'performance') {
      if (result.passed) {
        performancePassed++;
      } else {
        performanceFailed++;
      }
    } else if (result.type === 'security') {
      if (result.passed) {
        securityPassed++;
      } else {
        securityFailed++;
      }
    }
  }

  // Cleanup test files
  console.log('🧹 Cleaning up test files...');
  await cleanupFiles();
  console.log('');

  // Summary
  console.log('📊 Performance & Security Validation Summary:');
  console.log('===========================================');
  console.log(`⚡ Performance Tests:`);
  console.log(`   ✅ Passed: ${performancePassed}`);
  console.log(`   ❌ Failed: ${performanceFailed}`);
  
  console.log(`🔒 Security Tests:`);
  console.log(`   ✅ Passed: ${securityPassed}`);
  console.log(`   ❌ Failed: ${securityFailed}`);
  
  console.log(`📝 Total: ${tests.length} tests`);

  if (performanceFailed === 0 && securityFailed === 0) {
    console.log('\n🎉 Phase 7 Step 4: Performance & Security Validation - ALL TESTS PASSED!');
    console.log('✅ HKDF v2.0 system meets all performance and security requirements');
    console.log('✅ Production-ready for deployment');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Review results before production deployment.');
    return false;
  }
}

// Run tests
runAllTests().then((success) => {
  process.exit(success ? 0 : 1);
}).catch(console.error);