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

  // Initialize Indicator device with settings

  const indicator = new IndicatorDevice(
    settings.indi_port,
    settings.indi_baudrate,
    mainWindow
  );

  // Initialize KU16 device with settings
  const ku16 = new KU16(
    settings.ku_port,
    settings.ku_baudrate,
    settings.available_slots,
    mainWindow
  );

  // Initialize CU12 Smart State Manager (12-slot hardware with adaptive monitoring)
  cu12StateManager = new CU12SmartStateManager(mainWindow, {
    healthCheckInterval: 5 * 60 * 1000, // 5 minutes for 24/7 stability
    userInactiveTimeout: 2 * 60 * 1000, // 2 minutes user timeout
    maxConsecutiveFailures: 3,
    enableIntelligentCaching: true,
    logLevel: "INFO",
  });

  // Initialize CU12 device with configured port settings
  const cu12Port = settings?.cu_port || null;
  if (cu12Port) {
    try {
      cu12Initialized = await cu12StateManager.initialize({
        port: cu12Port,
        baudRate: settings.cu_baudrate || 19200,
        timeout: 3000,
      });
      console.log(
        `[CU12] Initialization: ${cu12Initialized ? "SUCCESS" : "FAILED"}`
      );
    } catch (error) {
      console.error("[CU12] Initialization failed:", error.message);
    }
  } else {
    console.log(
      "[CU12] CU12 port not configured - skipping CU12 initialization"
    );
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from devices
  ku16.receive();
  indicator.receive();

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // Settings related handlers
  getPortListHandler(ku16);
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  updateSettingHandler(mainWindow, ku16);
  getAllSlotsHandler();
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();

  // Authentication related handlers
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

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

  // CU12 handlers - Register only if CU12 is initialized
  if (cu12Initialized) {
    registerCU12Handlers(cu12StateManager, mainWindow);
    console.log("[CU12] All IPC handlers registered successfully");
  } else {
    console.log("[CU12] Hardware not available - handlers not registered");
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
