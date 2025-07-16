/**
 * CU12 Protocol Command Parser
 *
 * Packet Format: [STX][ADDR][LOCKNUM][CMD][ASK][DATALEN][ETX][SUM][DATA...]
 *
 * STX: Start byte (0x02)
 * ADDR: CU12 address (0x00-0x0F, 0x10=broadcast)
 * LOCKNUM: Lock index (0x00-0x0B, 0x0C=all)
 * CMD: Command byte (0x80-0x8F)
 * ASK: Usually 0x00 when sending
 * DATALEN: Length of DATA block
 * ETX: End byte (0x03)
 * SUM: Checksum (sum of all bytes including DATA)
 * DATA: Optional payload
 */

// CU12 Command Constants
export const CU12_COMMANDS = {
  GET_STATUS: 0x80, // Get Lock Status
  UNLOCK: 0x81, // Unlock Lock
  SET_UNLOCK_TIME: 0x82, // Query/Set Unlocking Time
  SET_BAUD_RATE: 0x83, // Query/Set Baud Rate
  SET_DELAY_TIME: 0x84, // Query/Set Delayed Unlock Time
  SET_PUSH_DOOR_TIME: 0x85, // Query/Set Push Door Wait Time
  INITIALIZE: 0x8e, // Initialize CU12
  GET_VERSION: 0x8f, // Query Software/Hardware Version
} as const;

// ASK Response Values
export const ASK_VALUES = {
  SUCCESS: 0x10, // Success
  FAILURE: 0x11, // Failure
  TIMEOUT: 0x12, // Timeout
  UNKNOWN_COMMAND: 0x13, // Unknown command
  CHECKSUM_ERROR: 0x14, // Checksum error
  DEFAULT: 0x00, // Default when sending
} as const;

// Protocol Constants
export const PROTOCOL_CONSTANTS = {
  STX: 0x02, // Start byte
  ETX: 0x03, // End byte
  BROADCAST_ADDR: 0x10, // Broadcast address
  ALL_LOCKS: 0x0c, // All locks command
  MIN_PACKET_SIZE: 8, // Minimum packet size
} as const;

// Response interface
export interface CU12Response {
  addr: number;
  locknum: number;
  cmd: number;
  ask: number;
  datalen: number;
  data: Buffer;
  valid: boolean;
  error?: string;
}

// Command interface
export interface CU12Command {
  addr: number;
  locknum: number;
  cmd: number;
  data?: Buffer;
}

/**
 * Build CU12 command packet
 * @param addr Device address (0x00-0x0F)
 * @param locknum Lock index (0x00-0x0B, 0x0C=all)
 * @param cmd Command byte (0x80-0x8F)
 * @param data Optional payload data
 * @returns Buffer containing the complete packet
 */
export function buildCommand(
  addr: number,
  locknum: number,
  cmd: number,
  data?: Buffer
): Buffer {
  // Validate parameters
  if (addr < 0x00 || addr > 0x10) {
    throw new Error(`Invalid address: 0x${addr.toString(16)}`);
  }

  if (locknum < 0x00 || locknum > 0x0c) {
    throw new Error(`Invalid lock number: 0x${locknum.toString(16)}`);
  }

  if (cmd < 0x80 || cmd > 0x8f) {
    throw new Error(`Invalid command: 0x${cmd.toString(16)}`);
  }

  const ask = ASK_VALUES.DEFAULT;
  const datalen = data ? data.length : 0;

  // Build packet without checksum
  const packet = Buffer.alloc(PROTOCOL_CONSTANTS.MIN_PACKET_SIZE + datalen);
  packet[0] = PROTOCOL_CONSTANTS.STX; // STX
  packet[1] = addr; // ADDR
  packet[2] = locknum; // LOCKNUM
  packet[3] = cmd; // CMD
  packet[4] = ask; // ASK
  packet[5] = datalen; // DATALEN
  packet[6] = PROTOCOL_CONSTANTS.ETX; // ETX

  // Add data if present
  if (data && datalen > 0) {
    data.copy(packet, 7);
  }

  // Calculate and add checksum
  let checksum = 0;
  for (let i = 0; i < 7 + datalen; i++) {
    checksum += packet[i];
  }
  checksum = checksum & 0xff;
  packet[7 + datalen] = checksum;

  return packet;
}

/**
 * Parse CU12 response packet
 * @param buffer Raw response buffer
 * @returns Parsed response object
 */
