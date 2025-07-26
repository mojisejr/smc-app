import { CU12Protocol } from '../protocol';
import { CU12_COMMANDS, CU12_RESPONSE_CODES } from '../types';

describe('CU12Protocol', () => {
  let protocol: CU12Protocol;

  beforeEach(() => {
    protocol = new CU12Protocol();
  });

  describe('buildGetStatusCommand', () => {
    it('should build valid GET_STATUS packet', () => {
      const packet = protocol.buildGetStatusCommand(0x00);
      const expected = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x85]);
      expect(packet).toEqual(expected);
    });
  });

  describe('buildUnlockCommand', () => {
    it('should build valid UNLOCK packet for slot 3', () => {
      const packet = protocol.buildUnlockCommand(0x00, 0x02); // slot 3 = lockNum 0x02
      const expected = Buffer.from([0x02, 0x00, 0x02, 0x81, 0x00, 0x00, 0x03, 0x88]);
      expect(packet).toEqual(expected);
    });

    it('should build valid UNLOCK ALL packet', () => {
      const packet = protocol.buildUnlockCommand(0x00, 0x0C); // unlock all
      const expected = Buffer.from([0x02, 0x00, 0x0C, 0x81, 0x00, 0x00, 0x03, 0x92]);
      expect(packet).toEqual(expected);
    });

    it('should throw error for invalid lock number', () => {
      expect(() => protocol.buildUnlockCommand(0x00, 0x0D)).toThrow();
      expect(() => protocol.buildUnlockCommand(0x00, -1)).toThrow();
    });
  });

  describe('validateChecksum', () => {
    it('should validate checksum correctly for GET_STATUS response', () => {
      // Example from CU12.md: 02000080100203990200
      const validPacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00]);
      expect(protocol.validateChecksum(validPacket)).toBe(true);
    });

    it('should reject packet with invalid checksum', () => {
      const invalidPacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x98, 0x02, 0x00]);
      expect(protocol.validateChecksum(invalidPacket)).toBe(false);
    });
  });

  describe('validatePacket', () => {
    it('should validate complete packet structure', () => {
      const validPacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00]);
      expect(protocol.validatePacket(validPacket)).toBe(true);
    });

    it('should reject packet with wrong STX', () => {
      const invalidPacket = Buffer.from([0x01, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00]);
      expect(protocol.validatePacket(invalidPacket)).toBe(false);
    });

    it('should reject packet with wrong ETX', () => {
      const invalidPacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x04, 0x99, 0x02, 0x00]);
      expect(protocol.validatePacket(invalidPacket)).toBe(false);
    });

    it('should reject packet that is too short', () => {
      const shortPacket = Buffer.from([0x02, 0x00, 0x00, 0x80]);
      expect(protocol.validatePacket(shortPacket)).toBe(false);
    });
  });

  describe('parseSlotStatus', () => {
    it('should parse slot status correctly', () => {
      // Example: lock #2 is locked (bit 1 set in first byte)
      const responsePacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00]);
      const slotStatuses = protocol.parseSlotStatus(responsePacket);
      
      expect(slotStatuses).toHaveLength(12);
      expect(slotStatuses[1].slotId).toBe(2);
      expect(slotStatuses[1].isLocked).toBe(true);
      
      // Other slots should be unlocked
      expect(slotStatuses[0].isLocked).toBe(false);
      expect(slotStatuses[2].isLocked).toBe(false);
    });

    it('should handle all slots unlocked', () => {
      const responsePacket = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x97, 0x00, 0x00]);
      const slotStatuses = protocol.parseSlotStatus(responsePacket);
      
      expect(slotStatuses).toHaveLength(12);
      slotStatuses.forEach(slot => {
        expect(slot.isLocked).toBe(false);
      });
    });
  });

  describe('isUnlockSuccessful', () => {
    it('should return true for successful unlock response', () => {
      const successResponse = Buffer.from([0x02, 0x00, 0x02, 0x81, 0x10, 0x00, 0x03, 0x98]);
      expect(protocol.isUnlockSuccessful(successResponse)).toBe(true);
    });

    it('should return false for failed unlock response', () => {
      const failResponse = Buffer.from([0x02, 0x00, 0x02, 0x81, 0x11, 0x00, 0x03, 0x99]);
      expect(protocol.isUnlockSuccessful(failResponse)).toBe(false);
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate checksum correctly', () => {
      const data = Buffer.from([0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03]);
      const checksum = protocol.calculateChecksum(data);
      expect(checksum).toBe(0x85);
    });

    it('should handle checksum overflow correctly', () => {
      const data = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
      const checksum = protocol.calculateChecksum(data);
      expect(checksum).toBe(0xFC); // (0xFF * 4) & 0xFF = 0xFC
    });
  });
});