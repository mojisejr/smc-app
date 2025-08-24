import { BrowserWindow, app } from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";

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

  // Initialize database connection
  const sql = await sequelize.sync();

  // Get application settings
  const settings = await getSetting();

  if (!settings || !sql) {
    throw new Error("Failed to initialize database or load settings");
  }

  // Initialize Indicator device with settings

  const indicator = new IndicatorDevice(
    settings.indi_port,
    settings.indi_baudrate,
    mainWindow
  );

  // PHASE 4.2: DS12-Only Implementation - No fallback strategy
  console.log("Phase 4.2: Initializing DS12Controller (DS12-only mode)...");

  const ds12Initialized = await BuildTimeController.initialize(
    mainWindow,
    settings.ku_port,
    settings.ku_baudrate
  );

  if (ds12Initialized) {
    console.log("✅ Using DS12Controller (Phase 4.2 DS12-only mode)");

    // Start receiving data from DS12Controller
    const controller = BuildTimeController.getCurrentController();
    if (controller) {
      controller.receive();
    }
  } else {
    console.warn("⚠️ DS12Controller unavailable - running in offline mode");
    console.warn("⚠️ Hardware operations will be disabled until connection restored");
    // Allow app to continue - license validation and UI will work normally
    // Hardware operations will fail gracefully at IPC level (existing behavior)
  }

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from indicator device
  indicator.receive();

  // Initialize license system handlers
  activateKeyHandler();
  checkActivationKeyHandler();
  activationProgressHandler();

  // Check license activation status and determine initial page (Phase 4.2)
  let initialPage = "activate-key"; // Default to activation page
  
  try {
    // Phase 4.2: Check validation mode first
    const validationMode = getValidationMode();
    
    if (validationMode === 'bypass') {
      console.log("info: Bypass mode detected - proceeding directly to home page");
      initialPage = "home";
    } else {
      console.log("info: Checking system activation status...");
      const isActivated = await isSystemActivated();
      
      if (isActivated) {
        console.log("info: System is activated - proceeding to main application");
        initialPage = "home";
      } else {
        console.log("info: System not activated - redirecting to activation page");
        initialPage = "activate-key";
      }
    }
  } catch (error: any) {
    console.error("error: License activation check failed:", error.message);
    console.log("info: Defaulting to activation page due to error");
    initialPage = "activate-key";
  }

  // Register all IPC handlers for various functionalities
  // PHASE 4.2: Use unified device controller handler registration
  registerAllDeviceHandlers();

  // Settings related handlers
  getSettingHandler(mainWindow);
  getUserHandler(mainWindow);
  updateSettingHandler(mainWindow);
  getAllSlotsHandler();
  createNewUserHandler();
  deleteUserHandler();
  setSelectedPortHandler();
  setSelectedIndicatorPortHandler();

  // Authentication related handlers
  loginRequestHandler(mainWindow, auth);
  logoutRequestHandler(auth);

  // Logging related handlers (Phase 4.2: migrated to DS12-only mode)
  logDispensingHanlder();
  LoggingHandler();
  exportLogsHandler();

  // Load the application UI based on environment and license status
  console.log(`info: Loading initial page: ${initialPage}`);
  
  if (isProd) {
    await mainWindow.loadURL(`app://./${initialPage}.html`);
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/${initialPage}`);
    mainWindow.webContents.openDevTools();
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
