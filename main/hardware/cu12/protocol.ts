import {
  CU12Packet,
  CU12_COMMANDS,
  CU12_RESPONSE_CODES,
  CU12_CONSTANTS,
  SlotStatus,
  CU12Command,
  CU12ResponseCode
} from './types';

export class CU12Protocol {
  private static readonly COMMANDS = CU12_COMMANDS;
  public static readonly RESPONSE_CODES = CU12_RESPONSE_CODES;
  private static readonly CONSTANTS = CU12_CONSTANTS;

  /**
   * Build a CU12 protocol packet
   * @param addr Device address (0x00-0x10)
   * @param lockNum Lock number (0x00-0x0C, 0x0C = all locks)
   * @param cmd Command code
   * @param data Optional data payload
   * @returns Buffer containing the complete packet
   */
  buildPacket(addr: number, lockNum: number, cmd: CU12Command, data?: Buffer): Buffer {
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
    const packets: Buffer[] = [header, Buffer.from([checksum])];
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
  validatePacket(packet: Buffer): boolean {
    console.log(`[CU12-PROTOCOL] Validating packet structure`);
    
    if (packet.length < CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH) {
      console.log(`[CU12-PROTOCOL] Packet too short: ${packet.length} < ${CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH}`);
      return false;
    }

    // Check STX and ETX - but allow some flexibility for actual hardware responses
    const stx = packet[0];
    const etx = packet[6];
    
    console.log(`[CU12-PROTOCOL] STX: 0x${stx.toString(16)}, ETX: 0x${etx.toString(16)}`);
    
    if (stx !== CU12Protocol.CONSTANTS.STX || etx !== CU12Protocol.CONSTANTS.ETX) {
      console.log(`[CU12-PROTOCOL] STX/ETX validation failed - expected STX=0x02, ETX=0x03`);
      
      // Try to find valid packet within the buffer (robustness improvement)
      for (let i = 0; i < packet.length - 7; i++) {
        if (packet[i] === CU12Protocol.CONSTANTS.STX && packet[i + 6] === CU12Protocol.CONSTANTS.ETX) {
          console.log(`[CU12-PROTOCOL] Found valid STX/ETX at offset ${i}, attempting reparse`);
          const subPacket = packet.subarray(i);
          if (subPacket.length >= CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH) {
            return this.validatePacket(subPacket);
          }
        }
      }
      
      return false;
    }

    const checksumValid = this.validateChecksum(packet);
    console.log(`[CU12-PROTOCOL] Basic packet structure valid, checksum: ${checksumValid ? 'VALID' : 'INVALID'}`);
    
    return checksumValid;
  }

  /**
   * Calculate checksum for CU12 packet
   * Sum all bytes and return low byte
   */
  calculateChecksum(data: Buffer): number {
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
  validateChecksum(packet: Buffer): boolean {
    const dataLen = packet[5];
    const checksumOffset = 7;
    const expectedChecksum = packet[checksumOffset];
    
    console.log(`[CU12-PROTOCOL] Checksum validation - Data length: ${dataLen}`);
    console.log(`[CU12-PROTOCOL] Expected checksum: 0x${expectedChecksum?.toString(16)}`);
    
    // Calculate checksum for: STX to ETX (7 bytes) + DATA portion
    let checksumData: Buffer;
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
    } else {
      const headerBytes = [];
      for (let i = 0; i < checksumOffset; i++) {
        headerBytes.push(packet[i]);
      }
      checksumData = Buffer.from(headerBytes);
    }
    
    console.log(`[CU12-PROTOCOL] Checksum data: ${checksumData.toString('hex')}`);
    
    const calculatedChecksum = this.calculateChecksum(checksumData);
    console.log(`[CU12-PROTOCOL] Calculated checksum: 0x${calculatedChecksum.toString(16)}`);
    
    const isValid = calculatedChecksum === expectedChecksum;
    console.log(`[CU12-PROTOCOL] Checksum validation result: ${isValid ? 'VALID' : 'INVALID'}`);
    
    return isValid;
  }

  /**
   * Check if packet contains a valid response code
   */
  isValidResponse(packet: Buffer): boolean {
    console.log(`[CU12-PROTOCOL] Validating response packet:`, packet.toString('hex'));
    console.log(`[CU12-PROTOCOL] Packet length: ${packet.length} bytes`);
    
    if (!this.validatePacket(packet)) {
      console.log(`[CU12-PROTOCOL] Packet validation failed`);
      if (packet.length < CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH) {
        console.log(`[CU12-PROTOCOL] Packet too short: ${packet.length} < ${CU12Protocol.CONSTANTS.MIN_PACKET_LENGTH}`);
      }
      if (packet[0] !== CU12Protocol.CONSTANTS.STX) {
        console.log(`[CU12-PROTOCOL] Invalid STX: 0x${packet[0]?.toString(16)} (expected 0x02)`);
      }
      if (packet[6] !== CU12Protocol.CONSTANTS.ETX) {
        console.log(`[CU12-PROTOCOL] Invalid ETX: 0x${packet[6]?.toString(16)} (expected 0x03)`);
      }
      return false;
    }

    const askField = packet[4];
    const validResponseCodes = Object.values(CU12Protocol.RESPONSE_CODES);
    console.log(`[CU12-PROTOCOL] ASK field: 0x${askField.toString(16)}`);
    console.log(`[CU12-PROTOCOL] Valid response codes:`, validResponseCodes.map(c => `0x${c.toString(16)}`));
    
    const isValid = validResponseCodes.includes(askField as CU12ResponseCode);
    console.log(`[CU12-PROTOCOL] Response validation result: ${isValid ? 'VALID' : 'INVALID'}`);
    
    return isValid;
  }

  /**
   * Parse packet structure from buffer
   */
  parsePacket(packet: Buffer): CU12Packet | null {
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
  buildGetStatusCommand(addr: number = 0x00): Buffer {
    return this.buildPacket(addr, 0x00, CU12Protocol.COMMANDS.GET_STATUS);
  }

  /**
   * Build UNLOCK command packet
   * @param addr Device address
   * @param lockNum Lock number (0x00-0x0B for individual locks, 0x0C for all)
   * @returns UNLOCK command buffer
   */
  buildUnlockCommand(addr: number = 0x00, lockNum: number): Buffer {
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
  parseSlotStatus(packet: Buffer): SlotStatus[] {
    console.log(`[CU12-PROTOCOL] Parsing slot status from packet: ${packet.toString('hex')}`);
    
    const parsed = this.parsePacket(packet);
    if (!parsed) {
      throw new Error('Failed to parse packet structure');
    }
    
    console.log(`[CU12-PROTOCOL] Parsed packet:`, {
      stx: `0x${parsed.stx.toString(16)}`,
      addr: `0x${parsed.addr.toString(16)}`,
      cmd: `0x${parsed.cmd.toString(16)}`,
      ask: `0x${parsed.ask.toString(16)}`,
      dataLen: parsed.dataLen,
      data: parsed.data?.toString('hex')
    });
    
    if (!parsed.data || parsed.data.length < 2) {
      console.error(`[CU12-PROTOCOL] Invalid data: expected 2+ bytes, got ${parsed.data?.length || 0}`);
      throw new Error('Invalid status packet: missing or insufficient data');
    }

    // CU12 returns 2 bytes of hook status data
    // Each bit represents one lock (12 locks total)
    const statusBytes = parsed.data.subarray(0, 2);
    const slotStatuses: SlotStatus[] = [];
    
    console.log(`[CU12-PROTOCOL] Status bytes: ${statusBytes.toString('hex')}`);
    console.log(`[CU12-PROTOCOL] Byte 0: 0b${statusBytes[0].toString(2).padStart(8, '0')} (0x${statusBytes[0].toString(16)})`);
    console.log(`[CU12-PROTOCOL] Byte 1: 0b${statusBytes[1].toString(2).padStart(8, '0')} (0x${statusBytes[1].toString(16)})`);

    // Parse 12 bits from 2 bytes (little-endian format as per documentation)
    for (let slotId = 1; slotId <= CU12Protocol.CONSTANTS.MAX_SLOTS; slotId++) {
      const byteIndex = Math.floor((slotId - 1) / 8);
      const bitIndex = (slotId - 1) % 8;
      
      if (byteIndex < statusBytes.length) {
        const isLocked = (statusBytes[byteIndex] & (1 << bitIndex)) !== 0;
        slotStatuses.push({ slotId, isLocked });
        console.log(`[CU12-PROTOCOL] Slot ${slotId}: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
      }
    }
    
    console.log(`[CU12-PROTOCOL] Successfully parsed ${slotStatuses.length} slot statuses`);
    return slotStatuses;
  }

  /**
   * Check if unlock command was successful
   * @param packet Response packet from UNLOCK command
   * @returns true if unlock was successful
   */
  isUnlockSuccessful(packet: Buffer): boolean {
    const parsed = this.parsePacket(packet);
    return parsed?.ask === CU12Protocol.RESPONSE_CODES.SUCCESS;
  }
}