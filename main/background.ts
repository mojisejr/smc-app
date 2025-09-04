import { BrowserWindow, app, ipcMain } from "electron";
import { join } from "path";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import runtime logger for debugging build hang issues
import { 
  logSystemInfo, 
  logError, 
  logDebug, 
  PerformanceTimer 
} from "./logger/runtime-logger";

// Environment configuration
const env = process.env;
const is = {
  dev: process.env.NODE_ENV !== "production"
};

// Load environment variables from .env file
import * as dotenv from "dotenv";
dotenv.config();

// Import database and DS12 controller modules
import { sequelize } from "../db/sequelize";
import { BuildTimeController } from "./ku-controllers/BuildTimeController";

// Import IPC handlers for various functionalities
// PHASE 4.2: Import new unified device controller handlers
import { registerAllDeviceHandlers } from "./device-controllers/ipcMain";
import {
  exportLogsHandler,
  logDispensingHanlder,
  LoggingHandler,
} from "./logger";

// Import authentication related modules
import { loginRequestHandler } from "./auth/ipcMain/login";
import { Authentication } from "./auth";
import { logoutRequestHandler } from "./auth/ipcMain/logout";

// Import settings related modules
import { getSetting } from "./setting/getSetting";
import { getSettingHandler } from "./setting/ipcMain/getSetting";
import { updateSettingHandler } from "./setting/ipcMain/updateSetting";
import { getUserHandler } from "./auth/ipcMain/getUser";
import { getAllSlotsHandler } from "./setting/ipcMain/getAllSlots";
import { createNewUserHandler } from "./user/createNewUser";
import { deleteUserHandler } from "./user/deleteUser";
import {
  setSelectedIndicatorPortHandler,
  setSelectedPortHandler,
} from "./setting/ipcMain/setSelectedPort";
import { checkActivationKeyHandler } from "./license/ipcMain/check-activation-key";
import { activateKeyHandler } from "./license/ipcMain/activate-key";
import { activationProgressHandler } from "./license/ipcMain/activation-progress";
import { isSystemActivated } from "./license/validator";
import { getValidationMode } from "./utils/environment";
import ActivationStateManager from "./license/activation-state-manager";
import { IndicatorDevice } from "./indicator";
/**
 * Indicates whether the application is running in production mode.
 *
 * This boolean value is determined by checking the `NODE_ENV` environment variable.
 * If `NODE_ENV` is set to "production", `isProd` will be `true`; otherwise, it will be `false`.
 */
const isProd: boolean = process.env.NODE_ENV === "production";
let mainWindow: BrowserWindow;

// Configure electron-serve for production mode
if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")} (development)`);
}

