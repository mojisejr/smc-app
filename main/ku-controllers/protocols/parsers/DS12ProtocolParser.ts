import {
  DeviceType,
  CommandType,
  ProtocolPacket,
  DS12Packet,
  ProtocolResponse,
  ProtocolError,
  ProtocolErrorCode,
} from "../interfaces/ProtocolTypes";
import {
  BinaryOperationResult,
  hexToDecimal,
  calculateChecksum,
  extractAllSlotStates,
  validatePacketStructure,
} from "../utils/BinaryUtils";

/**
 * DS12 Protocol Parser Implementation
 *
 * Based on CU12 Communication Protocol Documentation v1.1
 * Handles parsing and validation for DS12 (12-slot) hardware devices
 *
 * PROTOCOL SPECIFICATIONS:
 * - Hardware: DS12 (12 slots)
 * - Protocol: CU12 compatible
 * - Commands: 0x80-0x8F range
 * - Baud Rate: 19200 (default)
 * - Data Format: Big-endian
 *
 * PACKET STRUCTURE:
 * STX(1) + ADDR(1) + LOCKNUM(1) + CMD(1) + ASK(1) + DATALEN(1) + ETX(1) + SUM(1) + DATA(DATALEN)
 *
 * SLOT STATE DATA:
 * - HookStateDatas[2]: 12 slots encoded in 2 bytes
 * - Byte 1: Slots 1-8 (bits 0-7)
 * - Byte 2: Slots 9-12 (bits 0-3, bits 4-7 unused)
 *
 * QUALITY STANDARDS FOR SAFE REFACTORING:
 *
 * CODE ANALYSIS APPROACH:
 * ✅ STATIC ANALYSIS ONLY: Review code structure without modifications
 * ✅ DEPENDENCY MAPPING: Identify all components that use this parser
 * ✅ RISK ASSESSMENT: Evaluate impact of changes on medical device safety
 * ✅ INCREMENTAL VALIDATION: Test each small change independently
 * ✅ ROLLBACK PREPARATION: Always have working version to revert to
 *
 * REFACTORING SAFETY CHECKLIST:
 * ✅ Never change core parsing logic without comprehensive tests
 * ✅ Preserve all existing public method signatures during refactoring
 * ✅ Add extensive logging for medical device audit compliance
 * ✅ Validate checksum and packet integrity with same precision
 * ✅ Maintain identical error handling patterns across protocols
 *
 * QUALITY METRICS TO PRESERVE:
 * - Test Coverage: Maintain >95% for protocol parsing methods
 * - Response Time: Keep packet parsing <1ms (critical for real-time ops)
 * - Memory Usage: Stay under 100KB per parser instance
 * - Error Detection: 100% coverage of malformed packet scenarios
 * - Medical Compliance: All operations must be auditable and traceable
 *
 * SAFE DS16 IMPLEMENTATION STANDARDS:
 * - Follow same ProtocolResponse<T> pattern for consistent error handling
 * - Implement identical validation depth as DS12 (checksum, length, structure)
 * - Use abstract base class to share common validation logic
 * - Maintain medical device compliance with audit logging
 * - Preserve bit manipulation precision for DS16's 4-byte slot data
 */

/**MY OP: protocol parser ก็คือ ตัวที่จะทำหน้าที่ สร้าง และ แปลง command โดยที่ ระบบ input ข้อมูลที่ง่ายขึ้น เช่น ถ้าจะ unlock slot 2 ถ้าจะส่งคำสั่งก็ใช้ parser นี่แหละในการข่วยสร้าง คำสั่งให้กับ module ที่จะเป็นคนยิง คำสั่งอย่าง node-serial-port
 * และก็​ parse slot state จากข้อมูลตัวเลขไปเป็น array ที่บอกว่า แต่ละช่องปิด หรือเปิดอยู่ด้วย array
 */

