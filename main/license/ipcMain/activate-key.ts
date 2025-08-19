import { ipcMain } from "electron";
import { logger } from "../../logger";
import { LicenseFileManager } from "../file-manager";
import { ESP32Client } from "../esp32-client";
import { saveLicenseActivation, validateOrganizationData } from "../validator";

/**
 * License File Activation Handler
 * 
 * แทนที่ระบบ text key activation เดิม
 * ด้วย CLI License File + ESP32 validation
 */

export interface ActivationResult {
  success: boolean;
  error?: string;
  step?: string;
  data?: {
    organization?: string;
    customerId?: string;
    expiryDate?: string;
    macAddress?: string;
  };
}

export const activateKeyHandler = async () => {
  ipcMain.handle("activate-license-file", async (event, payload?: { filePath?: string }): Promise<ActivationResult> => {
    try {
      console.log("info: Starting CLI license file activation process");
      
      // Step 1: Find และ parse license file
      event.sender.send('activation-progress', { step: 'file-loading', progress: 10 });
      
      const filePath = payload?.filePath || await LicenseFileManager.findLicenseFile();
      if (!filePath) {
        return {
          success: false,
          error: 'ไม่พบไฟล์ license.lic ในโฟลเดอร์ติดตั้ง',
          step: 'file-loading'
        };
      }

      const licenseData = await LicenseFileManager.parseLicenseFile(filePath);
      if (!licenseData) {
        return {
          success: false,
          error: 'ไม่สามารถอ่านไฟล์ license ได้ รูปแบบไฟล์ไม่ถูกต้อง',
          step: 'file-parsing'
        };
      }

      console.log(`info: License file parsed - Organization: ${licenseData.organization}`);

      // Step 2: ตรวจสอบวันหมดอายุ
      event.sender.send('activation-progress', { step: 'expiry-check', progress: 20 });
      
      const expiryDate = new Date(licenseData.expiryDate);
      const today = new Date();
      
      if (expiryDate < today) {
        await logger({
          user: "system",
          message: `License activation failed: License expired on ${licenseData.expiryDate}`
        });
        return {
          success: false,
          error: `License หมดอายุแล้ว (หมดอายุ: ${licenseData.expiryDate})`,
          step: 'expiry-check'
        };
      }

      // Step 3: ตรวจสอบ organization data
      event.sender.send('activation-progress', { step: 'organization-validation', progress: 30 });
      
      const orgValid = await validateOrganizationData(licenseData);
      if (!orgValid) {
        return {
          success: false,
          error: 'ข้อมูลองค์กรใน license ไม่ตรงกับการตั้งค่าระบบ',
          step: 'organization-validation'
        };
      }

      // Step 4: ดึง WiFi credentials และเชื่อมต่อ
      event.sender.send('activation-progress', { step: 'wifi-connecting', progress: 40 });
      
      const wifiCredentials = await LicenseFileManager.extractWiFiCredentials(licenseData);
      if (!wifiCredentials) {
        return {
          success: false,
          error: 'ไม่พบข้อมูล WiFi ใน license file',
          step: 'wifi-credentials'
        };
      }

      console.log(`info: Connecting to ESP32 WiFi: ${wifiCredentials.ssid}`);
      const wifiConnected = await ESP32Client.connectToWiFi(wifiCredentials.ssid, wifiCredentials.password);
      
      if (!wifiConnected) {
        return {
          success: false,
          error: `ไม่สามารถเชื่อมต่อ WiFi ESP32 ได้ (${wifiCredentials.ssid})`,
          step: 'wifi-connecting'
        };
      }

      // Step 5: ดึง MAC address จาก ESP32
      event.sender.send('activation-progress', { step: 'mac-validation', progress: 70 });
      
      const esp32Mac = await ESP32Client.getMacAddress();
      if (!esp32Mac) {
        return {
          success: false,
          error: 'ไม่สามารถดึง MAC address จาก ESP32 ได้ กรุณาตรวจสอบการเชื่อมต่อ',
          step: 'mac-retrieval'
        };
      }

      // Step 6: ตรวจสอบ MAC address matching
      if (licenseData.macAddress.toUpperCase() !== esp32Mac.toUpperCase()) {
        console.log(`debug: MAC address mismatch`);
        console.log(`debug: License MAC: ${licenseData.macAddress}`);
        console.log(`debug: ESP32 MAC: ${esp32Mac}`);
        
        await logger({
          user: "system",
          message: "License activation failed: MAC address mismatch with ESP32"
        });
        
        return {
          success: false,
          error: 'MAC address ไม่ตรงกับอุปกรณ์ ESP32 ที่เชื่อมต่อ',
          step: 'mac-validation'
        };
      }

      // Step 7: บันทึก activation ลงฐานข้อมูล
      event.sender.send('activation-progress', { step: 'saving', progress: 90 });
      
      const saved = await saveLicenseActivation();
      if (!saved) {
        return {
          success: false,
          error: 'ไม่สามารถบันทึกการ activation ลงฐานข้อมูลได้',
          step: 'saving'
        };
      }

      // Step 8: เสร็จสิ้น
      event.sender.send('activation-progress', { step: 'success', progress: 100 });
      
      await logger({
        user: "system",
        message: `License activation successful - Organization: ${licenseData.organization}, Customer: ${licenseData.customerId}, Expires: ${licenseData.expiryDate}`
      });

      console.log("info: CLI license file activation completed successfully");
      
      return {
        success: true,
        step: 'success',
        data: {
          organization: licenseData.organization,
          customerId: licenseData.customerId,
          expiryDate: licenseData.expiryDate,
          macAddress: esp32Mac // ไม่เก็บในฐานข้อมูล แต่ส่งกลับไป UI ได้
        }
      };

    } catch (error: any) {
      console.error("error: License activation failed:", error);
      
      await logger({
        user: "system",
        message: `License activation error: ${error.message}`
      });

      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการ activate license',
        step: 'error'
      };
    }
  });

  // รักษา legacy handler ไว้ชั่วคราว (จะลบใน Phase 3)
  ipcMain.handle("activate-key", async (event, payload) => {
    console.log("warn: Legacy activate-key handler called - redirecting to new system");
    
    // Redirect ไป new handler
    return await event.sender.invoke("activate-license-file", {});
  });
};