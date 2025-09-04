#!/usr/bin/env node

/**
 * Test enhanced license parser with HKDF support
 */

const { LicenseParser } = require('./scripts/utils/licenseParser.ts');
const fs = require('fs');

async function testParser() {
  try {
    console.log('🧪 Testing Enhanced License Parser with HKDF Support...\n');
    
    // Test 1: Test with HKDF v2.0 license from CLI
    const hkdfLicensePath = './cli/test-license_test.lic';
    
    if (fs.existsSync(hkdfLicensePath)) {
      console.log('📋 Test 1: HKDF v2.0 License');
      console.log('=====================================');
      
      const parser = new LicenseParser({ verbose: true });
      
      // Test with sensitive data
      const sensitiveData = {
        macAddress: 'AA:BB:CC:DD:EE:FF',
        wifiSsid: 'TestWiFi'
      };
      
      try {
        const licenseData = await parser.parseLicenseFile(hkdfLicensePath, sensitiveData);
        console.log('✅ HKDF parsing successful!');
        console.log(`   Organization: ${licenseData.organization}`);
        console.log(`   Customer: ${licenseData.customer}`);
        console.log(`   Expiry: ${licenseData.expiry_date}`);
        console.log(`   No Expiry: ${licenseData.no_expiry}\n`);
      } catch (error) {
        console.log(`❌ HKDF parsing failed: ${error.message}\n`);
      }
    } else {
      console.log('⚠️  HKDF test license not found, skipping test 1\n');
    }
    
    // Test 2: Test without sensitive data (should fail for HKDF)
    if (fs.existsSync(hkdfLicensePath)) {
      console.log('📋 Test 2: HKDF License without Sensitive Data (Should Fail)');
      console.log('=====================================');
      
      const parser = new LicenseParser({ verbose: false });
      
      try {
        const licenseData = await parser.parseLicenseFile(hkdfLicensePath);
        console.log('❌ Unexpected success - should have failed without sensitive data\n');
      } catch (error) {
        console.log(`✅ Expected failure: ${error.message}\n`);
      }
    }
    
    console.log('🎉 Enhanced parser testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testParser();