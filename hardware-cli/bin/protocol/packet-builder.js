"use strict";
/**
 * DS12/DS16 Packet Builder
 * Raw packet building functions for hardware communication
 *
 * This module provides independent packet building capabilities
 * extracted from the main application for testing purposes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateChecksum = calculateChecksum;
exports.buildPacket = buildPacket;
exports.buildStatusRequestPacket = buildStatusRequestPacket;
exports.buildUnlockPacket = buildUnlockPacket;
exports.buildVersionRequestPacket = buildVersionRequestPacket;
exports.packetToHexString = packetToHexString;
exports.packetToBuffer = packetToBuffer;
exports.validatePacket = validatePacket;
const constants_1 = require("./constants");
/**
 * Calculate checksum for packet data
 * Checksum = Sum of all bytes (excluding checksum itself) & 0xFF
 */
function calculateChecksum(packet) {
    const sum = packet.reduce((acc, byte) => acc + byte, 0);
    return sum & 0xFF;
}
/**
 * Build a raw packet according to DS12/DS16 protocol
 * Packet Structure: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
 */
function buildPacket(packetData) {
    const { addr = constants_1.PROTOCOL_CONSTANTS.DEFAULT_ADDR, lockNum = 0x00, cmd, ask = constants_1.PROTOCOL_CONSTANTS.ASK_DEFAULT, data = [] } = packetData;
    // Build packet without checksum first
    const packet = [
        constants_1.PROTOCOL_CONSTANTS.STX,
        addr,
        lockNum,
        cmd,
        ask,
        data.length, // DATALEN
        constants_1.PROTOCOL_CONSTANTS.ETX
    ];
    // Calculate checksum (includes all bytes before SUM position)
    const packetWithData = [...packet, ...data];
    const checksum = calculateChecksum(packetWithData);
    // Build final packet: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
    const finalPacket = [...packet, checksum];
    // Append data if any (after SUM)
    if (data.length > 0) {
        finalPacket.push(...data);
    }
    return finalPacket;
}
/**
 * Build status request packet (0x80)
 * Used to check the state of all slots
 */
function buildStatusRequestPacket() {
    return buildPacket({
        cmd: constants_1.PROTOCOL_CONSTANTS.DS12_STATUS_REQUEST,
        lockNum: 0x00 // 0x00 for status of all slots
    });
}
/**
 * Build unlock packet (0x81)
 * Used to unlock a specific slot
 * @param slotNumber - Slot number (1-based, will be converted to 0-based)
 */
function buildUnlockPacket(slotNumber) {
    if (slotNumber < 1 || slotNumber > constants_1.PROTOCOL_CONSTANTS.DS12_MAX_SLOTS) {
        throw new Error(`Slot number must be between 1 and ${constants_1.PROTOCOL_CONSTANTS.DS12_MAX_SLOTS}`);
    }
    const lockNum = slotNumber - 1; // Convert 1-based to 0-based
    return buildPacket({
        cmd: constants_1.PROTOCOL_CONSTANTS.DS12_UNLOCK_SLOT,
        lockNum
    });
}
/**
 * Build version request packet (0x8F)
 * Used to get firmware version information
 */
function buildVersionRequestPacket() {
    return buildPacket({
        cmd: constants_1.PROTOCOL_CONSTANTS.DS12_GET_VERSION
    });
}
/**
 * Convert packet to hex string for debugging
 */
function packetToHexString(packet) {
    return packet.map(byte => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(' ');
}
/**
 * Convert packet to buffer for serial transmission
 */
function packetToBuffer(packet) {
    return Buffer.from(packet);
}
/**
 * Validate packet structure
 * CU12 Protocol: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
 */
function validatePacket(packet) {
    if (packet.length < 8) {
        return false;
    }
    // Check STX and ETX
    if (packet[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.STX] !== constants_1.PROTOCOL_CONSTANTS.STX ||
        packet[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.ETX] !== constants_1.PROTOCOL_CONSTANTS.ETX) {
        return false;
    }
    // Get data length
    const dataLen = packet[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.DATALEN];
    // Verify packet length matches expected length
    const expectedLength = 8 + dataLen; // Header (7) + SUM (1) + DATA (dataLen)
    if (packet.length !== expectedLength) {
        return false;
    }
    // Verify checksum - includes header + data
    const headerPart = packet.slice(0, 7); // STX to ETX
    const dataPart = packet.slice(8, 8 + dataLen); // DATA part
    const packetForChecksum = [...headerPart, ...dataPart];
    const expectedChecksum = calculateChecksum(packetForChecksum);
    const actualChecksum = packet[constants_1.PROTOCOL_CONSTANTS.PACKET_POS.SUM];
    return expectedChecksum === actualChecksum;
}
//# sourceMappingURL=packet-builder.js.map