/**
 * CU12 Hardware Controller Class
 *
 * Main class for CU12 protocol communication and hardware control.
 * Handles serial communication, command execution, and state management.
 */

import { SerialPort } from "serialport";
import { PacketLengthParser } from "@serialport/parser-packet-length";
import { BrowserWindow } from "electron";
import { EventEmitter } from "events";
import {
  buildCommand,
  createGetStatusCommand,
  createUnlockCommand,
  createInitializeCommand,
  createSetUnlockTimeCommand,
  createGetVersionCommand,
  CU12_COMMANDS,
  ASK_VALUES,
  PROTOCOL_CONSTANTS,
} from "./utils/command-parser";
import { CU12ResponseHandler, LockStatus } from "./utils/response-handler";

// CU12 state interface
export interface CU12State {
  connected: boolean;
  opening: boolean;
  dispensing: boolean;
  waitForLockedBack: boolean;
  waitForDispenseLockedBack: boolean;
  openingSlot?: {
    slotId: number;
    hn: string;
    timestamp: number;
  };
}

// CU12 configuration interface
export interface CU12Config {
  path: string;
  baudRate?: number;
  address?: number;
  unlockTime?: number;
  delayTime?: number;
  pushDoorTime?: number;
}

// CU12 events interface
export interface CU12Events {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  status: (status: LockStatus[]) => void;
  unlock: (locknum: number, success: boolean) => void;
  opening: (slotId: number, hn: string) => void;
  locked_back: (slotId: number) => void;
  dispensing: (slotId: number) => void;
  dispense_complete: (slotId: number) => void;
}

/**
 * CU12 Hardware Controller Class
 */
export class CU12 extends EventEmitter {
  private serialPort: SerialPort;
  private parser: PacketLengthParser;
  private responseHandler: CU12ResponseHandler;
  private win: BrowserWindow;

  // Configuration
  private path: string;
  private baudRate: number;
  private address: number;
  private unlockTime: number;
  private delayTime: number;
  private pushDoorTime: number;

  // State
  private state: CU12State = {
    connected: false,
    opening: false,
    dispensing: false,
    waitForLockedBack: false,
    waitForDispenseLockedBack: false,
  };

  constructor(config: CU12Config, win: BrowserWindow) {
    super();

    this.win = win;
    this.path = config.path;
    this.baudRate = config.baudRate || 19200;
    this.address = config.address || 0x00;
    this.unlockTime = config.unlockTime || 0x0037; // 550ms default
    this.delayTime = config.delayTime || 0;
    this.pushDoorTime = config.pushDoorTime || 0;

    // Initialize response handler
    this.responseHandler = new CU12ResponseHandler();
    this.setupResponseHandler();

    // Initialize serial port
    this.initializeSerialPort();
  }

  /**
   * Setup response handler events
   */
  private setupResponseHandler(): void {
    this.responseHandler.on("connected", () => {
      this.state.connected = true;
      this.emit("connected");
    });

    this.responseHandler.on("disconnected", () => {
      this.state.connected = false;
      this.emit("disconnected");
    });

    this.responseHandler.on("error", (error: Error) => {
      this.emit("error", error);
    });

    this.responseHandler.on("status", (status: LockStatus[]) => {
      this.emit("status", status);
    });

    this.responseHandler.on("unlock", (locknum: number, success: boolean) => {
      this.emit("unlock", locknum, success);

      if (success && this.state.opening) {
        this.handleUnlockSuccess(locknum);
      }
    });

    this.responseHandler.on("timeout", (command: string) => {
      this.emit("error", new Error(`Command timeout: ${command}`));
    });
  }

  /**
   * Initialize serial port
   */
  private initializeSerialPort(): void {
    this.serialPort = new SerialPort({
      path: this.path,
      baudRate: this.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      autoOpen: false,
    });

    // Setup packet parser
    this.parser = this.serialPort.pipe(
      new PacketLengthParser({
        delimiter: PROTOCOL_CONSTANTS.STX,
        packetOverhead: PROTOCOL_CONSTANTS.MIN_PACKET_SIZE,
      })
    );

    this.setupEventHandlers();
  }

