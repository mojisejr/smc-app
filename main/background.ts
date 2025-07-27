import { BrowserWindow, app, dialog } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import database and hardware related modules
import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16";
import { CU12SmartStateManager } from "./hardware/cu12/stateManager";

// Import IPC handlers for various functionalities
import { initHandler } from "./ku16/ipcMain/init";
import { unlockHandler } from "./ku16/ipcMain/unlock";
import { dispenseHandler } from "./ku16/ipcMain/dispensing";
import { dispensingResetHanlder } from "./ku16/ipcMain/reset";
import {
  exportLogsHandler,
  logDispensingHanlder,
  LoggingHandler,
} from "./logger";
import { forceResetHanlder } from "./ku16/ipcMain/forceReset";
import { reactiveAllHanlder } from "./ku16/ipcMain/reactiveAll";
import { deactiveHanlder } from "./ku16/ipcMain/deactivate";

// Import authentication related modules
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";

// Import settings related modules
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { getHardwareType } from "./setting/getHardwareType";
import { checkLockedBackHandler } from "./ku16/ipcMain/checkLockedBack";
import { dispenseContinueHandler } from "./ku16/ipcMain/dispensing-continue";
import { getPortListHandler } from "./ku16/ipcMain/getPortList";
import { getUserHandler } from "./auth/ipcMain/getUser";
import { getAllSlotsHandler } from "./setting/ipcMain/getAllSlots";
import { deactiveAllHandler } from "./ku16/ipcMain/deactivateAll";
import { reactivateAdminHandler } from "./ku16/ipcMain/reactivate-admin";
import { deactivateAdminHandler } from "./ku16/ipcMain/deactivate-admin";
import { createNewUserHandler } from "./user/createNewUser";
import { deleteUserHandler } from "./user/deleteUser";
import {
  setSelectedIndicatorPortHandler,
  setSelectedPortHandler,
} from "./setting/ipcMain/setSelectedPort";
import { checkActivationKeyHandler } from "./license/ipcMain/check-activation-key";
import { activateKeyHandler } from "./license/ipcMain/activate-key";
import { IndicatorDevice } from "./indicator";
import { registerCU12Handlers } from "./hardware/cu12/ipcMain";
/**
 * Indicates whether the application is running in production mode.
 *
 * This boolean value is determined by checking the `NODE_ENV` environment variable.
 * If `NODE_ENV` is set to "production", `isProd` will be `true`; otherwise, it will be `false`.
 */
const isProd: boolean = process.env.NODE_ENV === "production";
let mainWindow: BrowserWindow;
let cu12StateManager: CU12SmartStateManager | null = null;
let cu12Initialized = false;

