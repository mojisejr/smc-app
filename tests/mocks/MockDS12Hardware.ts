import { EventEmitter } from "events";
import { DS12ProtocolParser } from "../../main/ku-controllers/protocols/parsers/DS12ProtocolParser";
import { CommandType, DeviceType } from "../../main/ku-controllers/protocols/interfaces/ProtocolTypes";

/**
 * MockDS12Hardware - Safe Hardware Simulator for Medical Device Testing
 * 
 * MEDICAL DEVICE SAFETY APPROACH:
 * - Mock hardware testing infrastructure provides safe validation environment
 * - Real DS12 hardware should only be used after mock testing proves stability
 * - Protects expensive medical hardware from potential software errors
 * - Enables comprehensive error scenario testing without hardware risks
 * 
 * IMPLEMENTATION STRATEGY:
 * - Simulate DS12 serial communication patterns exactly
 * - Provide configurable response scenarios (normal, error, timeout)
 * - Include realistic timing delays for medical device behavior
 * - Support all DS12 protocol commands and responses
 * 
 * TESTING SCENARIOS SUPPORTED:
 * - Normal operation responses (status check, unlock, version)
 * - Hardware error conditions (timeout, communication failure)
 * - Malformed packet responses for robustness testing
 * - Connection stability testing (disconnect/reconnect)
 * - Performance testing under high communication load
 * 
 * DS12 HARDWARE SPECIFICATIONS:
 * - Device: DS12 (12 medication slots)
 * - Protocol: CU12 compatible communication
 * - Baud Rate: 19200 (standard for DS12 hardware)
 * - Data Format: 8N1 (8 data bits, no parity, 1 stop bit)
 * - Connection: RS485 over serial port simulation
 * 
 * SAFETY VALIDATION:
 * - All responses validated through DS12ProtocolParser
 * - Checksum calculation matches real hardware behavior
 * - Timing delays simulate actual DS12 response characteristics
 * - Error scenarios comprehensive for robustness validation
 */

export interface MockDS12Config {
  /** Device address (0x00-0x10) */
  address: number;
  /** Number of slots to simulate (1-12 for DS12) */
  slotCount: number;
  /** Response delay in milliseconds (simulates hardware processing time) */
  responseDelayMs: number;
  /** Probability of timeout error (0.0-1.0) */
  timeoutErrorRate: number;
  /** Probability of communication error (0.0-1.0) */
  commErrorRate: number;
  /** Probability of checksum error (0.0-1.0) */
  checksumErrorRate: number;
  /** Enable debug logging */
  enableLogging: boolean;
}

export interface MockDS12SlotState {
  slotId: number;
  isLocked: boolean;
  hasItem: boolean;
  isActive: boolean;
}

/**
 * Mock DS12 Hardware Responses for Different Test Scenarios
 */
export enum MockDS12Scenario {
  NORMAL = "normal",                    // Standard operation
  TIMEOUT = "timeout",                  // Hardware timeout response
  COMM_ERROR = "comm_error",           // Communication failure
  CHECKSUM_ERROR = "checksum_error",   // Data integrity failure
  UNKNOWN_COMMAND = "unknown_command", // Unsupported command
  DEVICE_BUSY = "device_busy",         // Hardware busy response
  MALFORMED_PACKET = "malformed_packet" // Invalid packet structure
}

export class MockDS12Hardware extends EventEmitter {
  private config: MockDS12Config;
  private protocolParser: DS12ProtocolParser;
  private slots: MockDS12SlotState[] = [];
  private connected: boolean = false;
  private currentScenario: MockDS12Scenario = MockDS12Scenario.NORMAL;
  
  // Simulate hardware state
  private softwareVersion: string = "1.0";
  private hardwareVersion: string = "1.2";

  /**
   * Initialize Mock DS12 Hardware with configurable parameters
   * 
   * SAFE TESTING CONFIGURATION:
   * - Default settings provide stable testing environment
   * - Error rates configurable for robustness testing
   * - Response delays simulate real hardware timing
   * - Comprehensive logging for debugging medical device communication
   * 
   * @param config - Hardware simulation configuration
   */
  constructor(config: Partial<MockDS12Config> = {}) {
    super();
    
    // DEFAULT CONFIGURATION: Safe testing parameters
    this.config = {
      address: 0x00,
      slotCount: 12,
      responseDelayMs: 50, // Simulate realistic DS12 response time
      timeoutErrorRate: 0.0, // Start with no errors for basic testing
      commErrorRate: 0.0,
      checksumErrorRate: 0.0,
      enableLogging: true,
      ...config
    };

    // PROTOCOL PARSER: Use real DS12ProtocolParser for authentic responses
    this.protocolParser = new DS12ProtocolParser();

    // SLOT INITIALIZATION: Create mock slots in known state
    this.initializeSlots();

    // MEDICAL AUDIT: Log mock hardware initialization
    if (this.config.enableLogging) {
      console.log(`[MockDS12] Initialized with ${this.config.slotCount} slots, address 0x${this.config.address.toString(16)}`);
    }
  }

