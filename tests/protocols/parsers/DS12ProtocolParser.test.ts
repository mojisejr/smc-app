import { DS12ProtocolParser } from "../../../main/ku-controllers/protocols/parsers/DS12ProtocolParser";
import { DeviceType, CommandType, ProtocolErrorCode } from "../../../main/ku-controllers/protocols/interfaces/ProtocolTypes";

/**
 * DS12 Protocol Parser Test Suite
 * 
 * Tests based on actual CU12 protocol examples from documentation
 * Covers packet validation, parsing, and building functionality
 * 
 * TEST DATA SOURCES:
 * - CU12.txt documentation examples
 * - Real hardware response patterns
 * - Edge cases and error conditions
 */

describe("DS12ProtocolParser", () => {
  let parser: DS12ProtocolParser;

  beforeEach(() => {
    parser = new DS12ProtocolParser();
  });

  describe("validatePacketStructure", () => {
    describe("Valid packets", () => {
      it("should validate minimum length packet (8 bytes)", () => {
        // Valid status request: 02 00 00 80 00 00 03 85
        const validPacket = [0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x85];
        
        const result = parser.validatePacketStructure(validPacket);
        
        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
        expect(result.deviceType).toBe(DeviceType.DS12);
      });

      it("should validate status response packet", () => {
        // Valid status response: 02 00 00 80 10 02 03 99 02 00
        const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00];
        
        const result = parser.validatePacketStructure(statusResponse);
        
        expect(result.success).toBe(true);
        expect(result.deviceType).toBe(DeviceType.DS12);
      });

      it("should validate unlock response packet", () => {
        // Valid unlock response: 02 00 02 81 10 00 03 98
        const unlockResponse = [0x02, 0x00, 0x02, 0x81, 0x10, 0x00, 0x03, 0x98];
        
        const result = parser.validatePacketStructure(unlockResponse);
        
        expect(result.success).toBe(true);
      });

      it("should validate broadcast address (0x10)", () => {
        const broadcastPacket = [0x02, 0x10, 0x00, 0x80, 0x00, 0x00, 0x03, 0x95];
        
        const result = parser.validatePacketStructure(broadcastPacket);
        
        expect(result.success).toBe(true);
      });
    });

    describe("Invalid packets", () => {
      it("should reject packet too short (< 8 bytes)", () => {
        const shortPacket = [0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03];
        
        const result = parser.validatePacketStructure(shortPacket);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("packet too short");
      });

      it("should reject packet too long (> 48 bytes)", () => {
        const longPacket = new Array(50).fill(0x00);
        longPacket[0] = 0x02; // STX
        longPacket[6] = 0x03; // ETX
        
        const result = parser.validatePacketStructure(longPacket);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("packet too long");
      });

      it("should reject invalid STX", () => {
        const invalidSTX = [0x01, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x84]; // STX should be 0x02
        
        const result = parser.validatePacketStructure(invalidSTX);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("Invalid STX");
      });

      it("should reject invalid ETX", () => {
        const invalidETX = [0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x04, 0x86]; // ETX should be 0x03
        
        const result = parser.validatePacketStructure(invalidETX);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("Invalid ETX position");
      });

      it("should reject invalid address (> 0x10)", () => {
        const invalidAddr = [0x02, 0x11, 0x00, 0x80, 0x00, 0x00, 0x03, 0x86]; // ADDR 0x11 > 0x10
        
        const result = parser.validatePacketStructure(invalidAddr);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("Invalid DS12 address");
      });

      it("should reject packet with wrong DATALEN", () => {
        // DATALEN=2 but only 1 data byte provided
        const wrongDatalen = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x98, 0x01];
        
        const result = parser.validatePacketStructure(wrongDatalen);
        
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
        expect(result.error?.message).toContain("Packet length mismatch");
      });
    });
  });

  describe("parseStatusResponse", () => {
    it("should parse successful status response with all slots locked", () => {
      // Example from CU12.txt: 02 00 00 80 10 02 03 99 00 00 (all slots locked = 0x00)
      const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x00, 0x00];
      
      const result = parser.parseStatusResponse(statusResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(12); // DS12 has 12 slots
      expect(result.data?.every(state => state === false)).toBe(true); // All locked (false)
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should parse status response with specific slots unlocked", () => {
      // Example from CU12.txt: 02 00 00 80 10 02 03 99 02 00 (slot 2 unlocked)
      // 0x02 = 00000010 binary = bit 1 set = slot 2 unlocked (0-indexed bit, 1-indexed slot)
      const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00];
      
      const result = parser.parseStatusResponse(statusResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(12);
      expect(result.data?.[1]).toBe(true); // Slot 2 (index 1) should be unlocked
      expect(result.data?.[0]).toBe(false); // Slot 1 should be locked
      expect(result.data?.[2]).toBe(false); // Slot 3 should be locked
    });

    it("should parse status response with slots 9-12 states", () => {
      // Test second byte parsing: 00 04 = 00000100 in second byte = bit 2 set = slot 11 unlocked
      const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x9D, 0x00, 0x04];
      
      const result = parser.parseStatusResponse(statusResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(12);
      expect(result.data?.[10]).toBe(true); // Slot 11 (index 10) should be unlocked
      expect(result.data?.[8]).toBe(false); // Slot 9 should be locked
      expect(result.data?.[9]).toBe(false); // Slot 10 should be locked
      expect(result.data?.[11]).toBe(false); // Slot 12 should be locked
    });

    it("should handle status response with failed ASK status", () => {
      // ASK = 0x11 (failed operation)
      const failedResponse = [0x02, 0x00, 0x00, 0x80, 0x11, 0x02, 0x03, 0x9A, 0x02, 0x00];
      
      const result = parser.parseStatusResponse(failedResponse);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.DEVICE_BUSY);
      expect(result.error?.message).toContain("Operation failed");
    });

    it("should reject non-status command", () => {
      // CMD = 0x81 (unlock) instead of 0x80 (status)
      const unlockResponse = [0x02, 0x00, 0x02, 0x81, 0x10, 0x00, 0x03, 0x98];
      
      const result = parser.parseStatusResponse(unlockResponse);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
      expect(result.error?.message).toContain("Expected DS12_STATUS_REQUEST");
    });

    it("should reject wrong DATALEN for status response", () => {
      // DATALEN should be 2 for status response, not 1
      const wrongDatalen = [0x02, 0x00, 0x00, 0x80, 0x10, 0x01, 0x03, 0x97, 0x02];
      
      const result = parser.parseStatusResponse(wrongDatalen);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
      expect(result.error?.message).toContain("DATALEN should be 2");
    });
  });

  describe("parseUnlockResponse", () => {
    it("should parse successful unlock response", () => {
      // Example from CU12.txt: 02 00 02 81 10 00 03 98 (unlock slot 3 success)
      const unlockResponse = [0x02, 0x00, 0x02, 0x81, 0x10, 0x00, 0x03, 0x98];
      
      const result = parser.parseUnlockResponse(unlockResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should handle failed unlock response", () => {
      // ASK = 0x11 (failed operation)
      const failedUnlock = [0x02, 0x00, 0x02, 0x81, 0x11, 0x00, 0x03, 0x99];
      
      const result = parser.parseUnlockResponse(failedUnlock);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.DEVICE_BUSY);
      expect(result.error?.message).toContain("Operation failed");
    });

    it("should handle timeout unlock response", () => {
      // ASK = 0x12 (timeout)
      const timeoutUnlock = [0x02, 0x00, 0x02, 0x81, 0x12, 0x00, 0x03, 0x9A];
      
      const result = parser.parseUnlockResponse(timeoutUnlock);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.DEVICE_BUSY);
      expect(result.error?.message).toContain("Operation timeout");
    });

    it("should reject non-unlock command", () => {
      // CMD = 0x80 (status) instead of 0x81 (unlock)
      const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00];
      
      const result = parser.parseUnlockResponse(statusResponse);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
      expect(result.error?.message).toContain("Expected DS12_UNLOCK_SLOT");
    });
  });

  describe("parseVersionResponse", () => {
    it("should parse version response correctly", () => {
      // Example from CU12.txt: 02 00 00 8F 10 02 03 C8 10 12
      // Version data: 10 12 = software v1.0, hardware v1.2
      const versionResponse = [0x02, 0x00, 0x00, 0x8F, 0x10, 0x02, 0x03, 0xC8, 0x10, 0x12];
      
      const result = parser.parseVersionResponse(versionResponse);
      
      expect(result.success).toBe(true);
      expect(result.data?.softwareVersion).toBe("1.0");
      expect(result.data?.hardwareVersion).toBe("1.2");
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should handle different version formats", () => {
      // Version: 23 45 = software v2.3, hardware v4.5
      const versionResponse = [0x02, 0x00, 0x00, 0x8F, 0x10, 0x02, 0x03, 0xDB, 0x23, 0x45];
      
      const result = parser.parseVersionResponse(versionResponse);
      
      expect(result.success).toBe(true);
      expect(result.data?.softwareVersion).toBe("2.3");
      expect(result.data?.hardwareVersion).toBe("4.5");
    });

    it("should handle failed version request", () => {
      // ASK = 0x11 (failed)
      const failedVersion = [0x02, 0x00, 0x00, 0x8F, 0x11, 0x02, 0x03, 0xC9, 0x10, 0x12];
      
      const result = parser.parseVersionResponse(failedVersion);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.DEVICE_BUSY);
      expect(result.error?.message).toContain("Operation failed");
    });
  });

  describe("buildStatusRequestPacket", () => {
    it("should build valid status request packet for address 0x00", () => {
      const result = parser.buildStatusRequestPacket(0x00);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03, 0x85]);
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should build valid status request packet for broadcast address", () => {
      const result = parser.buildStatusRequestPacket(0x10);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([0x02, 0x10, 0x00, 0x80, 0x00, 0x00, 0x03, 0x95]);
    });

    it("should reject invalid address", () => {
      const result = parser.buildStatusRequestPacket(0x11);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_CONFIGURATION);
      expect(result.error?.message).toContain("Invalid DS12 address");
    });
  });

  describe("buildUnlockPacket", () => {
    it("should build valid unlock packet for slot 1", () => {
      const result = parser.buildUnlockPacket(0x00, 1);
      
      expect(result.success).toBe(true);
      // Slot 1 = LOCKNUM 0x00
      expect(result.data).toEqual([0x02, 0x00, 0x00, 0x81, 0x00, 0x00, 0x03, 0x86]);
    });

    it("should build valid unlock packet for slot 3", () => {
      const result = parser.buildUnlockPacket(0x00, 3);
      
      expect(result.success).toBe(true);
      // Slot 3 = LOCKNUM 0x02, matches CU12.txt example: 02 00 02 81 00 00 03 88
      expect(result.data).toEqual([0x02, 0x00, 0x02, 0x81, 0x00, 0x00, 0x03, 0x88]);
    });

    it("should build valid unlock packet for slot 12", () => {
      const result = parser.buildUnlockPacket(0x00, 12);
      
      expect(result.success).toBe(true);
      // Slot 12 = LOCKNUM 0x0B
      expect(result.data).toEqual([0x02, 0x00, 0x0B, 0x81, 0x00, 0x00, 0x03, 0x91]);
    });

    it("should reject invalid slot number (0)", () => {
      const result = parser.buildUnlockPacket(0x00, 0);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_SLOT_NUMBER);
      expect(result.error?.message).toContain("must be 1-12");
    });

    it("should reject invalid slot number (13)", () => {
      const result = parser.buildUnlockPacket(0x00, 13);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_SLOT_NUMBER);
      expect(result.error?.message).toContain("must be 1-12");
    });

    it("should reject invalid address", () => {
      const result = parser.buildUnlockPacket(0x11, 1);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_CONFIGURATION);
      expect(result.error?.message).toContain("Invalid DS12 address");
    });
  });

  describe("buildVersionRequestPacket", () => {
    it("should build valid version request packet", () => {
      const result = parser.buildVersionRequestPacket(0x00);
      
      expect(result.success).toBe(true);
      // Example from CU12.txt: 02 00 00 8F 00 00 03 94
      expect(result.data).toEqual([0x02, 0x00, 0x00, 0x8F, 0x00, 0x00, 0x03, 0x94]);
    });

    it("should build valid version request for different address", () => {
      const result = parser.buildVersionRequestPacket(0x01);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([0x02, 0x01, 0x00, 0x8F, 0x00, 0x00, 0x03, 0x95]);
    });

    it("should reject invalid address", () => {
      const result = parser.buildVersionRequestPacket(0x11);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_CONFIGURATION);
      expect(result.error?.message).toContain("Invalid DS12 address");
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle malformed packet parsing gracefully", () => {
      // Completely malformed packet
      const malformedPacket = [0xFF, 0xFF, 0xFF];
      
      const result = parser.parseStatusResponse(malformedPacket);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should handle empty packet array", () => {
      const emptyPacket: number[] = [];
      
      const result = parser.validatePacketStructure(emptyPacket);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
      expect(result.error?.message).toContain("packet too short");
    });

    it("should handle packet with all zeros", () => {
      const zeroPacket = new Array(10).fill(0);
      
      const result = parser.validatePacketStructure(zeroPacket);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.INVALID_RESPONSE);
    });
  });

  describe("Integration with main parseSlotStates method", () => {
    it("should parse slot states through main entry point", async () => {
      // Valid status response from CU12.txt
      const statusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x02, 0x00];
      
      const result = await parser.parseSlotStates(statusResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(12);
      expect(result.data?.[1]).toBe(true); // Slot 2 unlocked
      expect(result.deviceType).toBe(DeviceType.DS12);
    });

    it("should handle unsupported command through main entry point", async () => {
      // Use version command (not supported for slot state parsing)
      const versionResponse = [0x02, 0x00, 0x00, 0x8F, 0x10, 0x02, 0x03, 0xC8, 0x10, 0x12];
      
      const result = await parser.parseSlotStates(versionResponse);
      
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ProtocolErrorCode.UNSUPPORTED_COMMAND);
      expect(result.error?.message).toContain("Unsupported DS12 command");
    });

    it("should handle invalid packet through main entry point", async () => {
      const invalidPacket = [0x01]; // Too short and wrong STX
      
      const result = await parser.parseSlotStates(invalidPacket);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deviceType).toBe(DeviceType.DS12);
    });
  });
});

