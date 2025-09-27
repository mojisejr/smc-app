/**
 * Cross-Platform PlatformIO Integration Utilities
 * Handles platform detection and PlatformIO command resolution
 * for macOS local development and container production environments
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { getBoardConfig, isChipSupported, isMedicalDeviceCompatible } from './board-configs';

const execAsync = promisify(exec);

export interface PlatformIOResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
}

export interface ChipDetectionResult {
  success: boolean;
  chipType?: string;
  boardConfig?: string;
  isSupported?: boolean;
  isMedicalDeviceCompatible?: boolean;
  macAddress?: string;
  chipDetails?: {
    chipRevision?: string;
    flashSize?: string;
    crystalFreq?: string;
  };
  error?: string;
}

export class CrossPlatformPlatformIO {
  
  /**
   * Get the correct PlatformIO command path based on environment
   */
  static getPlatformIOCommand(): string {
    const isRunningOnMacOS = process.platform === 'darwin';
    
    if (isRunningOnMacOS) {
      // macOS (development or container): use local PlatformIO installation
      return '/Users/non/Library/Python/3.9/bin/pio';
    } else {
      // Other platforms: use PATH
      return 'pio';
    }
  }

  /**
   * Check if PlatformIO is available in current environment
   */
  static async isPlatformIOAvailable(): Promise<boolean> {
    try {
      const pioCommand = this.getPlatformIOCommand();
      const { stdout } = await execAsync(`${pioCommand} --version`);
      console.log('info: PlatformIO available:', stdout.trim());
      return true;
    } catch (error) {
      console.log('info: PlatformIO not available:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Execute PlatformIO command with cross-platform support
   */
  static async executePlatformIO(args: string[], options?: {
    cwd?: string;
    timeout?: number;
  }): Promise<PlatformIOResult> {
    return new Promise((resolve) => {
      const pioCommand = this.getPlatformIOCommand();
      const timeout = options?.timeout || 300000; // 5 minutes default
      
      console.log(`info: Executing PlatformIO: ${pioCommand} ${args.join(' ')}`);
      
      const platformio = spawn(pioCommand, args, {
        cwd: options?.cwd || process.cwd(),
        env: {
          ...process.env,
          PLATFORMIO_CORE_DIR: this.getPlatformIOCoreDir()
        }
      });

      let output = '';
      let errorOutput = '';
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        platformio.kill();
        resolve({
          success: false,
          error: `PlatformIO command timeout (${timeout}ms)`,
          code: -1
        });
      }, timeout);

      // Collect stdout
      platformio.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        console.log('info: PlatformIO stdout:', chunk.trim());
      });

      // Collect stderr
      platformio.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        console.log('info: PlatformIO stderr:', chunk.trim());
      });

      // Handle completion
      platformio.on('close', (code) => {
        clearTimeout(timeoutHandle);
        
        if (code === 0) {
          resolve({
            success: true,
            output,
            code
          });
        } else {
          resolve({
            success: false,
            output,
            error: errorOutput || `PlatformIO command failed with code ${code}`,
            code: code || -1
          });
        }
      });

      // Handle spawn errors
      platformio.on('error', (error) => {
        clearTimeout(timeoutHandle);
        resolve({
          success: false,
          error: `Failed to execute PlatformIO: ${error.message}`,
          code: -2
        });
      });
    });
  }

  /**
   * Detect ESP32 chip information using esptool.py
   */
  static async detectChipInfo(devicePort: string): Promise<ChipDetectionResult> {
    try {
      console.log(`INFO: Detecting chip information for device on port ${devicePort}`);
      
      // Use esptool.py to detect chip information
      const { stdout, stderr } = await execAsync(`python -m esptool --port ${devicePort} chip_id`);
      
      // Parse esptool output to extract chip information
      const output = stdout + stderr;
      console.log(`DEBUG: esptool output: ${output}`);
      
      // Extract chip type from output
      let chipType = 'ESP32'; // Default fallback
      const chipTypeMatch = output.match(/Chip is (ESP32[^\s]*)/i);
      if (chipTypeMatch) {
        chipType = chipTypeMatch[1].toUpperCase();
      }
      
      // Extract MAC address
      let macAddress: string | undefined;
      const macMatch = output.match(/MAC: ([a-fA-F0-9:]{17})/);
      if (macMatch) {
        macAddress = macMatch[1];
      }
      
      // Extract chip details
      const chipDetails: ChipDetectionResult['chipDetails'] = {};
      const revisionMatch = output.match(/Chip revision: (\d+)/);
      if (revisionMatch) {
        chipDetails.chipRevision = revisionMatch[1];
      }
      
      const flashSizeMatch = output.match(/Flash size: ([^\s]+)/);
      if (flashSizeMatch) {
        chipDetails.flashSize = flashSizeMatch[1];
      }
      
      const crystalMatch = output.match(/Crystal frequency: ([^\s]+)/);
      if (crystalMatch) {
        chipDetails.crystalFreq = crystalMatch[1];
      }
      
      // Get board configuration and compatibility
      const boardConfig = getBoardConfig(chipType);
      const isSupported = isChipSupported(chipType);
      const isMedicalCompatible = isMedicalDeviceCompatible(chipType);
      
      console.log(`INFO: Detected chip: ${chipType}, Board: ${boardConfig}, Supported: ${isSupported}, Medical Compatible: ${isMedicalCompatible}`);
      
      return {
        success: true,
        chipType,
        boardConfig,
        isSupported,
        isMedicalDeviceCompatible: isMedicalCompatible,
        macAddress,
        chipDetails: Object.keys(chipDetails).length > 0 ? chipDetails : undefined
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during chip detection';
      console.log(`ERROR: Chip detection failed: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Build and upload firmware to ESP32 device with pre-deployment chip verification
   */
  static async buildAndUpload(projectPath: string, devicePort: string, expectedChipType?: string): Promise<PlatformIOResult> {
    console.log(`INFO: Building and uploading to ${devicePort} from ${projectPath}`);
    
    // Pre-deployment chip verification for medical device compliance
    if (expectedChipType) {
      console.log(`INFO: Verifying chip type before deployment (expected: ${expectedChipType})`);
      const chipDetection = await this.detectChipInfo(devicePort);
      
      if (!chipDetection.success) {
        return {
          success: false,
          error: `Pre-deployment chip verification failed: ${chipDetection.error}`,
          code: -3
        };
      }
      
      if (chipDetection.chipType !== expectedChipType) {
        return {
          success: false,
          error: `Chip type mismatch: expected ${expectedChipType}, detected ${chipDetection.chipType}`,
          code: -4
        };
      }
      
      if (!chipDetection.isSupported) {
        return {
          success: false,
          error: `Unsupported chip type: ${chipDetection.chipType}`,
          code: -5
        };
      }
      
      if (!chipDetection.isMedicalDeviceCompatible) {
        console.log(`WARNING: Chip ${chipDetection.chipType} is not medical device compatible`);
      }
      
      console.log(`INFO: Pre-deployment verification passed for ${chipDetection.chipType}`);
    }
    
    return await this.executePlatformIO([
      'run',
      '--target', 'upload',
      '--upload-port', devicePort,
      '--project-dir', projectPath
    ], {
      cwd: projectPath,
      timeout: 300000 // 5 minutes for build + upload
    });
  }

  /**
   * Get device list with cross-platform support
   */
  static async getDeviceList(): Promise<PlatformIOResult> {
    console.log('info: Getting PlatformIO device list');
    
    return await this.executePlatformIO([
      'device', 'list', '--json-output'
    ], {
      timeout: 10000 // 10 seconds for device list
    });
  }

  /**
   * Get environment information for debugging
   */
  static getEnvironmentInfo() {
    const isRunningOnMacOS = process.platform === 'darwin';
    
    return {
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development',
      isContainer: !!process.env.DOCKER_CONTAINER,
      isRunningOnMacOS,
      pioCommand: this.getPlatformIOCommand(),
      platformioDir: this.getPlatformIOCoreDir()
    };
  }

  /**
   * Get appropriate PlatformIO core directory for current environment
   */
  static getPlatformIOCoreDir(): string {
    const isRunningOnMacOS = process.platform === 'darwin';
    
    if (isRunningOnMacOS) {
      // macOS (development or container): use user's home directory
      return process.env.HOME + '/.platformio';
    } else {
      // Other platforms: use app directory
      return process.env.PLATFORMIO_CORE_DIR || '/app/.platformio';
    }
  }
}

// Convenience exports
export const getPlatformIOCommand = () => CrossPlatformPlatformIO.getPlatformIOCommand();
export const isPlatformIOAvailable = () => CrossPlatformPlatformIO.isPlatformIOAvailable();
export const executePlatformIO = (args: string[], options?: { cwd?: string; timeout?: number }) => 
  CrossPlatformPlatformIO.executePlatformIO(args, options);
export const buildAndUpload = (projectPath: string, devicePort: string, expectedChipType?: string) => 
  CrossPlatformPlatformIO.buildAndUpload(projectPath, devicePort, expectedChipType);
export const getDeviceList = () => CrossPlatformPlatformIO.getDeviceList();
export const getEnvironmentInfo = () => CrossPlatformPlatformIO.getEnvironmentInfo();
export const detectChipInfo = (devicePort: string) => CrossPlatformPlatformIO.detectChipInfo(devicePort);