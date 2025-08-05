/**
 * KU16 Hardware Device Interface
 * Extracted from monolithic KU16 class and modernized
 * Following CU12 pattern for consistency
 */

import { SerialPort, PacketLengthParser } from "serialport";
import { BrowserWindow } from "electron";
import { KU16Protocol } from './protocol';
import { KU16Config, KU16SlotStatus, OperationResult, UnlockPayload, DispensePayload, KU16Response } from './types';
import { Slot } from "../../../db/model/slot.model";
import { User } from "../../../db/model/user.model";
import { unifiedLoggingService } from "../../services/unified-logging.service";

export class KU16Device {
  private serialPort: SerialPort;
  private parser: PacketLengthParser;
  private protocol: KU16Protocol;
  private mainWindow: BrowserWindow;
  private config: KU16Config;
  
  // Hardware state flags (preserved from original)
  private connected = false;
  private opening = false;
  private dispensing = false;
  private waitForLockedBack = false;
  private waitForDispenseLockedBack = false;
  private openingSlot: { slotId: number; hn: string; timestamp: number } | null = null;

  constructor(config: KU16Config, mainWindow: BrowserWindow) {
    this.config = config;
    this.mainWindow = mainWindow;
    this.protocol = new KU16Protocol();
    this.openingSlot = null;

    // Initialize serial port (from original implementation)
    this.serialPort = new SerialPort(
      {
        path: config.port,
        baudRate: config.baudRate,
        autoOpen: true,
      },
      (error) => {
        if (error) {
          this.connected = false;
          unifiedLoggingService.logError({
            message: `KU16Device connection failed: ${error.message}`,
            component: "KU16Device",
            details: { port: config.port, error: error.message },
          });
        } else {
          this.connected = true;
          unifiedLoggingService.logInfo({
            message: `KU16Device connected successfully`,
            component: "KU16Device",
            details: { port: config.port },
          });
        }
      }
    );

    this.parser = this.serialPort.pipe(
      new PacketLengthParser({
        delimiter: 0x02,
        packetOverhead: 8,
      })
    );
  }

