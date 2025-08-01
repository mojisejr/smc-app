import { UnifiedLog } from '../model/unified-log.model';
import { User } from '../model/user.model';

/**
 * Mock Data Generator for UnifiedLog
 * สร้างข้อมูล test 500 records ครบทุก categories
 * รองรับทั้ง USING logs และ SYSTEM logs
 */

interface MockUser {
  id: number;
  name: string;
}

interface MockLogData {
  logType: 'USING' | 'SYSTEM';
  category: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  userId?: number;
  slotId?: number;
  hn?: string;
  operation?: string;
  reason?: string;
  message: string;
  details?: any;
  timestamp: number;
}

export class UnifiedLogMockDataGenerator {
  
  private mockUsers: MockUser[] = [
    { id: 1, name: 'นพ.สมชาย ใจดี' },
    { id: 2, name: 'นางสาววิภา สุขใส' },
    { id: 3, name: 'นายธนากร รักษ์ดี' },
    { id: 4, name: 'นางสุดา เก่งกาจ' },
    { id: 5, name: 'นายอดิศักดิ์ มานะดี' },
    { id: 6, name: 'ผู้ดูแลระบบ' },
    { id: 7, name: 'แอดมิน' }
  ];

  private hospitalNumbers = [
    'HN001234', 'HN005678', 'HN009012', 'HN003456', 'HN007890',
    'HN002468', 'HN001357', 'HN009753', 'HN008642', 'HN004567'
  ];

  private medications = [
    'พาราเซตามอล 500mg', 'แอสไพรอน 100mg', 'อิบูโปรเฟน 400mg',
    'คลอรเฟนิรามีน 4mg', 'ซิเมติดีน 200mg', 'โอเมพราโซล 20mg',
    'อะมอกซิซิลลิน 500mg', 'เซฟาเล็กซิน 250mg', 'เมทโฟร์มิน 500mg',
    'กลิเบนคลาไมด์ 5mg', 'อะเทโนลอล 50mg', 'นิเฟดิปีน 10mg'
  ];

  private systemComponents = [
    'KU16-Hardware', 'CU12-Hardware', 'Database', 'UI-Frontend', 
    'IPC-Communication', 'Port-Manager', 'State-Manager', 'Logging-Service'
  ];

  /**
   * สร้าง mock data สำหรับ testing
   */
  async generateMockData(count: number = 500): Promise<MockLogData[]> {
    const mockData: MockLogData[] = [];
    const now = Date.now();
    
    // สร้างข้อมูลให้ครอบคลุม 30 วันที่ผ่านมา
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < count; i++) {
      // สุ่มเวลาภายใน 30 วัน
      const timestamp = this.randomBetween(thirtyDaysAgo, now);
      
      // สุ่มประเภท log โดย USING logs มีสัดส่วน 70%, SYSTEM logs 30%
      const isUsingLog = Math.random() < 0.7;
      
      if (isUsingLog) {
        mockData.push(this.generateUsingLog(timestamp));
      } else {
        mockData.push(this.generateSystemLog(timestamp));
      }
    }
    
