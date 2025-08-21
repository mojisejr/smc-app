# Phase 2: Containerized Deployment Workflow

**ระยะเวลา:** 4-5 วัน  
**เป้าหมาย:** Docker-based template system + Container deployment workflow + MAC extraction + Export

## 📖 Overview & Goals

### **วัตถุประสงค์:**
- **Day 1-2:** Container-based template system + WiFi auto-generation
- **Day 3-4:** Containerized PlatformIO build + upload workflow with USB mapping
- **Day 5:** Container-to-ESP32 MAC extraction + Host file export
- สร้าง complete containerized end-to-end deployment workflow

### **Deliverables:**
- ✅ Container-processed firmware template พร้อม customer placeholders
- ✅ Container-based WiFi credential auto-generation (fixed algorithm)
- ✅ Containerized PlatformIO build + upload integration with USB device mapping
- ✅ Container-to-ESP32 MAC address extraction via HTTP
- ✅ Container-to-host JSON export to Desktop folder via volume mapping

## 🔧 Technical Requirements

### **Software Dependencies:**
```json
{
  "fs-extra": "^11.0.0",
  "crypto": "built-in",
  "child_process": "built-in"
}
```

### **Container & Hardware Requirements:**
- Docker Desktop with USB device support
- ESP32 development board with proper host OS drivers
- USB cable สำหรับ programming (mapped to container)
- AM2302 (DHT22) Temperature/Humidity Sensor
- GPIO 4 connection สำหรับ sensor (fixed สำหรับทุกชิ้น)
- Container network access for MAC extraction
- Host filesystem access for Desktop file export

## 📝 Implementation Steps

### **Step 2.1: Template System (Day 1-2)**

#### **Step 2.1a: Create Firmware Template (90 นาที)**

สร้าง `templates/main.cpp.template`:

