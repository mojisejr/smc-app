/**
 * List Ports Command
 * Lists available serial ports with DS12/DS16 detection
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { listAllPorts, detectDS12Ports, formatPortList } from '../serial/port-detector';

export interface ListPortsOptions {
  all?: boolean;
  verbose?: boolean;
}

export async function listPortsCommand(options: ListPortsOptions = {}): Promise<void> {
  console.log(chalk.blue('🔍 กำลังค้นหาพอร์ตอนุกรม...'));

  try {
    if (options.all) {
      // List all ports
      const result = await listAllPorts();
      
      if (!result.success) {
        console.error(chalk.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
        process.exit(1);
      }

      if (result.ports.length === 0) {
        console.log(chalk.yellow('⚠️  ไม่พบพอร์ตอนุกรม'));
        return;
      }

      console.log(chalk.green(`\n✅ พบพอร์ตอนุกรมทั้งหมด ${result.ports.length} พอร์ต:`));
      
      if (options.verbose) {
        displayVerboseTable(result.ports);
      } else {
        displaySimpleTable(result.ports);
      }

    } else {
      // List only DS12/DS16 candidates
      const result = await detectDS12Ports();
      
      if (!result.success) {
        console.error(chalk.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
        process.exit(1);
      }

      if (result.ports.length === 0) {
        console.log(chalk.yellow('⚠️  ไม่พบพอร์ตที่เหมาะสมสำหรับ DS12/DS16'));
        console.log(chalk.gray('💡 ใช้ --all เพื่อดูพอร์ตทั้งหมด'));
        return;
      }

      console.log(chalk.green(`\n✅ พบพอร์ตที่เป็นไปได้สำหรับ DS12/DS16:`));
      console.log(formatPortList(result.ports));
      
      if (options.verbose) {
        displayVerboseTable(result.ports);
      }
    }

  } catch (error) {
    console.error(chalk.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
    process.exit(1);
  }
}

function displaySimpleTable(ports: any[]): void {
  const table = new Table({
    head: [
      chalk.cyan('พอร์ต'),
      chalk.cyan('ผู้ผลิต'),
      chalk.cyan('ความเชื่อมั่น')
    ],
    style: { head: [], border: [] }
  });

  ports.forEach(port => {
    const confidence = port.confidence || 'unknown';
    const confidenceMap = {
      high: chalk.green('สูง'),
      medium: chalk.yellow('ปานกลาง'),
      low: chalk.red('ต่ำ'),
      unknown: chalk.gray('ไม่ทราบ')
    } as const;
    const confidenceColor = confidenceMap[confidence as keyof typeof confidenceMap];

    table.push([
      chalk.white(port.path),
      chalk.gray(port.manufacturer || 'ไม่ทราบ'),
      confidenceColor
    ]);
  });

  console.log(table.toString());
}

function displayVerboseTable(ports: any[]): void {
  const table = new Table({
    head: [
      chalk.cyan('พอร์ต'),
      chalk.cyan('ผู้ผลิต'),
      chalk.cyan('Serial Number'),
      chalk.cyan('Vendor ID'),
      chalk.cyan('Product ID'),
      chalk.cyan('ความเชื่อมั่น'),
      chalk.cyan('เหตุผล')
    ],
    style: { head: [], border: [] }
  });

  ports.forEach(port => {
    const confidence = port.confidence || 'unknown';
    const confidenceMap = {
      high: chalk.green('สูง'),
      medium: chalk.yellow('ปานกลาง'),
      low: chalk.red('ต่ำ'),
      unknown: chalk.gray('ไม่ทราบ')
    } as const;
    const confidenceColor = confidenceMap[confidence as keyof typeof confidenceMap];

    table.push([
      chalk.white(port.path),
      chalk.gray(port.manufacturer || '-'),
      chalk.gray(port.serialNumber || '-'),
      chalk.gray(port.vendorId || '-'),
      chalk.gray(port.productId || '-'),
      confidenceColor,
      chalk.gray(port.reason || '-')
    ]);
  });

  console.log(table.toString());
}