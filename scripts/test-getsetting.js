// Test script to validate getSetting function after migration
const path = require('path');

// Setup path to allow importing from main directory
const rootPath = path.resolve(__dirname, '..');
process.chdir(rootPath);

// Import the function to test
async function testGetSetting() {
  try {
    console.log('🧪 Testing getSetting function after CU12 migration...');
    
    // Import required modules
    const { sequelize } = require('./db/sequelize');
    const { getSetting } = require('./main/setting/getSetting');
    
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Test getSetting function
    console.log('📋 Testing getSetting function...');
    const settings = await getSetting();
    
    if (!settings) {
      console.error('❌ getSetting returned null - check if Setting record exists');
      return false;
    }
    
    console.log('✅ getSetting function successful!');
    console.log('📊 Retrieved settings:');
    console.log('  ID:', settings.id);
    console.log('  KU16 Port:', settings.ku_port);
    console.log('  KU16 Baudrate:', settings.ku_baudrate);
    console.log('  CU12 Port:', settings.cu_port || 'Not set');
    console.log('  CU12 Baudrate:', settings.cu_baudrate || 'Not set');
    console.log('  Available Slots:', settings.available_slots);
    console.log('  Organization:', settings.organization || 'Not set');
    console.log('  Customer Name:', settings.customer_name || 'Not set');
    
    // Validate CU12 migration
    const hasCU12Config = settings.cu_port && settings.cu_baudrate;
    console.log('');
    console.log('🔍 Migration validation:');
    console.log('  Has CU12 Configuration:', hasCU12Config ? '✅ Yes' : '❌ No');
    console.log('  Available Slots (should be 12):', settings.available_slots === 12 ? '✅ Correct' : '❌ Incorrect');
    
    if (hasCU12Config && settings.available_slots === 12) {
      console.log('🎉 CU12 migration validation PASSED!');
      return true;
    } else {
      console.log('⚠️ CU12 migration validation has issues');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    // Close database connection
    try {
      const { sequelize } = require('./db/sequelize');
      await sequelize.close();
      console.log('🔌 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database:', closeError.message);
    }
  }
}

// Run the test
testGetSetting()
  .then(success => {
    if (success) {
      console.log('\\n✅ All tests PASSED - Application should start successfully now!');
      process.exit(0);
    } else {
      console.log('\\n❌ Some tests FAILED - Review the issues above');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\\n💥 Test execution failed:', error.message);
    process.exit(1);
  });