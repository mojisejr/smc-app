/**
 * DS12/DS16 Packet Builder
 * Raw packet building functions for hardware communication
 * 
 * This module provides independent packet building capabilities
 * extracted from the main application for testing purposes.
 */

import { PROTOCOL_CONSTANTS } from './constants';

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
export function calculateChecksum(packet: number[]): number {
  const sum = packet.reduce((acc, byte) => acc + byte, 0);
  return sum & 0xFF;
}

/**
 * Build a raw packet according to DS12/DS16 protocol
 * Packet Structure: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA
 */
export function buildPacket(packetData: PacketData): number[] {
  const {
    addr = PROTOCOL_CONSTANTS.DEFAULT_ADDR,
    lockNum = 0x00,
    cmd,
    ask = PROTOCOL_CONSTANTS.ASK_DEFAULT,
    data = []
  } = packetData;

  // Build packet without checksum first
  const packet = [
    PROTOCOL_CONSTANTS.STX,
    addr,
    lockNum,
    cmd,
    ask,
    data.length,  // DATALEN
    PROTOCOL_CONSTANTS.ETX
  ];

  // Calculate and append checksum
  const checksum = calculateChecksum(packet);
  packet.push(checksum);

  // Append data if any
  if (data.length > 0) {
    packet.push(...data);
  }

  return packet;
}

/**
 * Build status request packet (0x80)
 * Used to check the state of all slots
 */
export function buildStatusRequestPacket(): number[] {
  return buildPacket({
    cmd: PROTOCOL_CONSTANTS.DS12_STATUS_REQUEST,
    lockNum: 0x00  // 0x00 for status of all slots
  });
}

/**
 * Build unlock packet (0x81)
 * Used to unlock a specific slot
 * @param slotNumber - Slot number (1-based, will be converted to 0-based)
 */
export function buildUnlockPacket(slotNumber: number): number[] {
  if (slotNumber < 1 || slotNumber > PROTOCOL_CONSTANTS.DS12_MAX_SLOTS) {
    throw new Error(`Slot number must be between 1 and ${PROTOCOL_CONSTANTS.DS12_MAX_SLOTS}`);
  }

  const lockNum = slotNumber - 1; // Convert 1-based to 0-based
  
  return buildPacket({
    cmd: PROTOCOL_CONSTANTS.DS12_UNLOCK_SLOT,
    lockNum
  });
}

/**
 * Build version request packet (0x8F)
 * Used to get firmware version information
 */
export function buildVersionRequestPacket(): number[] {
  return buildPacket({
    cmd: PROTOCOL_CONSTANTS.DS12_GET_VERSION
  });
}

/**
 * Convert packet to hex string for debugging
 */
export function packetToHexString(packet: number[]): string {
  return packet.map(byte => `0x${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(' ');
}

/**
 * Convert packet to buffer for serial transmission
 */
export function packetToBuffer(packet: number[]): Buffer {
  return Buffer.from(packet);
}

/**
 * Validate packet structure
 */
export function validatePacket(packet: number[]): boolean {
  if (packet.length < 8) {
    return false;
  }

  // Check STX and ETX
  if (packet[PROTOCOL_CONSTANTS.PACKET_POS.STX] !== PROTOCOL_CONSTANTS.STX ||
      packet[PROTOCOL_CONSTANTS.PACKET_POS.ETX] !== PROTOCOL_CONSTANTS.ETX) {
    return false;
  }

  // Verify checksum
  const packetWithoutChecksum = packet.slice(0, 7);
  const expectedChecksum = calculateChecksum(packetWithoutChecksum);
  const actualChecksum = packet[PROTOCOL_CONSTANTS.PACKET_POS.SUM];

  return expectedChecksum === actualChecksum;
}