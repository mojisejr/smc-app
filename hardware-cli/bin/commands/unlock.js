"use strict";
/**
 * Unlock Command
 * Unlocks specific DS12/DS16 slots using raw 0x81 command
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockCommand = unlockCommand;
const chalk_1 = __importDefault(require("chalk"));
const connection_1 = require("../serial/connection");
const packet_builder_1 = require("../protocol/packet-builder");
const port_detector_1 = require("../serial/port-detector");
const constants_1 = require("../protocol/constants");
async function unlockCommand(slotNumber, options = {}) {
    console.log(chalk_1.default.blue(`🔓 กำลังปลดล็อกช่องยาที่ ${slotNumber}...`));
    try {
        // Validate slot number
        const slot = parseInt(slotNumber);
        if (isNaN(slot) || slot < 1 || slot > constants_1.PROTOCOL_CONSTANTS.DS12_MAX_SLOTS) {
            console.error(chalk_1.default.red(`❌ หมายเลขช่องไม่ถูกต้อง: ${slotNumber}`));
            console.log(chalk_1.default.gray(`💡 ช่องที่ถูกต้อง: 1-${constants_1.PROTOCOL_CONSTANTS.DS12_MAX_SLOTS}`));
            process.exit(1);
        }
        // Safety warning for medical device
        if (!options.force) {
            console.log(chalk_1.default.yellow('⚠️  คำเตือน: การปลดล็อกช่องยาเป็นการดำเนินการทางการแพทย์'));
            console.log(chalk_1.default.yellow('   กรุณาตรวจสอบให้แน่ใจว่าได้รับอนุญาตแล้ว'));
            console.log(chalk_1.default.gray('   ใช้ --force เพื่อข้ามคำเตือนนี้'));
            // In a real implementation, you might want to add a confirmation prompt
            console.log(chalk_1.default.gray('   กำลังดำเนินการต่อ...'));
        }
        // Determine which port to use
        let portPath = options.port;
        if (!portPath) {
            console.log(chalk_1.default.gray('🔍 กำลังค้นหาพอร์ตอัตโนมัติ...'));
            const bestPort = await (0, port_detector_1.getBestPort)();
            if (!bestPort) {
                console.error(chalk_1.default.red('❌ ไม่พบพอร์ตที่เหมาะสม'));
                console.log(chalk_1.default.gray('💡 ใช้ --port เพื่อระบุพอร์ตเอง หรือ list-ports เพื่อดูพอร์ตที่มี'));
                process.exit(1);
            }
            portPath = bestPort.path;
            console.log(chalk_1.default.green(`✅ เลือกพอร์ต: ${portPath} (${bestPort.confidence})`));
        }
        // Test port connection first and get reusable port
        console.log(chalk_1.default.gray('🔗 กำลังทดสอบการเชื่อมต่อ...'));
        const connectionTest = await (0, port_detector_1.testPortConnection)(portPath, options.timeout, true);
        if (!connectionTest.success) {
            console.error(chalk_1.default.red(`❌ ไม่สามารถเชื่อมต่อกับพอร์ต ${portPath}`));
            console.log(chalk_1.default.gray('💡 ตรวจสอบว่าอุปกรณ์เชื่อมต่ออยู่และไม่มีโปรแกรมอื่นใช้งาน'));
            process.exit(1);
        }
        // Create DS12 connection with reused port to prevent race condition
        const connectionConfig = {
            portPath: portPath,
            timeout: 5000,
        };
        // Only add existingPort if it exists
        if (connectionTest.port) {
            connectionConfig.existingPort = connectionTest.port;
        }
        const connection = new connection_1.DS12Connection(connectionConfig);
        console.log(chalk_1.default.gray('🔗 กำลังเชื่อมต่อกับอุปกรณ์...'));
        await connection.connect();
        console.log(chalk_1.default.gray(`📡 กำลังส่งคำสั่งปลดล็อก (0x81) สำหรับช่องที่ ${slot}...`));
        const packet = (0, packet_builder_1.buildUnlockPacket)(slot);
        const result = await connection.sendCommand(packet);
        await connection.disconnect();
        // Manually close the port since we're using an existing port
        if (connectionTest.port && connectionTest.port.isOpen) {
            await new Promise((resolve) => {
                connectionTest.port.close((err) => {
                    if (err) {
                        console.warn(chalk_1.default.yellow(`⚠️ Warning: Failed to close port: ${err.message}`));
                    }
                    resolve();
                });
            });
        }
        if (!result.success) {
            console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
            // Provide specific error guidance
            if (result.error?.includes('timeout')) {
                console.log(chalk_1.default.gray('💡 อุปกรณ์อาจไม่ตอบสนอง ตรวจสอบการเชื่อมต่อ'));
            }
            else if (result.error?.includes('checksum')) {
                console.log(chalk_1.default.gray('💡 ข้อมูลเสียหาย ลองใหม่อีกครั้ง'));
            }
            process.exit(1);
        }
        // Success
        console.log(chalk_1.default.green(`\n✅ ปลดล็อกช่องที่ ${slot} สำเร็จ`));
        console.log(chalk_1.default.green('🔓 ช่องยาถูกปลดล็อกแล้ว'));
        if (options.verbose && result.rawData) {
            console.log(chalk_1.default.gray(`\nRaw response: ${result.rawData.toString('hex')}`));
            console.log(chalk_1.default.gray(`Response parsed: ${JSON.stringify(result.response, null, 2)}`));
        }
        // Medical device logging
        const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        console.log(chalk_1.default.gray(`\nMEDICAL: Slot ${slot} unlocked at ${timestamp}`));
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
        // Medical device error logging
        const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
        console.error(chalk_1.default.red(`MEDICAL: Unlock failed for slot ${slotNumber} at ${timestamp} - ${error}`));
        process.exit(1);
    }
}
//# sourceMappingURL=unlock.js.map