  /**
   * Initialize the device and start listening for responses
   */
  async initialize(): Promise<boolean> {
    try {
      await unifiedLoggingService.logInfo({
        message: "Initializing KU16Device",
        component: "KU16Device",
        details: { 
          port: this.config.port,
          baudRate: this.config.baudRate,
          maxSlots: this.config.maxSlots 
        },
      });

      // Start listening for responses
      this.startListening();

      // Send initial status check
      this.sendStatusCheck();

      return this.connected;
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `KU16Device initialization failed: ${error.message}`,
        component: "KU16Device",
        details: { error: error.message },
      });
      return false;
    }
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current device status
   */
  async getStatus(): Promise<KU16SlotStatus[]> {
    this.sendStatusCheck();
    
    // Return current slot status from database
    const slots = await Slot.findAll({
      limit: this.config.maxSlots,
      order: [['slotId', 'ASC']]
    });

    return slots.map(slot => ({
      slotId: slot.dataValues.slotId,
      occupied: slot.dataValues.occupied || false,
      opening: slot.dataValues.opening || false,
      isActive: slot.dataValues.isActive || false,
      hn: slot.dataValues.hn || undefined,
      timestamp: slot.dataValues.timestamp || undefined,
      lastOp: slot.dataValues.lastOp || undefined,
    }));
  }

  /**
   * Unlock a specific slot
   */
  async unlock(payload: UnlockPayload): Promise<OperationResult> {
    try {
      if (!this.isConnected() || this.waitForLockedBack) {
        return {
          success: false,
          error: "Device not connected or waiting for previous operation to complete"
        };
      }

      await unifiedLoggingService.logInfo({
        message: `KU16Device unlock slot ${payload.slotId}`,
        component: "KU16Device",
        details: { slotId: payload.slotId, hn: payload.hn },
      });

      const command = this.protocol.createUnlockCommand(payload.slotId);
      this.serialPort.write(command);
      
      this.opening = true;
      this.openingSlot = {
        slotId: payload.slotId,
        hn: payload.hn,
        timestamp: payload.timestamp
      };

      return {
        success: true,
        message: `Unlock command sent for slot ${payload.slotId}`
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `KU16Device unlock failed: ${error.message}`,
        component: "KU16Device",
        details: { slotId: payload.slotId, error: error.message },
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Dispense medication from slot
   */
  async dispense(payload: DispensePayload): Promise<OperationResult> {
    try {
      // Validate user
      const user = await User.findOne({ where: { passkey: payload.passkey } });
      if (!user) {
        return {
          success: false,
          error: "ไม่พบผู้ใช้งาน"
        };
      }

      if (!this.isConnected() || this.waitForDispenseLockedBack) {
        return {
          success: false,
          error: "Device not connected or waiting for previous operation to complete"
        };
      }

      // Check slot status
      const slot = await Slot.findOne({ where: { slotId: payload.slotId } });
      if (!slot || !slot.dataValues.occupied || !slot.dataValues.hn) {
        return {
          success: false,
          error: "Slot is not occupied or HN is missing"
        };
      }

      await unifiedLoggingService.logInfo({
        message: `KU16Device dispense slot ${payload.slotId}`,
        component: "KU16Device",
        details: { slotId: payload.slotId, hn: payload.hn, user: user.dataValues.name },
      });

      const command = this.protocol.createUnlockCommand(payload.slotId);
      this.serialPort.write(command);

      this.opening = true;
      this.dispensing = true;
      this.openingSlot = {
        slotId: payload.slotId,
        hn: payload.hn,
        timestamp: payload.timestamp
      };

      return {
        success: true,
        message: `Dispense command sent for slot ${payload.slotId}`
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `KU16Device dispense failed: ${error.message}`,
        component: "KU16Device",
        details: { slotId: payload.slotId, error: error.message },
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset a slot
   */
  async resetSlot(slotId: number): Promise<OperationResult> {
    try {
      await Slot.update(
        { hn: null, occupied: false, opening: false },
        { where: { slotId: slotId } }
      );

      await unifiedLoggingService.logInfo({
        message: `KU16Device reset slot ${slotId}`,
        component: "KU16Device",
        details: { slotId },
      });

      return {
        success: true,
        message: `Slot ${slotId} reset successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deactivate a slot
   */
  async deactivateSlot(slotId: number): Promise<OperationResult> {
    try {
      await Slot.update(
        { isActive: false, hn: null, occupied: false, opening: false },
        { where: { slotId: slotId } }
      );

      await unifiedLoggingService.logInfo({
        message: `KU16Device deactivate slot ${slotId}`,
        component: "KU16Device",
        details: { slotId },
      });

      // Clear state flags
      this.dispensing = false;
      this.opening = false;

      // Send deactivation events
      this.mainWindow.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: false,
      });
      this.mainWindow.webContents.send("dispensing", {
        slot: slotId,
        dispensing: false,
        unlocking: false,
        reset: false,
      });
      this.mainWindow.webContents.send("deactivated", { slotId });

      return {
        success: true,
        message: `Slot ${slotId} deactivated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reactivate a slot
   */
  async reactivateSlot(slotId: number): Promise<OperationResult> {
    try {
      await Slot.update(
        { isActive: true, hn: null, occupied: false, opening: false },
        { where: { slotId: slotId } }
      );

      return {
        success: true,
        message: `Slot ${slotId} reactivated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send status check command
   */
  sendStatusCheck(): void {
    if (this.isConnected()) {
      const command = this.protocol.createStatusCommand();
      this.serialPort.write(command);
    }
  }

  /**
   * Close the device connection
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.serialPort && this.serialPort.isOpen) {
        this.serialPort.close((error) => {
          if (error) {
            unifiedLoggingService.logError({
              message: `KU16Device close error: ${error.message}`,
              component: "KU16Device",
              details: { error: error.message },
            });
          }
          this.connected = false;
          resolve();
        });
      } else {
        this.connected = false;
        resolve();
      }
    });
  }

  /**
   * Start listening for hardware responses
   */
  private startListening(): void {
    this.parser.on("data", async (data: Buffer) => {
      try {
        const response = this.protocol.parseResponse(data);
        await this.handleResponse(response, data);
      } catch (error) {
        await unifiedLoggingService.logError({
          message: `KU16Device response parsing error: ${error.message}`,
          component: "KU16Device",
          details: { error: error.message },
        });
      }
    });
  }

  /**
   * Handle hardware responses (from original implementation logic)
   */
  private async handleResponse(response: KU16Response, rawData: Buffer): Promise<void> {
    const slotStates = response.slotStates;

    if (response.command === "RETURN_SINGLE_DATA") {
      if (this.opening && !this.dispensing && !this.waitForLockedBack) {
        await this.handleUnlockResponse(slotStates);
      } else if (this.opening && this.waitForLockedBack) {
        await this.handleLockedBackResponse(slotStates);
      } else if (this.opening && this.dispensing && !this.waitForDispenseLockedBack) {
        await this.handleDispenseResponse(slotStates);
      } else if (this.opening && this.dispensing && this.waitForDispenseLockedBack) {
        await this.handleDispenseLockedBackResponse(slotStates);
      } else {
        await this.handleStatusResponse(slotStates);
      }
    }
  }

  // Response handlers (preserved from original logic)
  private async handleStatusResponse(slotStates: number[]): Promise<void> {
    const slotData = await this.parseSlotStates(slotStates, this.config.maxSlots);
    
    await unifiedLoggingService.logInfo({
      message: `KU16Device status received: ${slotStates.toString()}`,
      component: "KU16Device",
      details: { data: slotStates.toString() },
    });

    this.mainWindow.webContents.send("init-res", slotData);
  }

  private async handleUnlockResponse(slotStates: number[]): Promise<void> {
    if (!this.openingSlot) return;

    const openingSlotNumber = this.protocol.checkOpeningSlot(slotStates, this.openingSlot.slotId);
    
    if (openingSlotNumber === -1) {
      await unifiedLoggingService.logError({
        message: "KU16Device unlock response: slot not found",
        component: "KU16Device",
        details: { slotId: this.openingSlot.slotId },
      });
      return;
    }

    this.waitForLockedBack = true;
    await Slot.update(
      { ...this.openingSlot, opening: true, occupied: false },
      { where: { slotId: this.openingSlot.slotId } }
    );

    this.mainWindow.webContents.send("unlocking", {
      ...this.openingSlot,
      unlocking: true,
    });
  }

  private async handleLockedBackResponse(slotStates: number[]): Promise<void> {
    if (!this.openingSlot) return;

    const openingSlotNumber = this.protocol.checkOpeningSlot(slotStates, this.openingSlot.slotId);
    
    if (openingSlotNumber === this.openingSlot.slotId) {
      // Still opening
      this.mainWindow.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: true,
      });
      return;
    }

    if (openingSlotNumber === -1) {
      // Slot locked back
      this.waitForLockedBack = false;
      this.opening = false;
      this.dispensing = false;

      await Slot.update(
        { ...this.openingSlot, opening: false, occupied: true },
        { where: { slotId: this.openingSlot.slotId } }
      );

      this.mainWindow.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: false,
      });
      this.mainWindow.webContents.send("unlocking-success", {
        slotId: this.openingSlot.slotId,
        timestamp: new Date().toISOString(),
      });

      await this.handleStatusResponse(slotStates);
    }
  }

  private async handleDispenseResponse(slotStates: number[]): Promise<void> {
    if (!this.openingSlot) return;

    const openingSlotNumber = this.protocol.checkOpeningSlot(slotStates, this.openingSlot.slotId);
    
    if (openingSlotNumber === -1) {
      await unifiedLoggingService.logError({
        message: "KU16Device dispense response: slot not found",
        component: "KU16Device",
        details: { slotId: this.openingSlot.slotId },
      });
      return;
    }

    this.waitForDispenseLockedBack = true;
    await Slot.update(
      { ...this.openingSlot, opening: true },
      { where: { slotId: this.openingSlot.slotId } }
    );

    this.mainWindow.webContents.send("dispensing", {
      ...this.openingSlot,
      dispensing: true,
    });
  }

  private async handleDispenseLockedBackResponse(slotStates: number[]): Promise<void> {
    if (!this.openingSlot) return;

    const openingSlotNumber = this.protocol.checkOpeningSlot(slotStates, this.openingSlot.slotId);
    
    if (openingSlotNumber === this.openingSlot.slotId) {
      // Still opening
      return;
    }

    if (openingSlotNumber === -1) {
      // Slot locked back
      this.waitForDispenseLockedBack = false;
      this.opening = false;
      this.dispensing = false;

      this.mainWindow.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: false,
        reset: true,
      });
      this.mainWindow.webContents.send("dispensing-success", {
        slotId: this.openingSlot.slotId,
        timestamp: new Date().toISOString(),
      });
      this.mainWindow.webContents.send("dispensing-locked-back", {
        slotId: this.openingSlot.slotId,
        timestamp: new Date().toISOString(),
      });

      await this.handleStatusResponse(slotStates);
    }
  }

  /**
   * Parse slot states from hardware response (from original implementation)
   */
  private async parseSlotStates(slotStates: number[], maxSlots: number): Promise<KU16SlotStatus[]> {
    if (slotStates.length <= 0 || maxSlots <= 0) {
      return [];
    }

    const slotsFromDb = await Slot.findAll();

    const slotData = slotStates.map((state, index) => {
      const dbSlot = slotsFromDb[index];
      return {
        slotId: dbSlot?.dataValues.slotId || null,
        hn: dbSlot?.dataValues.hn || null,
        occupied: dbSlot?.dataValues.occupied || false,
        timestamp: dbSlot?.dataValues.timestamp || null,
        opening: dbSlot?.dataValues.opening || false,
        isActive: (dbSlot?.dataValues.isActive && state === 1) || false,
      } as KU16SlotStatus;
    });

    return slotData.slice(0, maxSlots);
  }

  /**
   * Get serial port list (static method for compatibility)
   */
  static async getPortList() {
    return await SerialPort.list();
  }
}