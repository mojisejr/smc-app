/**
 * Cross-Platform PlatformIO Integration Utilities
 * Handles platform detection and PlatformIO command resolution
 * for macOS local development and container production environments
 */

import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface PlatformIOResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
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
      let timeoutHandle: NodeJS.Timeout;

      // Set timeout
      timeoutHandle = setTimeout(() => {
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
   * Build and upload firmware to ESP32 device
   */
  static async buildAndUpload(projectPath: string, devicePort: string): Promise<PlatformIOResult> {
    console.log(`info: Building and uploading to ${devicePort} from ${projectPath}`);
    
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
export const buildAndUpload = (projectPath: string, devicePort: string) => 
  CrossPlatformPlatformIO.buildAndUpload(projectPath, devicePort);
export const getDeviceList = () => CrossPlatformPlatformIO.getDeviceList();
export const getEnvironmentInfo = () => CrossPlatformPlatformIO.getEnvironmentInfo();