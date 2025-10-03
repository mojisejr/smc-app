/**
 * Unlock Command
 * Unlocks specific DS12/DS16 slots using raw 0x81 command
 */

import chalk from 'chalk';
import { DS12Connection } from '../serial/connection';
import { buildUnlockPacket } from '../protocol/packet-builder';
import { getBestPort, testPortConnection } from '../serial/port-detector';
import { PROTOCOL_CONSTANTS } from '../protocol/constants';

export interface UnlockOptions {
  port?: string;
  timeout?: number;
  verbose?: boolean;
  force?: boolean;
}

export async function unlockCommand(slotNumber: string, options: UnlockOptions = {}): Promise<void> {
  console.log(chalk.blue(`🔓 กำลังปลดล็อกช่องยาที่ ${slotNumber}...`));

  try {
    // Validate slot number
    const slot = parseInt(slotNumber);
    if (isNaN(slot) || slot < 1 || slot > PROTOCOL_CONSTANTS.DS12_MAX_SLOTS) {
      console.error(chalk.red(`❌ หมายเลขช่องไม่ถูกต้อง: ${slotNumber}`));
      console.log(chalk.gray(`💡 ช่องที่ถูกต้อง: 1-${PROTOCOL_CONSTANTS.DS12_MAX_SLOTS}`));
      process.exit(1);
    }

    // Safety warning for medical device
    if (!options.force) {
      console.log(chalk.yellow('⚠️  คำเตือน: การปลดล็อกช่องยาเป็นการดำเนินการทางการแพทย์'));
      console.log(chalk.yellow('   กรุณาตรวจสอบให้แน่ใจว่าได้รับอนุญาตแล้ว'));
      console.log(chalk.gray('   ใช้ --force เพื่อข้ามคำเตือนนี้'));
      
      // In a real implementation, you might want to add a confirmation prompt
      console.log(chalk.gray('   กำลังดำเนินการต่อ...'));
    }

    // Determine which port to use
    let portPath = options.port;
    
    if (!portPath) {
      console.log(chalk.gray('🔍 กำลังค้นหาพอร์ตอัตโนมัติ...'));
      const bestPort = await getBestPort();
      
      if (!bestPort) {
        console.error(chalk.red('❌ ไม่พบพอร์ตที่เหมาะสม'));
        console.log(chalk.gray('💡 ใช้ --port เพื่อระบุพอร์ตเอง หรือ list-ports เพื่อดูพอร์ตที่มี'));
        process.exit(1);
      }
      
      portPath = bestPort.path;
      console.log(chalk.green(`✅ เลือกพอร์ต: ${portPath} (${bestPort.confidence})`));
    }

    // Test port connection first and get reusable port
    console.log(chalk.gray('🔗 กำลังทดสอบการเชื่อมต่อ...'));
    const connectionTest = await testPortConnection(portPath!, options.timeout, true);
    
    if (!connectionTest.success) {
      console.error(chalk.red(`❌ ไม่สามารถเชื่อมต่อกับพอร์ต ${portPath}`));
      console.log(chalk.gray('💡 ตรวจสอบว่าอุปกรณ์เชื่อมต่ออยู่และไม่มีโปรแกรมอื่นใช้งาน'));
      process.exit(1);
    }

    // Create DS12 connection with reused port to prevent race condition
    const connectionConfig: any = {
      portPath: portPath!,
      timeout: 5000,
    };
    
    // Only add existingPort if it exists
    if (connectionTest.port) {
      connectionConfig.existingPort = connectionTest.port;
    }
    
    const connection = new DS12Connection(connectionConfig);

    console.log(chalk.gray('🔗 กำลังเชื่อมต่อกับอุปกรณ์...'));
    await connection.connect();

    console.log(chalk.gray(`📡 กำลังส่งคำสั่งปลดล็อก (0x81) สำหรับช่องที่ ${slot}...`));
    const packet = buildUnlockPacket(slot);
    const result = await connection.sendCommand(packet);

    await connection.disconnect();

    // Manually close the port since we're using an existing port
    if (connectionTest.port && connectionTest.port.isOpen) {
      await new Promise<void>((resolve) => {
        connectionTest.port!.close((err) => {
          if (err) {
            console.warn(chalk.yellow(`⚠️ Warning: Failed to close port: ${err.message}`));
          }
          resolve();
        });
      });
    }

    if (!result.success) {
      console.error(chalk.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
      
      // Provide specific error guidance
      if (result.error?.includes('timeout')) {
        console.log(chalk.gray('💡 อุปกรณ์อาจไม่ตอบสนอง ตรวจสอบการเชื่อมต่อ'));
      } else if (result.error?.includes('checksum')) {
        console.log(chalk.gray('💡 ข้อมูลเสียหาย ลองใหม่อีกครั้ง'));
      }
      
      process.exit(1);
    }

    // Success
    console.log(chalk.green(`\n✅ ปลดล็อกช่องที่ ${slot} สำเร็จ`));
    console.log(chalk.green('🔓 ช่องยาถูกปลดล็อกแล้ว'));
    
    if (options.verbose && result.rawData) {
      console.log(chalk.gray(`\nRaw response: ${result.rawData.toString('hex')}`));
      console.log(chalk.gray(`Response parsed: ${JSON.stringify(result.response, null, 2)}`));
    }

    // Medical device logging
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    console.log(chalk.gray(`\nMEDICAL: Slot ${slot} unlocked at ${timestamp}`));

  } catch (error) {
    console.error(chalk.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
    
    // Medical device error logging
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    console.error(chalk.red(`MEDICAL: Unlock failed for slot ${slotNumber} at ${timestamp} - ${error}`));
    
    process.exit(1);
  }
}