// Configure electron-serve for production mode
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  await app.whenReady();

  // Create main application window with specific dimensions and properties
  mainWindow = createWindow("main", {
    fullscreen: false,
    width: 1280,
    height: 768,
    minWidth: 1280,
    minHeight: 768,
    maxWidth: 1920,
    maxHeight: 1080,
    closable: true,
    autoHideMenuBar: true,
  });

  let dbConnection = false;

  // Initialize database connection
  const sql = await sequelize.sync();

  // Get application settings
  const settings = await getSetting();

  if (settings && sql) {
    dbConnection = true;
  }

  // Smart Hardware Selection - Initialize only one hardware type to prevent port conflicts
  const hardwareInfo = await getHardwareType();
  console.log(`[HARDWARE] Detected: ${hardwareInfo.type} (Port: ${hardwareInfo.port}, Max Slots: ${hardwareInfo.maxSlots})`);

  // Initialize Indicator device with settings (with error handling for platform compatibility)
  let indicator: IndicatorDevice | null = null;
  try {
    if (settings.indi_port && !settings.indi_port.startsWith('COM')) { // Skip Windows COM ports on macOS
      indicator = new IndicatorDevice(
        settings.indi_port,
        settings.indi_baudrate,
        mainWindow
      );
    } else {
      console.log('[INDICATOR] Skipping indicator initialization - Windows COM port detected on macOS');
    }
  } catch (error) {
    console.error('[INDICATOR] Initialization failed:', error.message);
  }

  // Initialize hardware based on detected configuration (SINGLE HARDWARE MODE)
  let ku16: KU16 | null = null;

  if (hardwareInfo.type === 'CU12' && hardwareInfo.isConfigured) {
    // CU12 Mode - Initialize CU12 only
    console.log('[HARDWARE] Initializing CU12 (12-slot system)...');
    
    cu12StateManager = new CU12SmartStateManager(mainWindow, {
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes for 24/7 stability
      userInactiveTimeout: 2 * 60 * 1000, // 2 minutes user timeout
      maxConsecutiveFailures: 3,
      enableIntelligentCaching: true,
      logLevel: "INFO",
    });

    try {
      cu12Initialized = await cu12StateManager.initialize({
        port: hardwareInfo.port!,
        baudRate: hardwareInfo.baudrate!,
        timeout: 3000,
      });
      console.log(`[CU12] Initialization: ${cu12Initialized ? "SUCCESS" : "FAILED"}`);
    } catch (error) {
      console.error("[CU12] Initialization failed:", error.message);
    }

  } else if (hardwareInfo.type === 'KU16' && hardwareInfo.isConfigured) {
    // KU16 Mode - Initialize KU16 only
    console.log('[HARDWARE] Initializing KU16 (15-slot system)...');
    
    ku16 = new KU16(
      hardwareInfo.port!,
      hardwareInfo.baudrate!,
      hardwareInfo.maxSlots,
      mainWindow
    );

  } else {
    // No hardware configured or unknown type
    console.warn('[HARDWARE] No valid hardware configuration found - creating KU16 fallback');
    ku16 = new KU16(
      settings.ku_port || '/dev/tty.usbserial-default',
      settings.ku_baudrate || 19200,
      settings.available_slots || 15,
      mainWindow
    );
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from devices based on hardware selection
  if (ku16) {
    ku16.receive();
    console.log('[HARDWARE] KU16 receiving data started');
  }
  
  if (indicator) {
    indicator.receive();
    console.log('[INDICATOR] Indicator receiving data started');
  }

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // Settings related handlers (always available)
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  getAllSlotsHandler();
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();

  // Authentication related handlers (always available)
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  // Hardware-specific handlers registration
  if (hardwareInfo.type === 'CU12' && cu12Initialized) {
    // CU12 Mode - Register CU12 handlers only
    console.log('[HARDWARE] Registering CU12 IPC handlers...');
    registerCU12Handlers(cu12StateManager, mainWindow);
    console.log("[CU12] All IPC handlers registered successfully");
    
    // Note: CU12 doesn't need KU16-style handlers as it has its own protocol
    
  } else if (ku16) {
    // KU16 Mode or Fallback - Register KU16 handlers
    console.log('[HARDWARE] Registering KU16 IPC handlers...');
    
    getPortListHandler(ku16);
    updateSettingHandler(mainWindow, ku16);
    
    // KU16 device operation handlers
    initHandler(ku16, mainWindow);
    unlockHandler(ku16);
    checkLockedBackHandler(ku16);
    dispenseHandler(ku16);
    dispensingResetHanlder(ku16);
    dispenseContinueHandler(ku16);
    forceResetHanlder(ku16);
    deactiveHanlder(ku16);
    deactiveAllHandler(ku16);
    reactiveAllHanlder(ku16);
    reactivateAdminHandler(ku16);
    deactivateAdminHandler(ku16);

    // Logging related handlers
    logDispensingHanlder(ku16);
    LoggingHandler(ku16);
    exportLogsHandler(ku16);
    
    console.log("[KU16] All IPC handlers registered successfully");
    
  } else {
    console.error('[HARDWARE] No hardware available - minimal handlers registered');
  }

  // Load the application UI based on environment
  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    // mainWindow.webContents.openDevTools();
  }
})();

// Quit application when all windows are closed
app.on("window-all-closed", async () => {
  // Cleanup CU12 resources before quitting
  if (cu12Initialized && cu12StateManager) {
    try {
      await cu12StateManager.cleanup();
      console.log("[CU12] Cleanup completed successfully");
    } catch (error) {
      console.error("[CU12] Cleanup error:", error.message);
    }
  }
  app.quit();
});
