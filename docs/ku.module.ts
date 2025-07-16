/**
 * Kerong Lock Controller Module
 * Supports CU12 and CU16 models with RS485 and TCP/IP communication
 *
 * @author Your Name
 * @version 1.0.0
 */

import * as net from "net";
import { SerialPort } from "serialport";
import { EventEmitter } from "events";

// Type definitions
export type ConnectionType = "tcp" | "rs485";
export type ModelType = "CU12" | "CU16";
export type BaudRate = 9600 | 19200 | 57600 | 115200;

// Interfaces
export interface ConnectionConfig {
  type: ConnectionType;
  host?: string;
  port?: number;
  path?: string;
  baudRate?: BaudRate;
  timeout?: number;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export interface LockControllerConfig {
  model?: ModelType;
  address?: number;
  connection?: ConnectionConfig;
}

export interface LockStatus {
  id: number;
  locked: boolean;
  hasItem: boolean;
}

export interface StatusResponse {
  hookStatus1: number;
  hookStatus2: number;
  infraredStatus1: number;
  infraredStatus2: number;
}

export interface CommandResponse {
  address: number;
  command: number;
  status?: StatusResponse;
  data?: number;
}

export interface GetStatusResponse {
  locks: LockStatus[];
  raw: CommandResponse;
}

export interface VersionResponse {
  softwareVersion: number;
  hardwareVersion: number;
}

interface CommandObject {
  packet: Buffer;
  command: number;
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Base class for Kerong lock controllers
 */
export class KerrongLockController extends EventEmitter {
  protected config: Required<LockControllerConfig>;
  protected connection: net.Socket | SerialPort | null = null;
  protected connected: boolean = false;
  protected lockCount: number;
  protected commandQueue: CommandObject[] = [];
  protected processing: boolean = false;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected currentCommand: CommandObject | null = null;

  constructor(config: LockControllerConfig = {}) {
    super();
    this.config = {
      model: "CU16",
      address: 0x00,
      connection: {
        type: "tcp",
        host: "192.168.1.100",
        port: 5000,
        baudRate: 19200,
        timeout: 5000,
        autoReconnect: true,
        reconnectInterval: 3000,
        ...config.connection,
      },
      ...config,
    };

    this.lockCount = this.config.model === "CU16" ? 16 : 12;
  }

  /**
   * Connect to the lock controller
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.config.connection.type === "tcp") {
          this._connectTCP(resolve, reject);
        } else if (this.config.connection.type === "rs485") {
          this._connectRS485(resolve, reject);
        } else {
          reject(new Error('Invalid connection type. Use "tcp" or "rs485"'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * TCP Connection
   */
  private _connectTCP(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.connection = new net.Socket();

    this.connection.connect(
      this.config.connection.port!,
      this.config.connection.host!,
      () => {
        this.connected = true;
        this.emit("connected");
        resolve();
      }
    );

    this.connection.on("data", (data: Buffer) => {
      this._handleResponse(data);
    });

    this.connection.on("error", (error: Error) => {
      this.emit("error", error);
      if (!this.connected) reject(error);
      this._handleDisconnection();
    });

    this.connection.on("close", () => {
      this._handleDisconnection();
    });
  }

  /**
   * RS485 Connection
   */
  private _connectRS485(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.connection = new SerialPort({
      path: this.config.connection.path || "/dev/ttyUSB0",
      baudRate: this.config.connection.baudRate || 19200,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });

    this.connection.on("open", () => {
      this.connected = true;
      this.emit("connected");
      resolve();
    });

    this.connection.on("data", (data: Buffer) => {
      this._handleResponse(data);
    });

    this.connection.on("error", (error: Error) => {
      this.emit("error", error);
      if (!this.connected) reject(error);
      this._handleDisconnection();
    });

    this.connection.on("close", () => {
      this._handleDisconnection();
    });
  }

  /**
   * Handle disconnection and auto-reconnect
   */
  private _handleDisconnection(): void {
    if (this.connected) {
      this.connected = false;
      this.emit("disconnected");

      if (this.config.connection.autoReconnect) {
        this.reconnectTimer = setTimeout(() => {
          this.emit("reconnecting");
          this.connect().catch((error) => {
            this.emit("reconnectFailed", error);
          });
        }, this.config.connection.reconnectInterval);
      }
    }
  }

  /**
   * Disconnect from the controller
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      this.config.connection.autoReconnect = false;

      if (this.connection) {
        if (this.connection instanceof net.Socket) {
          this.connection.end();
          this.connection.destroy();
        } else {
          this.connection.close();
        }
        this.connection = null;
      }

      this.connected = false;
      this.emit("disconnected");
      resolve();
    });
  }

  /**
   * Send command to the lock controller
   */
  async sendCommand(
    command: number,
    data?: number[]
  ): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("Not connected to lock controller"));
        return;
      }