// CODE REVIEW CHECKLIST FOR DS16 PROTOCOL PARSER:
//
// ✅ INTERFACE DESIGN:
// - Does IDS16ProtocolParser extend IBaseProtocolParser?
// - Are all method signatures consistent with DS12 patterns?
// - Does it use ProtocolResponse<T> for all return types?
// - Are TypeScript generics used appropriately?
//
// ✅ ERROR HANDLING:
// - All methods return ProtocolResponse<T> with success/error
// - Error messages include context (device type, operation)
// - Error codes use ProtocolErrorCode enum consistently
// - No thrown exceptions - all errors handled gracefully
//
// ✅ VALIDATION:
// - Packet structure validation before parsing
// - Checksum verification on all incoming packets
// - Address range validation (0x00-0x10)
// - Slot number validation (1-16 for DS16)
// - Command type validation per device
//
// ✅ BIT MANIPULATION:
// - Correct slot state extraction from 4-byte data
// - Proper bit shifting and masking operations
// - Clear comments explaining bit layout
// - No magic numbers - use named constants
//
// ✅ MEDICAL DEVICE COMPLIANCE:
// - Audit logging for all operations
// - Data integrity verification
// - Consistent timestamp generation
// - Device type tracking in all responses

export interface IDS12ProtocolParser {
  parseSlotStates(binArr: number[]): Promise<ProtocolResponse<boolean[]>>;
  validatePacketStructure(packet: number[]): ProtocolResponse<boolean>;
  parseStatusResponse(responseData: number[]): ProtocolResponse<boolean[]>;
  parseUnlockResponse(responseData: number[]): ProtocolResponse<boolean>;
  parseVersionResponse(
    responseData: number[]
  ): ProtocolResponse<{ softwareVersion: string; hardwareVersion: string }>;
  buildStatusRequestPacket(address: number): ProtocolResponse<number[]>;
  buildUnlockPacket(
    address: number,
    slotNumber: number
  ): ProtocolResponse<number[]>;
  buildVersionRequestPacket(address: number): ProtocolResponse<number[]>;
}

export class DS12ProtocolParser implements IDS12ProtocolParser {
  private static readonly DEVICE_TYPE = DeviceType.DS12;
  private static readonly MAX_SLOTS = 12;

  // Protocol constants from CU12 documentation
  private static readonly STX = 0x02;
  private static readonly ETX = 0x03;
  private static readonly ASK_DEFAULT = 0x00;
  private static readonly ASK_SUCCESS = 0x10;
  private static readonly ASK_FAILED = 0x11;
  private static readonly ASK_TIMEOUT = 0x12;
  private static readonly ASK_UNKNOWN_COMMAND = 0x13;
  private static readonly ASK_DATA_VERIFICATION_FAILED = 0x14;

  // SAFE REFACTORING STRATEGY: Move to BaseProtocolParser abstract class
  // ANALYSIS: These constants are candidates for shared base class:
  // ✅ STX/ETX markers (0x02/0x03) - SAFE: Universal protocol constants
  // ✅ ASK status codes (0x10-0x14 range) - SAFE: Same across DS12/DS16
  // ✅ Basic packet validation logic - MEDIUM RISK: Validate same behavior
  // ✅ Checksum calculation method - HIGH RISK: Critical for data integrity
  // ✅ Error message formatting patterns - SAFE: UI consistency improvement
  //
  // REFACTORING VALIDATION REQUIRED:
  // - Run full test suite after each constant extraction
  // - Validate checksum calculation produces identical results
  // - Test error handling with same precision as current implementation
  // - Verify medical device audit logging maintains same detail level

