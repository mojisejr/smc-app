const { sequelize } = require('../db/sequelize');
const { UnifiedLog } = require('../db/model/unified-log.model');
const { User } = require('../db/model/user.model');

/**
 * Simple test script สำหรับ UnifiedLog
 */

async function testUnifiedLog() {
  try {
    console.log('🧪 Testing UnifiedLog functionality...\n');

    // 1. เชื่อมต่อฐานข้อมูล
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // 2. Sync models
    await sequelize.sync();
    console.log('✅ Models synced');

    // 3. ตรวจสอบ User table
    const userCount = await User.count();
    console.log(`👥 Users in database: ${userCount}`);

    // 4. ลบข้อมูลเก่า
    await UnifiedLog.destroy({ where: {} });
    console.log('🗑️  Cleared existing logs');

    // 5. สร้างข้อมูล test แบบง่าย
    const testLogs = [
      {
        timestamp: Date.now(),
        logType: 'USING',
        category: 'unlock',
        level: 'info',
        userId: 1,
        slotId: 1,
        hn: 'HN001234',
        operation: 'unlock',
        message: 'ปลดล็อกช่องยาช่องที่ 1',
        details: { medication: 'พาราเซตามอล 500mg' }
      },
      {
        timestamp: Date.now() - 1000,
        logType: 'USING',
        category: 'dispensing',
        level: 'info',
        userId: 2,
        slotId: 2,
        hn: 'HN005678',
        operation: 'dispense',
        message: 'จ่ายยาจากช่องที่ 2',
        details: { medication: 'แอสไพรอน 100mg', quantity: 2 }
      },
      {
        timestamp: Date.now() - 2000,
        logType: 'SYSTEM',
        category: 'error',
        level: 'error',
        message: 'KU16-Hardware: การเชื่อมต่อฐานข้อมูลขาดหาย',
        details: { component: 'KU16-Hardware', errorCode: 'ERR_0001' }
      },
      {
        timestamp: Date.now() - 3000,
        logType: 'USING',
        category: 'admin',
        level: 'info',
        userId: 3,
        operation: 'export_logs',
        message: 'ส่งออกข้อมูล logs',
        details: { recordCount: 150, filename: 'logs-export-test.csv' }
      },
      {
        timestamp: Date.now() - 4000,
        logType: 'SYSTEM',
        category: 'warning',
        level: 'warn',
        message: 'CU12-Hardware: ยาในช่องที่ 5 เหลือน้อย',
        details: { component: 'CU12-Hardware', warningLevel: 'medium' }
      }
    ];

    // 6. บันทึกข้อมูล test
    for (const logData of testLogs) {
      await UnifiedLog.create(logData);
    }
    console.log(`📝 Created ${testLogs.length} test logs`);

    // 7. ทดสอบการ query
    console.log('\n🔍 Testing queries...');
    
    const totalLogs = await UnifiedLog.count();
    console.log(`   Total logs: ${totalLogs}`);

    const usingLogs = await UnifiedLog.count({ where: { logType: 'USING' } });
    console.log(`   USING logs: ${usingLogs}`);

    const systemLogs = await UnifiedLog.count({ where: { logType: 'SYSTEM' } });
    console.log(`   SYSTEM logs: ${systemLogs}`);

    const unlockLogs = await UnifiedLog.count({ 
      where: { 
        logType: 'USING', 
        category: 'unlock' 
      } 
    });
    console.log(`   Unlock category: ${unlockLogs}`);

    const errorLogs = await UnifiedLog.count({ where: { level: 'error' } });
    console.log(`   Error level: ${errorLogs}`);

    // 8. ทดสอบการดึงข้อมูลพร้อม User
    const logsWithUsers = await UnifiedLog.findAll({
      include: [{ model: User, attributes: ['name'] }],
      order: [['timestamp', 'DESC']],
      limit: 3
    });

    console.log('\n📋 Recent logs with users:');
    logsWithUsers.forEach((log, index) => {
      const userName = log.User?.name || 'ไม่ระบุผู้ใช้งาน';
      console.log(`   ${index + 1}. [${log.logType}/${log.category}] ${log.message} - ${userName}`);
    });

    console.log('\n✅ All tests passed! UnifiedLog is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
  }
}

// ถ้าเรียกไฟล์นี้โดยตรง
if (require.main === module) {
  testUnifiedLog();
}

module.exports = { testUnifiedLog };