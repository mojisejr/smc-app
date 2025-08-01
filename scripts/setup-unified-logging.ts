#!/usr/bin/env ts-node

import { sequelize } from '../db/sequelize';
import { UnifiedLog } from '../db/model/unified-log.model';
import { User } from '../db/model/user.model';
import { mockDataGenerator } from '../db/seeders/unified-log-mock-data';

/**
 * Setup Script สำหรับ UnifiedLog Database
 * ใช้สำหรับ initialize table และ seed mock data
 */

async function setupUnifiedLogging() {
  try {
    console.log('🚀 Setting up UnifiedLog Database...\n');

    // 1. เชื่อมต่อฐานข้อมูล
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // 2. Sync models (สร้างตารางถ้ายังไม่มี)
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ force: false }); // ไม่ drop table ที่มีอยู่
    console.log('✅ Models synced successfully\n');

    // 3. ตรวจสอบ User table (จำเป็นสำหรับ foreign key)
    console.log('👥 Checking User table...');
    const userCount = await User.count();
    console.log(`✅ Found ${userCount} users in database\n`);

    if (userCount === 0) {
      console.log('⚠️  No users found. Creating sample users...');
      await createSampleUsers();
    }

    // 4. ตรวจสอบ UnifiedLog table
    console.log('📊 Checking UnifiedLog table...');
    const existingLogCount = await UnifiedLog.count();
    console.log(`📈 Current log count: ${existingLogCount}`);

    if (existingLogCount > 0) {
      console.log('🤔 Found existing logs. Do you want to replace them with mock data?');
      console.log('   This will DELETE all existing logs and create new mock data.');
      console.log('   Continue? (This is automated for testing)\n');
      
      // For automated testing, we'll proceed
      console.log('🗑️  Clearing existing logs for fresh mock data...');
      await mockDataGenerator.clearMockData();
    }

    // 5. สร้าง mock data
    console.log('🎭 Generating mock data...');
    await mockDataGenerator.seedMockData(500);

    // 6. ทดสอบ basic queries
    console.log('🧪 Testing basic queries...');
    await testBasicQueries();

    // 7. ทดสอบ filtering
    console.log('🔍 Testing filter functionality...');
    await testFilterQueries();

    console.log('🎉 UnifiedLog setup completed successfully!\n');
    console.log('Ready for frontend integration testing.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

/**
 * สร้าง sample users สำหรับ testing
 */
async function createSampleUsers() {
  const sampleUsers = [
    { name: 'นพ.สมชาย ใจดี', role: 'doctor' },
    { name: 'นางสาววิภา สุขใส', role: 'nurse' },
    { name: 'นายธนากร รักษ์ดี', role: 'pharmacist' },
    { name: 'นางสุดา เก่งกาจ', role: 'nurse' },
    { name: 'นายอดิศักดิ์ มานะดี', role: 'technician' },
    { name: 'ผู้ดูแลระบบ', role: 'admin' },
    { name: 'แอดมิน', role: 'admin' }
  ];

  for (const userData of sampleUsers) {
    await User.create(userData);
  }

  console.log(`✅ Created ${sampleUsers.length} sample users`);
}

/**
 * ทดสอบ basic queries
 */
async function testBasicQueries() {
  try {
    // Total count
    const totalCount = await UnifiedLog.count();
    console.log(`   📊 Total logs: ${totalCount}`);

    // Count by logType
    const usingCount = await UnifiedLog.count({ where: { logType: 'USING' } });
    const systemCount = await UnifiedLog.count({ where: { logType: 'SYSTEM' } });
    console.log(`   📈 USING logs: ${usingCount}, SYSTEM logs: ${systemCount}`);

    // Recent logs with User relationship
    const recentLogs = await UnifiedLog.findAll({
      include: [{ model: User, attributes: ['name'] }],
      order: [['timestamp', 'DESC']],
      limit: 5
    });

    console.log(`   🕐 Recent logs (${recentLogs.length}):`);
    recentLogs.forEach((log, index) => {
      const userName = log.User?.name || 'ไม่ระบุผู้ใช้งาน';
      console.log(`      ${index + 1}. [${log.logType}/${log.category}] ${log.message} - ${userName}`);
    });

    console.log('   ✅ Basic queries working correctly\n');

  } catch (error) {
    console.error('   ❌ Basic queries failed:', error);
    throw error;
  }
}

/**
 * ทดสอบ filter queries
 */
async function testFilterQueries() {
  try {
    // Test logType filter
    const usingLogs = await UnifiedLog.count({ where: { logType: 'USING' } });
    console.log(`   🔍 USING logType filter: ${usingLogs} records`);

    // Test category filter
    const unlockLogs = await UnifiedLog.count({ 
      where: { 
        logType: 'USING',
        category: 'unlock' 
      } 
    });
    console.log(`   🔓 Unlock category filter: ${unlockLogs} records`);

    // Test level filter
    const errorLogs = await UnifiedLog.count({ where: { level: 'error' } });
    console.log(`   ❌ Error level filter: ${errorLogs} records`);

    // Test user filter
    const userLogs = await UnifiedLog.count({ 
      where: { userId: 1 } 
    });
    console.log(`   👤 User ID 1 filter: ${userLogs} records`);

    // Test date range filter (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentLogs = await UnifiedLog.count({
      where: {
        timestamp: {
          [require('sequelize').Op.gte]: sevenDaysAgo
        }
      }
    });
    console.log(`   📅 Last 7 days filter: ${recentLogs} records`);

    // Test search query (message search)
    const searchResults = await UnifiedLog.count({
      where: {
        message: {
          [require('sequelize').Op.like]: '%ปลดล็อก%'
        }
      }
    });
    console.log(`   🔍 Message search 'ปลดล็อก': ${searchResults} records`);

    // Test combined filters
    const combinedResults = await UnifiedLog.count({
      where: {
        logType: 'USING',
        category: 'dispensing',
        level: 'info'
      }
    });
    console.log(`   🔗 Combined filters (USING + dispensing + info): ${combinedResults} records`);

    console.log('   ✅ Filter queries working correctly\n');

  } catch (error) {
    console.error('   ❌ Filter queries failed:', error);
    throw error;
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupUnifiedLogging();
}

export { setupUnifiedLogging };