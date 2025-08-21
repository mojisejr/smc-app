import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { ESP32Device } from '@/types';
import { promisify } from 'util';
import { exec } from 'child_process';

export async function GET() {
  try {
    console.log('info: Starting ESP32 device detection...');
    
    // Check environment and platform
    const isContainer = !!process.env.DOCKER_CONTAINER;
    const environment = process.env.NODE_ENV || 'development';
    const platform = process.platform;
    const isDevelopmentMacOS = environment === 'development' && platform === 'darwin';
    
    console.log(`info: Running in ${isContainer ? 'container' : 'local'} environment (${environment}) on ${platform}`);
    
    let devices: ESP32Device[] = [];
    let detectionMethod = '';
    
    // Cross-platform detection strategy
    if (isDevelopmentMacOS) {
      console.log('info: Using macOS development mode - attempting local PlatformIO detection');
      try {
        devices = await detectViaLocalPlatformIO();
        detectionMethod = 'macOS local PlatformIO';
      } catch {
        console.log('info: Local PlatformIO not available, using mock data for development');
        devices = generateMockESP32Devices();
        detectionMethod = 'macOS mock data';
      }
    } else {
      console.log('info: Using container detection mode');
      devices = await detectESP32DevicesMultiMethod();
      detectionMethod = 'container multi-method';
    }
    
    console.log(`info: Detection completed using ${detectionMethod}, found ${devices.length} devices`);
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length,
      detection_method: detectionMethod,
      environment: {
        container: isContainer,
        mode: environment,
        platform: platform,
        development_bypass: isDevelopmentMacOS
      }
    });
  } catch (error) {
    console.error('error: ESP32 detection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      devices: [],
      troubleshooting: [
        'Check if ESP32 is connected via USB',
        'For macOS development: Install PlatformIO globally (pip install platformio)',
        'For container mode: Verify Docker configuration',
        'Test: pio device list (local) or docker-compose exec esp32-tool pio device list',
        'Ensure ESP32 drivers are installed on host OS'
      ]
    }, { status: 500 });
  }
}

const execAsync = promisify(exec);

// Local PlatformIO detection (for macOS development)
async function detectViaLocalPlatformIO(): Promise<ESP32Device[]> {
  console.log('info: Attempting local PlatformIO detection...');
  
  try {
    // Set up environment for PlatformIO (macOS specific path)
    const pioPath = '/Users/non/Library/Python/3.9/bin/pio';
    
    // Check if PlatformIO is installed globally
    const { stdout } = await execAsync(`${pioPath} --version`);
    console.log('info: Local PlatformIO found:', stdout.trim());
    
    // Get device list using local PlatformIO
    const { stdout: deviceOutput } = await execAsync(`${pioPath} device list --json-output`);
    
    // Clean up the output (remove warnings) and parse JSON
    const cleanOutput = deviceOutput.split('\n').find(line => line.trim().startsWith('[')) || '[]';
    const devices = parseDeviceListLocalPlatformIO(cleanOutput);
    
    console.log(`info: Local PlatformIO found ${devices.length} ESP32 devices`);
    return devices;
  } catch (error) {
    throw new Error(`Local PlatformIO detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate mock ESP32 devices for development
function generateMockESP32Devices(): ESP32Device[] {
  console.log('info: Generating mock ESP32 devices for development');
  
  return [
    {
      port: '/dev/cu.usbserial-59690215041',
      description: 'ESP32 with CH340 USB-to-Serial (Mock)',
      manufacturer: 'WCH (CH340) - Development Mock'
    },
    {
      port: '/dev/cu.SLAB_USBtoUART',
      description: 'ESP32 with Silicon Labs USB-to-Serial (Mock)', 
      manufacturer: 'Silicon Labs - Development Mock'
    }
  ];
}

// Multi-method ESP32 detection with fallback mechanisms
async function detectESP32DevicesMultiMethod(): Promise<ESP32Device[]> {
  console.log('info: Starting multi-method ESP32 device detection...');
  
  const detectionMethods = [
    detectViaPlatformIO,
    detectViaDirectUSBScan,
    detectViaPlatformSpecific
  ];
  
  const allDevices: ESP32Device[] = [];
  const methodResults: string[] = [];
  
  // Try each method and collect results
  for (let i = 0; i < detectionMethods.length; i++) {
    const methodName = detectionMethods[i].name;
    console.log(`info: Trying detection method ${i + 1}/3: ${methodName}`);
    
    try {
      const methodDevices = await detectionMethods[i]();
      methodResults.push(`${methodName}: ${methodDevices.length} devices`);
      
      // Merge devices, avoiding duplicates based on port
      methodDevices.forEach(device => {
        if (!allDevices.find(existing => existing.port === device.port)) {
          allDevices.push(device);
        }
      });
      
      console.log(`info: ${methodName} found ${methodDevices.length} devices`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`info: ${methodName} failed: ${errorMsg}`);
      methodResults.push(`${methodName}: failed (${errorMsg})`);
    }
  }
  
  console.log(`info: Detection complete. Methods results: ${methodResults.join(', ')}`);
  console.log(`info: Total unique ESP32 devices found: ${allDevices.length}`);
  
  return allDevices;
}

// Method 1: PlatformIO device list (existing method)
async function detectViaPlatformIO(): Promise<ESP32Device[]> {
  return new Promise((resolve, reject) => {
    const platformio = spawn('pio', ['device', 'list', '--json-output'], {
      env: {
        ...process.env,
        PLATFORMIO_CORE_DIR: process.env.PLATFORMIO_CORE_DIR || '/app/.platformio'
      }
    });
    let output = '';
    let errorOutput = '';

    // Set timeout for PlatformIO command
    const timeout = setTimeout(() => {
      platformio.kill();
      reject(new Error('PlatformIO device list timeout (5s)'));
    }, 5000);

    platformio.stdout.on('data', (data) => {
      output += data.toString();
    });

    platformio.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    platformio.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        try {
          const devices = parseDeviceListPlatformIO(output);
          resolve(devices);
        } catch (error) {
          reject(new Error(`Failed to parse PlatformIO output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        reject(new Error(`PlatformIO command failed (code ${code}): ${errorOutput}`));
      }
    });

    platformio.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to execute PlatformIO: ${error.message}`));
    });
  });
}

// Method 2: Direct USB device scan
async function detectViaDirectUSBScan(): Promise<ESP32Device[]> {
  console.log('info: Scanning USB devices directly...');
  
  try {
    // Get list of tty devices
    const { stdout: ttyDevices } = await execAsync('ls -la /dev/tty* 2>/dev/null | grep -E "(USB|ACM|cu\\.|SLAB)" || echo ""');
    
    // Get USB device info if available
    let usbInfo = '';
    try {
      const { stdout: lsusbOutput } = await execAsync('lsusb 2>/dev/null || echo ""');
      usbInfo = lsusbOutput;
    } catch {
      console.log('info: lsusb not available in container');
    }
    
    const devices: ESP32Device[] = [];
    
    // Parse tty device list
    if (ttyDevices.trim()) {
      const deviceLines = ttyDevices.trim().split('\n');
      
      for (const line of deviceLines) {
        const portMatch = line.match(/\/dev\/(tty[^\\s]+|cu\\.[^\\s]+)/);
        if (portMatch) {
          const port = `/dev/${portMatch[1]}`;
          
          // Check if this looks like an ESP32 device
          if (isESP32Device(port, line, usbInfo)) {
            devices.push({
              port,
              description: extractDeviceDescription(port, line, usbInfo),
              manufacturer: extractManufacturer(line, usbInfo)
            });
          }
        }
      }
    }
    
    console.log(`info: Direct USB scan found ${devices.length} potential ESP32 devices`);
    return devices;
  } catch (error) {
    throw new Error(`Direct USB scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Method 3: Platform-specific device enumeration
