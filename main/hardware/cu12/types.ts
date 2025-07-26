export interface CU12Config {
  port: string;
  baudRate: number;
  timeout: number;
}

export interface CU12Packet {
  stx: number;
  addr: number;
  lockNum: number;
  cmd: number;
  ask: number;
  dataLen: number;
  etx: number;
  sum: number;
  data?: Buffer;
}

export interface SlotStatus {
  slotId: number;
  isLocked: boolean;
}

export const CU12_COMMANDS = {
  GET_STATUS: 0x80,
  UNLOCK: 0x81,
  QUERY_SET_UNLOCK_TIME: 0x82,
  QUERY_SET_BAUDRATE: 0x83,
  QUERY_SET_DELAY_TIME: 0x84,
  QUERY_SET_PUSH_WAIT: 0x85,
  INITIALIZATION: 0x8E,
  QUERY_VERSION: 0x8F
} as const;

export const CU12_RESPONSE_CODES = {
  SUCCESS: 0x10,
  FAILED: 0x11,
  TIMEOUT: 0x12,
  UNKNOWN_COMMAND: 0x13,
  DATA_VERIFICATION_FAIL: 0x14,
  DEFAULT_ASK: 0x00
} as const;

export const CU12_CONSTANTS = {
  STX: 0x02,
  ETX: 0x03,
  MIN_PACKET_LENGTH: 8,
  MAX_PACKET_LENGTH: 48,
  MAX_SLOTS: 12,
  UNLOCK_ALL_SLOTS: 0x0C,
  DEFAULT_BAUDRATE: 19200,
  DEFAULT_ADDR: 0x00
} as const;

export type CU12Command = typeof CU12_COMMANDS[keyof typeof CU12_COMMANDS];
export type CU12ResponseCode = typeof CU12_RESPONSE_CODES[keyof typeof CU12_RESPONSE_CODES];