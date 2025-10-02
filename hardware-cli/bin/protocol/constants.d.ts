/**
 * DS12/DS16 Hardware Protocol Constants
 * Medical Device Communication Protocol for SMC Hardware
 *
 * This file contains the raw protocol constants extracted from the main application
 * for independent hardware testing and validation.
 */
export declare const PROTOCOL_CONSTANTS: {
    readonly STX: 2;
    readonly ETX: 3;
    readonly FRAME_START: 2;
    readonly FRAME_END: 3;
    readonly ASK_DEFAULT: 0;
    readonly ASK_SUCCESS: 16;
    readonly ASK_FAILED: 17;
    readonly ASK_TIMEOUT: 18;
    readonly ASK_UNKNOWN_COMMAND: 19;
    readonly ASK_DATA_VERIFICATION_FAILED: 20;
    readonly DS12_STATUS_REQUEST: 128;
    readonly DS12_UNLOCK_SLOT: 129;
    readonly DS12_GET_VERSION: 143;
    readonly DS12_MAX_SLOTS: 12;
    readonly DS16_MAX_SLOTS: 16;
    readonly DEFAULT_ADDR: 0;
    readonly COMMUNICATION_TIMEOUT: 3000;
    readonly MAX_RETRIES: 3;
    readonly SERIAL_CONFIG: {
        readonly BAUD_RATE: 19200;
        readonly DATA_BITS: 8;
        readonly STOP_BITS: 1;
        readonly PARITY: "none";
    };
    readonly PACKET_POS: {
        readonly STX: 0;
        readonly ADDR: 1;
        readonly LOCKNUM: 2;
        readonly CMD: 3;
        readonly ASK: 4;
        readonly DATALEN: 5;
        readonly ETX: 6;
        readonly SUM: 7;
        readonly DATA_START: 8;
    };
};
export declare const SERIAL_CONFIG: {
    readonly baudRate: 19200;
    readonly dataBits: 8;
    readonly parity: "none";
    readonly stopBits: 1;
    readonly flowControl: false;
    readonly autoOpen: false;
    readonly timeout: 5000;
    readonly writeTimeout: 2000;
    readonly COMMUNICATION_TIMEOUT: 3000;
    readonly MAX_RETRIES: 3;
};
/**
 * Medical Device Error Messages in Thai
 * These messages are part of the medical device certification
 */
export declare const ERROR_MESSAGES: {
    readonly PORT_NOT_FOUND: "ไม่พบพอร์ตการเชื่อมต่อ";
    readonly CONNECTION_FAILED: "ไม่สามารถเชื่อมต่อกับอุปกรณ์ได้";
    readonly COMMUNICATION_TIMEOUT: "การสื่อสารกับอุปกรณ์หมดเวลา";
    readonly INVALID_RESPONSE: "ได้รับข้อมูลตอบกลับที่ไม่ถูกต้อง";
    readonly CHECKSUM_ERROR: "ข้อมูลเสียหาย (Checksum Error)";
    readonly SLOT_OUT_OF_RANGE: "หมายเลขช่องยาไม่ถูกต้อง";
    readonly DEVICE_BUSY: "อุปกรณ์กำลังทำงานอยู่";
    readonly HARDWARE_ERROR: "เกิดข้อผิดพลาดของฮาร์ดแวร์";
    readonly PORT_DETECTION_FAILED: "การตรวจหาพอร์ตล้มเหลว";
    readonly NOT_CONNECTED: "ไม่ได้เชื่อมต่อกับอุปกรณ์";
};
export type ProtocolConstants = typeof PROTOCOL_CONSTANTS;
export type SerialConfig = typeof SERIAL_CONFIG;
export type ErrorMessages = typeof ERROR_MESSAGES;
//# sourceMappingURL=constants.d.ts.map