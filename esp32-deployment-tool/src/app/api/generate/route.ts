import { NextRequest, NextResponse } from 'next/server';
import { TemplateProcessor } from '@/lib/template';

export async function POST(request: NextRequest) {
  try {
    const { customer } = await request.json();
    
    if (!customer?.customerId) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID is required'
      }, { status: 400 });
    }

    // Generate WiFi credentials
    const wifi = TemplateProcessor.generateWiFiCredentials(customer.customerId);
    
    // Create template config
    const config = {
      customer,
      wifiSSID: wifi.ssid,
      wifiPassword: wifi.password,
      generatedDate: new Date().toISOString()
    };

    // Generate firmware
    const firmware = await TemplateProcessor.generateFirmware(config);

    return NextResponse.json({
      success: true,
      config,
      firmware,
      wifi
    });
  } catch (error) {
    console.error('error: Template generation failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}