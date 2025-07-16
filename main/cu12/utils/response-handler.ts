/**
 * CU12 Response Handler
 *
 * Handles response processing, error handling, and state management
 * for CU12 protocol communication.
 */

import { EventEmitter } from "events";
import {
  parseResponse,
  validateResponse,
  getAskMeaning,
  ASK_VALUES,
  CU12Response,
} from "./command-parser";

// Response event types
export interface CU12ResponseEvents {
  status: (status: LockStatus) => void;
  unlock: (locknum: number, success: boolean) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
  timeout: (command: string) => void;
}

// Lock status interface
export interface LockStatus {
  locknum: number;
  isLocked: boolean;
  isOpen: boolean;
  hasError: boolean;
  errorCode?: number;
}

// Response handler class
export class CU12ResponseHandler extends EventEmitter {
  private responseBuffer: Buffer = Buffer.alloc(0);
  private commandTimeout: number = 5000; // 5 seconds default timeout
  private pendingCommands: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
      command: string;
    }
  > = new Map();

  constructor() {
    super();
  }

  /**
   * Set command timeout
   * @param timeout Timeout in milliseconds
   */
  setCommandTimeout(timeout: number): void {
    this.commandTimeout = timeout;
  }

  /**
   * Process incoming data buffer
   * @param data Raw data from serial port
   */
  processData(data: Buffer): void {
    // Append to response buffer
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Process complete packets
    while (this.responseBuffer.length >= 8) {
      // Minimum packet size
      const packet = this.extractPacket();
      if (packet) {
        this.handlePacket(packet);
      } else {
        break; // Incomplete packet, wait for more data
      }
    }
  }

  /**
   * Extract complete packet from buffer
   * @returns Complete packet or null if incomplete
   */
  private extractPacket(): Buffer | null {
    // Look for STX (0x02)
    const stxIndex = this.responseBuffer.indexOf(0x02);
    if (stxIndex === -1) {
      // No STX found, clear buffer
      this.responseBuffer = Buffer.alloc(0);
      return null;
    }

    // Remove data before STX
    if (stxIndex > 0) {
      this.responseBuffer = this.responseBuffer.slice(stxIndex);
    }

    // Check if we have enough data for minimum packet
    if (this.responseBuffer.length < 8) {
      return null;
    }

    // Get data length from packet
    const datalen = this.responseBuffer[5];
    const expectedLength = 8 + datalen; // STX + ADDR + LOCKNUM + CMD + ASK + DATALEN + ETX + SUM + DATA

    // Check if we have complete packet
    if (this.responseBuffer.length < expectedLength) {
      return null;
    }

    // Extract complete packet
    const packet = this.responseBuffer.slice(0, expectedLength);
    this.responseBuffer = this.responseBuffer.slice(expectedLength);

    return packet;
  }

  /**
   * Handle complete packet
   * @param packet Complete packet buffer
   */
  private handlePacket(packet: Buffer): void {
    try {
      const response = parseResponse(packet);

      if (!response.valid) {
        this.emit("error", new Error(`Invalid packet: ${response.error}`));
        return;
      }

      // Handle different ASK values
      switch (response.ask) {
        case ASK_VALUES.SUCCESS:
          this.handleSuccessResponse(response);
          break;
        case ASK_VALUES.FAILURE:
          this.handleFailureResponse(response);
          break;
        case ASK_VALUES.TIMEOUT:
          this.handleTimeoutResponse(response);
          break;
        case ASK_VALUES.UNKNOWN_COMMAND:
          this.handleUnknownCommandResponse(response);
          break;
        case ASK_VALUES.CHECKSUM_ERROR:
          this.handleChecksumErrorResponse(response);
          break;
        default:
          this.handleUnknownAskResponse(response);
      }
    } catch (error) {
      this.emit(
        "error",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Handle successful response
   * @param response Parsed response
   */
  private handleSuccessResponse(response: CU12Response): void {
    switch (response.cmd) {
      case 0x80: // Get Status
        this.handleStatusResponse(response);
        break;
      case 0x81: // Unlock
        this.handleUnlockResponse(response);
        break;
      case 0x8e: // Initialize
        this.handleInitializeResponse(response);
        break;
      case 0x8f: // Get Version
        this.handleVersionResponse(response);
        break;
      default:
        this.resolvePendingCommand(`cmd_${response.cmd}`, response);
    }
  }

  /**
   * Handle status response
   * @param response Parsed response
   */
  private handleStatusResponse(response: CU12Response): void {
    if (response.data.length >= 12) {
      // 12 locks status
      const status: LockStatus[] = [];

      for (let i = 0; i < 12; i++) {
        const byte = response.data[i];
        status.push({
          locknum: i,
          isLocked: (byte & 0x01) === 0x01,
          isOpen: (byte & 0x02) === 0x02,
          hasError: (byte & 0x04) === 0x04,
          errorCode: (byte & 0xf0) >> 4,
        });
      }

      this.emit("status", status);
      this.resolvePendingCommand("getStatus", status);
    } else {
      this.emit("error", new Error("Invalid status response data length"));
    }
  }

  /**
   * Handle unlock response
   * @param response Parsed response
   */
  private handleUnlockResponse(response: CU12Response): void {
    const locknum = response.locknum;
    const success = response.ask === ASK_VALUES.SUCCESS;

    this.emit("unlock", locknum, success);
    this.resolvePendingCommand(`unlock_${locknum}`, success);
  }

  /**
   * Handle initialize response
   * @param response Parsed response
   */
  private handleInitializeResponse(response: CU12Response): void {
    this.resolvePendingCommand("initialize", true);
  }

  /**
   * Handle version response
   * @param response Parsed response
   */
  private handleVersionResponse(response: CU12Response): void {
    if (response.data.length >= 2) {
      const softVersion = response.data[0];
      const hardVersion = response.data[1];
      const version = { softVersion, hardVersion };

      this.resolvePendingCommand("getVersion", version);
    } else {
      this.emit("error", new Error("Invalid version response data length"));
    }
  }

  /**
   * Handle failure response
   * @param response Parsed response
   */
  private handleFailureResponse(response: CU12Response): void {
    const error = new Error(`Command failed: ${getAskMeaning(response.ask)}`);
    this.rejectPendingCommand(`cmd_${response.cmd}`, error);
    this.emit("error", error);
  }

  /**
   * Handle timeout response
   * @param response Parsed response
   */
  private handleTimeoutResponse(response: CU12Response): void {
    const error = new Error(`Command timeout: ${getAskMeaning(response.ask)}`);
    this.rejectPendingCommand(`cmd_${response.cmd}`, error);
    this.emit("timeout", `Command 0x${response.cmd.toString(16)}`);
  }

  /**
   * Handle unknown command response
   * @param response Parsed response
   */
  private handleUnknownCommandResponse(response: CU12Response): void {
    const error = new Error(`Unknown command: 0x${response.cmd.toString(16)}`);
    this.rejectPendingCommand(`cmd_${response.cmd}`, error);
    this.emit("error", error);
  }

  /**
   * Handle checksum error response
   * @param response Parsed response
   */
  private handleChecksumErrorResponse(response: CU12Response): void {
    const error = new Error(`Checksum error: ${getAskMeaning(response.ask)}`);
    this.rejectPendingCommand(`cmd_${response.cmd}`, error);
    this.emit("error", error);
  }

  /**
   * Handle unknown ASK response
   * @param response Parsed response
   */
  private handleUnknownAskResponse(response: CU12Response): void {
    const error = new Error(
      `Unknown ASK value: 0x${response.ask.toString(16)}`
    );
    this.rejectPendingCommand(`cmd_${response.cmd}`, error);
    this.emit("error", error);
  }

  /**
   * Register pending command
   * @param commandId Unique command identifier
   * @param resolve Promise resolve function
   * @param reject Promise reject function
   * @param command Command description for logging
   */
  registerPendingCommand(
    commandId: string,
    resolve: (value: any) => void,
    reject: (error: Error) => void,
    command: string
  ): void {
    // Clear existing timeout if any
    const existing = this.pendingCommands.get(commandId);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Set timeout
    const timeout = setTimeout(() => {
      this.pendingCommands.delete(commandId);
      reject(new Error(`Command timeout: ${command}`));
    }, this.commandTimeout);

    // Register command
    this.pendingCommands.set(commandId, {
      resolve,
      reject,
      timeout,
      command,
    });
  }

  /**
   * Resolve pending command
   * @param commandId Command identifier
   * @param value Resolution value
   */
  private resolvePendingCommand(commandId: string, value: any): void {
    const pending = this.pendingCommands.get(commandId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      pending.resolve(value);
    }
  }

  /**
   * Reject pending command
   * @param commandId Command identifier
   * @param error Error to reject with
   */
  private rejectPendingCommand(commandId: string, error: Error): void {
    const pending = this.pendingCommands.get(commandId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCommands.delete(commandId);
      pending.reject(error);
    }
  }

  /**
   * Clear all pending commands
   */
  clearPendingCommands(): void {
    this.pendingCommands.forEach((pending, commandId) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Connection closed"));
    });
    this.pendingCommands.clear();
  }

  /**
   * Get pending command count
   * @returns Number of pending commands
   */
  getPendingCommandCount(): number {
    return this.pendingCommands.size;
  }

  /**
   * Reset response buffer
   */
  resetBuffer(): void {
    this.responseBuffer = Buffer.alloc(0);
  }

  /**
   * Emit connection event
   */
  emitConnected(): void {
    this.emit("connected");
  }

  /**
   * Emit disconnection event
   */
  emitDisconnected(): void {
    this.emit("disconnected");
    this.clearPendingCommands();
    this.resetBuffer();
  }
}
