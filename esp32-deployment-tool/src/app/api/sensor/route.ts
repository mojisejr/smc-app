import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceIP = searchParams.get('ip') || '192.168.4.1';
    
    console.log('info: Testing sensor connectivity...');
    console.log('Device IP:', deviceIP);

    // Test sensor endpoint
    const response = await fetch(`http://${deviceIP}/sensor`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const sensorData = await response.json();
    
    console.log('info: Sensor data received:', sensorData);
    
    return NextResponse.json({
      success: true,
      sensor: sensorData,
      timestamp: new Date().toISOString(),
      message: 'Sensor connectivity test successful'
    });
  } catch (error) {
    console.error('error: Sensor connectivity test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'ตรวจสอบว่า ESP32 เชื่อมต่อ WiFi แล้ว',
        'ตรวจสอบ IP address ถูกต้อง (default: 192.168.4.1)',
        'ตรวจสอบ firmware upload สำเร็จ',
        'ลองใช้ curl http://192.168.4.1/sensor ใน terminal'
      ]
    }, { status: 500 });
  }
}