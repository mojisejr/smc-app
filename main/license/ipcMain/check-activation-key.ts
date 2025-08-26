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
  
  // Primary handler - HKDF v2.0 validation (always requires ESP32)
  ipcMain.handle("check-activation", async (): Promise<ValidationResult> => {
    try {
      console.log("info: Checking HKDF v2.0 license activation status");
      
      const isValid = await validateLicense();
      
      if (isValid) {
        await logger({
          user: "system",
          message: "HKDF license validation successful (ESP32 hardware binding)"
        });
        
        return {
          isValid: true,
          method: 'full', // HKDF v2.0 เสมอใช้ ESP32 validation
          details: {
            databaseFlag: true,
            licenseFileExists: true,
            esp32Connected: true,
            macAddressValid: true
          }
        };
      } else {
        return {
          isValid: false,
          method: 'full',
          error: 'HKDF license validation failed - ESP32 hardware binding required'
        };
      }
      
    } catch (error: any) {
      console.error("error: HKDF license validation failed:", error);
      
      await logger({
        user: "system",
        message: `HKDF license validation error: ${error.message}`
      });
      
      return {
        isValid: false,
        method: 'full',
        error: error.message
      };
    }
  });

  // Full validation handler - same as primary handler in HKDF v2.0
  ipcMain.handle("check-activation-full", async (): Promise<ValidationResult> => {
    try {
      console.log("info: Performing HKDF v2.0 license validation (always full ESP32 validation)");
      
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

      // HKDF v2.0 validation (เสมอใช้ ESP32 hardware binding)
      const isValid = await validateLicenseWithESP32();
      
      if (isValid) {
        await logger({
          user: "system",
          message: "HKDF license validation successful (full ESP32 hardware binding)"
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
          error: 'HKDF ESP32 hardware binding validation failed',
          details: {
            databaseFlag: true,
            licenseFileExists: true,
            esp32Connected: false, // ESP32 connection issue
          }
        };
      }
      
    } catch (error: any) {
      console.error("error: HKDF license validation failed:", error);
      
      await logger({
        user: "system",
        message: `HKDF license validation error: ${error.message}`
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