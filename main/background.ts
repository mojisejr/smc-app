import { BrowserWindow, app, dialog } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

// Import database and KU16 related modules
import { sequelize } from "../db/sequelize";
import { KU16 } from "./ku16";
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

  // PHASE 4.1: Simple Fallback Strategy - Try DS12 first, fallback to KU16
  let ku16 = null;
  let usingDS12 = false;

  try {
    // Try DS12Controller first (Phase 4.1 preferred)
    console.log("Phase 4.1: Attempting DS12Controller initialization...");
    
    const ds12Initialized = await BuildTimeController.initialize(
      mainWindow,
      settings.ku_port,
      settings.ku_baudrate
    );
    
    if (ds12Initialized) {
      console.log("✅ Using DS12Controller (Phase 4.1)");
      usingDS12 = true;
      
      // Start receiving data from DS12Controller
      const controller = BuildTimeController.getCurrentController();
      if (controller) {
        controller.receive();
      }
    }
    
  } catch (error) {
    console.log(`⚠️ DS12Controller initialization failed: ${error.message}`);
    console.log("🔄 Falling back to KU16 controller...");
  }

  // Fallback to KU16 if DS12 initialization failed
  if (!usingDS12) {
    ku16 = new KU16(
      settings.ku_port,
      settings.ku_baudrate,
      settings.available_slots,
      mainWindow
    );
    
    ku16.receive();
    console.log("✅ Using KU16Controller (fallback)");
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from indicator device
  indicator.receive();

  //Activation key check
  activateKeyHandler();
  checkActivationKeyHandler();

  // Register all IPC handlers for various functionalities
  // PHASE 4.2: Use unified device controller handler registration
  registerAllDeviceHandlers();

  // Settings related handlers
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

  // Logging related handlers (still using KU16 for now - to be migrated in future phase)
  logDispensingHanlder(ku16);
  LoggingHandler(ku16);
  exportLogsHandler(ku16);

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
  // PHASE 4.1: Graceful shutdown with BuildTimeController cleanup
  try {
    console.log("Application shutdown initiated - cleaning up controllers");
    
    // Cleanup BuildTimeController gracefully
    await BuildTimeController.cleanup();
    
    console.log("Controller cleanup completed successfully");
  } catch (error) {
    console.error("Error during controller cleanup:", error);
    
    // Emergency cleanup if graceful cleanup fails
    await BuildTimeController.emergencyCleanup("Application shutdown error");
  } finally {
    app.quit();
  }
});
