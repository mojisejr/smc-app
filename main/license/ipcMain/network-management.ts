import { ipcMain } from 'electron';
import { NetworkManager } from '../network-manager';
import { logger } from '../../logger';

/**
 * IPC Handlers for Network Management
 * 
 * รองรับ NetworkRetryDialog และการจัดการเครือข่าย
 */

const networkManager = NetworkManager.getInstance();

// Test ESP32 connection พร้อม retry
ipcMain.handle('test-esp32-connection', async (event, options?: {
  ip?: string;
  timeout?: number;
  retries?: number;
}) => {
  try {
    console.log('info: IPC - Testing ESP32 connection...');
    
    // ตั้งค่า parameters ถ้ามี
    if (options?.timeout || options?.retries) {
      networkManager.setConnectionParams(
        options.timeout || 10000,
        options.retries || 3,
        2000
      );
    }
    
    if (options?.ip) {
      networkManager.setESP32IP(options.ip);
    }
    
    const result = await networkManager.testESP32Connection(options?.ip);
    
    await logger({
      user: 'system',
      message: `IPC ESP32 test - Success: ${result.success}, IP: ${result.ip}, MAC: ${result.macAddress}`
    });
    
    return result;
    
  } catch (error: any) {
    console.error('error: IPC ESP32 connection test failed:', error);
    
    await logger({
      user: 'system',
      message: `IPC ESP32 test failed: ${error.message}`
    });
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
});

// Run network diagnostics
ipcMain.handle('run-network-diagnostics', async (event, ip?: string) => {
  try {
    console.log('info: IPC - Running network diagnostics...');
    
    const diagnostics = await networkManager.runNetworkDiagnostics(ip);
    
    await logger({
      user: 'system',
      message: `Network diagnostics completed - HTTP: ${diagnostics.httpAccess}, MAC: ${diagnostics.macAddressAccessible}`
    });
    
    return {
      success: true,
      data: diagnostics
    };
    
  } catch (error: any) {
    console.error('error: IPC network diagnostics failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Scan for ESP32 devices
ipcMain.handle('scan-for-esp32', async (event, ipRange?: string[]) => {
  try {
    console.log('info: IPC - Scanning for ESP32 devices...');
    
    const results = await networkManager.scanForESP32(ipRange);
    const foundDevices = results.filter(r => r.success);
    
    await logger({
      user: 'system',
      message: `ESP32 scan completed - found ${foundDevices.length} device(s)`
    });
    
    return {
      success: true,
      data: results,
      foundCount: foundDevices.length
    };
    
  } catch (error: any) {
    console.error('error: IPC ESP32 scan failed:', error);
    
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
});

// Update ESP32 IP address
ipcMain.handle('set-esp32-ip', async (event, ip: string) => {
  try {
    console.log(`info: IPC - Setting ESP32 IP to: ${ip}`);
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      throw new Error('Invalid IP address format');
    }
    
    networkManager.setESP32IP(ip);
    
    await logger({
      user: 'system',
      message: `ESP32 IP updated to: ${ip}`
    });
    
    return {
      success: true,
      ip: ip
    };
    
  } catch (error: any) {
    console.error('error: IPC set ESP32 IP failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Get current network manager status
ipcMain.handle('get-network-status', async (event) => {
  try {
    const status = networkManager.getStatus();
    
    return {
      success: true,
      data: status
    };
    
  } catch (error: any) {
    console.error('error: IPC get network status failed:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
});

// Open system network settings (platform-specific)
ipcMain.handle('open-network-settings', async (event) => {
  try {
    console.log('info: IPC - Opening system network settings...');
    
    const { shell } = require('electron');
    let success = false;
    
    // Platform-specific network settings
    switch (process.platform) {
      case 'win32':
        // Windows Network Settings
        await shell.openExternal('ms-settings:network');
        success = true;
        break;
        
      case 'darwin':
        // macOS Network Preferences
        await shell.openExternal('x-apple.systempreferences:com.apple.Network-Settings.extension');
        success = true;
        break;
        
      case 'linux':
        // Linux network settings (varies by desktop environment)
        try {
          await shell.openExternal('nm-connection-editor');
          success = true;
        } catch {
          // Fallback for different Linux distributions
          await shell.openExternal('gnome-control-center network');
          success = true;
        }
        break;
        
      default:
        throw new Error(`Network settings not available for platform: ${process.platform}`);
    }
    
    if (success) {
      await logger({
        user: 'system',
        message: 'Opened system network settings'
      });
    }
    
    return {
      success: success,
      platform: process.platform
    };
    
  } catch (error: any) {
    console.error('error: IPC open network settings failed:', error);
    
    return {
      success: false,
      error: error.message,
      platform: process.platform
    };
  }
});

// Export for main process registration
export const networkIPCHandlers = {
  'test-esp32-connection': true,
  'run-network-diagnostics': true,
  'scan-for-esp32': true,
  'set-esp32-ip': true,
  'get-network-status': true,
  'open-network-settings': true,
};

console.log('info: Network management IPC handlers registered');