import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';
import { logger } from '../logger';
import { getValidationMode, getPlatformWiFiStrategy, logPhase42Configuration } from '../utils/environment';
import { runtimeLogger, logHardwareOperation, PerformanceTimer } from '../logger/runtime-logger';

const execAsync = promisify(exec);

/**
 * System WiFi Manager
 * 
 * จัดการ WiFi connection ของระบบปฏิบัติการ
 * รองรับ Windows, macOS, และ Linux
 */

export interface WiFiNetwork {
  ssid: string;
  signal: string;
  security: string;
  connected: boolean;
}

export class SystemWiFiManager {
  private static platform = os.platform();

  /**
   * ดึงรายการ WiFi networks ที่พบ
   */
  static async scanNetworks(): Promise<WiFiNetwork[]> {
    const timer = new PerformanceTimer();
    
    try {
      console.log('info: Scanning for available WiFi networks');
      
      await logHardwareOperation('Starting WiFi network scan', {
        operation: 'wifi_scan_start',
        platform: this.platform
      });
      
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          command = 'netsh wlan show profiles';
          break;
        case 'darwin':
          command = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s';
          break;
        case 'linux':
          command = 'nmcli device wifi list';
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      const { stdout } = await execAsync(command);
      const networks = this.parseNetworkList(stdout);
      
      await logHardwareOperation(`WiFi scan completed - found ${networks.length} networks`, {
        operation: 'wifi_scan_success',
        platform: this.platform,
        networks_found: networks.length,
        duration_ms: timer.stop()
      });
      
      return networks;
      
    } catch (error) {
      console.error('error: Failed to scan WiFi networks:', error);
      
      await runtimeLogger({
        logType: 'hardware',
        component: 'wifi-manager',
        level: 'error',
        message: `WiFi network scan failed: ${error.message}`,
        metadata: {
          operation: 'wifi_scan_error',
          platform: this.platform,
          error: error.message,
          duration_ms: timer.stop()
        }
      });
      
      return [];
    }
  }