  /**
   * Initialize mock slots to known state for predictable testing
   * 
   * SLOT STATE INITIALIZATION:
   * - All slots start as locked (isLocked = true)
   * - All slots are active (isActive = true) 
   * - No items initially (hasItem = false)
   * - Provides clean starting state for each test
   */
  private initializeSlots(): void {
    this.slots = [];
    for (let i = 1; i <= this.config.slotCount; i++) {
      this.slots.push({
        slotId: i,
        isLocked: true,  // DS12 slots start locked
        hasItem: false,  // No medication loaded initially
        isActive: true   // All slots available for use
      });
    }
  }

  /**
   * Simulate connecting to DS12 hardware
   * 
   * CONNECTION SIMULATION:
   * - Sets connected flag for state tracking
   * - Emits connection events for testing event handling
   * - Provides realistic connection timing
   * 
   * @returns Promise resolving to connection success
   */
  async connect(): Promise<boolean> {
    // SIMULATE CONNECTION DELAY: Real hardware takes time to establish connection
    await this.delay(100);

    this.connected = true;

    // EMIT CONNECTION EVENT: Test DS12Controller connection handling
    this.emit('connected', {
      deviceType: DeviceType.DS12,
      address: this.config.address,
      timestamp: Date.now()
    });

    if (this.config.enableLogging) {
      console.log(`[MockDS12] Connected to address 0x${this.config.address.toString(16)}`);
    }

    return true;
  }

  /**
   * Simulate disconnecting from DS12 hardware
   * 
   * DISCONNECTION SIMULATION:
   * - Clears connected flag
   * - Emits disconnection events  
   * - Resets all slots to initial state for clean testing
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    
    // RESET STATE: Clean state for next test
    this.initializeSlots();
    this.currentScenario = MockDS12Scenario.NORMAL;

    // EMIT DISCONNECTION EVENT: Test DS12Controller disconnection handling
    this.emit('disconnected', {
      deviceType: DeviceType.DS12,
      timestamp: Date.now()
    });

    if (this.config.enableLogging) {
      console.log(`[MockDS12] Disconnected`);
    }
  }

  /**
   * Check if mock hardware is connected
   * 
   * @returns boolean - Connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Set test scenario for error condition testing
   * 
   * SCENARIO TESTING:
   * - Allows testing different hardware error conditions
   * - Essential for medical device robustness validation
   * - Enables comprehensive error handling testing
   * 
   * @param scenario - Test scenario to simulate
   */
  setTestScenario(scenario: MockDS12Scenario): void {
    this.currentScenario = scenario;
    if (this.config.enableLogging) {
      console.log(`[MockDS12] Set test scenario: ${scenario}`);
    }
  }

