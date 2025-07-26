export { CU12Device } from './device';
export { CU12Protocol } from './protocol';
export * from './types';

// Convenience factory function for creating CU12 device instances
export function createCU12Device(port: string, baudRate: number = 19200) {
  return new CU12Device({
    port,
    baudRate,
    timeout: 3000
  });
}