// Test script to validate post-Round3 fixes
const path = require('path');

// Setup path to allow importing from main directory
const rootPath = path.resolve(__dirname, '..');
process.chdir(rootPath);

async function testFixes() {
  try {
    console.log('🧪 Testing Post-Round3 Fixes...\n');
    
    // Import required modules
    const { sequelize } = require('./db/sequelize');
    const { getSetting } = require('./main/setting/getSetting');
    const { getAllSlots } = require('./main/setting/getallSlots');
    
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Test 1: Settings retrieval
    console.log('📋 Test 1: Settings Retrieval');
    const settings = await getSetting();
    if (settings) {
      console.log('✅ Settings retrieved successfully');
      console.log(`  Hardware Configuration:`);
      console.log(`    KU16: ${settings.ku_port || 'Not configured'} @ ${settings.ku_baudrate || 'N/A'}`);
      console.log(`    CU12: ${settings.cu_port || 'Not configured'} @ ${settings.cu_baudrate || 'N/A'}`);
      console.log(`    Available Slots: ${settings.available_slots}`);
    } else {
      console.log('❌ Settings retrieval failed');
    }
    console.log('');
    
    // Test 2: Slot configuration
    console.log('📋 Test 2: Slot Configuration');
    const slots = await getAllSlots();
    console.log(`✅ Retrieved ${slots.length} slots`);
    
    if (slots.length > 0) {
      const activeSlots = slots.filter(slot => slot.status);
      const inactiveSlots = slots.filter(slot => !slot.status);
      console.log(`  Active slots: ${activeSlots.length}`);
      console.log(`  Inactive slots: ${inactiveSlots.length}`);
      console.log(`  Slot range: ${Math.min(...slots.map(s => s.slotId))}-${Math.max(...slots.map(s => s.slotId))}`);
      
      // Check if it's a CU12 configuration (12 slots)
      if (activeSlots.length === 12) {
        console.log('🎉 CU12 configuration detected (12 active slots)');
      } else if (activeSlots.length === 15) {
        console.log('📊 KU16 configuration detected (15 active slots)');
      } else {
        console.log('⚠️ Unexpected slot configuration');
      }
    }
    console.log('');
    
    // Test 3: Database verification
    console.log('📋 Test 3: Database Verification');
    const { execSync } = require('child_process');
    const activeCount = execSync(`sqlite3 "resources/db/database.db" "SELECT COUNT(*) FROM Slot WHERE isActive = 1;"`, { encoding: 'utf8' }).trim();
    const inactiveCount = execSync(`sqlite3 "resources/db/database.db" "SELECT COUNT(*) FROM Slot WHERE isActive = 0;"`, { encoding: 'utf8' }).trim();
    
    console.log(`✅ Database verification:`);
    console.log(`  Active slots in DB: ${activeCount}`);
    console.log(`  Inactive slots in DB: ${inactiveCount}`);
    
    if (activeCount === '12' && inactiveCount === '3') {
      console.log('🎉 Database properly configured for CU12 (12 active, 3 inactive)');
    } else {
      console.log('⚠️ Unexpected database configuration');
    }
    console.log('');
    
    // Summary
    console.log('📊 Test Summary:');
    const testsPassedCount = [
      settings ? 1 : 0,
      slots.length > 0 ? 1 : 0,
      activeCount === '12' ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    console.log(`Tests passed: ${testsPassedCount}/3`);
    
    if (testsPassedCount === 3) {
      console.log('🎉 All fixes verified successfully!');
      console.log('✅ Ready for manual testing:');
      console.log('  - Application should show 12 slots instead of 15');
      console.log('  - CU12 hardware should initialize without errors');
      console.log('  - Settings should support both KU16 and CU12 configuration');
    } else {
      console.log('⚠️ Some tests failed - review the issues above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close database connection
    try {
      const { sequelize } = require('./db/sequelize');
      await sequelize.close();
      console.log('\n🔌 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database:', closeError.message);
    }
  }
}

// Run the tests
testFixes()
  .then(() => {
    console.log('\n✅ Test suite completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  });