      const packet = this._buildPacket(command, data);
      const commandObj: CommandObject = {
        packet,
        command,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.commandQueue.push(commandObj);
      this._processQueue();
    });
  }

  /**
   * Process command queue
   */
  private async _processQueue(): Promise<void> {
    if (this.processing || this.commandQueue.length === 0) return;

    this.processing = true;
    const commandObj = this.commandQueue.shift()!;

    try {
      this.currentCommand = commandObj;

      // Set timeout if configured
      if (this.config.connection.timeout! > 0) {
        commandObj.timeoutId = setTimeout(() => {
          commandObj.reject(new Error("Command timeout"));
          this.currentCommand = null;
          this.processing = false;
          this._processQueue();
        }, this.config.connection.timeout);
      }

      if (this.connection) {
        if (this.connection instanceof net.Socket) {
          this.connection.write(commandObj.packet);
        } else {
          this.connection.write(commandObj.packet);
        }
      }
    } catch (error) {
      commandObj.reject(error as Error);
      this.processing = false;
      this._processQueue();
    }
  }

  /**
   * Handle response from controller
   */
  private _handleResponse(data: Buffer): void {
    if (!this.currentCommand) return;

    try {
      const response = this._parseResponse(data);

      if (this.currentCommand.timeoutId) {
        clearTimeout(this.currentCommand.timeoutId);
      }

      this.currentCommand.resolve(response);
      this.currentCommand = null;
      this.processing = false;
      this._processQueue();
    } catch (error) {
      if (this.currentCommand.timeoutId) {
        clearTimeout(this.currentCommand.timeoutId);
      }

      this.currentCommand.reject(error as Error);
      this.currentCommand = null;
      this.processing = false;
      this._processQueue();
    }
  }

  /**
   * Build command packet
   */
  private _buildPacket(command: number, data?: number[]): Buffer {
    let packet: Buffer;

    if (data && data.length > 0) {
      // Extended packet format
      if (data.length === 1) {
        // 6-byte packet (0x39 commands)
        packet = Buffer.alloc(6);
        packet[0] = 0x02; // STX
        packet[1] = this.config.address; // ADDR
        packet[2] = command; // CMD
        packet[3] = data[0]; // DATA
        packet[4] = 0x03; // ETX
      } else if (data.length === 2) {
        // 7-byte packet (0x37 commands)
        packet = Buffer.alloc(7);
        packet[0] = 0x02; // STX
        packet[1] = this.config.address; // ADDR
        packet[2] = command; // CMD
        packet[3] = data[0]; // DATA high byte
        packet[4] = data[1]; // DATA low byte
        packet[5] = 0x03; // ETX
      } else {
        // 9-byte packet (status commands)
        packet = Buffer.alloc(9);
        packet[0] = 0x02; // STX
        packet[1] = this.config.address; // ADDR
        packet[2] = command; // CMD
        for (let i = 0; i < data.length && i < 4; i++) {
          packet[3 + i] = data[i];
        }
        packet[8] = 0x03; // ETX
      }
    } else {
      // Basic 5-byte packet
      packet = Buffer.alloc(5);
      packet[0] = 0x02; // STX
      packet[1] = this.config.address; // ADDR
      packet[2] = command; // CMD
      packet[3] = 0x03; // ETX
    }

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < packet.length - 1; i++) {
      checksum += packet[i];
    }
    packet[packet.length - 1] = checksum & 0xff;

    return packet;
  }

  /**
   * Parse response packet
   */
  private _parseResponse(data: Buffer): CommandResponse {
    if (data.length < 5) {
      throw new Error("Invalid response length");
    }

    if (data[0] !== 0x02) {
      throw new Error("Invalid response header");
    }

    const response: CommandResponse = {
      address: data[1],
      command: data[2],
      status: undefined,
      data: undefined,
    };

    // Parse based on command type
    if (data.length >= 9) {
      // Extended response with status data
      response.status = {
        hookStatus1: data[3], // Locks 1-8
        hookStatus2: data[4], // Locks 9-16
        infraredStatus1: data[5], // IR sensors 1-8
        infraredStatus2: data[6], // IR sensors 9-16
      };
    } else if (data.length >= 6) {
      // Response with single data byte
      response.data = data[3];
    }

    return response;
  }

  // === PUBLIC API METHODS ===

  /**
   * Get status of all locks
   */
  async getStatus(): Promise<GetStatusResponse | CommandResponse> {
    const response = await this.sendCommand(0x30);

    if (response.status) {
      const locks: LockStatus[] = [];

      // Parse lock hook status
      for (let i = 0; i < this.lockCount; i++) {
        const byteIndex = i < 8 ? 0 : 1;
        const bitIndex = i % 8;
        const hookByte =
          byteIndex === 0
            ? response.status.hookStatus1
            : response.status.hookStatus2;
        const irByte =
          byteIndex === 0
            ? response.status.infraredStatus1
            : response.status.infraredStatus2;

        locks.push({
          id: i + 1,
          locked: (hookByte & (1 << bitIndex)) !== 0,
          hasItem: (irByte & (1 << bitIndex)) !== 0,
        });
      }

      return { locks, raw: response };
    }

    return response;
  }

  /**
   * Unlock specific lock
   */
  async unlock(lockNumber: number): Promise<CommandResponse> {
    if (lockNumber < 1 || lockNumber > this.lockCount) {
      throw new Error(
        `Invalid lock number. Must be between 1 and ${this.lockCount}`
      );
    }

    // Set lock number in address field
    const originalAddress = this.config.address;
    this.config.address = (this.config.address & 0xf0) | (lockNumber - 1);

    try {
      const response = await this.sendCommand(0x31);
      return response;
    } finally {
      this.config.address = originalAddress;
    }
  }

  /**
   * Unlock all locks
   */
  async unlockAll(): Promise<CommandResponse> {
    const response = await this.sendCommand(0x33);
    return response;
  }

  /**
   * Get all device status on bus
   */
  async getAllDevicesStatus(): Promise<CommandResponse> {
    const originalAddress = this.config.address;
    this.config.address = 0xf0; // Broadcast address

    try {
      const response = await this.sendCommand(0x32);
      return response;
    } finally {
      this.config.address = originalAddress;
    }
  }

  /**
   * Set unlock time (0-60000ms)
   */
  async setUnlockTime(timeMs: number): Promise<CommandResponse> {
    if (timeMs < 0 || timeMs > 60000) {
      throw new Error("Unlock time must be between 0 and 60000ms");
    }

    const timeValue = Math.floor(timeMs / 10); // Convert to 10ms units
    const highByte = (timeValue >> 8) & 0xff;
    const lowByte = timeValue & 0xff;

    const response = await this.sendCommand(0x37, [highByte, lowByte]);
    return response;
  }

  /**
   * Get unlock time
   */
  async getUnlockTime(): Promise<CommandResponse> {
    const response = await this.sendCommand(0x37);
    return response;
  }

  /**
   * Set delay unlock time (0-250 seconds)
   */
  async setDelayUnlockTime(seconds: number): Promise<CommandResponse> {
    if (seconds < 0 || seconds > 250) {
      throw new Error("Delay time must be between 0 and 250 seconds");
    }

    const response = await this.sendCommand(0x39, [seconds]);
    return response;
  }

  /**
   * Set baud rate
   */
  async setBaudRate(rate: BaudRate): Promise<CommandResponse> {
    const rateMap: Record<BaudRate, number> = {
      9600: 0,
      19200: 1,
      57600: 2,
      115200: 3,
    };

    const response = await this.sendCommand(0x40, [rateMap[rate]]);
    return response;
  }

  /**
   * Get version information (OTA commands)
   */
  async getVersion(): Promise<VersionResponse | Buffer> {
    // Build OTA packet format
    const packet = Buffer.alloc(6);
    packet[0] = 0xf5; // STX for OTA
    packet[1] = 0xb6; // Get version command
    packet[2] = this.config.address; // ADDR
    packet[3] = 0x00; // DATALEN
    packet[4] = 0x5f; // ETX for OTA

    // Calculate checksum
    let checksum = 0;
    for (let i = 0; i < 5; i++) {
      checksum += packet[i];
    }
    packet[5] = checksum & 0xff;

    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error("Not connected to lock controller"));
        return;
      }

      const commandObj: CommandObject = {
        packet,
        command: 0xb6,
        resolve: (response: Buffer) => {
          if (response.length >= 8) {
            resolve({
              softwareVersion: response[6],
              hardwareVersion: response[7],
            });
          } else {
            resolve(response);
          }
        },
        reject,
        timestamp: Date.now(),
      };

      this.commandQueue.push(commandObj);
      this._processQueue();
    });
  }
}

/**
 * CU12 specific implementation
 */
export class KerrongCU12 extends KerrongLockController {
  constructor(config: LockControllerConfig = {}) {
    super({ ...config, model: "CU12" });
  }
}

/**
 * CU16 specific implementation
 */
export class KerrongCU16 extends KerrongLockController {
  constructor(config: LockControllerConfig = {}) {
    super({ ...config, model: "CU16" });
  }
}

/**
 * Factory function to create appropriate controller
 */
export function createController(
  config: LockControllerConfig
): KerrongLockController {
  const model = config.model?.toUpperCase() as ModelType;

  switch (model) {
    case "CU12":
      return new KerrongCU12(config);
    case "CU16":
      return new KerrongCU16(config);
    default:
      throw new Error("Unsupported model. Use CU12 or CU16");
  }
}

// Default export
export default KerrongLockController;
