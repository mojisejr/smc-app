import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { ESP32Device } from '@/types';

export async function GET() {
  try {
    console.log('info: Starting ESP32 device detection...');
    
    const devices = await detectESP32Devices();
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length
    });
  } catch (error) {
    console.error('error: ESP32 detection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      devices: []
    }, { status: 500 });
  }
}

async function detectESP32Devices(): Promise<ESP32Device[]> {
  return new Promise((resolve, reject) => {
    // ใช้ PlatformIO device list
    const platformio = spawn('pio', ['device', 'list', '--json-output']);
    let output = '';
    let errorOutput = '';

    platformio.stdout.on('data', (data) => {
      output += data.toString();
    });

    platformio.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    platformio.on('close', (code) => {
      if (code === 0) {
        try {
          const devices = parseDeviceList(output);
          resolve(devices);
        } catch (error) {
          reject(new Error(`Failed to parse device list: ${error.message}`));
        }
      } else {
        reject(new Error(`PlatformIO command failed: ${errorOutput}`));
      }
    });

    platformio.on('error', (error) => {
      reject(new Error(`Failed to execute PlatformIO: ${error.message}`));
    });
  });
}

function parseDeviceList(output: string): ESP32Device[] {
  try {
    const data = JSON.parse(output);
    return data
      .filter((device: any) => 
        device.description && 
        (device.description.includes('ESP32') || 
         device.description.includes('CH340') ||
         device.description.includes('CP210') ||
         device.description.includes('Silicon Labs'))
      )
      .map((device: any) => ({
        port: device.port,
        description: device.description,
        manufacturer: device.manufacturer || 'Unknown'
      }));
  } catch (error) {
    console.error('error: Failed to parse PlatformIO output:', error);
    return [];
  }
}