  /**
   * Setup serial port event handlers
   */
  private setupEventHandlers(): void {
    // Serial port events
    this.serialPort.on("open", () => {
      console.log(`CU12: Serial port opened on ${this.path}`);
      this.responseHandler.emitConnected();
    });

    this.serialPort.on("close", () => {
      console.log("CU12: Serial port closed");
      this.responseHandler.emitDisconnected();
    });

    this.serialPort.on("error", (error) => {
      console.error("CU12: Serial port error:", error);
      this.emit("error", error);
    });

    // Parser events
    this.parser.on("data", (data: Buffer) => {
      this.responseHandler.processData(data);
    });

    this.parser.on("error", (error) => {
      console.error("CU12: Parser error:", error);
      this.emit("error", error);
    });
  }

  /**
   * Open serial port connection
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.serialPort.isOpen) {
        resolve();
        return;
      }

      this.serialPort.open((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Close serial port connection
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.serialPort.isOpen) {
        resolve();
        return;
      }

      this.serialPort.close((error) => {
        if (error) {
          console.error("CU12: Error closing port:", error);
        }
        resolve();
      });
    });
  }

  /**
   * Send command and wait for response
   * @param command Command buffer to send
   * @param commandId Unique command identifier
   * @param description Command description for logging
   * @returns Promise that resolves with response or rejects with error
   */
  private async sendCommand(
    command: Buffer,
    commandId: string,
    description: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serialPort.isOpen) {
        reject(new Error("Serial port not open"));
        return;
      }

      // Register pending command
      this.responseHandler.registerPendingCommand(
        commandId,
        resolve,
        reject,
        description
      );