export function parseResponse(buffer: Buffer): CU12Response {
  // Check minimum packet size
  if (buffer.length < PROTOCOL_CONSTANTS.MIN_PACKET_SIZE) {
    return {
      addr: 0,
      locknum: 0,
      cmd: 0,
      ask: 0,
      datalen: 0,
      data: Buffer.alloc(0),
      valid: false,
      error: `Packet too short: ${buffer.length} bytes`,
    };
  }

  const stx = buffer[0];
  const addr = buffer[1];
  const locknum = buffer[2];
  const cmd = buffer[3];
  const ask = buffer[4];
  const datalen = buffer[5];
  const etx = buffer[6];

  // Validate packet structure
  if (stx !== PROTOCOL_CONSTANTS.STX) {
    return {
      addr,
      locknum,
      cmd,
      ask,
      datalen,
      data: Buffer.alloc(0),
      valid: false,
      error: `Invalid STX: 0x${stx.toString(16)}`,
    };
  }

  if (etx !== PROTOCOL_CONSTANTS.ETX) {
    return {
      addr,
      locknum,
      cmd,
      ask,
      datalen,
      data: Buffer.alloc(0),
      valid: false,
      error: `Invalid ETX: 0x${etx.toString(16)}`,
    };
  }

  // Check if packet has enough data
  const expectedLength = PROTOCOL_CONSTANTS.MIN_PACKET_SIZE + datalen;
  if (buffer.length < expectedLength) {
    return {
      addr,
      locknum,
      cmd,
      ask,
      datalen,
      data: Buffer.alloc(0),
      valid: false,
      error: `Incomplete packet: expected ${expectedLength}, got ${buffer.length}`,
    };
  }

  // Extract checksum
  const checksum = buffer[7 + datalen];

  // Validate checksum
  let calculatedSum = 0;
  for (let i = 0; i < 7 + datalen; i++) {
    calculatedSum += buffer[i];
  }

  if (calculatedSum !== checksum) {
    return {
      addr,
      locknum,
      cmd,
      ask,
      datalen,
      data: Buffer.alloc(0),
      valid: false,
      error: `Checksum mismatch: calculated 0x${calculatedSum.toString(
        16
      )}, received 0x${checksum.toString(16)}`,
    };
  }

  // Extract data
  const data = datalen > 0 ? buffer.slice(7, 7 + datalen) : Buffer.alloc(0);

  return {
    addr,
    locknum,
    cmd,
    ask,
    datalen,
    data,
    valid: true,
  };
}

/**
 * Get ASK value meaning
 * @param ask ASK value
 * @returns Human readable meaning
 */
export function getAskMeaning(ask: number): string {
  switch (ask) {
    case ASK_VALUES.SUCCESS:
      return "Success";
    case ASK_VALUES.FAILURE:
      return "Failure";
    case ASK_VALUES.TIMEOUT:
      return "Timeout";
    case ASK_VALUES.UNKNOWN_COMMAND:
      return "Unknown command";
    case ASK_VALUES.CHECKSUM_ERROR:
      return "Checksum error";
    case ASK_VALUES.DEFAULT:
      return "Default (sending)";
    default:
      return `Unknown ASK value: 0x${ask.toString(16)}`;
  }
}

/**
 * Create command for getting status
 * @param addr Device address
 * @param locknum Lock number (0x0C for all locks)
 * @returns Command packet
 */
export function createGetStatusCommand(
  addr: number,
  locknum: number = 0x0c
): Buffer {
  return buildCommand(addr, locknum, CU12_COMMANDS.GET_STATUS);
}

/**
 * Create command for unlocking
 * @param addr Device address
 * @param locknum Lock number to unlock
 * @returns Command packet
 */
export function createUnlockCommand(addr: number, locknum: number): Buffer {
  return buildCommand(addr, locknum, CU12_COMMANDS.UNLOCK);
}

/**
 * Create command for initialization
 * @param addr Device address
 * @returns Command packet
 */
export function createInitializeCommand(addr: number): Buffer {
  return buildCommand(addr, 0x0c, CU12_COMMANDS.INITIALIZE);
}

/**
 * Create command for setting unlock time
 * @param addr Device address
 * @param time Time in 10ms units (default: 550ms = 0x0037)
 * @returns Command packet
 */
export function createSetUnlockTimeCommand(addr: number, time: number): Buffer {
  const data = Buffer.alloc(2);
  data.writeUInt16BE(time, 0);
  return buildCommand(addr, 0x0c, CU12_COMMANDS.SET_UNLOCK_TIME, data);
}

/**
 * Create command for getting version
 * @param addr Device address
 * @returns Command packet
 */
export function createGetVersionCommand(addr: number): Buffer {
  return buildCommand(addr, 0x0c, CU12_COMMANDS.GET_VERSION);
}

/**
 * Validate response and throw error if invalid
 * @param response Parsed response
 * @throws Error if response is invalid or indicates failure
 */
export function validateResponse(response: CU12Response): void {
  if (!response.valid) {
    throw new Error(`Invalid response: ${response.error}`);
  }

  switch (response.ask) {
    case ASK_VALUES.SUCCESS:
      return; // Success, no error
    case ASK_VALUES.FAILURE:
      throw new Error("Command failed");
    case ASK_VALUES.TIMEOUT:
      throw new Error("Command timeout");
    case ASK_VALUES.UNKNOWN_COMMAND:
      throw new Error("Unknown command");
    case ASK_VALUES.CHECKSUM_ERROR:
      throw new Error("Checksum error");
    default:
      throw new Error(`Unknown ASK value: 0x${response.ask.toString(16)}`);
  }
}
