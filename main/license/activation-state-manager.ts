/**
 * Unified Activation State Manager
 * 
 * Centralizes activation status management across the entire application
 * to prevent conflicts between main process and renderer context.
 * 
 * This manager ensures:
 * - Single source of truth for activation status
 * - Proper synchronization between main and renderer processes
 * - Coordinated ESP32 and DS12Controller state management
 * - Event-driven updates to all dependent systems
 */

import { BrowserWindow, ipcMain } from "electron";
import { EventEmitter } from "events";
import { isSystemActivated, validateLicense } from "./validator";
import { getValidationMode } from "../utils/environment";
import { logger } from "../logger";
import { BuildTimeController } from "../ku-controllers/BuildTimeController";
import { getSetting } from "../setting/getSetting";

export interface ActivationState {
  isActivated: boolean;
  validationMode: 'bypass' | 'real-hardware' | 'production';
  lastChecked: number;
  source: 'startup' | 'manual-check' | 'activation-process';
  esp32Available: boolean;
  ds12Available: boolean;
}

export interface ActivationStateChangeEvent {
  previousState: ActivationState;
  newState: ActivationState;
  timestamp: number;
  reason: string;
}

class ActivationStateManager extends EventEmitter {
  private static instance: ActivationStateManager | null = null;
  private currentState: ActivationState;
  private mainWindow: BrowserWindow | null = null;
  private isInitialized = false;

