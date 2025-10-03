/**
 * Check State Command
 * Checks DS12/DS16 slot states using raw 0x80 command
 */

import chalk from "chalk";
import Table from "cli-table3";
import { DS12Connection } from "../serial/connection";
import { buildStatusRequestPacket } from "../protocol/packet-builder";
import { formatSlotStates, SlotState } from "../protocol/parser";
import { getBestPort, testPortConnection } from "../serial/port-detector";

export interface CheckStateOptions {
  port?: string;
  timeout?: number;
  verbose?: boolean;
}

export async function checkStateCommand(
  options: CheckStateOptions = {}
): Promise<void> {
  console.log(chalk.blue("🔍 กำลังตรวจสอบสถานะช่องยา..."));

  try {
    // Determine which port to use
    let portPath = options.port;

    if (!portPath) {
      console.log(chalk.gray("🔍 กำลังค้นหาพอร์ตอัตโนมัติ..."));
      const bestPort = await getBestPort();

      if (!bestPort) {
        console.error(chalk.red("❌ ไม่พบพอร์ตที่เหมาะสม"));
        console.log(
          chalk.gray(
            "💡 ใช้ --port เพื่อระบุพอร์ตเอง หรือ list-ports เพื่อดูพอร์ตที่มี"
          )
        );
        process.exit(1);
      }

      portPath = bestPort.path;
      console.log(
        chalk.green(`✅ เลือกพอร์ต: ${portPath} (${bestPort.confidence})`)
      );
    }

    // Test port connection first
    console.log(chalk.gray("🔗 กำลังทดสอบการเชื่อมต่อ..."));
    const canConnect = await testPortConnection(portPath!, options.timeout);

    console.log("DEBUG: Port connection test result:", canConnect);

    if (!canConnect) {
      console.error(chalk.red(`❌ ไม่สามารถเชื่อมต่อกับพอร์ต ${portPath}`));
      console.log(
        chalk.gray("💡 ตรวจสอบว่าอุปกรณ์เชื่อมต่ออยู่และไม่มีโปรแกรมอื่นใช้งาน")
      );
      process.exit(1);
    }

    // Create connection and send status request
    const connection = new DS12Connection({
      portPath: portPath!,
      timeout: options.timeout || 3000,
    });

    console.log("DEBUG: Port path:", portPath);

    console.log(chalk.gray("🔗 กำลังเชื่อมต่อกับอุปกรณ์..."));
    await connection.connect();

    console.log(chalk.gray("📡 กำลังส่งคำสั่งตรวจสอบสถานะ (0x80)..."));
    const packet = buildStatusRequestPacket();
    console.log("ส่ง package : ", packet);
    const result = await connection.sendCommand(packet);
    console.log("ได้รับ response : ", result);

    await connection.disconnect();

    if (!result.success) {
      console.error(chalk.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
      process.exit(1);
    }

    if (!result.response || !result.response.slotStates) {
      console.error(chalk.red("❌ ไม่ได้รับข้อมูลสถานะช่องยา"));
      process.exit(1);
    }

    // Display results
    console.log(chalk.green("\n✅ ตรวจสอบสถานะสำเร็จ"));

    if (options.verbose) {
      displayVerboseSlotTable(result.response.slotStates);
      console.log(
        chalk.gray(`\nRaw response: ${result.rawData?.toString("hex")}`)
      );
    } else {
      console.log("\n" + formatSlotStates(result.response.slotStates));
      displaySimpleSlotTable(result.response.slotStates);
    }
  } catch (error) {
    console.error(chalk.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
    process.exit(1);
  }
}

function displaySimpleSlotTable(slotStates: SlotState[]): void {
  const table = new Table({
    head: [chalk.cyan("ช่องที่"), chalk.cyan("สถานะ"), chalk.cyan("สัญลักษณ์")],
    style: { head: [], border: [] },
  });

  slotStates.forEach((slot) => {
    const statusText = slot.isOpen ? "เปิด" : "ปิด";
    const statusColor = slot.isOpen
      ? chalk.red(statusText)
      : chalk.green(statusText);
    const icon = slot.isOpen ? "🔓" : "🔒";

    table.push([chalk.white(slot.slotNumber.toString()), statusColor, icon]);
  });

  console.log(table.toString());
}

function displayVerboseSlotTable(slotStates: SlotState[]): void {
  const table = new Table({
    head: [
      chalk.cyan("ช่องที่"),
      chalk.cyan("สถานะ"),
      chalk.cyan("เปิด/ปิด"),
      chalk.cyan("สัญลักษณ์"),
      chalk.cyan("หมายเหตุ"),
    ],
    style: { head: [], border: [] },
  });

  slotStates.forEach((slot) => {
    const statusText = slot.status;
    const statusColor = slot.isOpen
      ? chalk.red(statusText)
      : chalk.green(statusText);
    const openText = slot.isOpen ? "true" : "false";
    const openColor = slot.isOpen ? chalk.red(openText) : chalk.green(openText);
    const icon = slot.isOpen ? "🔓" : "🔒";
    const note = slot.isOpen ? "ต้องการการตรวจสอบ" : "ปกติ";

    table.push([
      chalk.white(slot.slotNumber.toString()),
      statusColor,
      openColor,
      icon,
      chalk.gray(note),
    ]);
  });

  console.log(table.toString());
}
