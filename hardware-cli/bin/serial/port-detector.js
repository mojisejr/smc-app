"use strict";
/**
 * DS12/DS16 Port Detection Utility
 * Automatically detects and filters serial ports for DS12/DS16 hardware
 *
 * This module provides intelligent port detection capabilities
 * for identifying DS12/DS16 devices among available serial ports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAllPorts = listAllPorts;
exports.detectDS12Ports = detectDS12Ports;
exports.testPortConnection = testPortConnection;
exports.testPortConnectionLegacy = testPortConnectionLegacy;
exports.getBestPort = getBestPort;
exports.formatPortList = formatPortList;
const serialport_1 = require("serialport");
const constants_1 = require("../protocol/constants");
/**
 * List all available serial ports
 */
async function listAllPorts() {
    try {
        const ports = await serialport_1.SerialPort.list();
        return {
            success: true,
            ports: ports.map((port) => ({
                path: port.path,
                ...(port.manufacturer && { manufacturer: port.manufacturer }),
                ...(port.serialNumber && { serialNumber: port.serialNumber }),
                ...(port.pnpId && { pnpId: port.pnpId }),
                ...(port.vendorId && { vendorId: port.vendorId }),
                ...(port.productId && { productId: port.productId }),
                confidence: "low",
                reason: "Listed port without filtering",
            })),
            totalPorts: ports.length,
        };
    }
    catch (error) {
        return {
            success: false,
            ports: [],
            error: `Failed to list ports: ${error}`,
            totalPorts: 0,
        };
    }
}
/**
 * Detect DS12/DS16 devices with intelligent filtering
 */
async function detectDS12Ports() {
    try {
        const ports = await serialport_1.SerialPort.list();
        const detectedPorts = [];
        for (const port of ports) {
            const detection = analyzePort(port);
            if (detection) {
                detectedPorts.push(detection);
            }
        }
        // Sort by confidence level
        detectedPorts.sort((a, b) => {
            const confidenceOrder = { high: 3, medium: 2, low: 1, unknown: 0 };
            return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        });
        return {
            success: true,
            ports: detectedPorts,
            totalPorts: ports.length,
        };
    }
    catch (error) {
        return {
            success: false,
            ports: [],
            error: `${constants_1.ERROR_MESSAGES.PORT_DETECTION_FAILED}: ${error}`,
            totalPorts: 0,
        };
    }
}
/**
 * Analyze a single port to determine if it's likely a DS12/DS16 device
 */
function analyzePort(port) {
    const path = port.path;
    const manufacturer = port.manufacturer?.toLowerCase() || "";
    const pnpId = port.pnpId?.toLowerCase() || "";
    const vendorId = port.vendorId?.toLowerCase() || "";
    const productId = port.productId?.toLowerCase() || "";
    // High confidence indicators
    if (manufacturer.includes("ftdi") || manufacturer.includes("prolific")) {
        return {
            path,
            ...(port.manufacturer && { manufacturer: port.manufacturer }),
            ...(port.serialNumber && { serialNumber: port.serialNumber }),
            ...(port.pnpId && { pnpId: port.pnpId }),
            ...(port.vendorId && { vendorId: port.vendorId }),
            ...(port.productId && { productId: port.productId }),
            confidence: "high",
            reason: "FTDI/Prolific chip detected (common for DS12/DS16)",
        };
    }
    // Medium confidence indicators
    if (pnpId.includes("usb") || vendorId || productId) {
        return {
            path,
            ...(port.manufacturer && { manufacturer: port.manufacturer }),
            ...(port.serialNumber && { serialNumber: port.serialNumber }),
            ...(port.pnpId && { pnpId: port.pnpId }),
            ...(port.vendorId && { vendorId: port.vendorId }),
            ...(port.productId && { productId: port.productId }),
            confidence: "medium",
            reason: "USB serial adapter detected",
        };
    }
    // Low confidence - any COM port on Windows
    if (path.startsWith("COM") || path.startsWith("/dev/tty")) {
        return {
            path,
            ...(port.manufacturer && { manufacturer: port.manufacturer }),
            ...(port.serialNumber && { serialNumber: port.serialNumber }),
            ...(port.pnpId && { pnpId: port.pnpId }),
            ...(port.vendorId && { vendorId: port.vendorId }),
            ...(port.productId && { productId: port.productId }),
            confidence: "low",
            reason: "Generic serial port",
        };
    }
    return null;
}
/**
 * Test a port to verify if it responds to DS12 commands
 * Returns a connection result with optional port instance for reuse
 */
async function testPortConnection(portPath, timeout = 3000, reuseConnection = false) {
    return new Promise((resolve) => {
        let port = null;
        let timeoutId;
        const cleanup = (keepPortOpen = false) => {
            if (timeoutId)
                clearTimeout(timeoutId);
            if (port && port.isOpen && !keepPortOpen) {
                port.close();
            }
        };
        try {
            port = new serialport_1.SerialPort({
                path: portPath,
                baudRate: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
                dataBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
                stopBits: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
                parity: constants_1.PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
                autoOpen: false,
            });
            // Set timeout
            timeoutId = setTimeout(() => {
                cleanup();
                resolve({ success: false });
            }, timeout);
            port.open((err) => {
                if (err) {
                    cleanup();
                    resolve({ success: false });
                    return;
                }
                // Port opened successfully
                if (reuseConnection) {
                    // Keep port open for reuse - caller is responsible for closing
                    cleanup(true);
                    resolve({ success: true, port: port });
                }
                else {
                    // Traditional behavior - close immediately
                    cleanup();
                    resolve({ success: true });
                }
            });
        }
        catch (error) {
            cleanup();
            resolve({ success: false });
        }
    });
}
/**
 * Legacy wrapper for backward compatibility
 * @deprecated Use testPortConnection with reuseConnection parameter instead
 */
async function testPortConnectionLegacy(portPath, timeout = 3000) {
    const result = await testPortConnection(portPath, timeout, false);
    return result.success;
}
/**
 * Get the best port candidate for DS12/DS16 connection
 */
async function getBestPort() {
    const result = await detectDS12Ports();
    if (!result.success || result.ports.length === 0) {
        return null;
    }
    // Return the highest confidence port
    return result.ports[0];
}
/**
 * Format port detection results for CLI display
 */
function formatPortList(ports) {
    if (ports.length === 0) {
        return "ไม่พบพอร์ตที่เหมาะสม";
    }
    let output = `พบพอร์ตที่เป็นไปได้ ${ports.length} พอร์ต:\n\n`;
    ports.forEach((port, index) => {
        const confidenceIcon = {
            high: "🟢",
            medium: "🟡",
            low: "🔴",
            unknown: "⚪",
        }[port.confidence];
        output += `${index + 1}. ${port.path} ${confidenceIcon}\n`;
        output += `   ความเชื่อมั่น: ${port.confidence}\n`;
        output += `   เหตุผล: ${port.reason}\n`;
        if (port.manufacturer) {
            output += `   ผู้ผลิต: ${port.manufacturer}\n`;
        }
        if (port.serialNumber) {
            output += `   Serial: ${port.serialNumber}\n`;
        }
        output += "\n";
    });
    return output;
}
//# sourceMappingURL=port-detector.js.map