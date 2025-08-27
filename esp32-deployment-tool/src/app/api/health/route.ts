import { NextResponse } from 'next/server';
import { isPlatformIOAvailable, getDeviceList, getEnvironmentInfo } from '@/lib/platformio';

export async function GET() {
  const envInfo = getEnvironmentInfo();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    container: {
      node_version: process.version,
      platform: process.platform,
      docker: !!process.env.DOCKER_CONTAINER,
      environment: process.env.NODE_ENV || 'development'
    },
    platformio_info: envInfo,
    checks: {
      platformio: false,
      usb_devices: false,
      file_system: false
    }
  };

  try {
    // Check PlatformIO installation with cross-platform support
    const pioAvailable = await isPlatformIOAvailable();
    health.checks.platformio = pioAvailable;
    console.log('info: Cross-platform PlatformIO check:', pioAvailable ? 'passed' : 'failed');
  } catch (error) {
    console.warn('warn: PlatformIO check failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Check USB device access with cross-platform support
    const deviceListResult = await getDeviceList();
    if (deviceListResult.success && deviceListResult.output) {
      // Count devices in JSON output
      const devices = JSON.parse(deviceListResult.output);
      const deviceCount = Array.isArray(devices) ? devices.length : 0;
      health.checks.usb_devices = deviceCount >= 0;
      console.log(`info: Cross-platform USB check: ${deviceCount} devices found`);
    } else {
      health.checks.usb_devices = false;
      console.log('info: Cross-platform USB check: no devices detected');
    }
  } catch (error) {
    console.warn('warn: USB devices check failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  try {
    // Check file system access
    await checkFileSystem();
    health.checks.file_system = true;
    console.log('info: File system check passed');
  } catch (error) {
    console.warn('warn: File system check failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Overall health status
  const passedChecks = Object.values(health.checks).filter(check => check).length;
  const totalChecks = Object.keys(health.checks).length;
  
  if (passedChecks === totalChecks) {
    health.status = 'healthy';
  } else if (passedChecks > 0) {
    health.status = 'degraded';
  } else {
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}

// PlatformIO and USB device check functions moved to /lib/platformio.ts for cross-platform support

async function checkFileSystem(): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  try {
    // Check if we can write to temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    // Test write
    const testFile = path.join(tempDir, 'health-check.tmp');
    await fs.writeFile(testFile, 'health check test', 'utf8');
    
    // Test read
    await fs.readFile(testFile, 'utf8');
    
    // Cleanup
    await fs.unlink(testFile);
    
    // Check exports directory access
    const exportsDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    
  } catch (error) {
    throw new Error(`File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}