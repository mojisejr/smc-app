import { ipcMain, app } from "electron";
import { HardwareConfigService } from "../../services/hardware-config.service";

export const registerHardwareConfigHandlers = () => {
  
  // Get available ports
  ipcMain.handle("get-available-ports", async () => {
    try {
      return await HardwareConfigService.getAvailablePorts();
    } catch (error) {
      console.error("Failed to get available ports:", error);
      return [];
    }
  });

  // Test hardware connection
  ipcMain.handle("test-hardware-connection", async (event, payload) => {
    try {
      const { port, baudrate, hardwareType } = payload;
      return await HardwareConfigService.testPortConnection(port, baudrate, hardwareType);
    } catch (error) {
      return {
        success: false,
        message: "เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ",
        error: error.message
      };
    }
  });

  // Save hardware configuration
  ipcMain.handle("save-hardware-config", async (event, config) => {
    try {
      return await HardwareConfigService.saveHardwareConfig(config);
    } catch (error) {
      return {
        success: false,
        message: "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า",
        error: error.message
      };
    }
  });

  // Get current hardware configuration
  ipcMain.handle("get-current-hardware-config", async () => {
    try {
      return await HardwareConfigService.getCurrentConfig();
    } catch (error) {
      console.error("Failed to get current hardware config:", error);
      return null;
    }
  });

  // Validate hardware configuration
  ipcMain.handle("validate-hardware-config", async (event, config) => {
    try {
      return await HardwareConfigService.validateConfiguration(config);
    } catch (error) {
      return {
        success: false,
        message: "เกิดข้อผิดพลาดในการตรวจสอบการตั้งค่า",
        error: error.message
      };
    }
  });

  // Check if port exists (fast check)
  ipcMain.handle("check-port-exists", async (event, port) => {
    try {
      return await HardwareConfigService.checkPortExists(port);
    } catch (error) {
      console.error("Failed to check port existence:", error);
      return false;
    }
  });

  // App restart request
  ipcMain.handle("app-restart-request", async () => {
    try {
      // Give a small delay to allow the response to be sent
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 500);
      
      return { success: true };
    } catch (error) {
      console.error("Failed to restart app:", error);
      return { success: false, error: error.message };
    }
  });
};