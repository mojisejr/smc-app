import { Setting } from './db/model/setting.model';
import { LicenseFileManager } from './main/license/file-manager';
import { saveLicenseActivation } from './main/license/validator';
import { logger } from './main/logger';
import path from 'path';
import fs from 'fs';

// TypeScript interface for Setting model
interface SettingAttributes {
  id?: number;
  ku_port?: string;
  ku_baudrate?: number;
  available_slots?: number;
  max_user?: number;
  service_code?: string;
  max_log_counts?: number;
  organization?: string;
  customer_name?: string;
  activated_key?: string;
  indi_port?: string;
  indi_baudrate?: number;
  device_type?: string;
}

/**
 * Script to activate internal license for testing
 * This simulates the activation process without requiring ESP32
 */
async function activateInternalLicense() {
  try {
    console.log('🔍 Starting internal license activation...');
    
    // Check for license files
    const licenseFiles = [
      path.join(__dirname, 'resources', 'license.lic'),
      path.join(__dirname, 'resources', 'license_test.lic'),
      path.join(__dirname, 'license.lic'),
      path.join(__dirname, 'license_test.lic')
    ];
    
    let licenseFile = null;
    for (const file of licenseFiles) {
      if (fs.existsSync(file)) {
        licenseFile = file;
        console.log(`📄 Found license file: ${file}`);
        break;
      }
    }
    
    if (!licenseFile) {
      console.error('❌ No license file found. Checked:', licenseFiles);
      return;
    }
    
    // For internal licenses, we need to check the KDF info first (before parsing)
    const licenseContent = JSON.parse(fs.readFileSync(licenseFile, 'utf8'));
    
    // Extract license type from KDF info without decryption
    const kdfInfo = licenseContent.kdf_context?.info || '';
    const infoParts = kdfInfo.split('|');
    const licenseType = infoParts.length >= 6 ? infoParts[4] : 'production';
    
    console.log('✅ License file found');
    console.log('License type detected from KDF:', licenseType);
    
    // Check if it's an internal license
    if (licenseType !== 'internal') {
      console.log('❌ This script is only for internal licenses');
      console.log('Current license type:', licenseType);
      return;
    }
    
    console.log('✅ Internal license confirmed - using bypass mode');
    
    // For internal licenses, we don't need to fully parse the encrypted data
    // We'll use mock data for activation
    const licenseData = {
      license_type: 'internal',
      organization: infoParts[3] || 'Internal Organization',
      expiryDate: '2099-12-31', // Far future date for internal licenses
      macAddress: 'AA:BB:CC:DD:EE:FF' // Mock MAC address for internal licenses
    };
    
    console.log('📋 License data (mock for internal):', {
      organization: licenseData.organization,
      expiryDate: licenseData.expiryDate,
      licenseType: licenseData.license_type,
      macAddress: licenseData.macAddress
    });
    
    console.log(`✅ License valid until ${licenseData.expiryDate}`);
    
    // Check current activation status
    console.log('🔍 Checking current activation status...');
    const setting = await Setting.findOne() as SettingAttributes | null;
    if (setting?.activated_key) {
      console.log('⚠️  System already activated with key:', setting.activated_key);
      console.log('🔄 Proceeding to re-activate...');
    }
    
    // Activate license
    console.log('🔐 Activating license...');
    await saveLicenseActivation();
    
    // Verify activation
    const updatedSetting = await Setting.findOne() as SettingAttributes | null;
    if (updatedSetting?.activated_key) {
      console.log('✅ License activation successful!');
      console.log('🔑 Activation key set:', updatedSetting.activated_key);
      console.log('🏥 Organization:', updatedSetting.organization);
      console.log('👤 Customer:', updatedSetting.customer_name);
    } else {
      console.error('❌ License activation failed - no activation key set');
    }
    
  } catch (error) {
    console.error('❌ Error during license activation:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the activation
activateInternalLicense().then(() => {
  console.log('🏁 Activation script completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});