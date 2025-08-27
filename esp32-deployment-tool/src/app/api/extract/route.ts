import { NextRequest, NextResponse } from 'next/server';
import { TemplateProcessor } from '@/lib/template';
import { CustomerInfo } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { deviceIP = '192.168.4.1', customerInfo, deploymentLog } = await request.json();
    
    // Environment detection - Support both macOS and Windows development
    const isDevelopmentMacOS = process.platform === 'darwin' && process.env.NODE_ENV === 'development';
    const isDevelopmentWindows = process.platform === 'win32' && process.env.NODE_ENV === 'development';
    const isDevelopmentMode = isDevelopmentMacOS || isDevelopmentWindows;
    
    console.log('info: Extracting MAC address from ESP32...');
    console.log('Environment:', isDevelopmentMode ? `${process.platform} Development` : 'Container Production');
    console.log('Device IP:', deviceIP);

    // Development Mode (macOS/Windows): Use deployment log data
    if (isDevelopmentMode) {
      return await handleDevelopmentMode(customerInfo, deploymentLog, process.platform);
    }

    // Retry mechanism for MAC extraction
    const maxRetries = 5;
    let lastError: string = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`info: MAC extraction attempt ${attempt}/${maxRetries}`);
        
        const response = await fetch(`http://${deviceIP}/mac`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.mac_address) {
          console.log('info: MAC address extracted successfully:', data.mac_address);
          
          return NextResponse.json({
            success: true,
            macAddress: data.mac_address,
            customerInfo: {
              customerId: data.customer_id,
              organization: data.organization
            },
            timestamp: data.timestamp,
            attempt
          });
        } else {
          throw new Error('MAC address not found in response');
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`warn: MAC extraction attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    // All attempts failed
    console.error('error: MAC extraction failed after all attempts');
    
    return NextResponse.json({
      success: false,
      error: `Failed to extract MAC address after ${maxRetries} attempts. Last error: ${lastError}`,
      troubleshooting: [
        'ตรวจสอบว่า ESP32 เชื่อมต่อ WiFi แล้ว',
        'เชื่อมต่อ macOS กับ ESP32 WiFi AP',
        'ตรวจสอบ IP address ถูกต้อง (default: 192.168.4.1)',
        'รอสักครู่แล้วลองใหม่',
        'ตรวจสอบ firmware upload สำเร็จ'
      ]
    }, { status: 500 });
  } catch (error) {
    console.error('error: MAC extraction process failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Development Mode Handler (macOS/Windows)
async function handleDevelopmentMode(customerInfo: CustomerInfo, deploymentLog?: string, platform?: string): Promise<NextResponse> {
  try {
    console.log(`info: Using ${platform} Development Mode for MAC extraction`);
    
    // Extract MAC address from deployment log
    let macAddress = 'f4:65:0b:58:66:a4'; // Default fallback
    
    if (deploymentLog) {
      const macMatch = deploymentLog.match(/MAC:\s*([a-fA-F0-9:]{17})/);
      if (macMatch) {
        macAddress = macMatch[1].toLowerCase();
        console.log('info: MAC extracted from deployment log:', macAddress);
      }
    } else {
      console.log('info: Using fallback MAC address for development');
    }

    // Generate WiFi credentials for development
    const wifiCredentials = TemplateProcessor.generateWiFiCredentials(customerInfo?.customerId || 'TEST001');
    
    // Mock successful response similar to ESP32 API
    const response = {
      success: true,
      macAddress: macAddress,
      customerInfo: {
        customerId: customerInfo?.customerId || 'TEST001',
        organization: customerInfo?.organization || 'Development Org'
      },
      wifiCredentials: wifiCredentials,
      timestamp: Date.now(),
      mode: `development_${platform}`
    };
    
    console.log(`info: ${platform} Development MAC extraction completed:`, response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(`error: ${platform} Development MAC extraction failed:`, error);
    
    return NextResponse.json({
      success: false,
      error: `Development mode extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      troubleshooting: [
        'ตรวจสอบว่า deployment สำเร็จแล้ว',
        'ตรวจสอบ customer info ถูกส่งมาใน request',
        'ลองรีเฟรช page แล้วทำใหม่'
      ]
    }, { status: 500 });
  }
}