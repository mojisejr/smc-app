import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';
import { logger } from '../logger';
import { isDevelopmentBypass, logEnvironmentInfo } from '../utils/environment';

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
    try {
      console.log('info: Scanning for available WiFi networks');
      
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
      return this.parseNetworkList(stdout);
      
    } catch (error) {
      console.error('error: Failed to scan WiFi networks:', error);
      return [];
    }
  }

  /**
   * เชื่อมต่อกับ WiFi network
   * รองรับ development bypass สำหรับ macOS development
   */
  static async connectToNetwork(ssid: string, password: string): Promise<boolean> {
    try {
      console.log(`info: Attempting to connect to WiFi network: ${ssid}`);
      
      // ตรวจสอบ development bypass
      if (isDevelopmentBypass()) {
        console.log('⚠️  Development Mode: WiFi connection bypassed on macOS');
        console.log(`info: Would connect to WiFi: ${ssid} (password: ${'*'.repeat(password.length)})`);
        logEnvironmentInfo();
        
        // Mock successful connection
        await this.delay(1000); // Simulate connection time
        
        await logger({
          user: "system",
          message: `[DEVELOPMENT] Mocked WiFi connection to: ${ssid}`
        });
        
        console.log(`info: [DEVELOPMENT] Mocked successful connection to WiFi: ${ssid}`);
        return true;
      }
      
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
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('success')) {
        console.log(`debug: WiFi connect stderr: ${stderr}`);
      }
      
      // รอให้ connection สำเร็จ
      await this.delay(3000);
      
      // ตรวจสอบการเชื่อมต่อ
      const isConnected = await this.isConnectedTo(ssid);
      
      if (isConnected) {
        console.log(`info: Successfully connected to WiFi: ${ssid}`);
        await logger({
          user: "system",
          message: `Connected to WiFi network: ${ssid}`
        });
        return true;
      } else {
        console.error(`error: Failed to connect to WiFi: ${ssid}`);
        return false;
      }
      
    } catch (error) {
      console.error(`error: WiFi connection failed:`, error);
      await logger({
        user: "system",
        message: `WiFi connection failed: ${ssid} - ${error.message}`
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
   * ตรวจสอบว่าเชื่อมต่อกับ network ที่ระบุอยู่หรือไม่
   * รองรับ development bypass สำหรับ macOS development
   */
  static async isConnectedTo(ssid: string): Promise<boolean> {
    try {
      // ตรวจสอบ development bypass
      if (isDevelopmentBypass()) {
        console.log(`debug: [DEVELOPMENT] Mocking connection check for: ${ssid}`);
        return true; // Mock successful connection
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
          // macOS: "Current Wi-Fi Network: NetworkName"
          const macMatch = output.match(/Current Wi-Fi Network:\s*(.+)/);
          return macMatch ? macMatch[1].trim() : null;
          
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