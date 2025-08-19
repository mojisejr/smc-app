import { ipcMain } from "electron";
import { validateLicense, validateLicenseWithESP32, isSystemActivated } from "../validator";
import { logger } from "../../logger";

/**
 * License Validation Handler
 * 
 * แทนที่ระบบ validation เดิมด้วย CLI License System
 * รองรับการตรวจสอบแบบ quick และ full validation
 */

export interface ValidationResult {
  isValid: boolean;
  method?: 'quick' | 'full' | 'database-only';
  error?: string;
  details?: {
    databaseFlag?: boolean;
    licenseFileExists?: boolean;
    esp32Connected?: boolean;
    macAddressValid?: boolean;
    licenseExpired?: boolean;
  };
}

export const checkActivationKeyHandler = async () => {
  
  // Primary handler - ใช้ quick validation
  ipcMain.handle("check-activation", async (): Promise<ValidationResult> => {
    try {
      console.log("info: Checking license activation status");
      
      const isValid = await validateLicense();
      
      if (isValid) {
        await logger({
          user: "system",
          message: "License validation successful (quick check)"
        });
        
        return {
          isValid: true,
          method: 'quick',
          details: {
            databaseFlag: true,
            licenseFileExists: true
          }
        };
      } else {
        return {
          isValid: false,
          method: 'quick',
          error: 'License validation failed - system not activated or license file missing'
        };
      }
      
    } catch (error: any) {
      console.error("error: License validation failed:", error);
      
      await logger({
        user: "system",
        message: `License validation error: ${error.message}`
      });
      
      return {
        isValid: false,
        method: 'quick',
        error: error.message
      };
    }
  });

  // Full validation with ESP32 - ใช้เมื่อต้องการความแม่นยำสูง
  ipcMain.handle("check-activation-full", async (): Promise<ValidationResult> => {
    try {
      console.log("info: Performing full license validation with ESP32");
      
      // เริ่มด้วยการตรวจสอบ database flag
      const databaseFlag = await isSystemActivated();
      if (!databaseFlag) {
        return {
          isValid: false,
          method: 'full',
          error: 'System not activated in database',
          details: {
            databaseFlag: false
          }
        };
      }

      // Full validation กับ ESP32
      const isValid = await validateLicenseWithESP32();
      
      if (isValid) {
        await logger({
          user: "system",
          message: "License validation successful (full ESP32 validation)"
        });
        
        return {
          isValid: true,
          method: 'full',
          details: {
            databaseFlag: true,
            licenseFileExists: true,
            esp32Connected: true,
            macAddressValid: true,
            licenseExpired: false
          }
        };
      } else {
        return {
          isValid: false,
          method: 'full',
          error: 'Full ESP32 validation failed',
          details: {
            databaseFlag: true,
            licenseFileExists: true,
            esp32Connected: false, // อาจมีปัญหาตรงนี้
          }
        };
      }
      
    } catch (error: any) {
      console.error("error: Full license validation failed:", error);
      
      await logger({
        user: "system",
        message: `Full license validation error: ${error.message}`
      });
      
      return {
        isValid: false,
        method: 'full',
        error: error.message
      };
    }
  });

  // Database-only check - เร็วที่สุด ใช้สำหรับ UI quick check
  ipcMain.handle("check-activation-database", async (): Promise<ValidationResult> => {
    try {
      const databaseFlag = await isSystemActivated();
      
      return {
        isValid: databaseFlag,
        method: 'database-only',
        details: {
          databaseFlag
        }
      };
      
    } catch (error: any) {
      console.error("error: Database activation check failed:", error);
      
      return {
        isValid: false,
        method: 'database-only',
        error: error.message,
        details: {
          databaseFlag: false
        }
      };
    }
  });

  // Legacy handler - รักษาไว้เพื่อ backward compatibility
  ipcMain.handle("check-activation-key", async () => {
    console.log("warn: Legacy check-activation-key handler called");
    
    // Redirect to new handler
    const result = await validateLicense();
    return result;
  });

  // Utility handler - ตรวจสอบ ESP32 connection อย่างเดียว
  ipcMain.handle("check-esp32-connection", async () => {
    try {
      const { ESP32Client } = await import('../esp32-client');
      const isConnected = await ESP32Client.testConnection();
      
      if (isConnected) {
        await logger({
          user: "system",
          message: "ESP32 connection test successful"
        });
      }
      
      return {
        connected: isConnected,
        timestamp: Date.now()
      };
      
    } catch (error: any) {
      console.error("error: ESP32 connection test failed:", error);
      return {
        connected: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  });
};