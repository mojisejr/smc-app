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
      const firmware = template
        .replace(/\{\{ORGANIZATION\}\}/g, config.customer.organization)
        .replace(/\{\{CUSTOMER_ID\}\}/g, config.customer.customerId)
        .replace(/\{\{APPLICATION_NAME\}\}/g, config.customer.applicationName)
        .replace(/\{\{WIFI_SSID\}\}/g, config.wifiSSID)
        .replace(/\{\{WIFI_PASSWORD\}\}/g, config.wifiPassword)
        .replace(/\{\{GENERATED_DATE\}\}/g, config.generatedDate);

      return firmware;
    } catch (error) {
      throw new Error(`Failed to generate firmware: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static createPlatformIOConfig(): string {
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