/**
 * KU16 Hardware Module
 * Modern architecture following CU12 patterns
 */

export { KU16Device } from './device';
export { KU16Protocol } from './protocol';
export * from './types';
export * from './monitoringConfig';

// Convenience factory function for creating KU16 device instances
export function createKU16Device(port: string, baudRate: number = 19200, mainWindow: any): KU16Device {
  return new KU16Device({
    port,
    baudRate,
    timeout: 5000,
    maxSlots: 15
  }, mainWindow);
}