(async () => {
  const appTimer = new PerformanceTimer('background', 'application-startup');
  
  logSystemInfo('background', 'Starting SMC application initialization');
  
  try {
    logDebug('background', 'Waiting for app ready state');
    await app.whenReady();
    appTimer.checkpoint('app-ready');
    
    logSystemInfo('background', 'Electron app ready, proceeding with initialization');

    // Create main application window with specific dimensions and properties
    logDebug('background', 'Creating main window');
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
    appTimer.checkpoint('window-created');
    
    logSystemInfo('background', 'Main window created successfully');

    // Initialize database connection
    logDebug('background', 'Initializing database connection');
    // Use alter: true in development to update schema with new fields
    const sql = await sequelize.sync({ alter: !isProd });
    appTimer.checkpoint('database-sync');
    
    if (!isProd) {
      logDebug('background', 'Development mode: Database schema updated with new fields');
    }
    
    logSystemInfo('background', 'Database synchronized successfully');

    // Get application settings
    logDebug('background', 'Loading application settings');
    const settings = await getSetting();
    appTimer.checkpoint('settings-loaded');
    
    logSystemInfo('background', 'Application settings loaded', {
      indicatorPort: settings?.indi_port,
      indicatorBaudrate: settings?.indi_baudrate
    });

    if (!settings || !sql) {
      const errorMsg = "Failed to initialize database or load settings";
      logError('background', errorMsg, undefined, {
        settingsLoaded: !!settings,
        databaseSynced: !!sql
      });
      throw new Error(errorMsg);
    }

    // Initialize Indicator device with settings
    logDebug('background', 'Initializing indicator device', {
      port: settings.indi_port,
      baudrate: settings.indi_baudrate
    });
    
    const indicator = new IndicatorDevice(
      settings.indi_port,
      settings.indi_baudrate,
      mainWindow
    );
    appTimer.checkpoint('indicator-initialized');
    
    logSystemInfo('background', 'Indicator device initialized');

    // Initialize authentication system
    logDebug('background', 'Initializing authentication system');
    const auth = new Authentication();
    appTimer.checkpoint('auth-initialized');
    
    logSystemInfo('background', 'Authentication system initialized');

    // Start receiving data from indicator device
    logDebug('background', 'Starting indicator data reception');
    indicator.receive();
    appTimer.checkpoint('indicator-receiving');
    
    logSystemInfo('background', 'Indicator device started receiving data');

    // Initialize license system handlers
    logDebug('background', 'Initializing license system handlers');
    activateKeyHandler();
    checkActivationKeyHandler();
    activationProgressHandler();
    appTimer.checkpoint('license-handlers-initialized');
    
    logSystemInfo('background', 'License system handlers initialized');

    if (is.dev && env.RENDERER_REMOTE_URL) {
      logDebug('background', 'Loading development renderer URL', {
        url: env.RENDERER_REMOTE_URL
      });
      mainWindow.loadURL(env.RENDERER_REMOTE_URL);
    } else {
      logDebug('background', 'Loading production renderer file');
      mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
    appTimer.checkpoint('renderer-loaded');
    
    logSystemInfo('background', 'Renderer loaded successfully');

    // Initialize unified activation state manager (includes DS12Controller initialization)
    let initialPage = "activate-key"; // Default to activation page
    
    try {
      logDebug('background', 'Initializing activation state manager');
      
      // Initialize activation state manager with integrated DS12Controller
      const activationState = await ActivationStateManager.initialize(mainWindow);
      appTimer.checkpoint('activation-state-initialized');
      
      // Determine initial page based on activation state
      initialPage = activationState.isActivated ? "home" : "activate-key";
      
      logSystemInfo('background', 'Activation state manager initialized', {
        isActivated: activationState.isActivated,
        ds12Available: activationState.ds12Available,
        initialPage
      });
      
    } catch (error: any) {
      logError('background', 'Failed to initialize activation system', error, {
        defaultingToActivationPage: true
      });
      initialPage = "activate-key";
    }

    // Navigate to the appropriate initial page
    mainWindow.webContents.once("did-finish-load", () => {
      logSystemInfo('background', 'Renderer finished loading, navigating to initial page', {
        initialPage
      });
      mainWindow?.webContents.send("navigate-to-page", initialPage);
    });

    // Register all IPC handlers for various functionalities
    logDebug('background', 'Registering IPC handlers');
    
    // PHASE 4.2: Use unified device controller handler registration
    registerAllDeviceHandlers();
    appTimer.checkpoint('device-handlers-registered');
    
    logSystemInfo('background', 'Device handlers registered');

    // Settings related handlers
    getSettingHandler(mainWindow);
    getUserHandler(mainWindow);
    updateSettingHandler(mainWindow);
    getAllSlotsHandler();
    createNewUserHandler();
    deleteUserHandler();
    setSelectedPortHandler();
    setSelectedIndicatorPortHandler();
    appTimer.checkpoint('settings-handlers-registered');
    
    logSystemInfo('background', 'Settings handlers registered');

    // Authentication related handlers
    loginRequestHandler(mainWindow, auth);
    logoutRequestHandler(auth);
    appTimer.checkpoint('auth-handlers-registered');
    
    logSystemInfo('background', 'Authentication handlers registered');

    // Logging related handlers (Phase 4.2: migrated to DS12-only mode)
    logDispensingHanlder();
    LoggingHandler();
    exportLogsHandler();
    appTimer.checkpoint('logging-handlers-registered');
    
    logSystemInfo('background', 'Logging handlers registered');

    // Load the application UI based on environment and license status
    logDebug('background', 'Loading application UI', {
      environment: isProd ? 'production' : 'development',
      initialPage
    });

    if (isProd) {
      await mainWindow.loadURL(`app://./${initialPage}.html`);
    } else {
      const port = process.argv[2];
      await mainWindow.loadURL(`http://localhost:${port}/${initialPage}`);
      mainWindow.webContents.openDevTools();
    }
    
    const totalStartupTime = appTimer.end({
      environment: isProd ? 'production' : 'development',
      initialPage,
      success: true
    });
    
    logSystemInfo('background', 'SMC application initialization completed successfully', {
      totalStartupTime: `${totalStartupTime}ms`,
      environment: isProd ? 'production' : 'development'
    });
    
  } catch (error: any) {
    logError('background', 'Critical error during application initialization', error, {
      stage: 'startup',
      environment: isProd ? 'production' : 'development'
    });
    
    // Re-throw to maintain existing error handling behavior
    throw error;
  }
})();

// Quit application when all windows are closed
app.on("window-all-closed", async () => {
  // PHASE 4.1: Graceful shutdown with BuildTimeController cleanup
  try {
    logSystemInfo('background', 'Application shutdown initiated - cleaning up controllers');

    // Cleanup BuildTimeController gracefully
    await BuildTimeController.cleanup();

    logSystemInfo('background', 'Controller cleanup completed successfully');
  } catch (error: any) {
    logError('background', 'Error during controller cleanup', error);

    // Emergency cleanup if graceful cleanup fails
    await BuildTimeController.emergencyCleanup("Application shutdown error");
  } finally {
    logSystemInfo('background', 'Application quit initiated');
    app.quit();
  }
});
