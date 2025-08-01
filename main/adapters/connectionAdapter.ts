import { ipcMain, BrowserWindow } from "electron";
import { KU16 } from "../ku16";
import { CU12SmartStateManager } from "../hardware/cu12/stateManager";
import { connectionStatusService, ConnectionStatus } from "../services/connection-status.service";
import { unifiedLoggingService } from "../services/unified-logging.service";

/**
 * Universal Connection Status Adapter
 *
 * Provides hardware-agnostic connection status management
 * and real-time status updates to the frontend.
 *
 * Key Features:
 * - On-demand connection validation
 * - Pre-operation connection checks
 * - Real-time status broadcasting
 * - Hardware abstraction layer
 */

export const registerUniversalConnectionHandler = (
  ku16Instance: KU16 | null,
  cu12StateManager: CU12SmartStateManager | null,
  mainWindow: BrowserWindow
) => {
  // Initialize connection service with hardware instances
  connectionStatusService.setHardwareInstances(ku16Instance, cu12StateManager);

  /**
   * Get current connection status
   * Called by frontend to check hardware connection
   */
  ipcMain.handle("get-connection-status", async (event, payload) => {
    try {
      console.log("[CONNECTION-ADAPTER] Connection status requested");

      const status = await connectionStatusService.checkConnection();

      await unifiedLoggingService.logInfo({
        message: `Connection status retrieved: ${status.isConnected ? 'Connected' : 'Disconnected'}`,
        component: "ConnectionAdapter",
        details: { 
          hardwareType: status.hardwareType,
          isConnected: status.isConnected 
        },
      });

      return {
        success: true,
        status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Connection status check error: ${error.message}`,
        component: "ConnectionAdapter",
        details: { error: error.message },
      });

      return {
        success: false,
        error: error.message,
        status: {
          isConnected: false,
          hardwareType: 'UNKNOWN',
          lastChecked: new Date(),
          message: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ',
          error: error.message
        } as ConnectionStatus
      };
    }
  });

  /**
   * Validate connection before operation
   * Called by frontend before critical operations
   */
  ipcMain.handle("validate-connection-before-operation", async (event, payload) => {
    try {
      const { operationName } = payload;
      console.log(`[CONNECTION-ADAPTER] Pre-operation validation for: ${operationName}`);

      const validation = await connectionStatusService.validateBeforeOperation(operationName);

      if (!validation.isValid) {
        // Send connection error event to frontend
        mainWindow.webContents.send("connection-validation-error", {
          operation: operationName,
          message: validation.errorMessage,
          status: validation.status
        });
      }

      return {
        success: true,
        validation
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Connection validation error: ${error.message}`,
        component: "ConnectionAdapter",
        details: { error: error.message, operation: payload?.operationName },
      });

      return {
        success: false,
        error: error.message,
        validation: {
          isValid: false,
          status: {
            isConnected: false,
            hardwareType: 'UNKNOWN',
            lastChecked: new Date(),
            message: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ',
            error: error.message
          } as ConnectionStatus,
          errorMessage: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ'
        }
      };
    }
  });

  /**
   * Initialize connection status on app startup
   * Called during app initialization
   */
  ipcMain.handle("initialize-connection-status", async (event, payload) => {
    try {
      console.log("[CONNECTION-ADAPTER] Initializing connection status");

      const status = await connectionStatusService.setupInitialValidation();

      // Broadcast initial status to frontend
      mainWindow.webContents.send("connection-status-updated", {
        status,
        timestamp: new Date().toISOString(),
        isInitial: true
      });

      await unifiedLoggingService.logInfo({
        message: `Connection status initialized: ${status.isConnected ? 'Connected' : 'Disconnected'}`,
        component: "ConnectionAdapter",
        details: { 
          hardwareType: status.hardwareType,
          isConnected: status.isConnected 
        },
      });

      return {
        success: true,
        status
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Connection initialization error: ${error.message}`,
        component: "ConnectionAdapter",
        details: { error: error.message },
      });

      const errorStatus: ConnectionStatus = {
        isConnected: false,
        hardwareType: 'UNKNOWN',
        lastChecked: new Date(),
        message: 'เกิดข้อผิดพลาดในการเริ่มต้นระบบ',
        error: error.message
      };

      // Broadcast error status to frontend
      mainWindow.webContents.send("connection-status-updated", {
        status: errorStatus,
        timestamp: new Date().toISOString(),
        isInitial: true,
        error: true
      });

      return {
        success: false,
        error: error.message,
        status: errorStatus
      };
    }
  });

  /**
   * Manual connection refresh
   * Called when user wants to manually check connection
   */
  ipcMain.handle("refresh-connection-status", async (event, payload) => {
    try {
      console.log("[CONNECTION-ADAPTER] Manual connection refresh requested");

      const status = await connectionStatusService.checkConnection();

      // Broadcast updated status to frontend
      mainWindow.webContents.send("connection-status-updated", {
        status,
        timestamp: new Date().toISOString(),
        isManualRefresh: true
      });

      await unifiedLoggingService.logInfo({
        message: `Manual connection refresh completed: ${status.isConnected ? 'Connected' : 'Disconnected'}`,
        component: "ConnectionAdapter",
        details: { 
          hardwareType: status.hardwareType,
          isConnected: status.isConnected 
        },
      });

      return {
        success: true,
        status
      };
    } catch (error) {
      await unifiedLoggingService.logError({
        message: `Manual connection refresh error: ${error.message}`,
        component: "ConnectionAdapter",
        details: { error: error.message },
      });

      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log("[CONNECTION-ADAPTER] Universal connection handlers registered");
};