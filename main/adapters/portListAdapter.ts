import { ipcMain } from 'electron';
import { SerialPort } from 'serialport';
import { getHardwareType } from '../setting/getHardwareType';
import { KU16 } from '../ku16';
import { CU12Device } from '../hardware/cu12/device';

/**
 * Universal Port List Adapter
 * Routes 'get-port-list' IPC calls to appropriate hardware-specific implementation
 * Provides unified port listing functionality for both KU16 and CU12
 */
export const registerUniversalPortListHandler = (ku16Instance: KU16 | null) => {
  ipcMain.handle('get-port-list', async (event, payload) => {
    try {
      console.log('[ADAPTER] Universal port list handler called');
      
      // Auto-detect current hardware type
      const hardwareInfo = await getHardwareType();
      console.log(`[ADAPTER] Getting port list for ${hardwareInfo.type} hardware`);
      
      if (hardwareInfo.type === 'CU12') {
        // CU12 Mode - Use SerialPort.list() with CU12-compatible filtering
        console.log('[ADAPTER] Getting CU12 compatible port list');
        
        const ports = await SerialPort.list();
        console.log(`[ADAPTER] Found ${ports.length} total serial ports`);
        
        // Filter ports suitable for CU12 (similar to CU12Device.autoDetectDevice)
        const compatiblePorts = ports.filter(port => 
          port.path && (
            port.path.includes('USB') ||
            port.path.includes('ttyUSB') ||
            port.path.includes('ttyACM') ||
            port.path.includes('COM') ||
            port.path.includes('usbserial')
          )
        );
        
        console.log(`[ADAPTER] Found ${compatiblePorts.length} CU12-compatible ports`);
        
        return compatiblePorts.map(port => ({
          path: port.path,
          manufacturer: port.manufacturer || 'Unknown',
          serialNumber: port.serialNumber || 'Unknown',
          vendorId: port.vendorId || 'Unknown',
          productId: port.productId || 'Unknown',
          compatible: 'CU12'
        }));
        
      } else if (hardwareInfo.type === 'KU16' && ku16Instance) {
        // KU16 Mode - Use existing KU16 implementation
        console.log('[ADAPTER] Routing to KU16 port list handler');
        
        const ports = await SerialPort.list();
        console.log(`[ADAPTER] Found ${ports.length} total serial ports for KU16`);
        
        return ports.map(port => ({
          path: port.path,
          manufacturer: port.manufacturer || 'Unknown',
          serialNumber: port.serialNumber || 'Unknown',
          vendorId: port.vendorId || 'Unknown',
          productId: port.productId || 'Unknown',
          compatible: 'KU16'
        }));
        
      } else {
        // Fallback - Generic port listing
        console.log('[ADAPTER] Using generic port list (no specific hardware)');
        
        const ports = await SerialPort.list();
        console.log(`[ADAPTER] Found ${ports.length} generic serial ports`);
        
        return ports.map(port => ({
          path: port.path,
          manufacturer: port.manufacturer || 'Unknown',
          serialNumber: port.serialNumber || 'Unknown',
          vendorId: port.vendorId || 'Unknown',
          productId: port.productId || 'Unknown',
          compatible: 'Generic'
        }));
      }
      
    } catch (error) {
      console.error('[ADAPTER] Universal port list handler error:', error.message);
      return {
        error: error.message,
        ports: []
      };
    }
  });
  
  console.log('[ADAPTER] Universal port list handler registered successfully');
};