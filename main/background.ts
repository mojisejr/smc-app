import { BrowserWindow, app, dialog } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import database and hardware related modules
import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16"; // Legacy - to be removed
import { KU16SmartStateManager } from "./hardware/ku16/stateManager"; // New modern KU16
import { CU12SmartStateManager } from "./hardware/cu12/stateManager";

// Import IPC handlers for various functionalities
// NOTE: Core operation handlers (unlock, dispense, reset, etc.) are now managed by universal adapters
// NOTE: deactivate handler is now managed by universal adapters

// Import authentication related modules
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";

// Import settings related modules
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { getHardwareType } from "./setting/getHardwareType";
import { getUserHandler } from "./auth/ipcMain/getUser";
import { getAllSlotsHandler } from "./setting/ipcMain/getAllSlots";
// NOTE: Admin handlers (deactivate-all, reactivate-admin, deactivate-admin) are now managed by universal adapters
import { createNewUserHandler } from "./user/createNewUser";
import { deleteUserHandler } from "./user/deleteUser";
import {
  setSelectedIndicatorPortHandler,
  setSelectedPortHandler,
} from "./setting/ipcMain/setSelectedPort";
import { setHardwareTypeHandler } from "./setting/ipcMain/setHardwareType";
import { getHardwareTypeHandler } from "./setting/ipcMain/getHardwareType";
import { checkActivationKeyHandler } from "./license/ipcMain/check-activation-key";
import { activateKeyHandler } from "./license/ipcMain/activate-key";
import { IndicatorDevice } from "./indicator";
import { registerCU12Handlers } from "./hardware/cu12/ipcMain";
import { registerUniversalAdapters } from "./adapters";
import { registerEnhancedLoggingHandlers } from "./adapters/enhanced-logging-adapter";
import { registerHardwareConfigHandlers } from "./setting/ipcMain/hardwareConfigHandlers";
import { registerUserGuideAdapters } from "./adapters/userGuideAdapter";
import "./adapters/enhanced-export-adapter";
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
let ku16StateManager: KU16SmartStateManager | null = null; // New modern KU16
let ku16Initialized = false;

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

  // Initialize database connection
  const sql = await sequelize.sync();

  // Get application settings
  const settings = await getSetting();

  // Database connection successful if we reach here

  // Smart Hardware Selection - Initialize only one hardware type to prevent port conflicts
  const hardwareInfo = await getHardwareType();
  console.log(
    `[HARDWARE] Detected: ${hardwareInfo.type} (Port: ${hardwareInfo.port}, Max Slots: ${hardwareInfo.maxSlots})`
  );

  // Initialize Indicator device with settings (with proper port validation)
  let indicator: IndicatorDevice | null = null;
  try {
    if (settings.indi_port && !settings.indi_port.startsWith("COM")) {
      // Check if port exists before initialization
      const fs = require("fs");
      if (fs.existsSync(settings.indi_port)) {
        indicator = new IndicatorDevice(
          settings.indi_port,
          settings.indi_baudrate,
          mainWindow
        );
        console.log("[INDICATOR] Indicator device initialized successfully");
      } else {
        console.log(
          `[INDICATOR] Skipping indicator initialization - Port does not exist: ${settings.indi_port}`
        );
      }
    } else {
      console.log(
        "[INDICATOR] Skipping indicator initialization - Windows COM port detected on macOS"
      );
    }
  } catch (error) {
    console.error("[INDICATOR] Initialization failed:", error.message);
    // Don't let indicator errors prevent application startup
    indicator = null;
  }

  // Initialize hardware based on detected configuration (SINGLE HARDWARE MODE)
  let ku16: KU16 | null = null;

  if (hardwareInfo.type === "DS12" && hardwareInfo.isConfigured) {
    // CU12 Mode - Initialize CU12 only
    console.log("[HARDWARE] Initializing CU12 (12-slot system)...");

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
      console.log(
        `[CU12] Initialization: ${cu12Initialized ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      console.error("[CU12] Initialization failed:", error.message);
    }
  } else if (hardwareInfo.type === "DS16" && hardwareInfo.isConfigured) {
    // KU16 Mode - Initialize both modern and legacy KU16 for transition
    console.log("[HARDWARE] Initializing KU16 (15-slot system)...");

    // Initialize NEW modern KU16SmartStateManager
    ku16StateManager = new KU16SmartStateManager(mainWindow, {
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes for 24/7 stability
      userInactiveTimeout: 2 * 60 * 1000, // 2 minutes user timeout
      failureThreshold: 3,
      performanceMonitoring: true,
      detailedLogging: false, // Set to true for debugging
    });

    try {
      ku16Initialized = await ku16StateManager.initialize({
        port: hardwareInfo.port!,
        baudRate: hardwareInfo.baudrate!,
        timeout: 5000,
        maxSlots: 15, // KU16 specific
      });
      console.log(
        `[KU16-MODERN] Initialization: ${ku16Initialized ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      console.error("[KU16-MODERN] Initialization failed:", error.message);
    }

    // Initialize LEGACY KU16 for backward compatibility during transition
    try {
      ku16 = new KU16(
        hardwareInfo.port!,
        hardwareInfo.baudrate!,
        hardwareInfo.maxSlots,
        mainWindow
      );
      console.log("[KU16-LEGACY] Legacy instance created for backward compatibility");
    } catch (error) {
      console.error("[KU16-LEGACY] Legacy initialization failed:", error.message);
    }
  } else {
    // No hardware configured or unknown type - create KU16 fallback
    console.warn(
      "[HARDWARE] No valid hardware configuration found - creating KU16 modern + legacy fallback"
    );

    // Modern KU16 fallback
    ku16StateManager = new KU16SmartStateManager(mainWindow, {
      healthCheckInterval: 5 * 60 * 1000,
      userInactiveTimeout: 2 * 60 * 1000,
      failureThreshold: 3,
      performanceMonitoring: false, // Reduced for fallback mode
      detailedLogging: false,
    });

    try {
      ku16Initialized = await ku16StateManager.initialize({
        port: settings.ku_port || "/dev/tty.usbserial-default",
        baudRate: settings.ku_baudrate || 19200,
        timeout: 5000,
        maxSlots: 15,
      });
      console.log(
        `[KU16-MODERN-FALLBACK] Initialization: ${ku16Initialized ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      console.error("[KU16-MODERN-FALLBACK] Initialization failed:", error.message);
    }

    // Legacy KU16 fallback
    ku16 = new KU16(
      settings.ku_port || "/dev/tty.usbserial-default",
      settings.ku_baudrate || 19200,
      settings.available_slots || 15,
      mainWindow
    );
    console.log("[KU16-LEGACY-FALLBACK] Legacy fallback instance created");
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from devices based on hardware selection
  if (ku16) {
    ku16.receive();
    console.log("[HARDWARE] KU16 receiving data started");
  }

  if (indicator) {
    indicator.receive();
    console.log("[INDICATOR] Indicator receiving data started");
  }

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // Settings related handlers (always available)
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  getAllSlotsHandler(); // Re-enabled: using original handler to avoid conflicts
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();
  setHardwareTypeHandler();
  getHardwareTypeHandler();

  // Hardware Configuration Wizard handlers
  registerHardwareConfigHandlers();

  // Authentication related handlers (always available)
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  // Universal IPC Adapters - Works with both KU16 and CU12
  console.log("[HARDWARE] Registering universal IPC adapters...");
  registerUniversalAdapters(ku16, cu12StateManager, mainWindow, ku16StateManager);

  // Enhanced Logging System - Replaces legacy logging
  console.log("[LOGGING] Registering enhanced logging handlers...");
  registerEnhancedLoggingHandlers();
  console.log("[LOGGING] Enhanced logging system activated");
  
  // User Guide Documentation System - Modern documentation with hardware detection
  console.log("[USER-GUIDE] Registering user guide documentation handlers...");
  registerUserGuideAdapters();
  console.log("[USER-GUIDE] User guide documentation system activated");

  // Enhanced Export System - Provides CSV/XLSX export with Thai encoding
  console.log(
    "[EXPORT] Enhanced export system with CSV/XLSX support activated"
  );

  // Hardware-specific handlers registration
  if (hardwareInfo.type === "DS12" && cu12Initialized) {
    // CU12 Mode - Register CU12-specific handlers (excluding universal ones)
    console.log("[HARDWARE] Registering CU12-specific IPC handlers...");
    registerCU12Handlers(cu12StateManager, mainWindow);

    // Register additional handlers that need KU16 instance for CU12 mode
    updateSettingHandler(mainWindow, ku16); // May need hardware-agnostic version

    console.log("[CU12] CU12-specific IPC handlers registered successfully");
  } else if (ku16) {
    // KU16 Mode - Register remaining KU16-specific handlers (excluding universal ones)
    console.log("[HARDWARE] Registering KU16-specific IPC handlers...");

    updateSettingHandler(mainWindow, ku16);

    // NOTE: Core operation handlers (unlock, dispense, reset, etc.) are now handled by universal adapters
    // NOTE: deactivate handler is now handled by universal adapters (registerUniversalDeactivateHandler)

    // NOTE: Logging handlers (get_logs, get_dispensing_logs) are now handled by universal adapters

    // The following handlers are now managed by universal adapters:
    // - unlockHandler → registerUniversalUnlockHandler
    // - checkLockedBackHandler → registerUniversalCheckLockedBackHandler
    // - dispenseHandler → registerUniversalDispenseHandler
    // - dispensingResetHanlder → registerUniversalResetHandler
    // - dispenseContinueHandler → registerUniversalDispenseContinueHandler
    // - forceResetHanlder → registerUniversalForceResetHandler
    // - deactiveAllHandler, reactiveAllHanlder, reactivateAdminHandler, deactivateAdminHandler → admin adapters

    console.log(
      "[KU16] Universal adapters now handle core operations for backward compatibility"
    );
  } else {
    console.log(
      "[HARDWARE] Using universal adapters only - no hardware-specific handlers"
    );
  }

  // Load the application UI based on environment
  if (isProd) {
    await mainWindow.loadURL("app://./home.html");
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
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

  // Cleanup KU16 Modern resources before quitting
  if (ku16Initialized && ku16StateManager) {
    try {
      await ku16StateManager.cleanup();
      console.log("[KU16-MODERN] Cleanup completed successfully");
    } catch (error) {
      console.error("[KU16-MODERN] Cleanup error:", error.message);
    }
  }

  // Legacy KU16 cleanup
  if (ku16) {
    try {
      ku16.close();
      console.log("[KU16-LEGACY] Cleanup completed successfully");
    } catch (error) {
      console.error("[KU16-LEGACY] Cleanup error:", error.message);
    }
  }

  app.quit();
});
