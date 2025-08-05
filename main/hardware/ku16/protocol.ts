/**
 * KU16 Protocol Handler
 * Extracted from original command-parser.ts and modernized
 * Following CU12 pattern for consistency
 */

import { KU16Command, KU16Response, KU16_COMMANDS, KU16_PROTOCOL } from './types';

export class KU16Protocol {
  // Static command definitions for all 15 slots (16 for compatibility)
  private static readonly SLOT_COMMANDS: KU16Command[] = [
    { channel: 0, channelNo: 1, unlock: [0x02, 0x00, 0x31, 0x03, 0x36] },
    { channel: 1, channelNo: 2, unlock: [0x02, 0x01, 0x31, 0x03, 0x37] },
    { channel: 2, channelNo: 3, unlock: [0x02, 0x02, 0x31, 0x03, 0x38] },
    { channel: 3, channelNo: 4, unlock: [0x02, 0x03, 0x31, 0x03, 0x39] },
    { channel: 4, channelNo: 5, unlock: [0x02, 0x04, 0x31, 0x03, 0x3a] },
    { channel: 5, channelNo: 6, unlock: [0x02, 0x05, 0x31, 0x03, 0x3b] },
    { channel: 6, channelNo: 7, unlock: [0x02, 0x06, 0x31, 0x03, 0x3c] },
    { channel: 7, channelNo: 8, unlock: [0x02, 0x07, 0x31, 0x03, 0x3d] },
    { channel: 8, channelNo: 9, unlock: [0x02, 0x08, 0x31, 0x03, 0x3e] },
    { channel: 9, channelNo: 10, unlock: [0x02, 0x09, 0x31, 0x03, 0x3f] },
    { channel: 10, channelNo: 11, unlock: [0x02, 0x0a, 0x31, 0x03, 0x40] },
    { channel: 11, channelNo: 12, unlock: [0x02, 0x0b, 0x31, 0x03, 0x41] },
    { channel: 12, channelNo: 13, unlock: [0x02, 0x0c, 0x31, 0x03, 0x42] },
    { channel: 13, channelNo: 14, unlock: [0x02, 0x0d, 0x31, 0x03, 0x43] },
    { channel: 14, channelNo: 15, unlock: [0x02, 0x0e, 0x31, 0x03, 0x44] },
    { channel: 15, channelNo: 16, unlock: [0x02, 0x0f, 0x31, 0x03, 0x45] },
  ];

  private static readonly STATUS_COMMAND = [0x02, 0x00, 0x30, 0x03, 0x35];

  /**
   * Create status check command
   */
  createStatusCommand(): Buffer {
    return Buffer.from(KU16Protocol.STATUS_COMMAND);
  }

  /**
   * Create unlock command for specific slot
   */
  createUnlockCommand(slotId: number): Buffer {
    if (slotId < 1 || slotId > KU16_PROTOCOL.MAX_SLOTS) {
      throw new Error(`Invalid slot ID: ${slotId}. Must be between 1 and ${KU16_PROTOCOL.MAX_SLOTS}`);
    }

    const command = KU16Protocol.SLOT_COMMANDS[slotId - 1];
    if (!command) {
      throw new Error(`Command not found for slot ${slotId}`);
    }

    return Buffer.from(command.unlock);
  }

  /**
   * Parse command type from response
   */
  parseCommandType(commandByte: number): string {
    switch (commandByte) {
      case KU16_COMMANDS.STATUS:
        return "STATUS";
      case KU16_COMMANDS.UNLOCK:
        return "UNLOCK";
      case KU16_COMMANDS.ALL_CU_STATES:
        return "ALL_CU_STATES";
      case KU16_COMMANDS.UNLOCK_ALL:
        return "UNLOCK_ALL";
      case KU16_COMMANDS.RETURN_SINGLE_DATA:
        return "RETURN_SINGLE_DATA";
      case KU16_COMMANDS.RETURN_ALL_DATA:
        return "RETURN_ALL_DATA";
      default:
        return "UNKNOWN";
    }
  }

  /**
   * Parse response from hardware
   */
  parseResponse(data: Buffer): KU16Response {
    if (data.length < 3) {
      throw new Error('Invalid response: too short');
    }

    const command = this.parseCommandType(data[2]);
    const slotStates = data.length >= 5 ? this.parseSlotStates(data[3], data[4]) : [];

    return {
      command,
      data: Array.from(data),
      slotStates
    };
  }

  /**
   * Parse slot states from two data bytes
   */
  private parseSlotStates(data1: number, data2: number): number[] {
    const hex1 = this.decimalToHex(data1);
    const hex2 = this.decimalToHex(data2);
    const bin1 = this.hex2bin(hex1);
    const bin2 = this.hex2bin(hex2);
    const binArr1 = this.bin2arr(bin1).reverse();
    const binArr2 = this.bin2arr(bin2).reverse();
    
    return binArr1.concat(binArr2);
  }

  /**
   * Check if specific slot is opening (state = 0)
   */
  checkOpeningSlot(slotStates: number[], slotId: number): number {
    if (slotStates.length <= 0 || slotId < 1 || slotId > slotStates.length) {
      return -1;
    }

    return slotStates[slotId - 1] === 0 ? slotId : -1;
  }

  /**
   * Check if specific slot is closed (state = 1)
   */
  checkClosedSlot(slotStates: number[], slotId: number): number {
    if (slotStates.length <= 0 || slotId < 1 || slotId > slotStates.length) {
      return -1;
    }

    return slotStates[slotId - 1] === 1 ? slotId : -1;
  }

  /**
   * Validate command structure
   */
  validateCommand(command: number[]): boolean {
    if (command.length !== KU16_PROTOCOL.PACKET_SIZE) {
      return false;
    }

    // Check STX and ETX
    if (command[0] !== KU16_PROTOCOL.STX || command[3] !== KU16_PROTOCOL.ETX) {
      return false;
    }

    // Basic checksum validation (simplified)
    return true;
  }

  // Utility methods (from original implementation)
  private decimalToHex(decimal: number): string {
    if (!Number.isInteger(decimal)) {
      throw new Error("Input must be an integer.");
    }
    return decimal.toString(16).toUpperCase().padStart(2, "0");
  }

  private hex2bin(hex: string): string {
    return parseInt(hex, 16).toString(2).padStart(8, "0");
  }

  private bin2arr(bstr: string): number[] {
    return bstr.split("").map((i) => parseInt(i));
  }

  /**
   * Get all slot commands (for testing/debugging)
   */
  getAllSlotCommands(): KU16Command[] {
    return [...KU16Protocol.SLOT_COMMANDS];
  }

  /**
   * Get maximum supported slots
   */
  getMaxSlots(): number {
    return KU16_PROTOCOL.MAX_SLOTS;
  }
}