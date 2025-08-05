import { ipcMain } from "electron";
import { ActivationService } from "../../services/activationService";
import { ActivationError } from "../../errors/activationError";

export const activateKeyHandler = async () => {
  // Step 1: Process license file and return WiFi credentials
  ipcMain.handle("process-license-file", async (event, payload) => {
    console.log('🔌 [DEBUG] IPC: process-license-file called');
    console.log('📦 [DEBUG] IPC payload:', JSON.stringify(payload, null, 2));
    
    try {
      const filePath = payload.filePath;
      console.log(`📁 [DEBUG] IPC: Processing file: ${filePath}`);
      
      const wifiCredentials = await ActivationService.processLicenseFile(filePath);
      
      console.log('✅ [DEBUG] IPC: License processing successful');
      console.log('📶 [DEBUG] IPC: Returning WiFi credentials:', JSON.stringify(wifiCredentials, null, 2));
      
      return { 
        success: true, 
        data: wifiCredentials
      };
    } catch (error) {
      console.error('❌ [DEBUG] IPC: Error in process-license-file:', error);
      
      if (error instanceof ActivationError) {
        console.error(`❌ [DEBUG] IPC: ActivationError - Code: ${error.code}, Message: ${error.message}`);
        return { 
          success: false, 
          error: error.message,
          code: error.code
        };
      }
      
      console.error('❌ [DEBUG] IPC: Unexpected error:', error.message);
      return { 
        success: false, 
        error: "เกิดข้อผิดพลาดที่ไม่คาดคิด"
      };
    }
  });

  // Step 2: Complete activation after WiFi connection
  ipcMain.handle("complete-activation", async (event, payload) => {
    console.log('🔌 [DEBUG] IPC: complete-activation called');
    console.log('📦 [DEBUG] IPC payload:', JSON.stringify(payload, null, 2));
    
    try {
      const filePath = payload.filePath;
      console.log(`📁 [DEBUG] IPC: Completing activation for file: ${filePath}`);
      
      await ActivationService.completeActivation(filePath);
      
      console.log('✅ [DEBUG] IPC: Activation completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ [DEBUG] IPC: Error in complete-activation:', error);
      
      if (error instanceof ActivationError) {
        console.error(`❌ [DEBUG] IPC: ActivationError - Code: ${error.code}, Message: ${error.message}`);
        return { 
          success: false, 
          error: error.message,
          code: error.code
        };
      }
      
      console.error('❌ [DEBUG] IPC: Unexpected error:', error.message);
      return { 
        success: false, 
        error: "เกิดข้อผิดพลาดที่ไม่คาดคิด"
      };
    }
  });

  // Legacy handler for backward compatibility
  ipcMain.handle("activate-key", async (event, payload) => {
    try {
      const filePath = payload.filePath;
      const wifiCredentials = await ActivationService.processLicenseFile(filePath);
      return { 
        success: true, 
        data: wifiCredentials,
        message: "กรุณาเชื่อมต่อ WiFi และกดยืนยันเพื่อดำเนินการต่อ"
      };
    } catch (error) {
      if (error instanceof ActivationError) {
        return { 
          success: false, 
          error: error.message,
          code: error.code
        };
      }
      
      return { 
        success: false, 
        error: "เกิดข้อผิดพลาดที่ไม่คาดคิด"
      };
    }
  });
};
