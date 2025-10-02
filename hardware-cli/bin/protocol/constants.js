"use strict";
/**
 * DS12/DS16 Hardware Protocol Constants
 * Medical Device Communication Protocol for SMC Hardware
 *
 * This file contains the raw protocol constants extracted from the main application
 * for independent hardware testing and validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.SERIAL_CONFIG = exports.PROTOCOL_CONSTANTS = void 0;
exports.PROTOCOL_CONSTANTS = {
    // Frame delimiters
    STX: 0x02, // Start of Text
    ETX: 0x03, // End of Text
    FRAME_START: 0x02,
    FRAME_END: 0x03,
    // Response codes
    ASK_DEFAULT: 0x00,
    ASK_SUCCESS: 0x10,
    ASK_FAILED: 0x11,
    ASK_TIMEOUT: 0x12,
    ASK_UNKNOWN_COMMAND: 0x13,
    ASK_DATA_VERIFICATION_FAILED: 0x14,
    // DS12/DS16 Commands
    DS12_STATUS_REQUEST: 0x80, // Check state of all slots
    DS12_UNLOCK_SLOT: 0x81, // Unlock specific slot
    DS12_GET_VERSION: 0x8F, // Get firmware version
    // Device specifications
    DS12_MAX_SLOTS: 12,
    DS16_MAX_SLOTS: 16,
    // Default device address
    DEFAULT_ADDR: 0x00,
    // Communication settings
    COMMUNICATION_TIMEOUT: 3000, // 3 seconds
    MAX_RETRIES: 3,
    // Serial port configuration
    SERIAL_CONFIG: {
        BAUD_RATE: 19200,
        DATA_BITS: 8,
        STOP_BITS: 1,
        PARITY: 'none'
    },
    // Packet structure positions
    PACKET_POS: {
        STX: 0,
        ADDR: 1,
        LOCKNUM: 2,
        CMD: 3,
        ASK: 4,
        DATALEN: 5,
        ETX: 6,
        SUM: 7,
        DATA_START: 8
    }
};
exports.SERIAL_CONFIG = {
    baudRate: 19200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    autoOpen: false,
    // Timeout settings for medical device communication
    timeout: 5000, // 5 seconds timeout
    writeTimeout: 2000, // 2 seconds write timeout
    // Communication settings
    COMMUNICATION_TIMEOUT: 3000, // 3 seconds
    MAX_RETRIES: 3
};
/**
 * Medical Device Error Messages in Thai
 * These messages are part of the medical device certification
 */
exports.ERROR_MESSAGES = {
    PORT_NOT_FOUND: 'ไม่พบพอร์ตการเชื่อมต่อ',
    CONNECTION_FAILED: 'ไม่สามารถเชื่อมต่อกับอุปกรณ์ได้',
    COMMUNICATION_TIMEOUT: 'การสื่อสารกับอุปกรณ์หมดเวลา',
    INVALID_RESPONSE: 'ได้รับข้อมูลตอบกลับที่ไม่ถูกต้อง',
    CHECKSUM_ERROR: 'ข้อมูลเสียหาย (Checksum Error)',
    SLOT_OUT_OF_RANGE: 'หมายเลขช่องยาไม่ถูกต้อง',
    DEVICE_BUSY: 'อุปกรณ์กำลังทำงานอยู่',
    HARDWARE_ERROR: 'เกิดข้อผิดพลาดของฮาร์ดแวร์',
    PORT_DETECTION_FAILED: 'การตรวจหาพอร์ตล้มเหลว',
    NOT_CONNECTED: 'ไม่ได้เชื่อมต่อกับอุปกรณ์'
};
//# sourceMappingURL=constants.js.map