async function detectViaPlatformSpecific(): Promise<ESP32Device[]> {
  const platform = process.platform;
  console.log(`info: Platform-specific detection for: ${platform}`);
  
  try {
    switch (platform) {
      case 'darwin': // macOS
        return await detectMacOSDevices();
      case 'linux': // Linux/WSL
        return await detectLinuxDevices();
      case 'win32': // Windows
        return await detectWindowsDevices();
      default:
        console.log(`info: Platform ${platform} not specifically supported, skipping`);
        return [];
    }
  } catch (error) {
    throw new Error(`Platform-specific detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Platform-specific implementations
async function detectMacOSDevices(): Promise<ESP32Device[]> {
  try {
    const { stdout } = await execAsync('ls -la /dev/cu.* 2>/dev/null | grep -E "(usbserial|SLAB_USBtoUART|usbmodem)" || echo ""');
    
    const devices: ESP32Device[] = [];
    if (stdout.trim()) {
      const deviceLines = stdout.trim().split('\n');
      
      for (const line of deviceLines) {
        const portMatch = line.match(/\/dev\/(cu\\.[^\\s]+)/);
        if (portMatch) {
          const port = `/dev/${portMatch[1]}`;
          devices.push({
            port,
            description: `macOS Serial Device (${portMatch[1]})`,
            manufacturer: extractMacOSManufacturer(portMatch[1])
          });
        }
      }
    }
    
    return devices;
  } catch (error) {
    throw new Error(`macOS device detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function detectLinuxDevices(): Promise<ESP32Device[]> {
  try {
    const { stdout } = await execAsync('ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo ""');
    
    const devices: ESP32Device[] = [];
    if (stdout.trim()) {
      const deviceLines = stdout.trim().split('\n');
      
      for (const line of deviceLines) {
        const portMatch = line.match(/\/dev\/(tty(USB|ACM)[0-9]+)/);
        if (portMatch) {
          const port = `/dev/${portMatch[1]}`;
          devices.push({
            port,
            description: `Linux Serial Device (${portMatch[1]})`,
            manufacturer: 'Unknown'
          });
        }
      }
    }
    
    return devices;
  } catch (error) {
    throw new Error(`Linux device detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function detectWindowsDevices(): Promise<ESP32Device[]> {
  try {
    // Windows in WSL environment
    const { stdout } = await execAsync('ls -la /dev/ttyS* 2>/dev/null || echo ""');
    
    const devices: ESP32Device[] = [];
    if (stdout.trim()) {
      const deviceLines = stdout.trim().split('\n');
      
      for (const line of deviceLines) {
        const portMatch = line.match(/\/dev\/(ttyS[0-9]+)/);
        if (portMatch) {
          const port = `/dev/${portMatch[1]}`;
          devices.push({
            port,
            description: `Windows Serial Device (${portMatch[1]})`,
            manufacturer: 'Unknown'
          });
        }
      }
    }
    
    return devices;
  } catch (error) {
    throw new Error(`Windows device detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper functions for device recognition and parsing
function parseDeviceListLocalPlatformIO(output: string): ESP32Device[] {
  try {
    const data = JSON.parse(output);
    return data
      .filter((device: { description?: string; hwid?: string; port?: string }) => {
        // Look for ESP32-related indicators in description or hardware ID
        const searchText = `${device.description || ''} ${device.hwid || ''} ${device.port || ''}`.toLowerCase();
        return searchText.includes('usbserial') || 
               searchText.includes('ch340') || 
               searchText.includes('cp210') ||
               searchText.includes('1a86:55d4') || // CH340 VID:PID
               searchText.includes('usb single serial');
      })
      .map((device: { port: string; description: string; hwid?: string }) => ({
        port: device.port,
        description: device.description || 'ESP32 Device',
        manufacturer: extractManufacturerFromHWID(device.hwid || '')
      }));
  } catch (error) {
    console.error('error: Failed to parse local PlatformIO output:', error);
    return [];
  }
}

function parseDeviceListPlatformIO(output: string): ESP32Device[] {
  try {
    const data = JSON.parse(output);
    return data
      .filter((device: { description?: string }) => 
        device.description && 
        (device.description.includes('ESP32') || 
         device.description.includes('CH340') ||
         device.description.includes('CP210') ||
         device.description.includes('Silicon Labs'))
      )
      .map((device: { port: string; description: string; manufacturer?: string }) => ({
        port: device.port,
        description: device.description,
        manufacturer: device.manufacturer || 'Unknown'
      }));
  } catch (error) {
    console.error('error: Failed to parse PlatformIO output:', error);
    return [];
  }
}

function isESP32Device(port: string, deviceLine: string, usbInfo: string): boolean {
  // Check for ESP32-related indicators
  const indicators = [
    'ESP32', 'CH340', 'CP210', 'CP2102', 'CP2104', 'SLAB_USBtoUART', 'Silicon Labs',
    'usbserial', 'usbmodem', 'UART', 'USB2.0-Serial'
  ];
  
  const searchText = (deviceLine + ' ' + usbInfo).toLowerCase();
  
  return indicators.some(indicator => 
    searchText.includes(indicator.toLowerCase())
  ) || port.includes('cu.usbserial') || port.includes('cu.SLAB');
}

function extractDeviceDescription(port: string, deviceLine: string, usbInfo: string): string {
  // Try to extract meaningful description from device line or USB info
  if (deviceLine.includes('CH340')) return 'ESP32 with CH340 USB-to-Serial';
  if (deviceLine.includes('CP210') || usbInfo.includes('CP210')) return 'ESP32 with CP210x USB-to-Serial';
  if (deviceLine.includes('Silicon Labs') || deviceLine.includes('SLAB')) return 'ESP32 with Silicon Labs USB-to-Serial';
  if (port.includes('usbserial')) return 'ESP32 USB Serial Device';
  if (port.includes('usbmodem')) return 'ESP32 USB Modem Device';
  
  return `ESP32 Serial Device (${port.split('/').pop()})`;
}

function extractManufacturer(deviceLine: string, usbInfo: string): string {
  const searchText = (deviceLine + ' ' + usbInfo).toLowerCase();
  
  if (searchText.includes('ch340') || searchText.includes('wch')) return 'WCH (CH340)';
  if (searchText.includes('cp210') || searchText.includes('silicon labs')) return 'Silicon Labs';
  if (searchText.includes('ftdi')) return 'FTDI';
  
  return 'Unknown';
}

function extractMacOSManufacturer(deviceName: string): string {
  if (deviceName.includes('usbserial')) return 'USB Serial';
  if (deviceName.includes('SLAB_USBtoUART')) return 'Silicon Labs';
  if (deviceName.includes('usbmodem')) return 'USB Modem';
  
  return 'Unknown';
}

function extractManufacturerFromHWID(hwid: string): string {
  const lowerHwid = hwid.toLowerCase();
  
  if (lowerHwid.includes('1a86:55d4')) return 'WCH (CH340)';
  if (lowerHwid.includes('10c4:ea60')) return 'Silicon Labs (CP210x)';
  if (lowerHwid.includes('0403:6001')) return 'FTDI';
  if (lowerHwid.includes('ch340') || lowerHwid.includes('wch')) return 'WCH (CH340)';
  if (lowerHwid.includes('cp210') || lowerHwid.includes('silicon')) return 'Silicon Labs';
  
  return 'Unknown';
}