  private constructor() {
    super();
    this.currentState = {
      isActivated: false,
      validationMode: 'production',
      lastChecked: 0,
      source: 'startup',
      esp32Available: false,
      ds12Available: false
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ActivationStateManager {
    if (!this.instance) {
      this.instance = new ActivationStateManager();
    }
    return this.instance;
  }

  /**
   * Initialize the activation state manager
   */
  async initialize(mainWindow: BrowserWindow): Promise<ActivationState> {
    if (this.isInitialized) {
      return this.currentState;
    }

    this.mainWindow = mainWindow;
    
    try {
      console.log('info: Initializing Activation State Manager...');
      
      // Determine validation mode
      const validationMode = getValidationMode();
      
      let isActivated = false;
      let source: 'startup' | 'manual-check' | 'activation-process' = 'startup';
      
      if (validationMode === 'bypass') {
        console.log('info: Bypass mode - system considered activated');
        isActivated = true;
      } else {
        console.log('info: Checking database activation status...');
        isActivated = await isSystemActivated();
      }
      
      // Update state
      const newState: ActivationState = {
        isActivated,
        validationMode,
        lastChecked: Date.now(),
        source,
        esp32Available: false, // Will be updated by ESP32 system
        ds12Available: false   // Will be updated by DS12 system
      };
      
      await this.updateState(newState, 'Initial system startup');
      
      // Initialize DS12Controller based on activation status
      await this.initializeDS12Controller();
      
      // Register IPC handlers
      this.registerIpcHandlers();
      
      this.isInitialized = true;
      
      console.log('✅ Activation State Manager initialized successfully');
      console.log('info: Initial activation state:', this.currentState);
      
      return this.currentState;
      
    } catch (error) {
      console.error('error: Failed to initialize Activation State Manager:', error);
      
      // Set safe fallback state
      const fallbackState: ActivationState = {
        isActivated: false,
        validationMode: 'production',
        lastChecked: Date.now(),
        source: 'startup',
        esp32Available: false,
        ds12Available: false
      };
      
      await this.updateState(fallbackState, 'Initialization error fallback');
      this.isInitialized = true;
      
      return this.currentState;
    }
  }

  /**
   * Initialize DS12Controller based on activation status
   */
  private async initializeDS12Controller(): Promise<void> {
    if (!this.mainWindow) {
      console.warn('warn: Cannot initialize DS12Controller - no main window available');
      return;
    }

    try {
      console.log('info: Initializing DS12Controller based on activation status...');
      
      // Get application settings for DS12 connection
      const settings = await getSetting();
      if (!settings) {
        console.warn('warn: Cannot initialize DS12Controller - settings not available');
        return;
      }

      // Initialize DS12Controller regardless of activation status
      // Hardware should be available for diagnostics even when not activated
      const ds12Initialized = await BuildTimeController.initialize(
        this.mainWindow,
        settings.ku_port,
        settings.ku_baudrate
      );

      if (ds12Initialized) {
        console.log('✅ DS12Controller initialized successfully');
        
        // Start receiving data from DS12Controller
        const controller = BuildTimeController.getCurrentController();
        if (controller) {
          controller.receive();
        }
        
        // Update DS12 availability status
        await this.updateDS12Status(true, 'DS12Controller initialization successful');
      } else {
        console.warn('⚠️ DS12Controller initialization failed - running in offline mode');
        console.warn('⚠️ Hardware operations will be disabled until connection restored');
        
        // Update DS12 availability status
        await this.updateDS12Status(false, 'DS12Controller initialization failed');
      }
      
    } catch (error) {
      console.error('error: Failed to initialize DS12Controller:', error);
      await this.updateDS12Status(false, `DS12Controller initialization error: ${error}`);
    }
  }

  /**
   * Update activation state and notify all listeners
   */
  private async updateState(newState: ActivationState, reason: string): Promise<void> {
    const previousState = { ...this.currentState };
    this.currentState = { ...newState };
    
    const changeEvent: ActivationStateChangeEvent = {
      previousState,
      newState: this.currentState,
      timestamp: Date.now(),
      reason
    };
    
    // Log state change
    await logger({
      user: 'system',
      message: `Activation state changed: ${previousState.isActivated} -> ${newState.isActivated} (${reason})`
    });
    
    console.log('info: Activation state updated:', {
      from: previousState.isActivated,
      to: newState.isActivated,
      reason,
      validationMode: newState.validationMode
    });
    
    // Emit change event for internal listeners
    this.emit('state-changed', changeEvent);
    
    // Notify renderer process
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('activation-state-changed', changeEvent);
    }
  }

  /**
   * Perform full activation validation
   */
  async performFullValidation(source: 'manual-check' | 'activation-process' = 'manual-check'): Promise<ActivationState> {
    try {
      console.log('info: Performing full activation validation...');
      
      const validationMode = getValidationMode();
      let isActivated = false;
      
      if (validationMode === 'bypass') {
        isActivated = true;
        console.log('info: Bypass mode - validation skipped');
      } else {
        // Perform full license validation including ESP32 if available
        isActivated = await validateLicense();
        console.log(`info: Full validation result: ${isActivated}`);
      }
      
      const newState: ActivationState = {
        ...this.currentState,
        isActivated,
        lastChecked: Date.now(),
        source
      };
      
      await this.updateState(newState, 'Full validation check');
      
      return this.currentState;
      
    } catch (error) {
      console.error('error: Full validation failed:', error);
      
      const newState: ActivationState = {
        ...this.currentState,
        isActivated: false,
        lastChecked: Date.now(),
        source
      };
      
      await this.updateState(newState, `Validation error: ${error.message}`);
      
      return this.currentState;
    }
  }

  /**
   * Update ESP32 availability status
   */
  async updateESP32Status(available: boolean, reason: string = 'ESP32 status update'): Promise<void> {
    if (this.currentState.esp32Available !== available) {
      const newState: ActivationState = {
        ...this.currentState,
        esp32Available: available
      };
      
      await this.updateState(newState, reason);
    }
  }

  /**
   * Update DS12Controller availability status
   */
  async updateDS12Status(available: boolean, reason: string = 'DS12 status update'): Promise<void> {
    if (this.currentState.ds12Available !== available) {
      const newState: ActivationState = {
        ...this.currentState,
        ds12Available: available
      };
      
      await this.updateState(newState, reason);
    }
  }

  /**
   * Get current activation state
   */
  getCurrentState(): ActivationState {
    return { ...this.currentState };
  }

  /**
   * Check if system is ready for operations
   */
  isSystemReady(): boolean {
    return this.currentState.isActivated && 
           (this.currentState.validationMode === 'bypass' || this.currentState.esp32Available);
  }

  /**
   * Register IPC handlers for renderer communication
   */
  private registerIpcHandlers(): void {
    // Get current activation state
    ipcMain.handle('activation-state:get-current', () => {
      return this.getCurrentState();
    });

    // Perform manual validation check
    ipcMain.handle('activation-state:validate', async () => {
      return await this.performFullValidation('manual-check');
    });

    // Check if system is ready
    ipcMain.handle('activation-state:is-ready', () => {
      return this.isSystemReady();
    });

    console.log('info: Activation State Manager IPC handlers registered');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('info: Cleaning up Activation State Manager...');
    
    this.removeAllListeners();
    this.mainWindow = null;
    this.isInitialized = false;
    
    // Remove IPC handlers
    ipcMain.removeHandler('activation-state:get-current');
    ipcMain.removeHandler('activation-state:validate');
    ipcMain.removeHandler('activation-state:is-ready');
    
    console.log('info: Activation State Manager cleanup completed');
  }
}

export { ActivationStateManager };
export default ActivationStateManager.getInstance();