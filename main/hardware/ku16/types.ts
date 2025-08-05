/**
 * KU16 Hardware Types and Interfaces
 * Following CU12 pattern for consistency
 */

export interface KU16Config {
  port: string;
  baudRate: number;
  timeout?: number;
  maxSlots: 15; // KU16 specific: 15 slots
}

export interface KU16SlotStatus {
  slotId: number;
  occupied: boolean;
  opening: boolean;
  isActive: boolean;
  hn?: string;
  timestamp?: number;
  lastOp?: string;
}

export interface KU16Command {
  channel: number;
  channelNo: number;
  unlock: number[];
}

export interface KU16Response {
  command: string;
  data: number[];
  slotStates: number[];
}

export interface OperationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

export interface UnlockPayload {
  slotId: number;
  hn: string;
  timestamp: number;
  passkey?: string;
}

export interface DispensePayload extends UnlockPayload {
  passkey: string;
}

// Command constants for KU16
export const KU16_COMMANDS = {
  STATUS: 0x30,
  UNLOCK: 0x31,
  ALL_CU_STATES: 0x32,
  UNLOCK_ALL: 0x33,
  RETURN_SINGLE_DATA: 0x35,
  RETURN_ALL_DATA: 0x36,
} as const;

// Protocol constants
export const KU16_PROTOCOL = {
  STX: 0x02, // Start of text
  ETX: 0x03, // End of text
  MAX_SLOTS: 15,
  PACKET_SIZE: 5,
} as const;

export type KU16CommandType = keyof typeof KU16_COMMANDS;