    // เรียงตามเวลาจากใหม่ไปเก่า
    return mockData.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * สร้าง USING log (การใช้งานจริง)
   */
  private generateUsingLog(timestamp: number): MockLogData {
    const categories = ['unlock', 'dispensing', 'force-reset', 'deactive', 'admin'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const user = this.mockUsers[Math.floor(Math.random() * this.mockUsers.length)];
    const slotId = Math.floor(Math.random() * 12) + 1; // Slots 1-12
    const hn = this.hospitalNumbers[Math.floor(Math.random() * this.hospitalNumbers.length)];
    const medication = this.medications[Math.floor(Math.random() * this.medications.length)];

    let message: string;
    let operation: string;
    let reason: string | undefined;
    let level: 'info' | 'warn' | 'error' = 'info';
    let details: any = {
      medication,
      timestamp: new Date(timestamp).toISOString(),
      hardwareType: Math.random() > 0.5 ? 'KU16' : 'CU12'
    };

    switch (category) {
      case 'unlock':
        operation = 'unlock';
        message = `ปลดล็อกช่องยาช่องที่ ${slotId} สำหรับ ${medication}`;
        details.unlockMethod = Math.random() > 0.5 ? 'rfid' : 'manual';
        break;
        
      case 'dispensing':
        const operations = ['dispense', 'dispense-continue', 'dispense-end'];
        operation = operations[Math.floor(Math.random() * operations.length)];
        message = `จ่ายยา ${medication} จากช่องที่ ${slotId}`;
        details.quantity = Math.floor(Math.random() * 10) + 1;
        details.dispensingMode = operation;
        break;
        
      case 'force-reset':
        operation = 'force-reset';
        const resetReasons = [
          'ช่องยาค้าง', 'เซ็นเซอร์ไม่ตอบสนอง', 'จ่ายยาไม่สำเร็จ', 
          'ปัญหาการสื่อสาร', 'รีเซ็ตตามคำสั่งแพทย์'
        ];
        reason = resetReasons[Math.floor(Math.random() * resetReasons.length)];
        message = `รีเซ็ตบังคับช่องที่ ${slotId}: ${reason}`;
        level = Math.random() > 0.7 ? 'warn' : 'info';
        details.resetReason = reason;
        break;
        
      case 'deactive':
        operation = 'deactivate';
        const deactiveReasons = [
          'ช่องชำรุด', 'ยาหมด', 'ปิดปรุงปรุง', 'ข้อผิดพลาดระบบ', 'ปิดการใช้งานชั่วคราว'
        ];
        reason = deactiveReasons[Math.floor(Math.random() * deactiveReasons.length)];
        message = `ปิดการใช้งานช่องที่ ${slotId}: ${reason}`;
        level = Math.random() > 0.8 ? 'error' : 'warn';
        details.deactiveReason = reason;
        break;
        
      case 'admin':
        const adminOps = ['export_logs', 'slot_management', 'user_management', 'system_settings'];
        operation = adminOps[Math.floor(Math.random() * adminOps.length)];
        const adminMessages = {
          'export_logs': 'ส่งออกข้อมูล logs',
          'slot_management': `จัดการช่องที่ ${slotId}`,
          'user_management': 'จัดการผู้ใช้งาน',
          'system_settings': 'แก้ไขการตั้งค่าระบบ'
        };
        message = adminMessages[operation as keyof typeof adminMessages];
        details.adminOperation = operation;
        if (operation === 'export_logs') {
          details.recordCount = Math.floor(Math.random() * 500) + 1;
          details.filename = `logs-export-${Date.now()}.csv`;
        }
        break;
        
      default:
        operation = 'unknown';
        message = `การดำเนินการไม่ทราบประเภท`;
        level = 'warn';
    }

    return {
      logType: 'USING',
      category,
      level,
      userId: user.id,
      slotId: category !== 'admin' || operation?.includes('slot') ? slotId : undefined,
      hn: ['unlock', 'dispensing'].includes(category) ? hn : undefined,
      operation,
      reason,
      message,
      details,
      timestamp
    };
  }

  /**
   * สร้าง SYSTEM log (ระบบ)
   */
  private generateSystemLog(timestamp: number): MockLogData {
    const categories = ['error', 'warning', 'info'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const component = this.systemComponents[Math.floor(Math.random() * this.systemComponents.length)];
    
    let message: string;
    let level: 'error' | 'warn' | 'info' | 'debug' = category as any;
    let details: any = {
      component,
      timestamp: new Date(timestamp).toISOString(),
      systemInfo: {
        memory: `${Math.floor(Math.random() * 512) + 256}MB`,
        cpu: `${Math.floor(Math.random() * 100)}%`
      }
    };

    switch (category) {
      case 'error':
        const errorMessages = [
          `${component}: การเชื่อมต่อฐานข้อมูลขาดหาย`,
          `${component}: ไม่สามารถเข้าถึงพอร์ต COM3`,
          `${component}: เซ็นเซอร์ไม่ตอบสนอง`,
          `${component}: หน่วยความจำไม่เพียงพอ`,
          `${component}: ไฟล์การตั้งค่าเสียหาย`,
          `${component}: การตรวจสอบสิทธิ์ล้มเหลว`
        ];
        message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        details.errorCode = `ERR_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
        details.stackTrace = `at ${component}.js:${Math.floor(Math.random() * 500) + 1}`;
        break;
        
      case 'warning':
        level = 'warn';
        const warningMessages = [
          `${component}: การเชื่อมต่อช้ากว่าปกติ`,
          `${component}: ยาในช่องที่ ${Math.floor(Math.random() * 12) + 1} เหลือน้อย`,
          `${component}: อุณหภูมิสูงกว่าปกติ`,
          `${component}: พื้นที่จัดเก็บเหลือน้อย`,
          `${component}: กำลังใช้พอร์ตสำรอง`,
          `${component}: ประสิทธิภาพลดลง`
        ];
        message = warningMessages[Math.floor(Math.random() * warningMessages.length)];
        details.warningLevel = Math.random() > 0.5 ? 'medium' : 'low';
        break;
        
      case 'info':
        const infoMessages = [
          `${component}: เริ่มการทำงานเรียบร้อย`,
          `${component}: อัพเดทสถานะสำเร็จ`,
          `${component}: การสำรองข้อมูลเสร็จสิ้น`,
          `${component}: การตรวจสอบระบบเสร็จสิ้น`,
          `${component}: เชื่อมต่อฐานข้อมูลสำเร็จ`,
          `${component}: โหลดการตั้งค่าเรียบร้อย`
        ];
        message = infoMessages[Math.floor(Math.random() * infoMessages.length)];
        details.infoType = 'system_status';
        break;
    }

    // บางครั้งเพิ่ม debug level
    if (Math.random() < 0.1) {
      level = 'debug';
      message = `[DEBUG] ${message}`;
      details.debugInfo = {
        threadId: Math.floor(Math.random() * 1000),
        executionTime: `${Math.floor(Math.random() * 1000)}ms`
      };
    }

    return {
      logType: 'SYSTEM',
      category,
      level,
      message,
      details,
      timestamp
    };
  }

  /**
   * สุ่มตัวเลขระหว่าง min กับ max
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * บันทึก mock data ลงฐานข้อมูล
   */
  async seedMockData(count: number = 500): Promise<void> {
    try {
      console.log(`[MOCK DATA] Generating ${count} mock log records...`);
      
      // สร้าง mock data
      const mockData = await this.generateMockData(count);
      
      console.log(`[MOCK DATA] Generated ${mockData.length} records`);
      console.log(`[MOCK DATA] USING logs: ${mockData.filter(log => log.logType === 'USING').length}`);
      console.log(`[MOCK DATA] SYSTEM logs: ${mockData.filter(log => log.logType === 'SYSTEM').length}`);
      
      // ลบข้อมูลเก่าทั้งหมด
      await UnifiedLog.destroy({ where: {} });
      console.log(`[MOCK DATA] Cleared existing log records`);
      
      // บันทึกข้อมูลใหม่ทีละ batch เพื่อประสิทธิภาพ
      const batchSize = 50;
      for (let i = 0; i < mockData.length; i += batchSize) {
        const batch = mockData.slice(i, i + batchSize);
        await UnifiedLog.bulkCreate(batch);
        console.log(`[MOCK DATA] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(mockData.length / batchSize)}`);
      }
      
      console.log(`[MOCK DATA] Successfully seeded ${mockData.length} mock log records`);
      
      // แสดงสถิติ
      await this.displayStatistics();
      
    } catch (error) {
      console.error('[MOCK DATA] Failed to seed mock data:', error);
      throw error;
    }
  }

  /**
   * แสดงสถิติข้อมูลที่สร้าง
   */
  private async displayStatistics(): Promise<void> {
    try {
      const totalLogs = await UnifiedLog.count();
      const usingLogs = await UnifiedLog.count({ where: { logType: 'USING' } });
      const systemLogs = await UnifiedLog.count({ where: { logType: 'SYSTEM' } });
      
      console.log('\n=== MOCK DATA STATISTICS ===');
      console.log(`Total Logs: ${totalLogs}`);
      console.log(`USING Logs: ${usingLogs} (${((usingLogs/totalLogs)*100).toFixed(1)}%)`);
      console.log(`SYSTEM Logs: ${systemLogs} (${((systemLogs/totalLogs)*100).toFixed(1)}%)`);
      
      // สถิติตาม category
      const categories = await UnifiedLog.findAll({
        attributes: [
          'category',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['category'],
        raw: true
      }) as any[];
      
      console.log('\n--- By Category ---');
      categories.forEach(cat => {
        console.log(`${cat.category}: ${cat.count}`);
      });
      
      // สถิติตาม level
      const levels = await UnifiedLog.findAll({
        attributes: [
          'level',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        group: ['level'],
        raw: true
      }) as any[];
      
      console.log('\n--- By Level ---');
      levels.forEach(level => {
        console.log(`${level.level}: ${level.count}`);
      });
      
      console.log('===========================\n');
      
    } catch (error) {
      console.error('[MOCK DATA] Failed to display statistics:', error);
    }
  }

  /**
   * ล้างข้อมูล mock data
   */
  async clearMockData(): Promise<void> {
    try {
      const deletedCount = await UnifiedLog.destroy({ where: {} });
      console.log(`[MOCK DATA] Cleared ${deletedCount} mock log records`);
    } catch (error) {
      console.error('[MOCK DATA] Failed to clear mock data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mockDataGenerator = new UnifiedLogMockDataGenerator();

// Export สำหรับใช้ในการ testing
export { UnifiedLogMockDataGenerator };