```cpp
/*
 * ESP32 Customer Configuration
 * Organization: {{ORGANIZATION}}
 * Customer ID: {{CUSTOMER_ID}}
 * Application: {{APPLICATION_NAME}}
 * Generated: {{GENERATED_DATE}}
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Customer Configuration
const char* CUSTOMER_ORG = "{{ORGANIZATION}}";
const char* CUSTOMER_ID = "{{CUSTOMER_ID}}";  
const char* APPLICATION_NAME = "{{APPLICATION_NAME}}";

// AM2302 Sensor Configuration (Fixed GPIO for all devices)
#define DHT_PIN 4          // GPIO 4 - FIXED สำหรับทุกชิ้น
#define DHT_TYPE DHT22     // AM2302 = DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// WiFi Access Point Configuration
const char* AP_SSID = "{{WIFI_SSID}}";
const char* AP_PASSWORD = "{{WIFI_PASSWORD}}";
IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("========================================");
  Serial.println("SMC ESP32 Customer Configuration");
  Serial.printf("Customer: %s (%s)\\n", CUSTOMER_ORG, CUSTOMER_ID);
  Serial.printf("Application: %s\\n", APPLICATION_NAME);
  Serial.println("========================================");
  
  // Initialize Wi-Fi
  Serial.println("Starting WiFi Access Point...");
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  Serial.printf("AP SSID: %s\\n", AP_SSID);
  Serial.printf("AP IP Address: %s\\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("MAC Address: %s\\n", WiFi.macAddress().c_str());
  
  // Initialize AM2302 Sensor
  Serial.println("Initializing AM2302 Temperature/Humidity Sensor...");
  dht.begin();
  Serial.printf("Sensor Pin: GPIO %d\\n", DHT_PIN);
  Serial.println("Sensor: Mock Mode (Development)");

  // Configure CORS
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "*");

  // Root endpoint
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String html = "<!DOCTYPE html><html><head><title>SMC ESP32 - " + String(CUSTOMER_ORG) + "</title></head>";
    html += "<body style='font-family: Arial; padding: 20px;'>";
    html += "<h1>SMC Medical Device Configuration</h1>";
    html += "<div style='background: #f0f0f0; padding: 15px; border-radius: 5px;'>";
    html += "<h3>Customer Information</h3>";
    html += "<p><strong>Organization:</strong> " + String(CUSTOMER_ORG) + "</p>";
    html += "<p><strong>Customer ID:</strong> " + String(CUSTOMER_ID) + "</p>";
    html += "<p><strong>Application:</strong> " + String(APPLICATION_NAME) + "</p>";
    html += "<p><strong>MAC Address:</strong> " + WiFi.macAddress() + "</p>";
    html += "</div></body></html>";
    
    request->send(200, "text/html", html);
  });

  // MAC endpoint
  server.on("/mac", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    doc["mac_address"] = WiFi.macAddress();
    doc["customer_id"] = CUSTOMER_ID;
    doc["organization"] = CUSTOMER_ORG;
    doc["status"] = "success";
    doc["timestamp"] = millis();
    
    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Info endpoint  
  server.on("/info", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    JsonObject deviceObj = doc["device"].to<JsonObject>();
    deviceObj["type"] = "ESP32";
    deviceObj["mac_address"] = WiFi.macAddress();
    deviceObj["ap_ip"] = WiFi.softAPIP().toString();
    deviceObj["ap_ssid"] = AP_SSID;
    
    JsonObject customerObj = doc["customer"].to<JsonObject>();
    customerObj["organization"] = CUSTOMER_ORG;
    customerObj["customer_id"] = CUSTOMER_ID;
    customerObj["application"] = APPLICATION_NAME;
    
    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Sensor endpoint - AM2302 Temperature/Humidity
  server.on("/sensor", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    
    // Mock data mode for development (will be replaced with real sensor readings)
    float temperature = 22.5 + random(-25, 25) / 10.0; // 20-25°C range
    float humidity = 65.0 + random(-15, 15) / 10.0;    // 50-80% RH range
    
    // Future: Real sensor readings
    // float temperature = dht.readTemperature();
    // float humidity = dht.readHumidity();
    // if (isnan(temperature) || isnan(humidity)) {
    //   temperature = -999; humidity = -999; // Error values
    // }
    
    doc["temp"] = temperature;
    doc["humid"] = humidity;
    doc["sensor"] = "AM2302";
    doc["gpio"] = DHT_PIN;
    doc["mode"] = "mock"; // จะเป็น "live" เมื่อใช้ sensor จริง
    doc["timestamp"] = millis();
    doc["customer_id"] = CUSTOMER_ID;
    
    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Health endpoint
  server.on("/health", HTTP_GET, [](AsyncWebServerRequest *request) {
    JsonDocument doc;
    JsonObject serverObj = doc["server"].to<JsonObject>();
    serverObj["status"] = "healthy";
    serverObj["uptime_ms"] = millis();
    serverObj["connected_clients"] = WiFi.softAPgetStationNum();
    
    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Start server
  Serial.println("Starting HTTP server...");
  server.begin();
  Serial.println("Server started successfully!");
  Serial.println("Ready for client connections.");
}

void loop() {
  // Status reporting
  static unsigned long lastStatus = 0;
  if (millis() - lastStatus > 30000) {
    Serial.printf("[%s] Status: %d clients, %d bytes free\\n", 
                  CUSTOMER_ID, WiFi.softAPgetStationNum(), ESP.getFreeHeap());
    lastStatus = millis();
  }
  
  delay(1000);
}
```

#### **Step 2.1b: Template Processing Library (60 นาที)**

สร้าง `lib/template.ts`:

