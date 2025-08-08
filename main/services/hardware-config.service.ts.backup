import { SerialPort } from "serialport";
import { Setting } from "../../db/model/setting.model";
import { getHardwareType } from "../setting/getHardwareType";
import { unifiedLoggingService } from "./unified-logging.service";

export interface HardwareConfig {
  type: 'CU12' | 'KU16';
  port: string;
  baudrate: number;
  maxSlots: number;
  requiresRestart: boolean;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
}

export class HardwareConfigService {
  
  /**
   * Test port connection without saving configuration
   */
  static async testPortConnection(port: string, baudrate: number, hardwareType: 'CU12' | 'KU16'): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const serialTest = new SerialPort({
        path: port,
        baudRate: baudrate,
        autoOpen: false,
      });

      const timeout = setTimeout(() => {
        serialTest.close();
        resolve({
          success: false,
          message: "การทดสอบการเชื่อมต่อหมดเวลา",
          error: "Connection timeout"
        });
      }, 3000);

      serialTest.open(async (error) => {
        clearTimeout(timeout);
        
        if (error && !error.message.trim().toLowerCase().includes("access denied")) {
          await unifiedLoggingService.logError({
            message: `${hardwareType} port test failed: ${port}`,
            component: "HardwareConfigService",
            details: { hardwareType, port, error: error.message },
          });
          
          resolve({
            success: false,
            message: `ไม่สามารถเชื่อมต่อ ${hardwareType} port ได้`,
            error: error.message,
            details: { hardwareType, port }
          });
        } else {
          await unifiedLoggingService.logInfo({
            message: `${hardwareType} port test successful: ${port}`,
            component: "HardwareConfigService",
            details: { hardwareType, port },
          });
          
          serialTest.close();
          resolve({
            success: true,
            message: `${hardwareType} port เชื่อมต่อสำเร็จ`,
            details: { hardwareType, port }
          });
        }
      });
    });
  }

  /**
   * Check if port exists in system (fast check)
   */
  static async checkPortExists(port: string): Promise<boolean> {
    try {
      const ports = await SerialPort.list();
      return ports.some(p => p.path === port);
    } catch (error) {
      console.error("Port existence check failed:", error);
      return false;
    }
  }

  /**
   * Get current hardware configuration
   */
  static async getCurrentConfig(): Promise<HardwareConfig | null> {
    try {
      const hardwareInfo = await getHardwareType();
      
      if (!hardwareInfo.isConfigured) {
        return null;
      }

      return {
        type: hardwareInfo.type as 'CU12' | 'KU16',
        port: hardwareInfo.port!,
        baudrate: hardwareInfo.baudrate!,
        maxSlots: hardwareInfo.maxSlots,
        requiresRestart: true
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: "Failed to get current hardware configuration",
        component: "HardwareConfigService",
        details: { error: error.message },
      });
      return null;
    }
  }

  /**
   * Save new hardware configuration
   */
  static async saveHardwareConfig(config: HardwareConfig): Promise<ValidationResult> {
    try {
      // First test the connection
      const testResult = await this.testPortConnection(config.port, config.baudrate, config.type);
      
      if (!testResult.success) {
        return testResult;
      }

      // Prepare update fields based on hardware type
      const updateFields: any = {
        hardware_type: config.type,
        available_slots: config.maxSlots
      };

      if (config.type === "CU12") {
        updateFields.cu_port = config.port;
        updateFields.cu_baudrate = config.baudrate;
      } else if (config.type === "KU16") {
        updateFields.ku_port = config.port;
        updateFields.ku_baudrate = config.baudrate;
      }

      // Save to database
      await Setting.update(updateFields, { where: { id: 1 } });

      await unifiedLoggingService.logInfo({
        message: `Hardware configuration saved: ${config.type}`,
        component: "HardwareConfigService",
        details: { 
          hardwareType: config.type,
          port: config.port,
          baudrate: config.baudrate,
          maxSlots: config.maxSlots
        },
      });

      return {
        success: true,
        message: `บันทึกการตั้งค่า ${config.type} สำเร็จ`,
        details: config
      };

    } catch (error) {
      await unifiedLoggingService.logError({
        message: "Failed to save hardware configuration",
        component: "HardwareConfigService",
        details: { config, error: error.message },
      });

      return {
        success: false,
        message: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า",
        error: error.message
      };
    }
  }

  /**
   * Get available ports for selection
   */
  static async getAvailablePorts(): Promise<Array<{path: string, manufacturer?: string}>> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer
      }));
    } catch (error) {
      console.error("Failed to get available ports:", error);
      return [];
    }
  }

  /**
   * Validate complete hardware configuration
   */
  static async validateConfiguration(config: HardwareConfig): Promise<ValidationResult> {
    // Check port exists
    const portExists = await this.checkPortExists(config.port);
    if (!portExists) {
      return {
        success: false,
        message: "ไม่พบ port ที่ระบุในระบบ",
        error: "Port not found"
      };
    }

    // Test connection
    const connectionTest = await this.testPortConnection(config.port, config.baudrate, config.type);
    if (!connectionTest.success) {
      return connectionTest;
    }

    // Validate configuration values
    if (!config.type || !['CU12', 'KU16'].includes(config.type)) {
      return {
        success: false,
        message: "ประเภทฮาร์ดแวร์ไม่ถูกต้อง",
        error: "Invalid hardware type"
      };
    }

    if (!config.port || !config.baudrate) {
      return {
        success: false,
        message: "ข้อมูล port หรือ baudrate ไม่ครบถ้วน",
        error: "Missing port or baudrate"
      };
    }

    return {
      success: true,
      message: "การตั้งค่าถูกต้องและพร้อมใช้งาน"
    };
  }
}