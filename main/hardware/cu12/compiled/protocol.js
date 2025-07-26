"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CU12Protocol = void 0;
const types_1 = require("./types");
class CU12Protocol {
    /**
     * Build a CU12 protocol packet
     * @param addr Device address (0x00-0x10)
     * @param lockNum Lock number (0x00-0x0C, 0x0C = all locks)
     * @param cmd Command code
     * @param data Optional data payload
     * @returns Buffer containing the complete packet
     */
    buildPacket(addr, lockNum, cmd, data) {
        const dataLen = data ? data.length : 0;
        const ask = CU12Protocol.RESPONSE_CODES.DEFAULT_ASK;
        // Create header (7 bytes: STX, ADDR, LOCKNUM, CMD, ASK, DATALEN, ETX)
        const header = Buffer.from([
            CU12Protocol.CONSTANTS.STX,
            addr,
            lockNum,
            cmd,
            ask,
            dataLen,
            CU12Protocol.CONSTANTS.ETX
        ]);
        // Calculate checksum for header + data
        const checksumData = data ? Buffer.concat([header, data]) : header;
        const checksum = this.calculateChecksum(checksumData);
        // Build complete packet: header + checksum + data (if any)
        const packets = [header, Buffer.from([checksum])];
        if (data) {
            packets.push(data);
        }
        return Buffer.concat(packets);
    }
    /**
     * Validate a received CU12 packet
     * @param packet Buffer containing the packet
     * @returns true if packet is valid
     */
    validatePacket(packet) {
        if (packet.length < CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH) {
            return false;
        }
        // Check STX and ETX
        if (packet[0] !== CU12Protocol.CONSTANTS.STX || packet[6] !== CU12Protocol.CONSTANTS.ETX) {
            return false;
        }
        return this.validateChecksum(packet);
    }
    /**
     * Calculate checksum for CU12 packet
     * Sum all bytes and return low byte
     */
    calculateChecksum(data) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return sum & 0xFF;
    }
    /**
     * Validate checksum of received packet
     * @param packet Complete packet buffer
     * @returns true if checksum is valid
     */
    validateChecksum(packet) {
        const dataLen = packet[5];
        const checksumOffset = 7;
        const expectedChecksum = packet[checksumOffset];
        // Calculate checksum for: STX to ETX (7 bytes) + DATA portion
        let checksumData;
        if (dataLen > 0) {
            const headerBytes = [];
            const dataBytes = [];
            for (let i = 0; i < checksumOffset; i++) {
                headerBytes.push(packet[i]);
            }
            for (let i = 8; i < 8 + dataLen; i++) {
                dataBytes.push(packet[i]);
            }
            checksumData = Buffer.from([...headerBytes, ...dataBytes]);
        }
        else {
            const headerBytes = [];
            for (let i = 0; i < checksumOffset; i++) {
                headerBytes.push(packet[i]);
            }
            checksumData = Buffer.from(headerBytes);
        }
        const calculatedChecksum = this.calculateChecksum(checksumData);
        return calculatedChecksum === expectedChecksum;
    }
    /**
     * Check if packet contains a valid response code
     */
    isValidResponse(packet) {
        if (!this.validatePacket(packet)) {
            return false;
        }
        const askField = packet[4];
        const validResponseCodes = Object.values(CU12Protocol.RESPONSE_CODES);
        return validResponseCodes.includes(askField);
    }
    /**
     * Parse packet structure from buffer
     */
    parsePacket(packet) {
        if (!this.validatePacket(packet)) {
            return null;
        }
        const dataLen = packet[5];
        const data = dataLen > 0 ? packet.subarray(8, 8 + dataLen) : undefined;
        return {
            stx: packet[0],
            addr: packet[1],
            lockNum: packet[2],
            cmd: packet[3],
            ask: packet[4],
            dataLen: packet[5],
            etx: packet[6],
            sum: packet[7],
            data
        };
    }
    /**
     * Build GET_STATUS command packet
     * @param addr Device address
     * @returns GET_STATUS command buffer
     */
    buildGetStatusCommand(addr = 0x00) {
        return this.buildPacket(addr, 0x00, CU12Protocol.COMMANDS.GET_STATUS);
    }
    /**
     * Build UNLOCK command packet
     * @param addr Device address
     * @param lockNum Lock number (0x00-0x0B for individual locks, 0x0C for all)
     * @returns UNLOCK command buffer
     */
    buildUnlockCommand(addr = 0x00, lockNum) {
        if (lockNum < 0 || lockNum > CU12Protocol.CONSTANTS.UNLOCK_ALL_SLOTS) {
            throw new Error(`Invalid lock number: ${lockNum}. Must be 0-${CU12Protocol.CONSTANTS.UNLOCK_ALL_SLOTS}`);
        }
        return this.buildPacket(addr, lockNum, CU12Protocol.COMMANDS.UNLOCK);
    }
    /**
     * Parse slot status from GET_STATUS response
     * @param packet Response packet from GET_STATUS command
     * @returns Array of slot statuses (12 slots)
     */
    parseSlotStatus(packet) {
        const parsed = this.parsePacket(packet);
        if (!parsed || !parsed.data || parsed.data.length < 2) {
            throw new Error('Invalid status packet: missing or insufficient data');
        }
        // CU12 returns 2 bytes of hook status data
        // Each bit represents one lock (12 locks total)
        const statusBytes = parsed.data.subarray(0, 2);
        const slotStatuses = [];
        // Parse 12 bits from 2 bytes (big-endian format)
        for (let slotId = 1; slotId <= CU12Protocol.CONSTANTS.MAX_SLOTS; slotId++) {
            const byteIndex = Math.floor((slotId - 1) / 8);
            const bitIndex = (slotId - 1) % 8;
            if (byteIndex < statusBytes.length) {
                const isLocked = (statusBytes[byteIndex] & (1 << bitIndex)) !== 0;
                slotStatuses.push({ slotId, isLocked });
            }
        }
        return slotStatuses;
    }
    /**
     * Check if unlock command was successful
     * @param packet Response packet from UNLOCK command
     * @returns true if unlock was successful
     */
    isUnlockSuccessful(packet) {
        const parsed = this.parsePacket(packet);
        return parsed?.ask === CU12Protocol.RESPONSE_CODES.SUCCESS;
    }
}
exports.CU12Protocol = CU12Protocol;
CU12Protocol.COMMANDS = types_1.CU12_COMMANDS;
CU12Protocol.RESPONSE_CODES = types_1.CU12_RESPONSE_CODES;
CU12Protocol.CONSTANTS = types_1.CU12_CONSTANTS;