```typescript
import { CustomerInfo } from '@/types';
import fs from 'fs';
import path from 'path';

export interface TemplateConfig {
  customer: CustomerInfo;
  wifiSSID: string;
  wifiPassword: string;
  generatedDate: string;
}

export class TemplateProcessor {
  private static templatePath = path.join(process.cwd(), 'templates', 'main.cpp.template');

  static generateWiFiCredentials(customerId: string): { ssid: string; password: string } {
    // Fixed algorithm - no customization
    const ssid = `SMC_ESP32_${customerId}`;
    const password = this.generatePassword(customerId);
    
    return { ssid, password };
  }

  private static generatePassword(customerId: string): string {
    // Simple deterministic password generation
    // Format: SMC + customerId + 3 digits based on customerId hash
    const hash = customerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const suffix = String(hash % 1000).padStart(3, '0');
    return `SMC${customerId}${suffix}`;
  }

  static async generateFirmware(config: TemplateConfig): Promise<string> {
    try {
      // Read template file
      const template = await fs.promises.readFile(this.templatePath, 'utf8');
      
      // Replace placeholders
      let firmware = template
        .replace(/\{\{ORGANIZATION\}\}/g, config.customer.organization)
        .replace(/\{\{CUSTOMER_ID\}\}/g, config.customer.customerId)
        .replace(/\{\{APPLICATION_NAME\}\}/g, config.customer.applicationName)
        .replace(/\{\{WIFI_SSID\}\}/g, config.wifiSSID)
        .replace(/\{\{WIFI_PASSWORD\}\}/g, config.wifiPassword)
        .replace(/\{\{GENERATED_DATE\}\}/g, config.generatedDate);

      return firmware;
    } catch (error) {
      throw new Error(`Failed to generate firmware: ${error.message}`);
    }
  }

  static createPlatformIOConfig(projectPath: string): string {
    return `; PlatformIO Project Configuration File
; Generated for ESP32 deployment