  /**
   * เชื่อมต่อกับ WiFi network (Phase 4.2)
   * รองรับ validation modes และ platform-specific strategies
   */
  static async connectToNetwork(ssid: string, password: string): Promise<boolean | { requiresManualConnection: boolean; platform: string; }> {
    const timer = new PerformanceTimer();
    
    try {
      const validationMode = getValidationMode();
      const wifiStrategy = getPlatformWiFiStrategy();
      
      console.log(`info: Phase 4.2 WiFi Connection - SSID: ${ssid}`);
      logPhase42Configuration();
      
      await logHardwareOperation(`Starting WiFi connection to ${ssid}`, {
        operation: 'wifi_connect_start',
        ssid: ssid,
        platform: this.platform,
        validation_mode: validationMode,
        wifi_strategy: wifiStrategy
      });
      
      // ตรวจสอบ validation mode
      if (validationMode === 'bypass') {
        console.log('info: [BYPASS] Skipping WiFi connection - license validation bypassed');
        await logger({
          user: "system",
          message: `WiFi connection bypassed - SMC_LICENSE_BYPASS_MODE=true`
        });
        
        await logHardwareOperation('WiFi connection bypassed due to validation mode', {
          operation: 'wifi_connect_bypass',
          ssid: ssid,
          validation_mode: validationMode,
          duration_ms: timer.stop()
        });
        
        return true;
      }
      
      // ตรวจสอบ WiFi strategy
      if (wifiStrategy === 'manual') {
        console.log('info: [MANUAL] Manual WiFi connection required - showing instructions to user');
        await logger({
          user: "system",
          message: `Manual WiFi connection required for ${this.platform} - SSID: ${ssid}`
        });
        
        await logHardwareOperation('WiFi connection requires manual setup', {
          operation: 'wifi_connect_manual_required',
          ssid: ssid,
          platform: this.platform,
          wifi_strategy: wifiStrategy,
          duration_ms: timer.stop()
        });
        
        return {
          requiresManualConnection: true,
          platform: this.platform
        };
      }
      
      // Auto WiFi connection (Windows หรือ forced auto mode)
      console.log(`info: [AUTO] Attempting automatic WiFi connection on ${this.platform}`);
      
      await logHardwareOperation(`Starting automatic WiFi connection on ${this.platform}`, {
        operation: 'wifi_connect_auto_start',
        ssid: ssid,
        platform: this.platform,
        wifi_strategy: wifiStrategy
      });
      
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          // Windows: สร้าง profile แล้วเชื่อมต่อ
          await this.createWindowsWiFiProfile(ssid, password);
          command = `netsh wlan connect name="${ssid}"`;
          break;
          
        case 'darwin':
          // macOS: ใช้ networksetup
          command = `networksetup -setairportnetwork en0 "${ssid}" "${password}"`;
          break;
          
        case 'linux':
          // Linux: ใช้ nmcli
          command = `nmcli device wifi connect "${ssid}" password "${password}"`;
          break;
          
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      console.log(`debug: Executing WiFi connect command for ${this.platform}`);
      
      await logHardwareOperation(`Executing WiFi connect command`, {
        operation: 'wifi_connect_command_execute',
        ssid: ssid,
        platform: this.platform,
        command_type: this.platform
      });
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('success')) {
        console.log(`debug: WiFi connect stderr: ${stderr}`);
        
        await runtimeLogger({
          logType: 'hardware',
          component: 'wifi-manager',
          level: 'warn',
          message: `WiFi connect command stderr: ${stderr}`,
          metadata: {
            operation: 'wifi_connect_command_stderr',
            ssid: ssid,
            platform: this.platform,
            stderr: stderr
          }
        });
      }
      
      // รอให้ connection สำเร็จ (เพิ่มเวลาสำหรับ macOS)
      console.log('info: Waiting for WiFi connection to establish...');
      await this.delay(7000);
      
      // ลองตรวจสอบการเชื่อมต่อหลายครั้ง (retry mechanism)
      await logHardwareOperation('Starting WiFi connection verification', {
        operation: 'wifi_connect_verification_start',
        ssid: ssid,
        max_retries: 3
      });
      
      let isConnected = false;
      for (let retryCount = 1; retryCount <= 3; retryCount++) {
        console.log(`info: Checking WiFi connection (attempt ${retryCount}/3)...`);
        
        await logHardwareOperation(`WiFi connection check attempt ${retryCount}`, {
          operation: 'wifi_connect_verification_attempt',
          ssid: ssid,
          attempt: retryCount,
          max_retries: 3
        });
        
        isConnected = await this.isConnectedTo(ssid);
        
        if (isConnected) {
          break;
        }
        
        if (retryCount < 3) {
          console.log('info: Connection check failed, retrying in 2 seconds...');
          await this.delay(2000);
        }
      }
      
      if (isConnected) {
        console.log(`info: Successfully connected to WiFi: ${ssid}`);
        await logger({
          user: "system",
          message: `Connected to WiFi network: ${ssid} after connection verification`
        });
        
        await logHardwareOperation(`WiFi connection successful to ${ssid}`, {
          operation: 'wifi_connect_success',
          ssid: ssid,
          platform: this.platform,
          verification_attempts: isConnected ? 'verified' : 'failed',
          duration_ms: timer.stop()
        });
        
        return true;
      } else {
        console.error(`error: Failed to connect to WiFi: ${ssid} (verified with ${3} attempts)`);
        
        await logHardwareOperation(`WiFi connection failed after verification attempts`, {
          operation: 'wifi_connect_failed',
          ssid: ssid,
          platform: this.platform,
          verification_attempts: 3,
          duration_ms: timer.stop()
        });
        
        return false;
      }
      
    } catch (error) {
      console.error(`error: WiFi connection failed:`, error);
      await logger({
        user: "system",
        message: `WiFi connection failed: ${ssid} - ${error.message}`
      });
      
      await runtimeLogger({
        logType: 'hardware',
        component: 'wifi-manager',
        level: 'error',
        message: `WiFi connection failed: ${error.message}`,
        metadata: {
          operation: 'wifi_connect_error',
          ssid: ssid,
          platform: this.platform,
          error: error.message,
          duration_ms: timer.stop()
        }
      });
      
      return false;
    }
  }

  /**
   * ตัดการเชื่อมต่อจาก WiFi network
   */
  static async disconnectFromNetwork(ssid: string): Promise<boolean> {
    try {
      console.log(`info: Disconnecting from WiFi network: ${ssid}`);
      
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          command = `netsh wlan disconnect`;
          break;
        case 'darwin':
          command = `networksetup -setairportpower en0 off && networksetup -setairportpower en0 on`;
          break;
        case 'linux':
          command = `nmcli device disconnect ifname wlan0`;
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      await execAsync(command);
      
      console.log(`info: Disconnected from WiFi: ${ssid}`);
      await logger({
        user: "system",
        message: `Disconnected from WiFi network: ${ssid}`
      });
      
      return true;
      
    } catch (error) {
      console.error(`error: WiFi disconnection failed:`, error);
      return false;
    }
  }

  /**
   * ตรวจสอบว่าเชื่อมต่อกับ network ที่ระบุอยู่หรือไม่ (Phase 4.2)
   * รองรับ validation modes ใหม่
   */
  static async isConnectedTo(ssid: string): Promise<boolean> {
    try {
      const validationMode = getValidationMode();
      
      // ตรวจสอบ validation mode
      if (validationMode === 'bypass') {
        console.log(`info: [BYPASS] Skipping WiFi connection check for: ${ssid}`);
        return true; // Bypass - ถือว่าเชื่อมต่อแล้ว
      }
      
      const currentNetwork = await this.getCurrentConnectedNetwork();
      const isConnected = currentNetwork === ssid;
      
      console.log(`debug: Current network: ${currentNetwork}, Target: ${ssid}, Connected: ${isConnected}`);
      return isConnected;
      
    } catch (error) {
      console.error('error: Failed to check WiFi connection:', error);
      return false;
    }
  }

  /**
   * ดึงชื่อ network ที่เชื่อมต่ออยู่ปัจจุบัน
   */
  static async getCurrentConnectedNetwork(): Promise<string | null> {
    try {
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          command = 'netsh wlan show interfaces';
          break;
        case 'darwin':
          command = 'networksetup -getairportnetwork en0';
          break;
        case 'linux':
          command = 'nmcli -t -f active,ssid dev wifi | egrep \'^yes\' | cut -d\\: -f2';
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      const { stdout } = await execAsync(command);
      return this.parseCurrentNetwork(stdout);
      
    } catch (error) {
      console.error('error: Failed to get current WiFi network:', error);
      return null;
    }
  }

  /**
   * ดึงรายการ networks ที่เชื่อมต่อได้
   */
  static async getCurrentConnections(): Promise<string[]> {
    try {
      const networks = await this.scanNetworks();
      return networks.filter(network => network.connected).map(network => network.ssid);
    } catch (error) {
      console.error('error: Failed to get current connections:', error);
      return [];
    }
  }

  /**
   * สร้าง WiFi profile สำหรับ Windows
   */
  private static async createWindowsWiFiProfile(ssid: string, password: string): Promise<void> {
    try {
      const profileXml = `
<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig>
    <SSID>
      <name>${ssid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${password}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>`.trim();

      // เขียนไฟล์ profile ชั่วคราว
      const fs = require('fs');
      const profilePath = `${process.env.TEMP || '/tmp'}/wifi_profile_${Date.now()}.xml`;
      fs.writeFileSync(profilePath, profileXml);

      // เพิ่ม profile
      const command = `netsh wlan add profile filename="${profilePath}"`;
      await execAsync(command);

      // ลบไฟล์ชั่วคราว
      fs.unlinkSync(profilePath);
      
      console.log(`debug: Windows WiFi profile created for ${ssid}`);
      
    } catch (error) {
      console.error('error: Failed to create Windows WiFi profile:', error);
      throw error;
    }
  }

  /**
   * Parse network list output ตาม platform
   */
  private static parseNetworkList(output: string): WiFiNetwork[] {
    const networks: WiFiNetwork[] = [];
    
    try {
      switch (this.platform) {
        case 'win32':
          // Parse Windows netsh output
          const windowsLines = output.split('\n');
          for (const line of windowsLines) {
            if (line.includes('All User Profile')) {
              const match = line.match(/:\s*(.+)$/);
              if (match) {
                networks.push({
                  ssid: match[1].trim(),
                  signal: 'Unknown',
                  security: 'Unknown',
                  connected: false
                });
              }
            }
          }
          break;
          
        case 'darwin':
          // Parse macOS airport output
          const macLines = output.split('\n');
          for (const line of macLines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
              networks.push({
                ssid: parts[0],
                signal: parts[2] || 'Unknown',
                security: parts[6] || 'Unknown',
                connected: false
              });
            }
          }
          break;
          
        case 'linux':
          // Parse Linux nmcli output
          const linuxLines = output.split('\n');
          for (const line of linuxLines) {
            if (line.includes('Infra')) {
              const parts = line.split(/\s+/);
              if (parts.length >= 2) {
                networks.push({
                  ssid: parts[1] || 'Unknown',
                  signal: parts[5] || 'Unknown',
                  security: parts[7] || 'Unknown',
                  connected: line.includes('*')
                });
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('error: Failed to parse network list:', error);
    }
    
    return networks;
  }

  /**
   * Parse current network output ตาม platform
   */
  private static parseCurrentNetwork(output: string): string | null {
    try {
      switch (this.platform) {
        case 'win32':
          // Windows: หา SSID ใน interfaces output
          const windowsMatch = output.match(/SSID\s*:\s*(.+)/);
          return windowsMatch ? windowsMatch[1].trim() : null;
          
        case 'darwin':
          // macOS: รองรับ format หลายแบบ
          console.log('debug: macOS networksetup output:', output);
          
          // Pattern 1: "Current Wi-Fi Network: NetworkName"
          let macMatch = output.match(/Current Wi-Fi Network:\s*(.+)/);
          if (macMatch) {
            const networkName = macMatch[1].trim();
            console.log(`debug: Found network using pattern 1: ${networkName}`);
            return networkName;
          }
          
          // Pattern 2: "Wi-Fi Network: NetworkName" 
          macMatch = output.match(/Wi-Fi Network:\s*(.+)/);
          if (macMatch) {
            const networkName = macMatch[1].trim();
            console.log(`debug: Found network using pattern 2: ${networkName}`);
            return networkName;
          }
          
          // Pattern 3: Direct network name output
          const trimmedOutput = output.trim();
          if (trimmedOutput && !trimmedOutput.includes('You are not associated with an AirPort network')) {
            console.log(`debug: Found network using pattern 3: ${trimmedOutput}`);
            return trimmedOutput;
          }
          
          console.log('debug: No network found in macOS output');
          return null;
          
        case 'linux':
          // Linux: direct output from nmcli
          return output.trim() || null;
          
        default:
          return null;
      }
    } catch (error) {
      console.error('error: Failed to parse current network:', error);
      return null;
    }
  }

  /**
   * Utility delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ตรวจสอบว่า WiFi adapter เปิดอยู่หรือไม่
   */
  static async isWiFiEnabled(): Promise<boolean> {
    try {
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          command = 'netsh interface show interface "Wi-Fi"';
          break;
        case 'darwin':
          command = 'networksetup -getairportpower en0';
          break;
        case 'linux':
          command = 'nmcli radio wifi';
          break;
        default:
          return false;
      }

      const { stdout } = await execAsync(command);
      
      switch (this.platform) {
        case 'win32':
          return stdout.includes('Connected');
        case 'darwin':
          return stdout.includes('On');
        case 'linux':
          return stdout.includes('enabled');
        default:
          return false;
      }
      
    } catch (error) {
      console.error('error: Failed to check WiFi status:', error);
      return false;
    }
  }

  /**
   * เปิด WiFi adapter
   */
  static async enableWiFi(): Promise<boolean> {
    try {
      console.log('info: Enabling WiFi adapter');
      
      let command = '';
      
      switch (this.platform) {
        case 'win32':
          command = 'netsh interface set interface "Wi-Fi" enable';
          break;
        case 'darwin':
          command = 'networksetup -setairportpower en0 on';
          break;
        case 'linux':
          command = 'nmcli radio wifi on';
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      await execAsync(command);
      
      // รอให้ WiFi เริ่มทำงาน
      await this.delay(2000);
      
      const isEnabled = await this.isWiFiEnabled();
      
      if (isEnabled) {
        console.log('info: WiFi adapter enabled successfully');
        await logger({
          user: "system",
          message: "WiFi adapter enabled"
        });
      }
      
      return isEnabled;
      
    } catch (error) {
      console.error('error: Failed to enable WiFi:', error);
      return false;
    }
  }
}