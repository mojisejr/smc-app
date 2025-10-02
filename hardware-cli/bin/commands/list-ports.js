"use strict";
/**
 * List Ports Command
 * Lists available serial ports with DS12/DS16 detection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPortsCommand = listPortsCommand;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const port_detector_1 = require("../serial/port-detector");
async function listPortsCommand(options = {}) {
    console.log(chalk_1.default.blue('🔍 กำลังค้นหาพอร์ตอนุกรม...'));
    try {
        if (options.all) {
            // List all ports
            const result = await (0, port_detector_1.listAllPorts)();
            if (!result.success) {
                console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
                process.exit(1);
            }
            if (result.ports.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  ไม่พบพอร์ตอนุกรม'));
                return;
            }
            console.log(chalk_1.default.green(`\n✅ พบพอร์ตอนุกรมทั้งหมด ${result.ports.length} พอร์ต:`));
            if (options.verbose) {
                displayVerboseTable(result.ports);
            }
            else {
                displaySimpleTable(result.ports);
            }
        }
        else {
            // List only DS12/DS16 candidates
            const result = await (0, port_detector_1.detectDS12Ports)();
            if (!result.success) {
                console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาด: ${result.error}`));
                process.exit(1);
            }
            if (result.ports.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  ไม่พบพอร์ตที่เหมาะสมสำหรับ DS12/DS16'));
                console.log(chalk_1.default.gray('💡 ใช้ --all เพื่อดูพอร์ตทั้งหมด'));
                return;
            }
            console.log(chalk_1.default.green(`\n✅ พบพอร์ตที่เป็นไปได้สำหรับ DS12/DS16:`));
            console.log((0, port_detector_1.formatPortList)(result.ports));
            if (options.verbose) {
                displayVerboseTable(result.ports);
            }
        }
    }
    catch (error) {
        console.error(chalk_1.default.red(`❌ เกิดข้อผิดพลาดที่ไม่คาดคิด: ${error}`));
        process.exit(1);
    }
}
function displaySimpleTable(ports) {
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.cyan('พอร์ต'),
            chalk_1.default.cyan('ผู้ผลิต'),
            chalk_1.default.cyan('ความเชื่อมั่น')
        ],
        style: { head: [], border: [] }
    });
    ports.forEach(port => {
        const confidence = port.confidence || 'unknown';
        const confidenceMap = {
            high: chalk_1.default.green('สูง'),
            medium: chalk_1.default.yellow('ปานกลาง'),
            low: chalk_1.default.red('ต่ำ'),
            unknown: chalk_1.default.gray('ไม่ทราบ')
        };
        const confidenceColor = confidenceMap[confidence];
        table.push([
            chalk_1.default.white(port.path),
            chalk_1.default.gray(port.manufacturer || 'ไม่ทราบ'),
            confidenceColor
        ]);
    });
    console.log(table.toString());
}
function displayVerboseTable(ports) {
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.cyan('พอร์ต'),
            chalk_1.default.cyan('ผู้ผลิต'),
            chalk_1.default.cyan('Serial Number'),
            chalk_1.default.cyan('Vendor ID'),
            chalk_1.default.cyan('Product ID'),
            chalk_1.default.cyan('ความเชื่อมั่น'),
            chalk_1.default.cyan('เหตุผล')
        ],
        style: { head: [], border: [] }
    });
    ports.forEach(port => {
        const confidence = port.confidence || 'unknown';
        const confidenceMap = {
            high: chalk_1.default.green('สูง'),
            medium: chalk_1.default.yellow('ปานกลาง'),
            low: chalk_1.default.red('ต่ำ'),
            unknown: chalk_1.default.gray('ไม่ทราบ')
        };
        const confidenceColor = confidenceMap[confidence];
        table.push([
            chalk_1.default.white(port.path),
            chalk_1.default.gray(port.manufacturer || '-'),
            chalk_1.default.gray(port.serialNumber || '-'),
            chalk_1.default.gray(port.vendorId || '-'),
            chalk_1.default.gray(port.productId || '-'),
            confidenceColor,
            chalk_1.default.gray(port.reason || '-')
        ]);
    });
    console.log(table.toString());
}
//# sourceMappingURL=list-ports.js.map