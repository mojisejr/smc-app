import { NextRequest, NextResponse } from 'next/server';
import { TemplateProcessor } from '@/lib/template';
import { buildAndUpload as crossPlatformBuildAndUpload, getEnvironmentInfo } from '@/lib/platformio';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { customer, device } = await request.json();
    
    if (!customer || !device) {
      return NextResponse.json({
        success: false,
        error: 'Customer and device information required'
      }, { status: 400 });
    }

    const envInfo = getEnvironmentInfo();
    
    console.log('info: Starting cross-platform deployment process...');
    console.log('Environment Info:', JSON.stringify(envInfo, null, 2));
    console.log('Customer:', customer.customerId);
    console.log('Device:', device.port);

    // Generate WiFi credentials and firmware
    const wifi = TemplateProcessor.generateWiFiCredentials(customer.customerId);
    const config = {
      customer,
      wifiSSID: wifi.ssid,
      wifiPassword: wifi.password,
      generatedDate: new Date().toISOString()
    };

    const firmware = await TemplateProcessor.generateFirmware(config);

    // Create temporary project directory
    const projectId = uuidv4();
    const projectPath = path.join(process.cwd(), 'temp', projectId);
    const srcPath = path.join(projectPath, 'src');

    // Ensure directories exist
    await fs.promises.mkdir(srcPath, { recursive: true });

    // Write firmware file
    await fs.promises.writeFile(path.join(srcPath, 'main.cpp'), firmware);

    // Write platformio.ini
    const platformioConfig = await TemplateProcessor.createPlatformIOConfig(config);
    await fs.promises.writeFile(path.join(projectPath, 'platformio.ini'), platformioConfig);

    console.log('info: Project files created, starting cross-platform build...');

    // Build and upload using cross-platform PlatformIO
    const uploadResult = await crossPlatformBuildAndUpload(projectPath, device.port);

    if (uploadResult.success) {
      console.log('info: Deployment successful');
      
      // Clean up temporary files
      await cleanupProject(projectPath);

      return NextResponse.json({
        success: true,
        config,
        wifi,
        buildOutput: uploadResult.output,
        message: 'Deployment completed successfully'
      });
    } else {
      console.error('error: Deployment failed:', uploadResult.error);
      
      return NextResponse.json({
        success: false,
        error: uploadResult.error,
        buildOutput: uploadResult.output
      }, { status: 500 });
    }
  } catch (error) {
    console.error('error: Deployment process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// buildAndUpload function moved to /lib/platformio.ts for cross-platform support

async function cleanupProject(projectPath: string): Promise<void> {
  try {
    await fs.promises.rm(projectPath, { recursive: true, force: true });
    console.log('info: Temporary project cleaned up');
  } catch (error) {
    console.warn('warn: Failed to cleanup temporary project:', error);
  }
}