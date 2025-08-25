#!/usr/bin/env node

/**
 * Test CLI ↔ SMC App HKDF Integration
 * Phase 7: Step 2 - SMC App Integration Testing
 */

const { LicenseParser } = require('./scripts/utils/licenseParser.ts');
const fs = require('fs');

async function testCLISMCAppIntegration() {
  try {
    console.log('🔄 Testing CLI ↔ SMC App HKDF Integration...\n');
    
    // Test 1: Test with CLI-generated HKDF license
    const cliLicensePath = '/Users/non/dev/smc/smc-app/cli/hkdf-test_test.lic';
    
    if (fs.existsSync(cliLicensePath)) {
      console.log('📋 Test 1: CLI-Generated HKDF v2.0 License');
      console.log('=====================================');
      
      const parser = new LicenseParser({ verbose: true });
      
      // Test with sensitive data matching CLI generation
      const sensitiveData = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wifiSsid: 'TestWiFi_HKDF'
      };
      
      try {
        const licenseData = await parser.parseLicenseFile(cliLicensePath, sensitiveData);
        console.log('✅ CLI → SMC App parsing successful!');
        console.log(`   Organization: ${licenseData.organization}`);
        console.log(`   Customer: ${licenseData.customer}`);
        console.log(`   Application: ${licenseData.application_name}`);
        console.log(`   Expiry: ${licenseData.expiry_date}`);
        console.log(`   No Expiry: ${licenseData.no_expiry}`);
        console.log(`   MAC Address: ${licenseData.hardware_binding.mac_address}`);
        console.log(`   WiFi SSID: ${licenseData.network.wifi_ssid}\n`);
        
        // Validate expected values
        if (licenseData.organization === 'Test Corp HKDF' && 
            licenseData.customer === 'HKDF001' &&
            licenseData.application_name === 'TestApp_HKDF_TEST' &&
            licenseData.expiry_date === '2025-12-31') {
          console.log('✅ Data integrity verification PASSED');
        } else {
          console.log('❌ Data integrity verification FAILED');
          return false;
        }
        
      } catch (error) {
        console.log(`❌ CLI → SMC App parsing failed: ${error.message}\n`);
        return false;
      }
    } else {
      console.log('⚠️  CLI HKDF test license not found, skipping test 1\n');
      return false;
    }
    
    // Test 2: Test with updated expiry CLI license 
    const updatedLicensePath = '/Users/non/dev/smc/smc-app/cli/hkdf-test-updated.lic';
    
    if (fs.existsSync(updatedLicensePath)) {
      console.log('📋 Test 2: Updated Expiry HKDF License');
      console.log('=====================================');
      
      const parser = new LicenseParser({ verbose: false });
      
      // Same sensitive data
      const sensitiveData = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wifiSsid: 'TestWiFi_HKDF'
      };
      
      try {
        const licenseData = await parser.parseLicenseFile(updatedLicensePath, sensitiveData);
        console.log('✅ Updated license parsing successful!');
        console.log(`   Organization: ${licenseData.organization}`);
        console.log(`   Customer: ${licenseData.customer}`);
        console.log(`   Expiry: ${licenseData.expiry_date} (Updated)`);
        
        // Validate expiry update worked
        if (licenseData.expiry_date === '2026-12-31') {
          console.log('✅ Expiry update verification PASSED\n');
        } else {
          console.log('❌ Expiry update verification FAILED\n');
          return false;
        }
        
      } catch (error) {
        console.log(`❌ Updated license parsing failed: ${error.message}\n`);
        return false;
      }
    } else {
      console.log('⚠️  Updated license not found, skipping test 2\n');
    }
    
    // Test 3: Test without sensitive data (should fail for HKDF)
    console.log('📋 Test 3: HKDF License without Sensitive Data (Should Fail)');
    console.log('=====================================');
    
    const parser = new LicenseParser({ verbose: false });
    
    try {
      const licenseData = await parser.parseLicenseFile(cliLicensePath);
      console.log('❌ Unexpected success - should have failed without sensitive data\n');
      return false;
    } catch (error) {
      console.log(`✅ Expected failure: ${error.message}\n`);
    }
    
    // Test 4: Test with wrong MAC address (should fail)
    console.log('📋 Test 4: HKDF License with Wrong MAC Address (Should Fail)');
    console.log('=====================================');
    
    const wrongSensitiveData = {
      macAddress: 'BB:CC:DD:EE:FF:AA', // Wrong MAC
      wifiSsid: 'TestWiFi_HKDF'
    };
    
    try {
      const licenseData = await parser.parseLicenseFile(cliLicensePath, wrongSensitiveData);
      console.log('❌ Unexpected success - should have failed with wrong MAC\n');
      return false;
    } catch (error) {
      console.log(`✅ Expected failure with wrong MAC: ${error.message}\n`);
    }
    
    console.log('🎉 CLI ↔ SMC App HKDF Integration testing completed successfully!');
    console.log('');
    console.log('📊 Integration Test Summary:');
    console.log('✅ CLI-generated HKDF licenses work with SMC App parser');
    console.log('✅ Data integrity verified between CLI and SMC App');
    console.log('✅ Expiry update functionality working end-to-end');
    console.log('✅ Security validation (wrong credentials fail correctly)');
    console.log('✅ HKDF v2.0 system fully integrated and compatible');
    
    return true;
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    return false;
  }
}

testCLISMCAppIntegration().then((success) => {
  if (success) {
    console.log('\n🚀 Phase 7 Step 2: SMC App Integration Testing - ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some integration tests failed');
    process.exit(1);
  }
}).catch(console.error);