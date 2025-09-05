const { Setting } = require('./db/model/setting.model');
const { LicenseFileManager } = require('./main/license/file-manager');
const { saveLicenseActivation } = require('./main/license/validator');
const { logger } = require('./main/logger');

/**
 * Script to activate internal license for testing
 * This simulates the activation process without requiring ESP32
 */

async function activateInternalLicense() {
  try {
    console.log('🔄 Starting internal license activation...');
    
    // 1. Check if license file exists
    console.log('📁 Checking for license file...');
    const licenseFile = await LicenseFileManager.findLicenseFile();
    
    if (!licenseFile) {
      console.error('❌ License file not found!');
      return false;
    }
    
    console.log(`✅ License file found: ${licenseFile}`);
    
    // 2. Parse license file to check type
    console.log('🔍 Parsing license file...');
    const mockMacAddress = 'AA:BB:CC:DD:EE:FF';
    const licenseData = await LicenseFileManager.parseLicenseFile(licenseFile, mockMacAddress);
    
    if (!licenseData) {
      console.error('❌ Failed to parse license file!');
      return false;
    }
    
    console.log(`📋 License Type: ${licenseData.license_type || 'production'}`);
    console.log(`🏢 Organization: ${licenseData.organization}`);
    console.log(`👤 Customer: ${licenseData.customerId}`);
    console.log(`📅 Expires: ${licenseData.expiryDate}`);
    
    // 3. Check if it's internal license
    const licenseType = licenseData.license_type || 'production';
    const isInternalLicense = licenseType === 'internal' || licenseType === 'development';
    
    if (!isInternalLicense) {
      console.error('❌ This script only works with internal/development licenses!');
      console.error(`   Current license type: ${licenseType}`);
      return false;
    }
    
    console.log(`✅ Internal license detected: ${licenseType}`);
    
    // 4. Check expiry date
    const expiryDate = new Date(licenseData.expiryDate);
    const today = new Date();
    
    if (expiryDate < today) {
      console.error(`❌ License expired on ${licenseData.expiryDate}`);
      return false;
    }
    
    console.log('✅ License is valid and not expired');
    
    // 5. Save activation to database
    console.log('💾 Saving activation to database...');
    const saved = await saveLicenseActivation();
    
    if (!saved) {
      console.error('❌ Failed to save activation to database!');
      return false;
    }
    
    console.log('✅ License activation saved to database successfully!');
    
    // 6. Log the activation
    await logger({
      user: 'system',
      message: `Internal license activated successfully - Organization: ${licenseData.organization}, Type: ${licenseType}`
    });
    
    console.log('🎉 Internal license activation completed successfully!');
    console.log('');
    console.log('ℹ️  You can now restart the application to use the activated license.');
    
    return true;
    
  } catch (error) {
    console.error('❌ License activation failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the activation
activateInternalLicense()
  .then((success) => {
    if (success) {
      console.log('\n✅ Activation process completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Activation process failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });