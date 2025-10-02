"use strict";
/**
 * DS12/DS16 Response Parser
 * Parses hardware responses and extracts meaningful data
 *
 * This module provides independent response parsing capabilities
 * for interpreting DS12/DS16 hardware communication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseResponse = parseResponse;
exports.formatSlotStates = formatSlotStates;
const constants_1 = require("./constants");
const packet_builder_1 = require("./packet-builder");
/**
 * Parse raw response buffer from DS12/DS16 hardware
 */
function parseResponse(buffer) {
    const data = Array.from(buffer);
    // Validate minimum packet length
    if (data.length < 8) {
        return {
            success: false,
            command: 0,
            ask: 0,
            error: constants_1.ERROR_MESSAGES.INVALID_RESPONSE
        };
    }
    // Validate packet structure
    if (!(0, packet_builder_1.validatePacket)(data)) {
        return {
            success: false,
            command: 0,
            ask: 0,
            error: constants_1.ERROR_MESSAGES.CHECKSUM_ERROR
        };
    }
    const command = data[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.CMD];
    const ask = data[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.ASK];
    const dataLen = data[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.DATALEN];
    // Extract data payload if present
    const responseData = dataLen > 0 ?
        data.slice(constants_1.PROTOCOL_CONSTANTS.PACKET_POS.DATA_START, constants_1.PROTOCOL_CONSTANTS.PACKET_POS.DATA_START + dataLen) :
        [];
    // Check for error responses
    if (ask !== constants_1.PROTOCOL_CONSTANTS.ASK_SUCCESS) {
        return {
            success: false,
            command,
            ask,
            data: responseData,
            error: getErrorMessage(ask)
        };
    }
    // Parse based on command type
    switch (command) {
        case constants_1.PROTOCOL_CONSTANTS.DS12_STATUS_REQUEST:
            return parseStatusResponse(command, ask, responseData);
        case constants_1.PROTOCOL_CONSTANTS.DS12_UNLOCK_SLOT:
            return parseUnlockResponse(command, ask, responseData);
        case constants_1.PROTOCOL_CONSTANTS.DS12_GET_VERSION:
            return parseVersionResponse(command, ask, responseData);
        default:
            return {
                success: true,
                command,
                ask,
                data: responseData,
                message: 'Unknown command response'
            };
    }
}
/**
 * Parse status response (0x80) - Extract slot states
 */
function parseStatusResponse(command, ask, data) {
    if (data.length < 2) {
        return {
            success: false,
            command,
            ask,
            error: 'Invalid status response data length'
        };
    }
    // DS12 uses 2 bytes for slot states
    // data[0] = slots 1-8 (bits 0-7)
    // data[1] = slots 9-12 (bits 0-3)
    const data1 = data[0]; // Slots 1-8
    const data2 = data[1]; // Slots 9-12
    const slotStates = [];
    // Parse slots 1-8
    for (let i = 0; i < 8; i++) {
        const isOpen = (data1 & (1 << i)) !== 0;
        slotStates.push({
            slotNumber: i + 1,
            isOpen,
            status: isOpen ? 'open' : 'closed'
        });
    }
    // Parse slots 9-12
    for (let i = 0; i < 4; i++) {
        const isOpen = (data2 & (1 << i)) !== 0;
        slotStates.push({
            slotNumber: i + 9,
            isOpen,
            status: isOpen ? 'open' : 'closed'
        });
    }
    return {
        success: true,
        command,
        ask,
        data,
        slotStates,
        message: 'Slot states retrieved successfully'
    };
}
/**
 * Parse unlock response (0x81)
 */
function parseUnlockResponse(command, ask, data) {
    return {
        success: true,
        command,
        ask,
        data,
        message: 'Slot unlocked successfully'
    };
}
/**
 * Parse version response (0x8F)
 */
function parseVersionResponse(command, ask, data) {
    let versionInfo = 'Unknown version';
    if (data.length > 0) {
        // Convert data bytes to version string
        versionInfo = data.map(byte => String.fromCharCode(byte)).join('');
    }
    return {
        success: true,
        command,
        ask,
        data,
        message: `Firmware version: ${versionInfo}`
    };
}
/**
 * Get error message based on ASK code
 */
function getErrorMessage(ask) {
    switch (ask) {
        case constants_1.PROTOCOL_CONSTANTS.ASK_FAILED:
            return constants_1.ERROR_MESSAGES.HARDWARE_ERROR;
        case constants_1.PROTOCOL_CONSTANTS.ASK_TIMEOUT:
            return constants_1.ERROR_MESSAGES.COMMUNICATION_TIMEOUT;
        case constants_1.PROTOCOL_CONSTANTS.ASK_UNKNOWN_COMMAND:
            return 'คำสั่งไม่ถูกต้อง';
        case constants_1.PROTOCOL_CONSTANTS.ASK_DATA_VERIFICATION_FAILED:
            return constants_1.ERROR_MESSAGES.CHECKSUM_ERROR;
        default:
            return `Unknown error code: 0x${ask.toString(16).toUpperCase()}`;
    }
}
/**
 * Format slot states for human-readable output
 */
function formatSlotStates(slotStates) {
    const openSlots = slotStates.filter(slot => slot.isOpen);
    const closedSlots = slotStates.filter(slot => !slot.isOpen);
    let output = `สถานะช่องยา (${slotStates.length} ช่อง):\n`;
    output += `ช่องที่เปิด: ${openSlots.length > 0 ? openSlots.map(s => s.slotNumber).join(', ') : 'ไม่มี'}\n`;
    output += `ช่องที่ปิด: ${closedSlots.length > 0 ? closedSlots.map(s => s.slotNumber).join(', ') : 'ไม่มี'}`;
    return output;
}
//# sourceMappingURL=parser.js.map