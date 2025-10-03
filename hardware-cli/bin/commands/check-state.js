"use strict";
/**
 * Check State Command
 * Checks DS12/DS16 slot states using raw 0x80 command
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStateCommand = checkStateCommand;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const connection_1 = require("../serial/connection");
const packet_builder_1 = require("../protocol/packet-builder");
const parser_1 = require("../protocol/parser");
const port_detector_1 = require("../serial/port-detector");
async function checkStateCommand(options = {}) {
    console.log(chalk_1.default.blue("🔍 กำลังตรวจสอบสถานะช่องยา..."));
    try {
        // Determine which port to use
        let portPath = options.port;
        if (!portPath) {
            console.log(chalk_1.default.gray("🔍 กำลังค้นหาพอร์ตอัตโนมัติ..."));
            const bestPort = await (0, port_detector_1.getBestPort)();
            if (!bestPort) {
                console.error(chalk_1.default.red("❌ ไม่พบพอร์ตที่เหมาะสม"));
                console.log(chalk_1.default.gray("💡 ใช้ --port เพื่อระบุพอร์ตเอง หรือ list-ports เพื่อดูพอร์ตที่มี"));
                process.exit(1);
            }
            portPath = bestPort.path;
            console.log(chalk_1.default.green(`✅ เลือกพอร์ต: ${portPath} (${bestPort.confidence})`));
        }
        // Test port connection first
        console.log(chalk_1.default.gray("🔗 กำลังทดสอบการเชื่อมต่อ..."));
        const canConnect = await (0, port_detector_1.testPortConnection)(portPath, options.timeout);
        console.log("DEBUG: Port connection test result:", canConnect);
        if (!canConnect) {
            console.error(chalk_1.default.red(`❌ ไม่สามารถเชื่อมต่อกับพอร์ต ${portPath}`));
            console.log(chalk_1.default.gray("💡 ตรวจสอบว่าอุปกรณ์เชื่อมต่ออยู่และไม่มีโปรแกรมอื่นใช้งาน"));
            process.exit(1);
        }
        // Create connection and send status request
        const connection = new connection_1.DS12Connection({
            portPath: portPath,
            timeout: options.timeout || 3000,
        });
        console.log("DEBUG: Port path:", portPath);
        console.log(chalk_1.default.gray("🔗 กำลังเชื่อมต่อกับอุปกรณ์..."));
        await connection.connect();
        console.log(chalk_1.default.gray("📡 กำลังส่งคำสั่งตรวจสอบสถานะ (0x80)..."));
        const packet = (0, packet_builder_1.buildStatusRequestPacket)();
        console.log("ส่ง package : ", packet);
        const result = await connection.sendCommand(packet);
        console.log("ได้รับ response : ", result);
        await connection.disconnect();
        if (!result.success) {
            console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
            process.exit(1);
        }
        if (!result.response || !result.response.slotStates) {
            console.error(chalk_1.default.red("❌ ไม่ได้รับข้อมูลสถานะช่องยา"));
            process.exit(1);
        }
        // Display results
        console.log(chalk_1.default.green("\n✅ ตรวจสอบสถานะสำเร็จ"));
        if (options.verbose) {
            displayVerboseSlotTable(result.response.slotStates);
            console.log(chalk_1.default.gray(`\nRaw response: ${result.rawData?.toString("hex")}`));
        }
        else {
            console.log("\n" + (0, parser_1.formatSlotStates)(result.response.slotStates));
            displaySimpleSlotTable(result.response.slotStates);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
        process.exit(1);
    }
}
function displaySimpleSlotTable(slotStates) {
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan("ช่องที่"), chalk_1.default.cyan("สถานะ"), chalk_1.default.cyan("สัญลักษณ์")],
        style: { head: [], border: [] },
    });
    slotStates.forEach((slot) => {
        const statusText = slot.isOpen ? "เปิด" : "ปิด";
        const statusColor = slot.isOpen
            ? chalk_1.default.red(statusText)
            : chalk_1.default.green(statusText);
        const icon = slot.isOpen ? "🔓" : "🔒";
        table.push([chalk_1.default.white(slot.slotNumber.toString()), statusColor, icon]);
    });
    console.log(table.toString());
}
function displayVerboseSlotTable(slotStates) {
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.cyan("ช่องที่"),
            chalk_1.default.cyan("สถานะ"),
            chalk_1.default.cyan("เปิด/ปิด"),
            chalk_1.default.cyan("สัญลักษณ์"),
            chalk_1.default.cyan("หมายเหตุ"),
        ],
        style: { head: [], border: [] },
    });
    slotStates.forEach((slot) => {
        const statusText = slot.status;
        const statusColor = slot.isOpen
            ? chalk_1.default.red(statusText)
            : chalk_1.default.green(statusText);
        const openText = slot.isOpen ? "true" : "false";
        const openColor = slot.isOpen ? chalk_1.default.red(openText) : chalk_1.default.green(openText);
        const icon = slot.isOpen ? "🔓" : "🔒";
        const note = slot.isOpen ? "ต้องการการตรวจสอบ" : "ปกติ";
        table.push([
            chalk_1.default.white(slot.slotNumber.toString()),
            statusColor,
            openColor,
            icon,
            chalk_1.default.gray(note),
        ]);
    });
    console.log(table.toString());
}
//# sourceMappingURL=check-state.js.map