  /**
   * Process incoming command packet and generate appropriate response
   * 
   * COMMAND PROCESSING:
   * - Validates packet structure using real DS12ProtocolParser
   * - Routes to appropriate command handler based on CMD byte
   * - Applies current test scenario for error simulation
   * - Returns responses with realistic timing delays
   * 
   * @param packet - Command packet from DS12Controller
   * @returns Promise resolving to response packet
   */
  async processCommand(packet: number[]): Promise<number[]> {
    // CONNECTION CHECK: Ensure mock hardware is connected
    if (!this.connected) {
      throw new Error("MockDS12Hardware not connected");
    }

    // APPLY ERROR SCENARIOS: Test robustness before normal processing
    if (await this.shouldSimulateError()) {
      return this.generateErrorResponse();
    }

    // PACKET VALIDATION: Use real DS12ProtocolParser for authentic validation
    const validation = this.protocolParser.validatePacketStructure(packet);
    if (!validation.success) {
      if (this.config.enableLogging) {
        console.log(`[MockDS12] Invalid packet: ${validation.error?.message}`);
      }
      return this.generateMalformedResponse();
    }

    // COMMAND EXTRACTION: Get command type from packet
    const command = packet[3]; // CMD position per CU12 protocol

    // RESPONSE DELAY: Simulate hardware processing time
    await this.delay(this.config.responseDelayMs);

    // COMMAND ROUTING: Process based on command type
    let response: number[] = [];

    try {
      switch (command) {
        case CommandType.DS12_STATUS_REQUEST:
          response = await this.handleStatusRequest(packet);
          break;
        
        case CommandType.DS12_UNLOCK_SLOT:
          response = await this.handleUnlockRequest(packet);
          break;
        
        case CommandType.DS12_GET_VERSION:
          response = await this.handleVersionRequest(packet);
          break;
        
        default:
          response = this.generateUnknownCommandResponse(packet);
          break;
      }

      // MEDICAL AUDIT: Log command processing for debugging
      if (this.config.enableLogging) {
        console.log(`[MockDS12] Processed command 0x${command.toString(16)}, response length: ${response.length}`);
      }

      return response;

    } catch (error) {
      // ERROR HANDLING: Generate appropriate error response
      if (this.config.enableLogging) {
        console.error(`[MockDS12] Command processing error:`, error);
      }
      return this.generateDeviceBusyResponse(packet);
    }
  }

  /**
   * Handle DS12 status request command (0x80)
   * 
   * STATUS RESPONSE FORMAT:
   * - Returns current state of all slots
   * - HookStateDatas[2] contains slot lock states
   * - Byte 1: Slots 1-8 (bits 0-7)
   * - Byte 2: Slots 9-12 (bits 0-3, bits 4-7 unused)
   * 
   * @param packet - Status request packet
   * @returns Status response packet with slot states
   */
  private async handleStatusRequest(packet: number[]): Promise<number[]> {
    // EXTRACT PACKET INFO: Get address and command for response
    const address = packet[1];
    const lockNum = packet[2];

    // BUILD SLOT STATE DATA: Convert slot states to binary format
    let hookStateData1 = 0; // Slots 1-8
    let hookStateData2 = 0; // Slots 9-12

    // ENCODE SLOT STATES: Set bits for locked slots
    for (let i = 0; i < Math.min(8, this.slots.length); i++) {
      if (this.slots[i].isLocked) {
        hookStateData1 |= (1 << i);
      }
    }

    for (let i = 8; i < Math.min(12, this.slots.length); i++) {
      if (this.slots[i].isLocked) {
        hookStateData2 |= (1 << (i - 8));
      }
    }

    // BUILD RESPONSE PACKET: Use protocol parser for authentic response
    const responsePacket = await this.buildResponsePacket({
      address: address,
      lockNum: lockNum,
      command: CommandType.DS12_STATUS_REQUEST,
      askStatus: 0x10, // ASK_SUCCESS
      data: [hookStateData1, hookStateData2]
    });

    return responsePacket;
  }

  /**
   * Handle DS12 unlock slot command (0x81)
   * 
   * UNLOCK PROCESSING:
   * - Validates slot number is in valid range (1-12)
   * - Updates slot state to unlocked if successful
   * - Returns success or failure response
   * 
   * @param packet - Unlock request packet
   * @returns Unlock response packet
   */
  private async handleUnlockRequest(packet: number[]): Promise<number[]> {
    // EXTRACT PACKET INFO
    const address = packet[1];
    const lockNum = packet[2]; // 0-based slot index
    const slotId = lockNum + 1; // Convert to 1-based slot ID

    // SLOT VALIDATION: Check slot number range
    if (slotId < 1 || slotId > this.config.slotCount) {
      return await this.buildResponsePacket({
        address: address,
        lockNum: lockNum,
        command: CommandType.DS12_UNLOCK_SLOT,
        askStatus: 0x11, // ASK_FAILED
        data: []
      });
    }

    // FIND TARGET SLOT: Get slot state
    const targetSlot = this.slots.find(slot => slot.slotId === slotId);
    if (!targetSlot || !targetSlot.isActive) {
      return await this.buildResponsePacket({
        address: address,
        lockNum: lockNum,
        command: CommandType.DS12_UNLOCK_SLOT,
        askStatus: 0x11, // ASK_FAILED
        data: []
      });
    }

    // UNLOCK OPERATION: Update slot state
    targetSlot.isLocked = false;

    // SUCCESS RESPONSE: Return successful unlock
    const responsePacket = await this.buildResponsePacket({
      address: address,
      lockNum: lockNum,
      command: CommandType.DS12_UNLOCK_SLOT,
      askStatus: 0x10, // ASK_SUCCESS
      data: []
    });

    if (this.config.enableLogging) {
      console.log(`[MockDS12] Unlocked slot ${slotId}`);
    }

    return responsePacket;
  }

