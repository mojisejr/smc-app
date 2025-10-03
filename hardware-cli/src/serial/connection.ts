/**
 * DS12/DS16 Serial Connection Manager
 * Manages serial communication with DS12/DS16 hardware devices
 *
 * This module provides robust serial connection management
 * with proper error handling and medical device compliance.
 */

import { SerialPort } from "serialport";
import { PROTOCOL_CONSTANTS, ERROR_MESSAGES } from "../protocol/constants";
import { parseResponse, ParsedResponse } from "../protocol/parser";

export interface ConnectionConfig {
  portPath: string;
  timeout?: number;
  retries?: number;
  existingPort?: SerialPort; // Allow reusing an existing port connection
}

export interface SendCommandResult {
  success: boolean;
  response?: ParsedResponse;
  error?: string;
  rawData?: Buffer;
}

export class DS12Connection {
  private port: SerialPort | null = null;
  private isConnected = false;
  private portPath: string;
  private timeout: number;
  private retries: number;
  private usingExistingPort: boolean = false;

  constructor(config: ConnectionConfig) {
    this.portPath = config.portPath;
    this.timeout = config.timeout || PROTOCOL_CONSTANTS.COMMUNICATION_TIMEOUT;
    this.retries = config.retries || 3;
    
    // If an existing port is provided, use it
    if (config.existingPort) {
      this.port = config.existingPort;
      this.usingExistingPort = true;
      this.isConnected = config.existingPort.isOpen;
    }
  }

  /**
   * Open connection to DS12/DS16 device
   */
  async connect(): Promise<boolean> {
    try {
      if (this.isConnected && this.port?.isOpen) {
        return true;
      }

      // If using an existing port, just verify it's open
      if (this.usingExistingPort && this.port) {
        if (this.port.isOpen) {
          this.isConnected = true;
          return true;
        } else {
          throw new Error(`${ERROR_MESSAGES.CONNECTION_FAILED}: Existing port is not open`);
        }
      }

      // Create new port connection
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
        dataBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
        stopBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
        parity: PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
        autoOpen: false,
      });

      return new Promise((resolve, reject) => {
        this.port!.open((err) => {
          if (err) {
            reject(
              new Error(`${ERROR_MESSAGES.CONNECTION_FAILED}: ${err.message}`)
            );
            return;
          }

          this.isConnected = true;
          resolve(true);
        });
      });
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.CONNECTION_FAILED}: ${error}`);
    }
  }

  /**
   * Close connection to DS12/DS16 device
   */
  async disconnect(): Promise<void> {
    // If using an existing port, don't close it - let the caller handle it
    if (this.usingExistingPort) {
      this.isConnected = false;
      // Don't set port to null since we don't own it
      return;
    }

    if (this.port && this.port.isOpen) {
      return new Promise((resolve, reject) => {
        this.port!.close((err) => {
          if (err) {
            reject(new Error(`Failed to close connection: ${err.message}`));
            return;
          }

          this.isConnected = false;
          this.port = null;
          resolve();
        });
      });
    }

    this.isConnected = false;
    this.port = null;
  }

  /**
   * Send command packet and wait for response
   */
  async sendCommand(packet: number[]): Promise<SendCommandResult> {
    if (!this.isConnected || !this.port) {
      return {
        success: false,
        error: ERROR_MESSAGES.NOT_CONNECTED,
      };
    }

    let attempt = 0;

    while (attempt < this.retries) {
      try {
        const result = await this.sendSingleCommand(packet);

        if (result.success) {
          return result;
        }

        attempt++;

        // Wait before retry
        if (attempt < this.retries) {
          await this.delay(500);
        }
      } catch (error) {
        attempt++;

        if (attempt >= this.retries) {
          return {
            success: false,
            error: `${ERROR_MESSAGES.COMMUNICATION_TIMEOUT}: ${error}`,
          };
        }

        await this.delay(500);
      }
    }

    return {
      success: false,
      error: `${ERROR_MESSAGES.COMMUNICATION_TIMEOUT} after ${this.retries} attempts`,
    };
  }

  /**
   * Send a single command attempt
   */
  private async sendSingleCommand(
    packet: number[]
  ): Promise<SendCommandResult> {
    return new Promise((resolve) => {
      if (!this.port) {
        resolve({
          success: false,
          error: ERROR_MESSAGES.NOT_CONNECTED,
        });
        return;
      }

      const buffer = Buffer.from(packet);
      let responseBuffer = Buffer.alloc(0);
      let timeoutId: NodeJS.Timeout;

      // Set up timeout
      timeoutId = setTimeout(() => {
        this.port!.removeAllListeners("data");
        resolve({
          success: false,
          error: ERROR_MESSAGES.COMMUNICATION_TIMEOUT,
        });
      }, this.timeout);

      // Set up data listener
      const onData = (data: Buffer) => {
        responseBuffer = Buffer.concat([responseBuffer, data]);

        // Check if we have a complete response
        if (this.isCompleteResponse(responseBuffer)) {
          clearTimeout(timeoutId);
          this.port!.removeAllListeners("data");

          const parsedResponse = parseResponse(responseBuffer);

          resolve({
            success: parsedResponse.success,
            response: parsedResponse,
            rawData: responseBuffer,
            ...(parsedResponse.error && { error: parsedResponse.error }),
          });
        }
      };

      this.port.on("data", onData);

      // Send the command
      this.port.write(buffer, (err) => {
        if (err) {
          clearTimeout(timeoutId);
          this.port!.removeAllListeners("data");
          resolve({
            success: false,
            error: `Write error: ${err.message}`,
          });
        }
      });
    });
  }

  /**
   * Check if response buffer contains a complete packet
   */
  private isCompleteResponse(buffer: Buffer): boolean {
    if (buffer.length < 8) {
      return false;
    }

    // Check for frame start
    if (buffer[0] !== PROTOCOL_CONSTANTS.FRAME_START) {
      return false;
    }

    // Check if we have enough data for the packet
    if (buffer.length >= 6) {
      const dataLen = buffer[PROTOCOL_CONSTANTS.PACKET_POS.DATALEN];
      const expectedLength = 8 + dataLen; // Header + data + checksum + frame end

      if (buffer.length >= expectedLength) {
        // Check for frame end
        const frameEndPos = expectedLength - 1;
        return buffer[frameEndPos] === PROTOCOL_CONSTANTS.FRAME_END;
      }
    }

    return false;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if connection is active
   */
  isConnectionActive(): boolean {
    return this.isConnected && this.port?.isOpen === true;
  }

  /**
   * Get connection status information
   */
  getConnectionInfo(): { connected: boolean; port: string; config: any } {
    return {
      connected: this.isConnected,
      port: this.portPath,
      config: {
        baudRate: PROTOCOL_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
        dataBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
        stopBits: PROTOCOL_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
        parity: PROTOCOL_CONSTANTS.SERIAL_CONFIG.PARITY,
        timeout: this.timeout,
        retries: this.retries,
      },
    };
  }
}