[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
upload_speed = 921600

; Dependencies
lib_deps = 
    mathieucarbou/ESP Async WebServer@^3.0.6
    bblanchon/ArduinoJson@^7.4.2
    adafruit/DHT sensor library@^1.4.4
    adafruit/Adafruit Unified Sensor@^1.1.9
`;
  }
}
```

#### **Step 2.1c: WiFi Generation API (30 นาที)**

สร้าง `app/api/generate/route.ts`:

```typescript
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
```

### **Step 2.2: PlatformIO Integration (Day 3-4)**

#### **Step 2.2a: Deploy API Route (120 นาที)**

สร้าง `app/api/deploy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TemplateProcessor } from '@/lib/template';
import { spawn } from 'child_process';
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

    console.log('info: Starting deployment process...');
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
    const platformioConfig = TemplateProcessor.createPlatformIOConfig(projectPath);
    await fs.promises.writeFile(path.join(projectPath, 'platformio.ini'), platformioConfig);

    console.log('info: Project files created, starting build...');

    // Build and upload
    const uploadResult = await buildAndUpload(projectPath, device.port);

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

async function buildAndUpload(projectPath: string, devicePort: string): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    console.log('info: Building and uploading firmware...');
    
    // PlatformIO build and upload command
    const platformio = spawn('pio', [
      'run',
      '--target', 'upload',
      '--upload-port', devicePort,
      '--project-dir', projectPath
    ]);

    let output = '';
    let errorOutput = '';

    platformio.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log('pio stdout:', text);
    });

    platformio.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log('pio stderr:', text);
    });

    platformio.on('close', (code) => {
      if (code === 0) {
        console.log('info: PlatformIO upload successful');
        resolve({
          success: true,
          output: output + errorOutput
        });
      } else {
        console.error('error: PlatformIO upload failed with code:', code);
        resolve({
          success: false,
          output: output + errorOutput,
          error: `Upload failed with exit code ${code}`
        });
      }
    });

    platformio.on('error', (error) => {
      console.error('error: Failed to execute PlatformIO:', error);
      resolve({
        success: false,
        output: output + errorOutput,
        error: `Failed to execute PlatformIO: ${error.message}`
      });
    });
  });
}

async function cleanupProject(projectPath: string): Promise<void> {
  try {
    await fs.promises.rm(projectPath, { recursive: true, force: true });
    console.log('info: Temporary project cleaned up');
  } catch (error) {
    console.warn('warn: Failed to cleanup temporary project:', error);
  }
}
```

#### **Step 2.2b: Progress Component (60 นาที)**

สร้าง `components/ProgressBar.tsx`:

```typescript
'use client'

interface ProgressBarProps {
  progress: number;
  status: string;
  isActive: boolean;
}

export default function ProgressBar({ progress, status, isActive }: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">📊 สถานะการ Deploy</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">ความคืบหน้า</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isActive ? 'bg-blue-600' : 'bg-gray-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isActive && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          )}
          <span className="text-sm text-gray-700">{status}</span>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={`p-2 rounded text-center ${progress >= 25 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            สร้าง Firmware
          </div>
          <div className={`p-2 rounded text-center ${progress >= 50 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            Build Project
          </div>
          <div className={`p-2 rounded text-center ${progress >= 75 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            Upload ESP32
          </div>
          <div className={`p-2 rounded text-center ${progress >= 100 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            เสร็จสิ้น
          </div>
        </div>
      </div>
    </div>
  );
}
```

### **Step 2.3: MAC Extraction & Export (Day 5)**

#### **Step 2.3a: MAC Extraction API (60 นาที)**

สร้าง `app/api/extract/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { deviceIP = '192.168.4.1' } = await request.json();
    
    console.log('info: Extracting MAC address from ESP32...');
    console.log('Device IP:', deviceIP);

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
```

#### **Step 2.3b: JSON Export Library (60 นาที)**

สร้าง `lib/export.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import os from 'os';
import { CustomerInfo } from '@/types';

export interface ExportData {
  customer: CustomerInfo;
  wifi: {
    ssid: string;
    password: string;
  };
  esp32: {
    macAddress: string;
    ipAddress: string;
  };
  deployment: {
    timestamp: string;
    toolVersion: string;
  };
}

export class JSONExporter {
  static async exportCustomerData(data: ExportData): Promise<string> {
    try {
      // Create filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `customer-${data.customer.customerId}-${timestamp}.json`;
      
      // Desktop path (cross-platform)
      const desktopPath = path.join(os.homedir(), 'Desktop');
      const filePath = path.join(desktopPath, filename);

      // Prepare export object
      const exportObject = {
        version: "1.0.0",
        type: "smc-esp32-configuration",
        generated_date: data.deployment.timestamp,
        tool_version: data.deployment.toolVersion,
        
        customer: {
          organization: data.customer.organization,
          customer_id: data.customer.customerId,
          application_name: data.customer.applicationName
        },
        
        wifi: {
          ssid: data.wifi.ssid,
          password: data.wifi.password
        },
        
        esp32: {
          mac_address: data.esp32.macAddress,
          ip_address: data.esp32.ipAddress,
          sensor: {
            type: "AM2302",
            gpio_pin: 4,
            supported_endpoints: ["/sensor"],
            mode: "mock" // จะเป็น "live" เมื่อใช้ sensor จริง
          }
        },
        
        // For CLI integration
        cli_import: {
          command: `smc-license generate -o "${data.customer.organization}" -c "${data.customer.customerId}" -a "${data.customer.applicationName}" --wifi-ssid "${data.wifi.ssid}" --wifi-password "${data.wifi.password}" --mac-address "${data.esp32.macAddress}"`,
          
          environment_variables: {
            CUSTOMER_ORG: data.customer.organization,
            CUSTOMER_ID: data.customer.customerId,
            APPLICATION_NAME: data.customer.applicationName,
            WIFI_SSID: data.wifi.ssid,
            WIFI_PASSWORD: data.wifi.password,
            ESP32_MAC_ADDRESS: data.esp32.macAddress
          }
        },
        
        deployment_log: {
          deployed_at: data.deployment.timestamp,
          deployed_by: "ESP32 Deployment Tool",
          status: "completed"
        }
      };

      // Write file
      await fs.promises.writeFile(filePath, JSON.stringify(exportObject, null, 2), 'utf8');
      
      console.log('info: Customer data exported to:', filePath);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export customer data: ${error.message}`);
    }
  }

  static async validateExportFile(filePath: string): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Basic validation
      return (
        data.version &&
        data.type === 'smc-esp32-configuration' &&
        data.customer?.customer_id &&
        data.wifi?.ssid &&
        data.esp32?.mac_address
      );
    } catch (error) {
      console.error('error: Export file validation failed:', error);
      return false;
    }
  }
}
```

#### **Step 2.3c: Sensor API Route (30 นาที)**

สร้าง `app/api/sensor/route.ts`:

```typescript
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
```

#### **Step 2.3d: Complete Export API (60 นาที)**

สร้าง `app/api/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { JSONExporter, ExportData } from '@/lib/export';