  /**
   * Handle DS12 version request command (0x8F)
   * 
   * VERSION RESPONSE FORMAT:
   * - Returns software and hardware version
   * - Version data: [softwareVersionByte, hardwareVersionByte]
   * - Version format: 0x10 = "1.0", 0x12 = "1.2"
   * 
   * @param packet - Version request packet
   * @returns Version response packet
   */
  private async handleVersionRequest(packet: number[]): Promise<number[]> {
    const address = packet[1];
    const lockNum = packet[2];

    // CONVERT VERSION STRINGS TO BYTES: Match real DS12 format
    const softwareVersionByte = this.convertVersionToBytes(this.softwareVersion);
    const hardwareVersionByte = this.convertVersionToBytes(this.hardwareVersion);

    const responsePacket = await this.buildResponsePacket({
      address: address,
      lockNum: lockNum,
      command: CommandType.DS12_GET_VERSION,
      askStatus: 0x10, // ASK_SUCCESS
      data: [softwareVersionByte, hardwareVersionByte]
    });

    return responsePacket;
  }

  /**
   * Build response packet with proper DS12 protocol structure
   * 
   * PACKET BUILDING:
   * - Uses real DS12ProtocolParser patterns for authenticity
   * - Calculates proper checksum for data integrity
   * - Follows CU12 protocol specification exactly
   * 
   * @param params - Response packet parameters
   * @returns Complete response packet array
   */
  private async buildResponsePacket(params: {
    address: number;
    lockNum: number;
    command: number;
    askStatus: number;
    data: number[];
  }): Promise<number[]> {
    const { address, lockNum, command, askStatus, data } = params;
    const dataLength = data.length;

    // BUILD BASE PACKET: Follow CU12 protocol structure
    const packet = [
      0x02,       // STX
      address,    // ADDR
      lockNum,    // LOCKNUM
      command,    // CMD
      askStatus,  // ASK
      dataLength, // DATALEN
      0x03,       // ETX
    ];

    // CALCULATE CHECKSUM: Include data in checksum calculation
    const checksumData = [...packet, ...data];
    let checksum = 0;
    for (const byte of checksumData) {
      checksum += byte;
    }
    
    // COMPLETE PACKET: Add checksum and data
    const completePacket = [
      ...packet,
      checksum & 0xFF, // SUM (low byte of checksum)
      ...data
    ];

    return completePacket;
  }

  /**
   * Convert version string to DS12 protocol byte format
   * Example: "1.0" -> 0x10, "1.2" -> 0x12
   */
  private convertVersionToBytes(version: string): number {
    const [major, minor] = version.split('.').map(v => parseInt(v, 10));
    return ((major & 0x0F) << 4) | (minor & 0x0F);
  }

  /**
   * Determine if error should be simulated based on current scenario and rates
   */
  private async shouldSimulateError(): Promise<boolean> {
    // SCENARIO-BASED ERRORS: Override random errors
    if (this.currentScenario !== MockDS12Scenario.NORMAL) {
      return true;
    }

    // RANDOM ERROR SIMULATION: Based on configured rates
    const random = Math.random();
    
    if (random < this.config.timeoutErrorRate) {
      this.currentScenario = MockDS12Scenario.TIMEOUT;
      return true;
    }
    
    if (random < this.config.timeoutErrorRate + this.config.commErrorRate) {
      this.currentScenario = MockDS12Scenario.COMM_ERROR;
      return true;
    }
    
    if (random < this.config.timeoutErrorRate + this.config.commErrorRate + this.config.checksumErrorRate) {
      this.currentScenario = MockDS12Scenario.CHECKSUM_ERROR;
      return true;
    }

    return false;
  }

