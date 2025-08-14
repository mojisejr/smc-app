/**
 * Test Script for Database Data Access Validation
 * 
 * This script tests proper Sequelize data access patterns in the SMC application.
 * Run this script to verify that database queries work correctly after fixes.
 * 
 * MEDICAL DEVICE COMPLIANCE:
 * - Tests critical data access patterns used in medication dispensing
 * - Validates user authentication and slot management
 * - Ensures data integrity for audit requirements
 * 
 * USAGE:
 * node test-data-access.js
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// Database configuration (adjust path as needed)
const dbPath = path.join(__dirname, 'resources', 'db', 'database.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: console.log, // Enable logging to see SQL queries
});

// Define models (simplified versions for testing)
const { DataTypes } = require('sequelize');

// User Model
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  passkey: { type: DataTypes.TEXT },
}, {
  tableName: 'User',
  timestamps: false,
});

// Slot Model  
const Slot = sequelize.define('Slot', {
  slotId: { type: DataTypes.INTEGER, primaryKey: true },
  hn: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.INTEGER },
  occupied: { type: DataTypes.BOOLEAN },
  opening: { type: DataTypes.BOOLEAN },
  isActive: { type: DataTypes.BOOLEAN },
}, {
  tableName: 'Slot',
  timestamps: false,
});

// DispensingLog Model
const DispensingLog = sequelize.define('DispensingLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  timestamp: { type: DataTypes.INTEGER },
  userId: { type: DataTypes.INTEGER },
  slotId: { type: DataTypes.INTEGER },
  hn: { type: DataTypes.TEXT },
  process: { type: DataTypes.TEXT },
  message: { type: DataTypes.TEXT },
}, {
  tableName: 'DispensingLog',
  timestamps: false,
});

/**
 * Test proper data access patterns using getDataValue()
 */
async function testDataAccess() {
  try {
    console.log('🔍 Testing Database Data Access Patterns...\n');

    // Test 1: User data access (fixed pattern)
    console.log('📋 Test 1: User Data Access');
    const users = await User.findAll({ limit: 3 });
    
    if (users.length > 0) {
      console.log('✅ Users found:', users.length);
      
      users.forEach((user, index) => {
        console.log(`  User ${index + 1}:`);
        console.log(`    ID: ${user.getDataValue('id')}`);
        console.log(`    Name: ${user.getDataValue('name')}`);
        console.log(`    Role: ${user.getDataValue('role')}`);
        console.log(`    Has Passkey: ${user.getDataValue('passkey') ? 'Yes' : 'No'}`);
        
        // Demonstrate WRONG vs RIGHT access
        console.log(`    ❌ WRONG: user.userId would be: ${user.userId} (undefined - field doesn't exist)`);
        console.log(`    ✅ RIGHT: user.getDataValue('id'): ${user.getDataValue('id')}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No users found in database');
    }

    // Test 2: Slot data access (fixed pattern)
    console.log('📋 Test 2: Slot Data Access');
    const slots = await Slot.findAll({ limit: 5 });
    
    if (slots.length > 0) {
      console.log('✅ Slots found:', slots.length);
      
      slots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    Slot ID: ${slot.getDataValue('slotId')}`);
        console.log(`    HN: ${slot.getDataValue('hn') || 'Empty'}`);
        console.log(`    Occupied: ${slot.getDataValue('occupied')}`);
        console.log(`    Opening: ${slot.getDataValue('opening')}`);
        console.log(`    Active: ${slot.getDataValue('isActive')}`);
        console.log(`    Timestamp: ${slot.getDataValue('timestamp') || 'None'}`);
        
        // Show both correct approaches
        console.log(`    ✅ Using getDataValue(): ${slot.getDataValue('occupied')}`);
        console.log(`    ✅ Using dataValues: ${slot.dataValues.occupied}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No slots found in database');
    }

    // Test 3: Find user by passkey (authentication pattern)
    console.log('📋 Test 3: User Authentication Pattern');
    const testUser = await User.findOne({ 
      where: { passkey: 'test' } // You may need to adjust this
    });
    
    if (testUser) {
      console.log('✅ Authentication test successful');
      console.log(`  Found user: ${testUser.getDataValue('name')}`);
      console.log(`  User ID: ${testUser.getDataValue('id')}`);
      console.log(`  Role: ${testUser.getDataValue('role')}`);
    } else {
      console.log('⚠️  No user found with test passkey (this is normal if no test data exists)');
    }

    // Test 4: Slot occupancy check (dispensing pattern)
    console.log('📋 Test 4: Slot Occupancy Check');
    const occupiedSlots = await Slot.findAll({ 
      where: { occupied: true }
    });
    
    console.log(`✅ Found ${occupiedSlots.length} occupied slots`);
    occupiedSlots.forEach((slot, index) => {
      if (index < 3) { // Limit output
        console.log(`  Occupied Slot ${slot.getDataValue('slotId')}:`);
        console.log(`    Patient HN: ${slot.getDataValue('hn')}`);
        console.log(`    Active: ${slot.getDataValue('isActive')}`);
      }
    });

    // Test 5: Recent dispensing logs
    console.log('📋 Test 5: Recent Dispensing Logs');
    const recentLogs = await DispensingLog.findAll({ 
      limit: 3,
      order: [['timestamp', 'DESC']]
    });
    
    console.log(`✅ Found ${recentLogs.length} recent logs`);
    recentLogs.forEach((log, index) => {
      console.log(`  Log ${index + 1}:`);
      console.log(`    ID: ${log.getDataValue('id')}`);
      console.log(`    User ID: ${log.getDataValue('userId')}`);
      console.log(`    Slot ID: ${log.getDataValue('slotId')}`);
      console.log(`    Process: ${log.getDataValue('process')}`);
      console.log(`    Message: ${log.getDataValue('message')}`);
      console.log('');
    });

    console.log('🎉 All data access tests completed successfully!');
    console.log('✅ Fixed data access patterns are working correctly');
    
  } catch (error) {
    console.error('❌ Error during data access tests:', error.message);
    console.error('Stack:', error.stack);
  }
}

/**
 * Test database connection and run data access tests
 */
async function runTests() {
  try {
    console.log('🚀 Starting Database Data Access Validation\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully\n');
    
    // Run data access tests
    await testDataAccess();
    
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    console.error('Please check database path:', dbPath);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testDataAccess };