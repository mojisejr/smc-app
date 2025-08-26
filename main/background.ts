import { BrowserWindow, app, ipcMain } from "electron";
import { join } from "path";
import serve from "electron-serve";
import { createWindow } from "./helpers";

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

  // Initialize authentication system
  const auth = new Authentication();

  // Start receiving data from indicator device
  indicator.receive();

  // Initialize license system handlers
  activateKeyHandler();
  checkActivationKeyHandler();
  activationProgressHandler();

  if (is.dev && env.RENDERER_REMOTE_URL) {
    mainWindow.loadURL(env.RENDERER_REMOTE_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Initialize unified activation state manager (includes DS12Controller initialization)
  let initialPage = "activate-key"; // Default to activation page
  
  try {
    // Initialize activation state manager with integrated DS12Controller
    const activationState = await ActivationStateManager.initialize(mainWindow);
    
    // Determine initial page based on activation state
    initialPage = activationState.isActivated ? "home" : "activate-key";
    
    console.log(`info: System activation status: ${activationState.isActivated}`);
    console.log(`info: DS12Controller status: ${activationState.ds12Available}`);
    console.log(`info: Initial page set to: ${initialPage}`);
    
  } catch (error: any) {
    console.error("error: Failed to initialize activation system:", error.message);
    console.log("info: Defaulting to activation page due to error");
    initialPage = "activate-key";
  }

  // Navigate to the appropriate initial page
  mainWindow.webContents.once("did-finish-load", () => {
    console.log(`info: Navigating to initial page: ${initialPage}`);
    mainWindow?.webContents.send("navigate-to-page", initialPage);
  });

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
