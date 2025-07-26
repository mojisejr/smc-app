import { SerialPort } from 'serialport';
import { CU12Protocol } from './protocol';
import {
  CU12Config,
  SlotStatus,
  CU12_CONSTANTS
} from './types';

export class CU12Device {
  private protocol: CU12Protocol;
  private serialPort: SerialPort | null = null;
  private config: CU12Config;
  private connected = false;
  private responseTimeout = 3000; // 3 seconds as specified

  constructor(config: CU12Config) {
    this.config = {
      baudRate: CU12_CONSTANTS.DEFAULT_BAUDRATE,
      timeout: 3000,
      ...config
    };
    this.protocol = new CU12Protocol();
  }

  /**
   * Initialize connection to CU12 device
   */
  async initialize(): Promise<boolean> {
    try {
      await this.connect();
      
      // Test communication with a status check
      await this.testCommunication();
      
      this.connected = true;
      return true;
    } catch (error) {
      console.error('CU12 initialization failed:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Connect to serial port
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort({
        path: this.config.port,
        baudRate: this.config.baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      });

      this.serialPort.open((error) => {
        if (error) {
          reject(new Error(`Failed to open port ${this.config.port}: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Test communication by sending a status check command
   */
  async testCommunication(): Promise<boolean> {
    try {
      const statusCommand = this.protocol.buildGetStatusCommand();
      const response = await this.sendCommand(statusCommand);
      return this.protocol.isValidResponse(response);
    } catch (error) {
      console.error('CU12 communication test failed:', error);
      return false;
    }
  }

  /**
   * Send command and wait for response
   */
  private async sendCommand(command: Buffer): Promise<Buffer> {
    if (!this.serialPort || !this.connected) {
      throw new Error('CU12 device not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('CU12 command timeout'));
      }, this.responseTimeout);

      // Set up one-time data listener
      const onData = (data: Buffer) => {
        clearTimeout(timeout);
        this.serialPort?.removeListener('data', onData);
        resolve(data);
      };

      this.serialPort.on('data', onData);

      // Send the command
      this.serialPort.write(command, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.serialPort?.removeListener('data', onData);
          reject(new Error(`Failed to send command: ${error.message}`));
        }
      });
    });
  }

  /**
   * Get status of all slots (12 slots)
   */
  async getSlotStatus(addr: number = 0x00): Promise<SlotStatus[]> {
    try {
      const command = this.protocol.buildGetStatusCommand(addr);
      const response = await this.sendCommand(command);
      
      if (!this.protocol.isValidResponse(response)) {
        throw new Error('Invalid response from CU12 device');
      }

      return this.protocol.parseSlotStatus(response);
    } catch (error) {
      console.error('Failed to get slot status:', error);
      throw error;
    }
  }

  /**
   * Unlock a specific slot
   * @param slotId Slot number (1-12)
   * @param addr Device address
   */
  async unlockSlot(slotId: number, addr: number = 0x00): Promise<boolean> {
    if (slotId < 1 || slotId > CU12_CONSTANTS.MAX_SLOTS) {
      throw new Error(`Invalid slot ID: ${slotId}. Must be 1-${CU12_CONSTANTS.MAX_SLOTS}`);
    }

    try {
      // Convert slot ID to lock number (0-based)
      const lockNum = slotId - 1;
      const command = this.protocol.buildUnlockCommand(addr, lockNum);
      const response = await this.sendCommand(command);
      
      return this.protocol.isUnlockSuccessful(response);
    } catch (error) {
      console.error(`Failed to unlock slot ${slotId}:`, error);
      throw error;
    }
  }

  /**
   * Unlock all slots
   * @param addr Device address
   */
  async unlockAllSlots(addr: number = 0x00): Promise<boolean> {
    try {
      const command = this.protocol.buildUnlockCommand(addr, CU12_CONSTANTS.UNLOCK_ALL_SLOTS);
      const response = await this.sendCommand(command);
      
      return this.protocol.isUnlockSuccessful(response);
    } catch (error) {
      console.error('Failed to unlock all slots:', error);
      throw error;
    }
  }

  /**
   * Check if device is connected
   */
  isConnected(): boolean {
    return this.connected && this.serialPort?.isOpen === true;
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.serialPort && this.serialPort.isOpen) {
        this.serialPort.close((error) => {
          if (error) {
            console.error('Error closing serial port:', error);
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
   * Auto-detect CU12 device on available serial ports
   */
  static async autoDetectDevice(): Promise<string | null> {
    try {
      const ports = await SerialPort.list();
      console.log(`📡 Found ${ports.length} serial ports`);
      
      const potentialPorts = ports.filter(port => 
        port.path && (
          port.path.includes('USB') ||
          port.path.includes('ttyUSB') ||
          port.path.includes('ttyACM') ||
          port.path.includes('COM')
        )
      );

      console.log(`🔍 Auto-detecting CU12 device...`);
      console.log(`📡 Found ${potentialPorts.length} potential CU12 ports`);

      for (const port of potentialPorts) {
        try {
          console.log(`🧪 Testing ${port.path}...`);
          
          const device = new CU12Device({
            port: port.path!,
            baudRate: CU12_CONSTANTS.DEFAULT_BAUDRATE,
            timeout: 3000
          });

          if (await device.initialize()) {
            console.log(`✅ CU12 detected on ${port.path}`);
            await device.disconnect();
            return port.path!;
          }
          
          await device.disconnect();
        } catch (error) {
          console.log(`❌ Failed to connect to ${port.path}`);
        }
      }

      console.log('❌ No CU12 device found on any port');
      return null;
    } catch (error) {
      console.error('Error during CU12 auto-detection:', error);
      return null;
    }
  }

  /**
   * Get device configuration
   */
  getConfig(): CU12Config {
    return { ...this.config };
  }

  /**
   * Update device configuration
   */
  updateConfig(newConfig: Partial<CU12Config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}