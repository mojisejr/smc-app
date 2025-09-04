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
      
      // Container-aware path selection
      const isContainer = !!process.env.DOCKER_CONTAINER;
      let exportPath: string;
      
      if (isContainer) {
        // In container: use /app/exports which is mapped to host Desktop
        exportPath = path.join(process.cwd(), 'exports');
        console.log('info: Using container export path (mapped to host Desktop):', exportPath);
      } else {
        // Local development: use actual Desktop path
        exportPath = path.join(os.homedir(), 'Desktop');
        console.log('info: Using local Desktop path:', exportPath);
      }
      
      // Ensure export directory exists
      await fs.promises.mkdir(exportPath, { recursive: true });
      
      const filePath = path.join(exportPath, filename);

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
          status: "completed",
          environment: {
            container: !!process.env.DOCKER_CONTAINER,
            platform: process.platform,
            node_version: process.version
          }
        }
      };

      // Write file
      await fs.promises.writeFile(filePath, JSON.stringify(exportObject, null, 2), 'utf8');
      
      console.log('info: Customer data exported to:', filePath);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export customer data: ${error instanceof Error ? error.message : 'Unknown error'}`);
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