export async function POST(request: NextRequest) {
  try {
    const { customer, wifi, macAddress, ipAddress = '192.168.4.1' } = await request.json();
    
    console.log('info: Starting JSON export process...');
    
    // Prepare export data
    const exportData: ExportData = {
      customer,
      wifi,
      esp32: {
        macAddress,
        ipAddress
      },
      deployment: {
        timestamp: new Date().toISOString(),
        toolVersion: '1.0.0'
      }
    };

    // Export to JSON file
    const filePath = await JSONExporter.exportCustomerData(exportData);
    
    // Validate exported file
    const isValid = await JSONExporter.validateExportFile(filePath);
    
    if (!isValid) {
      throw new Error('Exported file validation failed');
    }

    console.log('info: JSON export completed successfully');
    
    return NextResponse.json({
      success: true,
      filePath,
      filename: filePath.split('/').pop(),
      exportData,
      message: 'Customer data exported successfully'
    });
  } catch (error) {
    console.error('error: JSON export failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### **Step 2.4: Update Main Page (60 นาที)**

อัปเดต `app/page.tsx` เพื่อรองรับ complete workflow:

```typescript
// เพิ่มใน handleDeploy function
const handleDeploy = async () => {
  if (!deploymentState.customer || !deploymentState.selectedDevice) return;

  setDeploymentState(prev => ({
    ...prev,
    isDeploying: true,
    progress: 0,
    status: 'เริ่มต้น deployment...'
  }));

  try {
    // Step 1: Deploy firmware (25% - 75%)
    setDeploymentState(prev => ({ ...prev, progress: 25, status: 'สร้าง firmware...' }));
    
    const deployResponse = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: deploymentState.customer,
        device: deploymentState.selectedDevice
      })
    });

    const deployResult = await deployResponse.json();
    
    if (!deployResult.success) {
      throw new Error(deployResult.error);
    }

    setDeploymentState(prev => ({ ...prev, progress: 75, status: 'Upload สำเร็จ, ดึง MAC address...' }));

    // Step 2: Extract MAC address (75% - 90%)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for ESP32 to boot
    
    const extractResponse = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceIP: '192.168.4.1' })
    });

    const extractResult = await extractResponse.json();
    
    if (!extractResult.success) {
      throw new Error(extractResult.error);
    }

    setDeploymentState(prev => ({ ...prev, progress: 90, status: 'สร้าง JSON file...' }));

    // Step 3: Export JSON (90% - 100%)
    const exportResponse = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: deploymentState.customer,
        wifi: deployResult.wifi,
        macAddress: extractResult.macAddress,
        ipAddress: '192.168.4.1'
      })
    });

    const exportResult = await exportResponse.json();
    
    if (!exportResult.success) {
      throw new Error(exportResult.error);
    }

    // Complete
    setDeploymentState(prev => ({
      ...prev,
      progress: 100,
      status: `เสร็จสิ้น! ไฟล์: ${exportResult.filename}`,
      isDeploying: false
    }));

    console.log('info: Complete deployment workflow finished successfully');
    
  } catch (error) {
    console.error('error: Deployment workflow failed:', error);
    setDeploymentState(prev => ({
      ...prev,
      status: `ข้อผิดพลาด: ${error.message}`,
      isDeploying: false
    }));
  }
};
```

## ✅ Success Criteria

### **Core Functionality:**
- [ ] **Template generation**: สร้าง firmware จาก customer data ได้
- [ ] **WiFi generation**: สร้าง SSID/Password อัตโนมัติ
- [ ] **Sensor integration**: AM2302 sensor library และ API endpoint
- [ ] **PlatformIO build**: Build firmware project สำเร็จ
- [ ] **ESP32 upload**: Upload firmware ลง ESP32 สำเร็จ
- [ ] **MAC extraction**: ดึง MAC address จาก ESP32 ได้
- [ ] **Sensor connectivity**: Test `/sensor` endpoint ใช้งานได้
- [ ] **JSON export**: สร้างไฟล์ลง Desktop สำเร็จ

### **End-to-End Workflow:**
- [ ] **Complete deployment**: ทำงานตั้งแต่ต้นจนจบได้
- [ ] **Progress tracking**: แสดงความคืบหน้า real-time
- [ ] **Error handling**: จัดการ error ได้อย่างเหมาะสม
- [ ] **File validation**: ไฟล์ที่ export ถูกต้อง

## 🧪 Testing Guidelines

### **Manual Testing:**
1. **Complete workflow test:**
   ```
   1. กรอกข้อมูลลูกค้า
   2. เลือก ESP32 device
   3. กด Deploy
   4. รอ progress จนเสร็จ
   5. ตรวจสอบไฟล์ใน Desktop
   ```

2. **JSON file validation:**
   ```bash
   # ตรวจสอบไฟล์ที่ export
   cat ~/Desktop/customer-*.json
   # ต้องมี customer, wifi, esp32, cli_import data
   ```

3. **ESP32 connectivity test:**
   ```bash
   # หลัง deploy เสร็จ
   curl http://192.168.4.1/mac
   # ต้องได้ MAC address กลับมา
   ```

4. **Sensor functionality test:**
   ```bash
   # ทดสอบ sensor endpoint
   curl http://192.168.4.1/sensor
   # ต้องได้ temp, humid ใน JSON format
   # Expected: {"temp": 22.5, "humid": 65.0, "sensor": "AM2302", "mode": "mock"}
   ```

## 🚨 Common Issues

**1. PlatformIO build failure**
- ตรวจสอบ PlatformIO installation
- ตรวจสอบ internet connection (สำหรับ download libraries)

**2. ESP32 upload failure**  
- ตรวจสอบ USB cable connection
- ตรวจสอบ ESP32 driver

**3. MAC extraction timeout**
- รอ ESP32 boot up (2-3 seconds)
- ตรวจสอบ WiFi connection

**4. Sensor connectivity failure**
- ตรวจสอบ DHT library installation ใน PlatformIO
- ตรวจสอบ GPIO 4 connection ไม่ได้ใช้งานอื่น
- ใน mock mode ควรใช้งานได้ทันที (ไม่ต้อง physical sensor)

**5. JSON export permission error**
- ตรวจสอบ write permission ใน Desktop folder

---

## ⏭️ Next Phase

เมื่อ Phase 2 เสร็จเรียบร้อย จะได้:
- ✅ Complete deployment workflow  
- ✅ Customer JSON files ready for CLI
- ✅ Working ESP32 firmware with AM2302 sensor integration
- ✅ MAC address binding
- ✅ Temperature/Humidity sensor API (`/sensor` endpoint)
- ✅ Ready สำหรับ SMC-App environmental monitoring integration

**Phase 3 จะ implement:**
- Error handling & recovery
- UI polish & improvements
- Production deployment setup
- Final testing & validation