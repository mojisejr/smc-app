/**
 * DS12/DS16 Response Parser
 * Parses hardware responses and extracts meaningful data
 * 
 * This module provides independent response parsing capabilities
 * for interpreting DS12/DS16 hardware communication.
 */

import { PROTOCOL_CONSTANTS, ERROR_MESSAGES } from './constants';
import { validatePacket } from './packet-builder';

export interface SlotState {
  slotNumber: number;
  isOpen: boolean;
  status: 'open' | 'closed' | 'unknown';
}

export interface ParsedResponse {
  success: boolean;
  command: number;
  ask: number;
  data?: number[];
  error?: string;
  slotStates?: SlotState[];
  message?: string;
}

/**
 * Parse raw response buffer from DS12/DS16 hardware
 */
export function parseResponse(buffer: Buffer): ParsedResponse {
  const data = Array.from(buffer);
  
  // Validate minimum packet length
  if (data.length < 8) {
    return {
      success: false,
      command: 0,
      ask: 0,
      error: ERROR_MESSAGES.INVALID_RESPONSE
    };
  }

  // Validate packet structure
  if (!validatePacket(data)) {
    return {
      success: false,
      command: 0,
      ask: 0,
      error: ERROR_MESSAGES.CHECKSUM_ERROR
    };
  }

  const command = data[PROTOCOL_CONSTANTS.PACKET_POS.CMD];
  const ask = data[PROTOCOL_CONSTANTS.PACKET_POS.ASK];
  const dataLen = data[PROTOCOL_CONSTANTS.PACKET_POS.DATALEN];
  
  // Extract data payload if present (DATA comes after SUM in CU12 protocol)
  const responseData = dataLen > 0 ? 
    data.slice(PROTOCOL_CONSTANTS.PACKET_POS.DATA_START, PROTOCOL_CONSTANTS.PACKET_POS.DATA_START + dataLen) : 
    [];

  // Check for error responses
  if (ask !== PROTOCOL_CONSTANTS.ASK_SUCCESS) {
    return {
      success: false,
      command,
      ask,
      data: responseData,
      error: getErrorMessage(ask)
    };
  }

  // Parse based on command type
  switch (command) {
    case PROTOCOL_CONSTANTS.DS12_STATUS_REQUEST:
      return parseStatusResponse(command, ask, responseData);
    
    case PROTOCOL_CONSTANTS.DS12_UNLOCK_SLOT:
      return parseUnlockResponse(command, ask, responseData);
    
    case PROTOCOL_CONSTANTS.DS12_GET_VERSION:
      return parseVersionResponse(command, ask, responseData);
    
    default:
      return {
        success: true,
        command,
        ask,
        data: responseData,
        message: 'Unknown command response'
      };
  }
}

/**
 * Parse status response (0x80) - Extract slot states
 */
function parseStatusResponse(command: number, ask: number, data: number[]): ParsedResponse {
  if (data.length < 2) {
    return {
      success: false,
      command,
      ask,
      error: 'Invalid status response data length'
    };
  }

  // DS12 uses 2 bytes for slot states
  // data[0] = slots 1-8 (bits 0-7)
  // data[1] = slots 9-12 (bits 0-3)
  const data1 = data[0]; // Slots 1-8
  const data2 = data[1]; // Slots 9-12

  const slotStates: SlotState[] = [];

  // Parse slots 1-8
  for (let i = 0; i < 8; i++) {
    const isOpen = (data1 & (1 << i)) !== 0;
    slotStates.push({
      slotNumber: i + 1,
      isOpen,
      status: isOpen ? 'open' : 'closed'
    });
  }

  // Parse slots 9-12
  for (let i = 0; i < 4; i++) {
    const isOpen = (data2 & (1 << i)) !== 0;
    slotStates.push({
      slotNumber: i + 9,
      isOpen,
      status: isOpen ? 'open' : 'closed'
    });
  }

  return {
    success: true,
    command,
    ask,
    data,
    slotStates,
    message: 'Slot states retrieved successfully'
  };
}

/**
 * Parse unlock response (0x81)
 */
function parseUnlockResponse(command: number, ask: number, data: number[]): ParsedResponse {
  return {
    success: true,
    command,
    ask,
    data,
    message: 'Slot unlocked successfully'
  };
}

/**
 * Parse version response (0x8F)
 */
function parseVersionResponse(command: number, ask: number, data: number[]): ParsedResponse {
  let versionInfo = 'Unknown version';
  
  if (data.length > 0) {
    // Convert data bytes to version string
    versionInfo = data.map(byte => String.fromCharCode(byte)).join('');
  }

  return {
    success: true,
    command,
    ask,
    data,
    message: `Firmware version: ${versionInfo}`
  };
}

/**
 * Get error message based on ASK code
 */
function getErrorMessage(ask: number): string {
  switch (ask) {
    case PROTOCOL_CONSTANTS.ASK_FAILED:
      return ERROR_MESSAGES.HARDWARE_ERROR;
    case PROTOCOL_CONSTANTS.ASK_TIMEOUT:
      return ERROR_MESSAGES.COMMUNICATION_TIMEOUT;
    case PROTOCOL_CONSTANTS.ASK_UNKNOWN_COMMAND:
      return 'คำสั่งไม่ถูกต้อง';
    case PROTOCOL_CONSTANTS.ASK_DATA_VERIFICATION_FAILED:
      return ERROR_MESSAGES.CHECKSUM_ERROR;
    default:
      return `Unknown error code: 0x${ask.toString(16).toUpperCase()}`;
  }
}

/**
 * Format slot states for human-readable output
 */
export function formatSlotStates(slotStates: SlotState[]): string {
  const openSlots = slotStates.filter(slot => slot.isOpen);
  const closedSlots = slotStates.filter(slot => !slot.isOpen);

  let output = `สถานะช่องยา (${slotStates.length} ช่อง):\n`;
  output += `ช่องที่เปิด: ${openSlots.length > 0 ? openSlots.map(s => s.slotNumber).join(', ') : 'ไม่มี'}\n`;
  output += `ช่องที่ปิด: ${closedSlots.length > 0 ? closedSlots.map(s => s.slotNumber).join(', ') : 'ไม่มี'}`;

  return output;
}