      // Send command
      this.serialPort.write(command, (error) => {
        if (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Get lock status for all locks
   * @returns Promise that resolves with lock status array
   */
  async getStatus(): Promise<LockStatus[]> {
    const command = createGetStatusCommand(this.address);
    return this.sendCommand(command, "getStatus", "Get Status");
  }

  /**
   * Unlock specific lock
   * @param locknum Lock number to unlock (0-11)
   * @returns Promise that resolves with success status
   */
  async unlock(locknum: number): Promise<boolean> {
    if (locknum < 0 || locknum > 11) {
      throw new Error(`Invalid lock number: ${locknum}`);
    }

    const command = createUnlockCommand(this.address, locknum);
    return this.sendCommand(
      command,
      `unlock_${locknum}`,
      `Unlock Lock ${locknum}`
    );
  }

  /**
   * Initialize device (reset to factory defaults)
   * @returns Promise that resolves with success status
   */
  async initialize(): Promise<boolean> {
    const command = createInitializeCommand(this.address);
    const result = await this.sendCommand(
      command,
      "initialize",
      "Initialize Device"
    );

    if (result) {
      // Wait >500ms after initialization as per protocol
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    return result;
  }

  /**
   * Set unlock time
   * @param time Time in 10ms units (default: 550ms = 0x0037)
   * @returns Promise that resolves with success status
   */
  async setUnlockTime(time: number): Promise<boolean> {
    const command = createSetUnlockTimeCommand(this.address, time);
    const result = await this.sendCommand(
      command,
      "setUnlockTime",
      "Set Unlock Time"
    );

    if (result) {
      // Wait >500ms after setting time as per protocol
      await new Promise((resolve) => setTimeout(resolve, 600));
      this.unlockTime = time;
    }

    return result;
  }

  /**
   * Get device version information
   * @returns Promise that resolves with version info
   */
  async getVersion(): Promise<{ softVersion: number; hardVersion: number }> {
    const command = createGetVersionCommand(this.address);
    return this.sendCommand(command, "getVersion", "Get Version");
  }

  /**
   * Set baud rate
   * @param baudRate Baud rate (0:9600, 1:19200, 2:57600, 3:115200)
   * @returns Promise that resolves with success status
   */
  async setBaudRate(baudRate: number): Promise<boolean> {
    if (baudRate < 0 || baudRate > 3) {
      throw new Error(`Invalid baud rate index: ${baudRate}`);
    }

    const data = Buffer.alloc(1);
    data[0] = baudRate;
    const command = buildCommand(
      this.address,
      0x0c,
      CU12_COMMANDS.SET_BAUD_RATE,
      data
    );

    const result = await this.sendCommand(
      command,
      "setBaudRate",
      "Set Baud Rate"
    );

    if (result) {
      // Wait >500ms after setting baud rate as per protocol
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    return result;
  }

  /**
   * Set delayed unlock time
   * @param delayTime Delay time in seconds
   * @returns Promise that resolves with success status
   */
  async setDelayTime(delayTime: number): Promise<boolean> {
    if (delayTime < 0 || delayTime > 255) {
      throw new Error(`Invalid delay time: ${delayTime}`);
    }

    const data = Buffer.alloc(1);
    data[0] = delayTime;
    const command = buildCommand(
      this.address,
      0x0c,
      CU12_COMMANDS.SET_DELAY_TIME,
      data
    );

    const result = await this.sendCommand(
      command,
      "setDelayTime",
      "Set Delay Time"
    );

    if (result) {
      // Wait >500ms after setting delay time as per protocol
      await new Promise((resolve) => setTimeout(resolve, 600));
      this.delayTime = delayTime;
    }

    return result;
  }

  /**
   * Set push door wait time
   * @param pushDoorTime Wait time in seconds
   * @returns Promise that resolves with success status
   */
  async setPushDoorTime(pushDoorTime: number): Promise<boolean> {
    if (pushDoorTime < 0 || pushDoorTime > 255) {
      throw new Error(`Invalid push door time: ${pushDoorTime}`);
    }

    const data = Buffer.alloc(1);
    data[0] = pushDoorTime;
    const command = buildCommand(
      this.address,
      0x0c,
      CU12_COMMANDS.SET_PUSH_DOOR_TIME,
      data
    );

    const result = await this.sendCommand(
      command,
      "setPushDoorTime",
      "Set Push Door Time"
    );

    if (result) {
      // Wait >500ms after setting push door time as per protocol
      await new Promise((resolve) => setTimeout(resolve, 600));
      this.pushDoorTime = pushDoorTime;
    }

    return result;
  }

  /**
   * Handle successful unlock operation
   * @param locknum Lock number that was unlocked
   */
  private handleUnlockSuccess(locknum: number): void {
    if (this.state.opening && this.state.openingSlot) {
      const slotId = this.state.openingSlot.slotId;
      const hn = this.state.openingSlot.hn;

      // Emit opening event
      this.emit("opening", slotId, hn);

      // Set state for locked back detection
      this.state.waitForLockedBack = true;

      // Start timer for locked back detection
      setTimeout(() => {
        if (this.state.waitForLockedBack) {
          this.state.waitForLockedBack = false;
          this.emit("locked_back", slotId);
        }
      }, this.unlockTime * 10 + 1000); // Unlock time + 1 second buffer
    }
  }

  /**
   * Start dispensing process
   * @param slotId Slot ID for dispensing
   * @param hn Hospital number
   */
  startDispensing(slotId: number, hn: string): void {
    if (this.state.dispensing) {
      throw new Error("Already dispensing");
    }

    this.state.dispensing = true;
    this.state.openingSlot = {
      slotId,
      hn,
      timestamp: Date.now(),
    };

    // Emit dispensing event
    this.emit("dispensing", slotId);
  }

  /**
   * Complete dispensing process
   * @param slotId Slot ID that completed dispensing
   */
  completeDispensing(slotId: number): void {
    if (!this.state.dispensing) {
      return;
    }

    this.state.dispensing = false;
    this.state.openingSlot = undefined;
    this.state.waitForLockedBack = false;
    this.state.waitForDispenseLockedBack = false;

    // Emit dispense complete event
    this.emit("dispense_complete", slotId);
  }

  /**
   * Get current state
   * @returns Current CU12 state
   */
  getState(): CU12State {
    return { ...this.state };
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): CU12Config {
    return {
      path: this.path,
      baudRate: this.baudRate,
      address: this.address,
      unlockTime: this.unlockTime,
      delayTime: this.delayTime,
      pushDoorTime: this.pushDoorTime,
    };
  }

  /**
   * Check if connected
   * @returns True if serial port is open
   */
  isConnected(): boolean {
    return this.serialPort.isOpen;
  }

  /**
   * Get pending command count
   * @returns Number of pending commands
   */
  getPendingCommandCount(): number {
    return this.responseHandler.getPendingCommandCount();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.responseHandler.clearPendingCommands();
    this.removeAllListeners();
  }
}
