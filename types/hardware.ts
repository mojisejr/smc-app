export interface HardwareDevice {
  initialize(config: any): Promise<boolean>;
  getSlotStatus(): Promise<SlotStatus[]>;
  unlockSlot(slotId: number): Promise<boolean>;
  unlockAllSlots(): Promise<boolean>;
  testCommunication(): Promise<boolean>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export interface SlotStatus {
  slotId: number;
  isLocked: boolean;
}

export interface HardwareConfig {
  port: string;
  baudRate: number;
  timeout?: number;
}

export interface DeviceDetectionResult {
  port: string | null;
  deviceType: 'KU16' | 'CU12' | 'UNKNOWN';
}