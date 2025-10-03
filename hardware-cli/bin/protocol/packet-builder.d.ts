/**
 * DS12/DS16 Packet Builder
 * Raw packet building functions for hardware communication
 *
 * This module provides independent packet building capabilities
 * extracted from the main application for testing purposes.
 */
export interface PacketData {
    addr?: number;
    lockNum?: number;
    cmd: number;
    ask?: number;
    data?: number[];
}
/**
 * Calculate checksum for packet data
 * Checksum = Sum of all bytes (excluding checksum itself) & 0xFF
 */
export declare function calculateChecksum(packet: number[]): number;
/**
 * Build a raw packet according to DS12/DS16 protocol
 * Packet Structure: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
 */
export declare function buildPacket(packetData: PacketData): number[];
/**
 * Build status request packet (0x80)
 * Used to check the state of all slots
 */
export declare function buildStatusRequestPacket(): number[];
/**
 * Build unlock packet (0x81)
 * Used to unlock a specific slot
 * @param slotNumber - Slot number (1-based, will be converted to 0-based)
 */
export declare function buildUnlockPacket(slotNumber: number): number[];
/**
 * Build version request packet (0x8F)
 * Used to get firmware version information
 */
export declare function buildVersionRequestPacket(): number[];
/**
 * Convert packet to hex string for debugging
 */
export declare function packetToHexString(packet: number[]): string;
/**
 * Convert packet to buffer for serial transmission
 */
export declare function packetToBuffer(packet: number[]): Buffer;
/**
 * Validate packet structure
 * CU12 Protocol: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
 */
export declare function validatePacket(packet: number[]): boolean;
//# sourceMappingURL=packet-builder.d.ts.map