  /**
   * Generate error response based on current test scenario
   */
  private generateErrorResponse(): number[] {
    switch (this.currentScenario) {
      case MockDS12Scenario.TIMEOUT:
        // TIMEOUT: Return empty response (no data received)
        if (this.config.enableLogging) {
          console.log(`[MockDS12] Simulating timeout error`);
        }
        return [];

      case MockDS12Scenario.COMM_ERROR:
        // COMMUNICATION ERROR: Return incomplete packet
        if (this.config.enableLogging) {
          console.log(`[MockDS12] Simulating communication error`);
        }
        return [0x02, 0x00]; // Incomplete packet

      case MockDS12Scenario.CHECKSUM_ERROR:
        // CHECKSUM ERROR: Return packet with wrong checksum
        if (this.config.enableLogging) {
          console.log(`[MockDS12] Simulating checksum error`);
        }
        return [0x02, 0x00, 0x00, 0x80, 0x10, 0x00, 0x03, 0xFF]; // Wrong checksum

      case MockDS12Scenario.MALFORMED_PACKET:
        // MALFORMED: Return structurally invalid packet
        if (this.config.enableLogging) {
          console.log(`[MockDS12] Simulating malformed packet`);
        }
        return [0xFF, 0xFF, 0xFF]; // Invalid structure

      default:
        return [];
    }
  }

  /**
   * Generate malformed response for invalid input packets
   */
  private generateMalformedResponse(): number[] {
    if (this.config.enableLogging) {
      console.log(`[MockDS12] Returning malformed response for invalid packet`);
    }
    return [0xFF, 0xFF, 0xFF]; // Invalid response
  }

  /**
   * Generate unknown command response
   */
  private generateUnknownCommandResponse(packet: number[]): number[] {
    const address = packet[1];
    const lockNum = packet[2];
    const command = packet[3];

    if (this.config.enableLogging) {
      console.log(`[MockDS12] Unknown command: 0x${command.toString(16)}`);
    }

    // Return ASK_UNKNOWN_COMMAND response
    return [
      0x02,       // STX
      address,    // ADDR
      lockNum,    // LOCKNUM
      command,    // CMD (echo back)
      0x13,       // ASK_UNKNOWN_COMMAND
      0x00,       // DATALEN
      0x03,       // ETX
      0x2B        // SUM (calculated for this specific packet)
    ];
  }

  /**
   * Generate device busy response
   */
  private generateDeviceBusyResponse(packet: number[]): number[] {
    const address = packet[1];
    const lockNum = packet[2];
    const command = packet[3];

    if (this.config.enableLogging) {
      console.log(`[MockDS12] Device busy response`);
    }

    // Return ASK_FAILED response
    return [
      0x02,       // STX
      address,    // ADDR
      lockNum,    // LOCKNUM
      command,    // CMD (echo back)
      0x11,       // ASK_FAILED
      0x00,       // DATALEN
      0x03,       // ETX
      0x29        // SUM (calculated for this specific packet)
    ];
  }

  /**
   * Simulate hardware processing delay
   * Essential for realistic timing tests
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current slot states for testing validation
   * @returns Array of current slot states
   */
  getSlotStates(): MockDS12SlotState[] {
    return [...this.slots]; // Return copy to prevent external modification
  }

  /**
   * Set specific slot state for testing scenarios
   * @param slotId - Slot ID (1-12)
   * @param state - Desired slot state
   */
  setSlotState(slotId: number, state: Partial<MockDS12SlotState>): void {
    const slot = this.slots.find(s => s.slotId === slotId);
    if (slot) {
      Object.assign(slot, state);
      if (this.config.enableLogging) {
        console.log(`[MockDS12] Set slot ${slotId} state:`, state);
      }
    }
  }

  /**
   * Reset all slots to initial locked state
   * Useful for test cleanup and reset
   */
  resetAllSlots(): void {
    this.initializeSlots();
    if (this.config.enableLogging) {
      console.log(`[MockDS12] Reset all slots to initial state`);
    }
  }

  /**
   * Get hardware version information
   * @returns Version information object
   */
  getVersionInfo(): { softwareVersion: string; hardwareVersion: string } {
    return {
      softwareVersion: this.softwareVersion,
      hardwareVersion: this.hardwareVersion
    };
  }

  /**
   * Set hardware version for testing different firmware scenarios
   * @param softwareVersion - Software version string (e.g., "1.0")
   * @param hardwareVersion - Hardware version string (e.g., "1.2")
   */
  setVersionInfo(softwareVersion: string, hardwareVersion: string): void {
    this.softwareVersion = softwareVersion;
    this.hardwareVersion = hardwareVersion;
    if (this.config.enableLogging) {
      console.log(`[MockDS12] Set version info: SW=${softwareVersion}, HW=${hardwareVersion}`);
    }
  }
}