  /**
   * Main entry point for parsing DS12 slot states from binary data
   * @param binArr - Binary array from hardware response
   * @returns Promise with boolean array representing slot states
   */
  async parseSlotStates(
    binArr: number[]
  ): Promise<ProtocolResponse<boolean[]>> {
    try {
      // Validate basic packet structure
      const structureValidation = this.validatePacketStructure(binArr);
      if (!structureValidation.success) {
        return {
          success: false,
          error: structureValidation.error,
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // Extract command type to determine parsing strategy
      const command = binArr[3]; // CMD position in packet

      switch (command) {
        case CommandType.DS12_STATUS_REQUEST:
          return this.parseStatusResponse(binArr);

        default:
          return {
            success: false,
            error: {
              code: ProtocolErrorCode.UNSUPPORTED_COMMAND,
              message: `Unsupported DS12 command for slot state parsing: 0x${command.toString(
                16
              )}`,
            },
            deviceType: DeviceType.DS12,
            timestamp: Date.now(),
          };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 slot state parsing failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Validates DS12 packet structure according to CU12 protocol
   * @param packet - Raw packet data
   * @returns Validation result with error details
   */
  validatePacketStructure(packet: number[]): ProtocolResponse<boolean> {
    // Minimum packet length check (8 bytes minimum per protocol)
    if (packet.length < 8) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 packet too short: ${packet.length} bytes (minimum 8 required)`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Maximum packet length check (48 bytes maximum per protocol)
    if (packet.length > 48) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 packet too long: ${packet.length} bytes (maximum 48 allowed)`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Validate STX (Start of Text)
    if (packet[0] !== DS12ProtocolParser.STX) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `Invalid STX: expected 0x${DS12ProtocolParser.STX.toString(
            16
          )}, got 0x${packet[0].toString(16)}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Validate ADDR (Address) - should be 0x00-0x10 per protocol
    const address = packet[1];
    if (address < 0x00 || address > 0x10) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `Invalid DS12 address: 0x${address.toString(
            16
          )} (must be 0x00-0x10)`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Validate DATALEN and ETX position
    const dataLength = packet[5];
    const expectedETXPosition = 6;

    if (packet[expectedETXPosition] !== DS12ProtocolParser.ETX) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `Invalid ETX position: expected 0x${DS12ProtocolParser.ETX.toString(
            16
          )} at position ${expectedETXPosition}, got 0x${packet[
            expectedETXPosition
          ].toString(16)}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Validate packet length matches DATALEN
    const expectedPacketLength = 8 + dataLength;
    if (packet.length !== expectedPacketLength) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `Packet length mismatch: DATALEN=${dataLength} indicates ${expectedPacketLength} bytes, but got ${packet.length} bytes`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }

    // Validate checksum
    const checksumValidation = this.validateChecksum(packet);
    if (!checksumValidation.success) {
      return checksumValidation;
    }

    return {
      success: true,
      data: true,
      deviceType: DeviceType.DS12,
      timestamp: Date.now(),
    };
  }

  /**
   * Parse DS12 status response containing slot states
   * Example response: 02 00 00 80 10 02 03 99 02 00
   * HookStateDatas[2] = [0x02, 0x00] = slots state data
   */
  parseStatusResponse(responseData: number[]): ProtocolResponse<boolean[]> {
    try {
      // Validate this is a status response
      const command = responseData[3];
      if (command !== CommandType.DS12_STATUS_REQUEST) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_RESPONSE,
            message: `Expected DS12_STATUS_REQUEST (0x${CommandType.DS12_STATUS_REQUEST.toString(
              16
            )}), got 0x${command.toString(16)}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // Check ASK (response status)
      const askStatus = responseData[4];
      if (askStatus !== DS12ProtocolParser.ASK_SUCCESS) {
        const errorMessage = this.getErrorMessageFromAskStatus(askStatus);
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.DEVICE_BUSY,
            message: `DS12 status request failed: ${errorMessage} (ASK=0x${askStatus.toString(
              16
            )})`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // Validate DATALEN for status response (should be 2 for HookStateDatas[2])
      const dataLength = responseData[5];
      if (dataLength !== 2) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_RESPONSE,
            message: `DS12 status response DATALEN should be 2, got ${dataLength}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // Extract HookStateDatas[2] from DATA section
      const hookStateData1 = responseData[8]; // First byte of slot states (slots 1-8)
      const hookStateData2 = responseData[9]; // Second byte of slot states (slots 9-12)

      // Use BinaryUtils to extract slot states
      const extractionResult = extractAllSlotStates(DeviceType.DS12, [
        hookStateData1,
        hookStateData2,
      ]);

      if (!extractionResult.success) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_RESPONSE,
            message: `DS12 slot state extraction failed: ${extractionResult.error}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data: extractionResult.data!,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 status response parsing failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Parse DS12 unlock response
   * Example response: 02 00 02 81 10 00 03 98
   */
  parseUnlockResponse(responseData: number[]): ProtocolResponse<boolean> {
    try {
      const command = responseData[3];
      if (command !== CommandType.DS12_UNLOCK_SLOT) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_RESPONSE,
            message: `Expected DS12_UNLOCK_SLOT (0x${CommandType.DS12_UNLOCK_SLOT.toString(
              16
            )}), got 0x${command.toString(16)}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      const askStatus = responseData[4];
      const unlockSuccess = askStatus === DS12ProtocolParser.ASK_SUCCESS;

      if (!unlockSuccess) {
        const errorMessage = this.getErrorMessageFromAskStatus(askStatus);
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.DEVICE_BUSY,
            message: `DS12 unlock failed: ${errorMessage} (ASK=0x${askStatus.toString(
              16
            )})`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data: unlockSuccess,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 unlock response parsing failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Parse DS12 version response
   * Example response: 02 00 00 8F 10 02 03 C8 10 12
   * Version data: [0x10, 0x12] = software v1.0, hardware v1.2
   */
  parseVersionResponse(
    responseData: number[]
  ): ProtocolResponse<{ softwareVersion: string; hardwareVersion: string }> {
    try {
      const command = responseData[3];
      if (command !== CommandType.DS12_GET_VERSION) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_RESPONSE,
            message: `Expected DS12_GET_VERSION (0x${CommandType.DS12_GET_VERSION.toString(
              16
            )}), got 0x${command.toString(16)}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      const askStatus = responseData[4];
      if (askStatus !== DS12ProtocolParser.ASK_SUCCESS) {
        const errorMessage = this.getErrorMessageFromAskStatus(askStatus);
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.DEVICE_BUSY,
            message: `DS12 version request failed: ${errorMessage} (ASK=0x${askStatus.toString(
              16
            )})`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // Extract version data
      const softwareVersionByte = responseData[8];
      const hardwareVersionByte = responseData[9];

      // Convert version bytes to readable format (e.g., 0x10 = "1.0")
      const softwareVersion = `${(softwareVersionByte >> 4) & 0x0f}.${
        softwareVersionByte & 0x0f
      }`;
      const hardwareVersion = `${(hardwareVersionByte >> 4) & 0x0f}.${
        hardwareVersionByte & 0x0f
      }`;

      return {
        success: true,
        data: {
          softwareVersion,
          hardwareVersion,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_RESPONSE,
          message: `DS12 version response parsing failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Build DS12 status request packet
   * Format: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM
   * Example: 02 00 00 80 00 00 03 85
   */
  buildStatusRequestPacket(address: number = 0x00): ProtocolResponse<number[]> {
    try {
      if (address < 0x00 || address > 0x10) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `Invalid DS12 address: 0x${address.toString(
              16
            )} (must be 0x00-0x10)`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      const packet: number[] = [
        DS12ProtocolParser.STX, // STX = 0x02
        address, // ADDR
        0x00, // LOCKNUM (0x00 for status of all slots)
        CommandType.DS12_STATUS_REQUEST, // CMD = 0x80
        DS12ProtocolParser.ASK_DEFAULT, // ASK = 0x00
        0x00, // DATALEN = 0 (no data for request)
        DS12ProtocolParser.ETX, // ETX = 0x03
      ];

      // CHECKSUM CALCULATION: Ensures data integrity during transmission
      // RS485 can have electrical interference, checksum detects corruption
      //
      // PERFORMANCE BENCHMARKS FOR PHASE 2:
      // - Packet building: <1ms for single packet (target: <0.5ms)
      // - Slot state parsing: <2ms for 16-slot DS16 data (target: <1ms)
      // - Memory usage: <100KB heap per parser instance
      // - Factory creation: <0.1ms per parser instantiation
      // - Error handling: No performance degradation in happy path
      const checksumResult = calculateChecksum(packet);
      if (!checksumResult.success) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `DS12 status packet checksum calculation failed: ${checksumResult.error}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      packet.push(checksumResult.data! & 0xff); // SUM (low byte of checksum)

      return {
        success: true,
        data: packet,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_CONFIGURATION,
          message: `DS12 status packet building failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Build DS12 unlock packet
   * Format: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM
   * Example: 02 00 02 81 00 00 03 88 (unlock slot 3)
   */
  buildUnlockPacket(
    address: number = 0x00,
    slotNumber: number
  ): ProtocolResponse<number[]> {
    try {
      if (address < 0x00 || address > 0x10) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `Invalid DS12 address: 0x${address.toString(
              16
            )} (must be 0x00-0x10)`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      if (slotNumber < 1 || slotNumber > 12) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_SLOT_NUMBER,
            message: `Invalid DS12 slot number: ${slotNumber} (must be 1-12)`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      // INDEX CONVERSION: User sees "slot 2", protocol uses "LOCKNUM 1"
      // This is a common source of off-by-one errors in protocol implementation
      // LEARNING POINT: Always be explicit about 0-based vs 1-based indexing
      //
      // CRITICAL FOR DS16: Slot numbers 1-16 map to LOCKNUM 0-15
      // DS16 has 16 slots vs DS12's 12 slots - validate range carefully
      const lockNum = slotNumber - 1;

      const packet: number[] = [
        DS12ProtocolParser.STX, // STX = 0x02
        address, // ADDR
        lockNum, // LOCKNUM (0x00-0x0B for slots 1-12)
        CommandType.DS12_UNLOCK_SLOT, // CMD = 0x81
        DS12ProtocolParser.ASK_DEFAULT, // ASK = 0x00
        0x00, // DATALEN = 0 (no data for unlock)
        DS12ProtocolParser.ETX, // ETX = 0x03
      ];

      // Calculate and append checksum
      const checksumResult = calculateChecksum(packet);
      if (!checksumResult.success) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `DS12 unlock packet checksum calculation failed: ${checksumResult.error}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      packet.push(checksumResult.data! & 0xff); // SUM (low byte of checksum)

      return {
        success: true,
        data: packet,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_CONFIGURATION,
          message: `DS12 unlock packet building failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Build DS12 version request packet
   * Format: STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM
   * Example: 02 00 00 8F 00 00 03 94
   */
  buildVersionRequestPacket(
    address: number = 0x00
  ): ProtocolResponse<number[]> {
    try {
      if (address < 0x00 || address > 0x10) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `Invalid DS12 address: 0x${address.toString(
              16
            )} (must be 0x00-0x10)`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      const packet: number[] = [
        DS12ProtocolParser.STX, // STX = 0x02
        address, // ADDR
        0x00, // LOCKNUM (not used for version request)
        CommandType.DS12_GET_VERSION, // CMD = 0x8F
        DS12ProtocolParser.ASK_DEFAULT, // ASK = 0x00
        0x00, // DATALEN = 0 (no data for request)
        DS12ProtocolParser.ETX, // ETX = 0x03
      ];

      // Calculate and append checksum
      const checksumResult = calculateChecksum(packet);
      if (!checksumResult.success) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.INVALID_CONFIGURATION,
            message: `DS12 version packet checksum calculation failed: ${checksumResult.error}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      packet.push(checksumResult.data! & 0xff); // SUM (low byte of checksum)

      return {
        success: true,
        data: packet,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.INVALID_CONFIGURATION,
          message: `DS12 version packet building failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  // Private helper methods

  /**
   * Validate packet checksum according to CU12 protocol
   * Checksum = low byte of (STX+ADDR+LOCKNUM+CMD+ASK+DATALEN+ETX+DATA)
   *
   * CRITICAL REFACTORING TARGET: Extract to BaseProtocolParser.validateChecksum()
   *
   * SAFETY ANALYSIS:
   * ⚠️  HIGH RISK: Checksum validation is critical for medical device safety
   * ⚠️  DATA INTEGRITY: Ensures hardware communication reliability in noisy RS485 environment
   * ⚠️  REGULATORY: Required for FDA/CE compliance - any change needs full validation
   *
   * REFACTORING APPROACH:
   * 1. Create comprehensive unit tests for current checksum logic FIRST
   * 2. Extract to BaseProtocolParser with identical behavior
   * 3. Add regression tests comparing old vs new implementation
   * 4. Validate with real hardware using known good/bad packets
   * 5. Document any edge cases or protocol-specific requirements
   *
   * VALIDATION CHECKLIST:
   * ✅ Same checksum results for 1000+ test packets
   * ✅ Identical error detection for malformed packets
   * ✅ Performance testing: <1ms validation time
   * ✅ Medical audit logging preserved
   * ✅ Rollback plan ready if issues found
   */
  private validateChecksum(packet: number[]): ProtocolResponse<boolean> {
    try {
      // Extract expected checksum (SUM byte)
      const expectedChecksum = packet[7];

      // Calculate actual checksum (exclude the SUM byte itself)
      const dataForChecksum = packet.slice(0, 7).concat(packet.slice(8));
      const checksumResult = calculateChecksum(dataForChecksum);

      if (!checksumResult.success) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.DATA_VERIFICATION_FAILURE,
            message: `DS12 checksum calculation failed: ${checksumResult.error}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      const actualChecksum = checksumResult.data! & 0xff;

      if (actualChecksum !== expectedChecksum) {
        return {
          success: false,
          error: {
            code: ProtocolErrorCode.DATA_VERIFICATION_FAILURE,
            message: `DS12 checksum mismatch: expected 0x${expectedChecksum.toString(
              16
            )}, calculated 0x${actualChecksum.toString(16)}`,
          },
          deviceType: DeviceType.DS12,
          timestamp: Date.now(),
        };
      }

      return {
        success: true,
        data: true,
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ProtocolErrorCode.DATA_VERIFICATION_FAILURE,
          message: `DS12 checksum validation failed: ${error}`,
        },
        deviceType: DeviceType.DS12,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * ERROR CODE TRANSLATION: Convert binary protocol codes to meaningful messages
   *
   * LEARNING POINT: Good protocol parsers provide human-readable error messages
   * This helps with debugging, logging, and user interface display
   * Medical device software must provide clear error communication
   *
   * ANTI-PATTERNS TO AVOID IN DS16 IMPLEMENTATION:
   * ❌ Copy-paste this entire method - create shared base class instead
   * ❌ Hardcode ASK status values - use constants like DS12ProtocolParser
   * ❌ Different error message formats - maintain consistency across protocols
   * ❌ Skip error code mapping - always provide meaningful messages
   * ❌ Duplicate validation logic - extract to shared utility functions
   */
  private getErrorMessageFromAskStatus(askStatus: number): string {
    switch (askStatus) {
      case DS12ProtocolParser.ASK_SUCCESS:
        return "Operation successful";
      case DS12ProtocolParser.ASK_FAILED:
        return "Operation failed";
      case DS12ProtocolParser.ASK_TIMEOUT:
        return "Operation timeout";
      case DS12ProtocolParser.ASK_UNKNOWN_COMMAND:
        return "Unknown command";
      case DS12ProtocolParser.ASK_DATA_VERIFICATION_FAILED:
        return "Data verification failed";
      default:
        return `Unknown ASK status: 0x${askStatus.toString(16)}`;
    }
  }
}