/**
 * Additional Test Notes:
 * 
 * REAL HARDWARE TESTING:
 * These tests use documented examples from CU12.txt
 * For production deployment, additional tests with actual hardware responses are recommended
 * 
 * PERFORMANCE TESTING:
 * Consider adding performance tests for parsing large amounts of status data
 * Test memory usage with repeated parsing operations
 * 
 * SECURITY TESTING:
 * Add tests for buffer overflow scenarios
 * Test with malicious packet data
 * Validate that parser doesn't crash on unexpected input
 * 
 * INTEGRATION TESTING:
 * Test parser integration with actual DS12Controller class
 * Test with real serial communication data
 * Validate end-to-end data flow from hardware to UI
 * 
 * MULTI-PROTOCOL TESTING STRATEGY FOR PHASE 2:
 * 
 * 1. SHARED TEST UTILITIES:
 *    - Create BaseProtocolParserTest.ts with common test patterns
 *    - Implement protocol-agnostic validation test helpers
 *    - Build packet generation utilities for both DS12/DS16
 * 
 * 2. DS16 SPECIFIC TEST REQUIREMENTS:
 *    - Test 4-byte slot state parsing (data1-data4 fields)  
 *    - Validate 16-slot bit manipulation accuracy
 *    - Test DS16 command range (0x30-0x3F) validation
 *    - Mock DS16 hardware responses without actual device
 * 
 * 3. FACTORY PATTERN TESTING:
 *    - Test ProtocolFactory.createParser() for both device types
 *    - Validate runtime protocol selection logic
 *    - Test error handling when wrong parser used for device
 * 
 * 4. INTEGRATION TESTING:
 *    - Test KuControllerBase with both DS12/DS16 parsers
 *    - Validate IPC message handling for multi-protocol
 *    - Test graceful degradation when one protocol fails
 * 
 * 5. COVERAGE TARGETS:
 *    - Individual parsers: 95%+ line coverage
 *    - Factory pattern: 90%+ branch coverage  
 *    - Integration tests: 85%+ end-to-end scenarios
 *    - Error paths: 100% error condition coverage
 */