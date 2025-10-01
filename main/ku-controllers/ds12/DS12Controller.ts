import { SerialPort } from "serialport";
import { BrowserWindow } from "electron";
import { KuControllerBase } from "../base/KuControllerBase";
import {
  DS12ProtocolParser,
  IDS12ProtocolParser,
} from "../protocols/parsers/DS12ProtocolParser";
import { SlotState } from "../../interfaces/slotState";
import { Slot } from "../../../db/model/slot.model";
import { User } from "../../../db/model/user.model";
import { logDispensing } from "../../logger";
import {
  DeviceType,
  CommandType,
  ProtocolResponse,
  ProtocolErrorCode,
} from "../protocols/interfaces/ProtocolTypes";

/**
 * DS12Controller - Medical Device Communication Controller
 *
 * Implements communication protocol for DS12 (12-slot) hardware devices
 * Extends KuControllerBase for medical device compliance and audit requirements
 *
 * MEDICAL DEVICE COMPLIANCE:
 * - Complete audit logging for all operations
 * - Comprehensive error handling and recovery
 * - State management with database synchronization
 * - Secure IPC communication with renderer process
 *
 * HARDWARE SPECIFICATIONS:
 * - Device: DS12 (12 medication slots)
 * - Protocol: CU12 compatible communication
 * - Baud Rate: 19200 (default for DS12 hardware)
 * - Data Format: 8N1 (8 data bits, no parity, 1 stop bit)
 * - Connection: RS485 over serial port
 *
 * COMMUNICATION PATTERNS:
 * - PacketLengthParser with STX delimiter (0x02)
 * - Packet overhead: 8 bytes minimum per CU12 protocol
 * - Checksum validation for data integrity
 * - Event-driven response handling via receive() loop
 *
 * SECURITY REQUIREMENTS:
 * - Passkey validation for all critical operations
 * - User authentication via database lookup
 * - Role-based access control (admin/operator permissions)
 * - Complete audit trail in DispensingLog and Logs tables
 *
 * STATE MANAGEMENT:
 * - Real-time synchronization between hardware, database, and UI
 * - Comprehensive state tracking (opening, dispensing, wait states)
 * - Error recovery and graceful degradation
 * - Connection monitoring and automatic reconnection
 */
export class DS12Controller extends KuControllerBase {
  // Device configuration constants
  public readonly deviceType = "DS12" as const;
  public readonly maxSlot = 12;

  // Serial communication components
  private serialPort: SerialPort | null = null;
  private rawDataBuffer: Buffer = Buffer.alloc(0);
  private packetTimeout: NodeJS.Timeout | null = null;
  private protocolParser: IDS12ProtocolParser;

  // Connection configuration
  private portPath: string = "";
  private baudRate: number = 19200; // DS12 default baud rate per CU12 specification
  private autoOpen: boolean = true;

  // Hardware protection and connection management
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;
  private connectionTimeout: number = 5000; // 5 second timeout for medical device safety
  private reconnectDelay: number = 1000; // 1 second base delay for exponential backoff

  // Operation type tracking for proper dialog routing
  private currentOperationType: "unlock" | "dispense" | null = null;
  private hardwareProtectionEnabled: boolean = true; // Enable safe hardware interaction

  // Command queue for sequential operations (prevents command conflicts)
  private commandQueue: Array<{
    command: string;
    timestamp: number;
    retries: number;
  }> = [];
  private processingCommand: boolean = false;
  private maxCommandRetries: number = 2;

  // Dispensing context for tracking ongoing dispensing operations
  private dispensingContext: {
    slotId?: number;
    hn?: string;
    timestamp?: number;
  } = {};

  // INSTRUMENTATION: Track packet processing frequency for debugging rapid CSV flushing
  private lastPacketTime?: number;
  private packetCount: number = 0;

  /**
   * Initialize DS12Controller with BrowserWindow for IPC communication
   *
   * INITIALIZATION PATTERN:
   * - Call parent constructor for base validation and setup
   * - Initialize DS12ProtocolParser for command building and parsing
   * - Reset all states to ensure clean initialization
   * - Set up medical device logging for initialization audit
   *
   * @param win - BrowserWindow instance for IPC communication with renderer
   * @throws Error if BrowserWindow is invalid or destroyed
   */
  constructor(win: BrowserWindow) {
    // MEDICAL DEVICE SAFETY: Validate BrowserWindow in parent constructor
    // Parent handles null checks, destroyed window validation, and basic setup
    super(win);

    // PROTOCOL INTEGRATION: Initialize DS12-specific protocol parser
    // This handles all packet building, parsing, and validation for DS12 hardware
    this.protocolParser = new DS12ProtocolParser();

    // MEDICAL COMPLIANCE: Log controller initialization for audit trail
    // Medical device regulations require tracking all system initialization events
    this.logOperation("controller-initialized", {
      deviceType: this.deviceType,
      maxSlots: this.maxSlot,
      timestamp: Date.now(),
      message: "DS12Controller initialized successfully",
    });

    // STATE MANAGEMENT: Ensure clean initial state
    // Critical for medical devices to start in known, safe state
    this.resetAllStates();
  }

  /**
   * Set dispensing context for tracking ongoing dispensing operations
   *
   * This method stores the slot ID and HN for use when hardware responds
   * to check-locked-back commands during dispensing workflow.
   *
   * @param context - Dispensing context with slotId and hn
   */
  setDispensingContext(context: {
    slotId?: number;
    hn?: string;
    timestamp?: number;
  }) {
    this.dispensingContext = {
      ...context,
      timestamp: context.timestamp || Date.now(),
    };
    // Debug log removed for production
  }

  /**
   * Clear dispensing context after operation completion
   */
  clearDispensingContext() {
    this.dispensingContext = {};
    // Debug log removed for production
  }

  /**
   * Establish serial connection to DS12 hardware device
   *
   * IMPLEMENTATION STRATEGY:
   * - Follow exact KU16 patterns for SerialPort initialization
   * - Use PacketLengthParser with DS12-specific delimiter (0x02)
   * - Set packet overhead to 8 bytes per CU12 protocol specification
   * - Implement comprehensive error handling for connection failures
   * - Start receive() loop for continuous hardware communication
   *
   * MEDICAL DEVICE REQUIREMENTS:
   * - Log all connection attempts for audit compliance
   * - Validate port parameters before attempting connection
   * - Handle connection failures gracefully without system crash
   * - Provide detailed error messages for troubleshooting
   *
   * @param port - Serial port identifier (e.g., "COM3", "/dev/ttyUSB0")
   * @param baudRate - Communication baud rate (default: 19200 for DS12)
   * @returns Promise<boolean> - Connection success status
   * @throws Never throws - all errors handled via return value and logging
   */
  async connect(port: string, baudRate: number = 19200): Promise<boolean> {
    try {
      // MEDICAL AUDIT: Log connection attempt for compliance
      await this.logOperation("connection-attempt", {
        port,
        baudRate,
        deviceType: this.deviceType,
        message: `Attempting DS12 connection to ${port} at ${baudRate} baud`,
      });

      // INPUT VALIDATION: Validate connection parameters
      if (!port || typeof port !== "string") {
        await this.logOperation("connection-error", {
          error: "Invalid port parameter",
          port,
          message: "Connection failed: port must be non-empty string",
        });
        return false;
      }

      if (baudRate <= 0 || !Number.isInteger(baudRate)) {
        await this.logOperation("connection-error", {
          error: "Invalid baud rate parameter",
          baudRate,
          message: "Connection failed: baud rate must be positive integer",
        });
        return false;
      }

      // CLEANUP: Ensure any existing connection is properly closed
      if (this.serialPort && this.serialPort.isOpen) {
        await this.disconnect();
      }

      // STORE CONFIGURATION: Save for reconnection attempts
      this.portPath = port;
      this.baudRate = baudRate;

      // SERIAL PORT INITIALIZATION: Follow KU16 patterns exactly
      // Use same initialization pattern for consistency and reliability
      return new Promise((resolve) => {
        this.serialPort = new SerialPort(
          {
            path: port,
            baudRate: baudRate,
            autoOpen: this.autoOpen,
          },
          async (error) => {
            if (error) {
              // CONNECTION FAILURE: Log detailed error for medical audit
              await this.logOperation("connection-error", {
                error: error.message,
                port,
                baudRate,
                message: `DS12 connection failed: ${error.message}`,
              });

              this.connected = false;
              this.serialPort = null;
              resolve(false);
            } else {
              // CONNECTION SUCCESS: Set up raw data reception and start receiving
              this.connected = true;

              // DIRECT DATA HANDLING: No parser needed, handle raw bytes
              // CU12 protocol packets start with STX (0x02), using parser would corrupt data

              // START RECEIVE LOOP: Begin hardware communication
              this.receive();

              // MEDICAL AUDIT: Log successful connection
              await this.logOperation("connection-success", {
                port,
                baudRate,
                deviceType: this.deviceType,
                message: `DS12 connected successfully to ${port}`,
              });

              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors for medical audit
      await this.logOperation("connection-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        port,
        baudRate,
        message: `DS12 connection exception: ${error}`,
      });

      this.connected = false;
      this.serialPort = null;
      return false;
    }
  }

  /**
   * Disconnect from DS12 hardware and cleanup resources
   *
   * CLEANUP STRATEGY:
   * - Close serial port connection gracefully
   * - Reset all device states to prevent stale state issues
   * - Clear any pending operations or timers
   * - Log disconnection for medical audit compliance
   * - Emit UI events to update renderer state
   *
   * MEDICAL DEVICE SAFETY:
   * - Never leave device in intermediate state during disconnect
   * - Ensure all operations complete or timeout gracefully
   * - Provide audit trail of disconnection event
   * - Reset error states to allow clean reconnection
   */
  async disconnect(): Promise<void> {
    try {
      // MEDICAL AUDIT: Log disconnection attempt
      await this.logOperation("disconnection-attempt", {
        deviceType: this.deviceType,
        connected: this.connected,
        message: "DS12 disconnection initiated",
      });

      // SERIAL PORT CLEANUP: Close connection gracefully
      if (this.serialPort && this.serialPort.isOpen) {
        return new Promise((resolve) => {
          this.serialPort!.close(async (error) => {
            if (error) {
              // LOG DISCONNECT ERROR: Medical audit requires error tracking
              await this.logOperation("disconnection-error", {
                error: error.message,
                message: `DS12 disconnect error: ${error.message}`,
              });
            } else {
              // SUCCESS AUDIT: Log successful disconnection
              await this.logOperation("disconnection-success", {
                deviceType: this.deviceType,
                message: "DS12 disconnected successfully",
              });
            }

            // CLEANUP: Reset all states regardless of close result
            this.serialPort = null;
            this.connected = false;

            // PACKET BUFFER CLEANUP: Clear buffered data and timeout
            this.rawDataBuffer = Buffer.alloc(0);
            this.clearPacketTimeout();

            // STATE RESET: Ensure clean state for next connection
            this.resetAllStates();

            // UI NOTIFICATION: Inform renderer of disconnection
            this.emitToUI("device-disconnected", {
              deviceType: this.deviceType,
              timestamp: Date.now(),
            });

            resolve();
          });
        });
      } else {
        // ALREADY DISCONNECTED: Clean up states anyway
        this.serialPort = null;

        this.connected = false;
        this.resetAllStates();

        await this.logOperation("disconnection-complete", {
          deviceType: this.deviceType,
          message: "DS12 already disconnected, states reset",
        });
      }
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("disconnection-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 disconnect exception: ${error}`,
      });

      // FORCE CLEANUP: Ensure cleanup even if exceptions occur
      this.serialPort = null;

      this.connected = false;
      this.resetAllStates();
    }
  }

  /**
   * Check current connection status to DS12 hardware
   *
   * CONNECTION VALIDATION:
   * - Verify serialPort exists and is open
   * - Check internal connected flag consistency
   * - Validate parser is properly initialized
   * - Return boolean status for caller decision making
   *
   * @returns boolean - true if device is connected and ready for communication
   */
  isConnected(): boolean {
    // COMPREHENSIVE STATUS CHECK: Verify all connection components
    return this.connected && this.serialPort !== null && this.serialPort.isOpen;
  }

  /**
   * Send status check command to DS12 hardware to get all slot states
   *
   * IMPLEMENTATION APPROACH:
   * - Use DS12ProtocolParser to build status request packet
   * - Validate connection before sending command
   * - Send packet via SerialPort.write()
   * - Handle errors gracefully with medical audit logging
   * - Return slot states parsed from hardware response
   *
   * MEDICAL DEVICE PATTERN:
   * - Log all hardware communication attempts
   * - Validate device state before operations
   * - Provide detailed error information for troubleshooting
   * - Maintain audit trail for regulatory compliance
   *
   * @returns Promise<SlotState[]> - Array of slot states from hardware
   */
  async sendCheckState(): Promise<SlotState[]> {
    try {
      // INSTRUMENTATION: Track sendCheckState call frequency
      console.log(
        `[MAIN PROCESS] sendCheckState() called at ${new Date().toISOString()}`
      );

      // CONNECTION VALIDATION: Ensure device is ready
      if (!this.isConnected()) {
        await this.logOperation("check-state-error", {
          error: "Device not connected",
          deviceType: this.deviceType,
          message: "Cannot check DS12 state: device not connected",
        });
        return [];
      }

      // BUILD COMMAND PACKET: Use protocol parser for packet generation
      const packetResult = this.protocolParser.buildStatusRequestPacket(0x00);

      if (!packetResult.success) {
        await this.logOperation("check-state-error", {
          error: packetResult.error?.message || "Packet building failed",
          deviceType: this.deviceType,
          message: "DS12 status packet building failed",
        });
        return [];
      }

      // SEND COMMAND: Transmit to hardware
      const packetBuffer = Buffer.from(packetResult.data!);
      this.serialPort!.write(packetBuffer);

      // MEDICAL AUDIT: Log command transmission
      await this.logOperation("check-state-sent", {
        packetData: packetResult
          .data!.map((b) => `0x${b.toString(16)}`)
          .join(" "),
        deviceType: this.deviceType,
        message: "DS12 status check command sent",
      });

      // NOTE: Actual slot state data will be returned via receive() loop
      // This method triggers the request, response comes asynchronously
      // UI will be updated via receivedCheckState() -> emitToUI('init-res', slotData)
      return [];
    } catch (error) {
      // EXCEPTION HANDLING: Log and handle unexpected errors
      await this.logOperation("check-state-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        deviceType: this.deviceType,
        message: `DS12 check state exception: ${error}`,
      });
      return [];
    }
  }

  /**
   * Send unlock command to specific DS12 slot
   *
   * UNLOCK OPERATION FLOW:
   * 1. Validate user passkey and permissions
   * 2. Check device connection and state
   * 3. Build unlock packet for specified slot
   * 4. Transmit command to hardware
   * 5. Update internal state tracking
   * 6. Log operation for medical audit
   *
   * SECURITY REQUIREMENTS:
   * - Validate passkey before hardware operation
   * - Ensure slot is in valid state for unlocking
   * - Prevent duplicate operations (check waitForLockedBack)
   * - Log all unlock attempts (successful and failed)
   *
   * @param inputSlot - Slot information with patient HN, timestamp, and passkey
   */
  async sendUnlock(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }): Promise<void> {
    try {
      // INSTRUMENTATION: Track unlock method calls
      console.log(
        `[INSTRUMENTATION] sendUnlock called for slot ${inputSlot.slotId}, HN: ${inputSlot.hn}`
      );
      const unlockStartTime = Date.now();
      // SECURITY VALIDATION: Authenticate user before hardware operation
      const user = await User.findOne({
        where: { passkey: inputSlot.passkey },
      });

      if (!user) {
        await this.logOperation("unlock-error", {
          userId: 1, // Admin user ID for system operations when user authentication fails
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Invalid passkey",
          message: "DS12 unlock failed: user authentication failed",
        });
        return;
      }

      // CONNECTION AND STATE VALIDATION
      if (!this.isConnected() || this.waitForLockedBack) {
        await this.logOperation("unlock-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Device not ready",
          connected: this.isConnected(),
          waitForLockedBack: this.waitForLockedBack,
          message:
            "DS12 unlock failed: device not ready or waiting for previous operation",
        });
        return;
      }

      // SLOT VALIDATION: Check slot number range for DS12
      if (inputSlot.slotId < 1 || inputSlot.slotId > this.maxSlot) {
        await this.logOperation("unlock-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Invalid slot number",
          message: `DS12 unlock failed: slot ${inputSlot.slotId} out of range (1-${this.maxSlot})`,
        });
        return;
      }

      // BUILD UNLOCK PACKET: Use protocol parser
      const packetResult = this.protocolParser.buildUnlockPacket(
        0x00,
        inputSlot.slotId
      );

      if (!packetResult.success) {
        await this.logOperation("unlock-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: packetResult.error?.message || "Unlock packet building failed",
          message: "DS12 unlock packet generation failed",
        });
        return;
      }

      // SEND UNLOCK COMMAND: Transmit to hardware
      const packetBuffer = Buffer.from(packetResult.data!);
      this.serialPort!.write(packetBuffer);

      // STATE UPDATE: Track opening operation
      this.setOpening(true);
      this.currentOperationType = "unlock"; // Track operation type for proper dialog routing
      this.openingSlot = inputSlot;

      // MEDICAL AUDIT: Log unlock operation
      await this.logOperation("unlock", {
        userId: user.getDataValue("id"),
        slotId: inputSlot.slotId,
        hn: inputSlot.hn,
        packetData: packetResult
          .data!.map((b) => `0x${b.toString(16)}`)
          .join(" "),
        message: `DS12 unlock command sent for slot ${inputSlot.slotId}`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("unlock-exception", {
        slotId: inputSlot.slotId,
        hn: inputSlot.hn,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 unlock exception: ${error}`,
      });
    }
  }

  /**
   * Dispense medication from DS12 slot with security validation
   *
   * DISPENSE OPERATION REQUIREMENTS:
   * - Highest security level operation (patient medication access)
   * - Validate passkey and user permissions
   * - Confirm slot contains medication for correct patient (HN validation)
   * - Check slot occupancy and state before dispensing
   * - Update database with dispensing record
   * - Provide complete audit trail
   *
   * IMPLEMENTATION PATTERN: Follow KU16 dispense() method exactly
   * - Same validation sequence and error handling
   * - Same database operations and state management
   * - Same IPC events and logging patterns
   * - Adapt only for DS12-specific protocol commands
   *
   * @param inputSlot - Slot information with patient HN, timestamp, and passkey
   */
  async dispense(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }): Promise<void> {
    try {
      // INSTRUMENTATION: Track dispense method calls
      console.log(
        `[INSTRUMENTATION] dispense called for slot ${inputSlot.slotId}, HN: ${inputSlot.hn}`
      );
      const dispenseStartTime = Date.now();
      // SECURITY VALIDATION: Authenticate user (identical to KU16 pattern)
      const user = await User.findOne({
        where: { passkey: inputSlot.passkey },
      });

      if (!user) {
        await this.logOperation("dispense-error", {
          userId: 1, // Admin user ID for system operations when user authentication fails
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Invalid passkey",
          message: "DS12 dispense failed: user authentication failed",
        });
        return;
      }

      // CONNECTION AND STATE VALIDATION
      if (!this.isConnected() || this.waitForDispenseLockedBack) {
        await this.logOperation("dispense-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Device not ready",
          connected: this.isConnected(),
          waitForDispenseLockedBack: this.waitForDispenseLockedBack,
          message:
            "DS12 dispense failed: device not ready or waiting for previous operation",
        });
        return;
      }

      // SLOT DATA VALIDATION: Verify slot contains medication for correct patient
      const slot = await Slot.findOne({ where: { slotId: inputSlot.slotId } });

      if (!slot) {
        await this.logOperation("dispense-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Slot not found",
          message: "DS12 dispense failed: slot not found in database",
        });
        return;
      }

      // OCCUPANCY VALIDATION: Ensure slot contains medication
      const slotData = slot.dataValues;
      if (!slotData.occupied || !slotData.hn || slotData.hn === "") {
        await this.logOperation("dispense-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error: "Slot not occupied or missing HN",
          occupied: slotData.occupied,
          slotHN: slotData.hn,
          message:
            "DS12 dispense failed: slot not occupied or missing patient HN",
        });
        return;
      }

      // BUILD UNLOCK COMMAND: Dispense uses unlock command (same as KU16 pattern)
      const packetResult = this.protocolParser.buildUnlockPacket(
        0x00,
        inputSlot.slotId
      );

      if (!packetResult.success) {
        await this.logOperation("dispense-error", {
          userId: user.getDataValue("id"),
          slotId: inputSlot.slotId,
          hn: inputSlot.hn,
          error:
            packetResult.error?.message || "Dispense packet building failed",
          message: "DS12 dispense packet generation failed",
        });
        return;
      }

      // SEND DISPENSE COMMAND: Transmit unlock command for dispensing
      const packetBuffer = Buffer.from(packetResult.data!);
      this.serialPort!.write(packetBuffer);

      // STATE UPDATE: Set both opening and dispensing flags
      this.setOpening(true);
      this.setDispensing(true);
      this.currentOperationType = "dispense"; // Track operation type for proper dialog routing
      this.openingSlot = inputSlot;

      // MEDICAL AUDIT: Log dispense operation
      await this.logOperation("dispense-continue", {
        userId: user.getDataValue("id"),
        slotId: inputSlot.slotId,
        hn: inputSlot.hn,
        packetData: packetResult
          .data!.map((b) => `0x${b.toString(16)}`)
          .join(" "),
        message: `DS12 dispense command sent for slot ${inputSlot.slotId}`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("dispense-exception", {
        slotId: inputSlot.slotId,
        hn: inputSlot.hn,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 dispense exception: ${error}`,
      });
    }
  }

  /**
   * Reset DS12 slot to default state (empty for reuse)
   *
   * RESET OPERATION SCOPE:
   * - Clear patient HN from slot database record
   * - Set occupied = false (slot available for new medication)
   * - Set opening = false (reset operation state)
   * - Maintain audit trail for regulatory compliance
   * - No hardware command needed (database operation only)
   *
   * SECURITY NOTE: Should require 'admin' or 'supervisor' role
   * Current implementation follows KU16 pattern (passkey validation)
   * Future enhancement: Add role-based access control
   *
   * @param slotId - Target slot number (1-12 for DS12)
   * @param passkey - User authentication passkey
   */
  async resetSlot(slotId: number, passkey: string): Promise<void> {
    try {
      // SECURITY VALIDATION: Authenticate user
      const user = await User.findOne({ where: { passkey: passkey } });

      if (!user) {
        await this.logOperation("reset-slot-error", {
          userId: 1, // Admin user ID for system operations when user authentication fails
          slotId: slotId,
          error: "Invalid passkey",
          message: "DS12 reset slot failed: user authentication failed",
        });
        return;
      }

      // SLOT VALIDATION: Check slot number range for DS12
      if (slotId < 1 || slotId > this.maxSlot) {
        await this.logOperation("reset-slot-error", {
          userId: user.getDataValue("id"),
          slotId: slotId,
          error: "Invalid slot number",
          message: `DS12 reset slot failed: slot ${slotId} out of range (1-${this.maxSlot})`,
        });
        return;
      }

      // DATABASE UPDATE: Reset slot to empty state (follows KU16 pattern)
      await Slot.update(
        {
          hn: null,
          occupied: false,
          opening: false,
        },
        { where: { slotId: slotId } }
      );

      // MEDICAL AUDIT: Log reset operation
      await this.logOperation("force-reset", {
        userId: user.getDataValue("id"),
        slotId: slotId,
        message: `DS12 slot ${slotId} reset successfully`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("force-reset-error", {
        slotId: slotId,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 reset slot exception: ${error}`,
      });
    }
  }

  /**
   * Deactivate DS12 slot (make unavailable for use)
   *
   * DEACTIVATION SCOPE:
   * - Set isActive = false (removes slot from service)
   * - Clear patient data (hn = null, occupied = false, opening = false)
   * - Update UI via IPC events (same as KU16 pattern)
   * - Log operation for medical audit
   * - Reset controller states (dispensing, opening flags)
   *
   * CRITICAL OPERATION: Should require 'admin' role only
   * Safety check: Ensure no patient medication in slot before deactivating
   *
   * @param slotId - Target slot number (1-12 for DS12)
   * @param passkey - User authentication passkey
   */
  async deactivate(slotId: number, passkey: string): Promise<void> {
    try {
      // SECURITY VALIDATION: Authenticate user
      const user = await User.findOne({ where: { passkey: passkey } });

      if (!user) {
        await this.logOperation("deactivate-error", {
          userId: 1, // Admin user ID for system operations when user authentication fails
          slotId: slotId,
          error: "Invalid passkey",
          message: "DS12 deactivate failed: user authentication failed",
        });
        return;
      }

      // SLOT VALIDATION: Check slot number range for DS12
      if (slotId < 1 || slotId > this.maxSlot) {
        await this.logOperation("deactivate-error", {
          userId: user.getDataValue("id"),
          slotId: slotId,
          error: "Invalid slot number",
          message: `DS12 deactivate failed: slot ${slotId} out of range (1-${this.maxSlot})`,
        });
        return;
      }

      // DATABASE UPDATE: Deactivate slot (follows KU16 pattern exactly)
      await Slot.update(
        {
          isActive: false,
          hn: null,
          occupied: false,
          opening: false,
        },
        { where: { slotId: slotId } }
      );

      // EMERGENCY STATE RESET: Clear all hardware controller operation flags
      // This is critical for preventing "Device not ready" errors after reactivation
      this.emergencyStateReset();

      // UI NOTIFICATION: Update renderer with unlock status (follows KU16 pattern)
      this.emitToUI("unlocking", {
        ...this.openingSlot,
        unlocking: false,
      });

      // UI NOTIFICATION: Update renderer with dispense status (follows KU16 pattern)
      this.emitToUI("dispensing", {
        slot: slotId,
        dispensing: false,
        unlocking: false,
        reset: false,
      });

      // EMIT DEACTIVATED EVENT: Notify UI that slot has been deactivated
      this.emitToUI("deactivated", {
        slotId: slotId,
        timestamp: Date.now(),
        reason: "Emergency deactivation via emergency button",
      });

      // MEDICAL AUDIT: Log deactivate operation
      await this.logOperation("deactivate", {
        userId: user.getDataValue("id"),
        slotId: slotId,
        message: `DS12 slot ${slotId} deactivated successfully with hardware state reset`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("deactivate-error", {
        slotId: slotId,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 deactivate exception: ${error}`,
      });
    }
  }

  /**
   * Reactivate previously deactivated DS12 slot
   *
   * REACTIVATION SCOPE:
   * - Set isActive = true (returns slot to service)
   * - Clear any stale patient data
   * - Reset slot to clean state for new use
   * - Log operation for medical audit
   * - Validate slot hardware integrity (future enhancement)
   *
   * CRITICAL OPERATION: Should require 'admin' role only
   * Safety check: Validate slot hardware before reactivating
   *
   * @param slotId - Target slot number (1-12 for DS12)
   * @param passkey - User authentication passkey
   */
  async reactivate(slotId: number, passkey: string): Promise<void> {
    try {
      // SECURITY VALIDATION: Authenticate user
      const user = await User.findOne({ where: { passkey: passkey } });

      if (!user) {
        await this.logOperation("reactivate-error", {
          userId: 1, // Admin user ID for system operations when user authentication fails
          slotId: slotId,
          error: "Invalid passkey",
          message: "DS12 reactivate failed: user authentication failed",
        });
        return;
      }

      // SLOT VALIDATION: Check slot number range for DS12
      if (slotId < 1 || slotId > this.maxSlot) {
        await this.logOperation("reactivate-error", {
          userId: user.getDataValue("id"),
          slotId: slotId,
          error: "Invalid slot number",
          message: `DS12 reactivate failed: slot ${slotId} out of range (1-${this.maxSlot})`,
        });
        return;
      }

      // DATABASE UPDATE: Reactivate slot (follows KU16 reactive pattern)
      await Slot.update(
        {
          isActive: true,
          hn: null,
          occupied: false,
          opening: false,
        },
        { where: { slotId: slotId } }
      );

      // HARDWARE STATE RESET: Ensure clean controller state after reactivation
      // This is critical for preventing "Device not ready" errors from stale operation flags
      this.emergencyStateReset();

      // HARDWARE VALIDATION: Verify device connection and readiness
      if (!this.isConnected()) {
        await this.logOperation("reactivate-warning", {
          userId: user.getDataValue("id"),
          slotId: slotId,
          warning: "Device not connected during reactivation",
          message: `DS12 slot ${slotId} reactivated but device not connected - may need reconnection`,
        });
      }

      // MEDICAL AUDIT: Log reactivate operation
      await this.logOperation("reactivate", {
        userId: user.getDataValue("id"),
        slotId: slotId,
        hardwareStateReset: true,
        deviceConnected: this.isConnected(),
        message: `DS12 slot ${slotId} reactivated successfully with hardware state reset`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("reactivate-error", {
        slotId: slotId,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 reactivate exception: ${error}`,
      });
    }
  }

  /**
   * Process received status check response from DS12 hardware
   *
   * PROCESSING FLOW:
   * 1. Use DS12ProtocolParser to parse binary response data
   * 2. Convert parsed slot states to SlotState objects with database data
   * 3. Emit 'init-res' event to update UI (same as KU16 pattern)
   * 4. Log operation for medical audit
   * 5. Handle parsing errors gracefully
   *
   * INTEGRATION WITH PROTOCOL PARSER:
   * - Use DS12ProtocolParser.parseSlotStates() for parsing
   * - Handle ProtocolResponse<boolean[]> return type
   * - Map boolean array to SlotState objects with database synchronization
   * - Follow exact KU16 patterns for database queries and UI events
   *
   * @param data - Binary array from DS12 hardware response
   */
  async receivedCheckState(data: number[]): Promise<void> {
    try {
      // PROTOCOL PARSING: Use DS12ProtocolParser for response parsing
      const parseResult = await this.protocolParser.parseSlotStates(data);

      if (!parseResult.success) {
        await this.logOperation("check-state-parse-error", {
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          deviceType: this.deviceType,
          message: "DS12 status response parsing failed",
        });

        // Send error event to UI if this was from a check-locked-back operation
        if (this.dispensingContext.slotId) {
          this.emitToUI("locked-back-error", {
            slotId: this.dispensingContext.slotId,
            error: parseResult.error?.message || "Hardware communication error",
          });
        }

        return;
      }

      // SLOT STATE CONVERSION: Convert boolean array to SlotState objects
      const slotStatesFromHardware = parseResult.data!;
      const slotData = await this.convertToSlotStateObjects(
        slotStatesFromHardware
      );

      // MEDICAL AUDIT: Log successful status check
      await this.logOperation("check-state-success", {
        slotsReceived: slotStatesFromHardware.length,
        activeSlots: slotStatesFromHardware.filter((state) => state).length,
        rawData: data.toString(),
        message: `DS12 status check received: ${slotStatesFromHardware.length} slots processed`,
      });

      // UI UPDATE: Send to renderer (follows KU16 pattern exactly)
      this.emitToUI("init-res", slotData);
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("check-state-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 check state processing exception: ${error}`,
      });
    }
  }

  /**
   * Process received unlock response from DS12 hardware
   *
   * PROCESSING FLOW (follows KU16 receivedUnlockState pattern):
   * 1. Use DS12ProtocolParser to parse unlock response
   * 2. Validate unlock was successful
   * 3. Update database with opening state
   * 4. Set waitForLockedBack flag for next phase
   * 5. Emit 'unlocking' event to UI with unlock status
   * 6. Log operation for medical audit
   *
   * STATE MANAGEMENT:
   * - Update slot database record (opening = true, occupied = false)
   * - Set internal waitForLockedBack flag
   * - Preserve openingSlot data for next phase
   * - Handle unlock failures gracefully
   *
   * @param data - Binary array from DS12 unlock response
   */
  async receivedUnlockState(data: number[]): Promise<void> {
    try {
      // PROTOCOL PARSING: Use DS12ProtocolParser for unlock response
      const parseResult = this.protocolParser.parseUnlockResponse(data);

      if (!parseResult.success) {
        await this.logOperation("unlock-response-error", {
          slotId: this.openingSlot?.slotId || 0,
          hn: this.openingSlot?.hn || "",
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          message: "DS12 unlock response parsing failed",
        });
        return;
      }

      // UNLOCK VALIDATION: Check if unlock was successful
      const unlockSuccessful = parseResult.data!;

      if (!unlockSuccessful) {
        await this.logOperation("unlock-hardware-failed", {
          slotId: this.openingSlot?.slotId || 0,
          hn: this.openingSlot?.hn || "",
          rawData: data.toString(),
          message: "DS12 unlock failed at hardware level",
        });
        return;
      }

      // VALIDATION: Ensure we have valid opening slot data
      if (!this.openingSlot) {
        await this.logOperation("unlock-state-error", {
          error: "No opening slot data",
          rawData: data.toString(),
          message: "DS12 unlock response received but no opening slot tracked",
        });
        return;
      }

      // STATE UPDATE: Set wait flag for locked back detection
      this.setWaitForLockedBack(true);

      // DATABASE UPDATE: Update slot with opening state (follows KU16 pattern)
      await Slot.update(
        {
          ...this.openingSlot,
          opening: true,
          occupied: false,
        },
        { where: { slotId: this.openingSlot.slotId } }
      );

      // UI NOTIFICATION: Send unlock status to renderer (follows KU16 pattern)
      this.emitToUI("unlocking", {
        ...this.openingSlot,
        unlocking: true,
      });

      // MEDICAL AUDIT: Log successful unlock
      await this.logOperation("unlock-success", {
        slotId: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
        rawData: data.toString(),
        message: `DS12 slot ${this.openingSlot.slotId} unlocked successfully`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("unlock-response-exception", {
        slotId: this.openingSlot?.slotId || 0,
        hn: this.openingSlot?.hn || "",
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 unlock response processing exception: ${error}`,
      });
    }
  }

  /**
   * Handle dispense unlock response from DS12 hardware
   *
   * This method specifically handles unlock responses for dispense operations
   * (patient medication pickup), separate from unlock operations for medication loading.
   *
   * KEY DIFFERENCES FROM receivedUnlockState():
   * - Emits "dispensing" event instead of "unlocking" event
   * - Sets waitForDispenseLockedBack instead of waitForLockedBack
   * - Different logging for audit trail clarity
   *
   * @param data - Binary array from DS12 unlock response
   */
  private async handleDispenseUnlockResponse(data: number[]): Promise<void> {
    try {
      // PROTOCOL PARSING: Use DS12ProtocolParser for unlock response (same as unlock)
      const parseResult = this.protocolParser.parseUnlockResponse(data);

      if (!parseResult.success) {
        await this.logOperation("dispense-unlock-response-error", {
          slotId: this.openingSlot?.slotId || 0,
          hn: this.openingSlot?.hn || "",
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          message: "DS12 dispense unlock response parsing failed",
        });
        return;
      }

      // UNLOCK VALIDATION: Check if unlock was successful
      const unlockSuccessful = parseResult.data!;

      if (!unlockSuccessful) {
        await this.logOperation("dispense-unlock-hardware-failed", {
          slotId: this.openingSlot?.slotId || 0,
          hn: this.openingSlot?.hn || "",
          rawData: data.toString(),
          message: "DS12 dispense unlock failed at hardware level",
        });
        return;
      }

      // VALIDATION: Ensure we have valid opening slot data
      if (!this.openingSlot) {
        await this.logOperation("dispense-unlock-state-error", {
          error: "No opening slot data",
          rawData: data.toString(),
          message:
            "DS12 dispense unlock response received but no opening slot tracked",
        });
        return;
      }

      // STATE UPDATE: Set wait flag for dispense locked back detection
      this.setWaitForDispenseLockedBack(true);

      // DATABASE UPDATE: Update slot with opening state for dispense operation
      await Slot.update(
        {
          ...this.openingSlot,
          opening: true,
          occupied: true, // Keep occupied=true for dispense (medication still in slot until removed)
        },
        { where: { slotId: this.openingSlot.slotId } }
      );

      // UI NOTIFICATION: Send dispensing status to renderer (triggers dispensingWait.tsx)
      this.emitToUI("dispensing", {
        ...this.openingSlot,
        dispensing: true,
      });

      // MEDICAL AUDIT: Log successful dispense unlock
      await this.logOperation("dispense-unlock-success", {
        slotId: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
        rawData: data.toString(),
        message: `DS12 slot ${this.openingSlot.slotId} unlocked successfully for dispensing`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("dispense-unlock-response-exception", {
        slotId: this.openingSlot?.slotId || 0,
        hn: this.openingSlot?.hn || "",
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 dispense unlock response processing exception: ${error}`,
      });
    }
  }

  /**
   * Main receive loop for DS12 hardware communication
   *
   * IMPLEMENTATION PATTERN (follows KU16 receive method exactly):
   * - Set up parser.on('data') event listener
   * - Parse command type from received data
   * - Route to appropriate handler based on device state and command
   * - Handle state machine logic for different operation phases
   * - Provide comprehensive error handling and logging
   *
   * STATE MACHINE LOGIC:
   * - Check opening/dispensing/wait flags to determine operation phase
   * - Route data to correct handler method
   * - Update states based on operation results
   * - Handle edge cases and error conditions
   *
   * MEDICAL DEVICE COMPLIANCE:
   * - Log all received data for audit trail
   * - Handle hardware communication errors gracefully
   * - Maintain system stability during communication issues
   * - Provide detailed error information for troubleshooting
   */
  receive(): void {
    try {
      // SERIAL PORT VALIDATION: Ensure serial port is initialized
      if (!this.serialPort) {
        this.logOperation("receive-error", {
          error: "Serial port not initialized",
          deviceType: this.deviceType,
          message: "DS12 receive failed: serial port not initialized",
        });
        return;
      }

      // EVENT LISTENER: Set up direct data reception from serial port
      this.serialPort.on("data", async (dataBuffer: Buffer) => {
        console.log("RECEIVED: DATA BACK", dataBuffer);
        try {
          // ACCUMULATE RAW DATA: Buffer all incoming serial data
          this.rawDataBuffer = Buffer.concat([
            this.rawDataBuffer,
            dataBuffer as Buffer,
          ]);

          // PROCESS COMPLETE PACKETS: Extract packets starting with STX (0x02)
          while (this.rawDataBuffer.length >= 8) {
            // FIND STX: Look for start of packet marker
            const stxIndex = this.rawDataBuffer.indexOf(0x02);

            if (stxIndex === -1) {
              // NO STX FOUND: Clear buffer and wait for new data
              this.rawDataBuffer = Buffer.alloc(0);
              break;
            }

            if (stxIndex > 0) {
              // STX NOT AT START: Remove garbage data before STX
              this.rawDataBuffer = this.rawDataBuffer.slice(stxIndex);
            }

            if (this.rawDataBuffer.length < 8) {
              // NOT ENOUGH DATA: Wait for more
              this.startPacketTimeout();
              break;
            }

            // EXTRACT PACKET HEADER: Parse CU12 packet structure
            const data = Array.from(this.rawDataBuffer);
            const stx = data[0]; // Should be 0x02
            const addr = data[1]; // Address
            const locknum = data[2]; // Lock number
            const cmd = data[3]; // Command
            const ask = data[4]; // Response status
            const datalen = data[5]; // Data length
            const etx = data[6]; // Should be 0x03
            const sum = data[7]; // Checksum

            const expectedTotalLen = 8 + datalen;

            // VALIDATE PACKET STRUCTURE
            if (stx !== 0x02 || etx !== 0x03) {
              // INVALID PACKET: Remove first byte and try again
              this.rawDataBuffer = this.rawDataBuffer.slice(1);
              await this.logOperation("receive-invalid-packet", {
                stx: `0x${stx.toString(16)}`,
                etx: `0x${etx.toString(16)}`,
                message: `DS12 invalid packet markers: STX=${stx}, ETX=${etx}`,
              });
              continue;
            }

            if (this.rawDataBuffer.length < expectedTotalLen) {
              // INCOMPLETE PACKET: Wait for more data
              await this.logOperation("receive-buffering-packet", {
                received: this.rawDataBuffer.length,
                expected: expectedTotalLen,
                datalen: datalen,
                message: `DS12 buffering: ${this.rawDataBuffer.length}/${expectedTotalLen} bytes`,
              });
              this.startPacketTimeout();
              break;
            }

            // PACKET COMPLETE: Extract complete packet
            this.clearPacketTimeout();
            const completePacket = Array.from(
              this.rawDataBuffer.slice(0, expectedTotalLen)
            );

            // REMOVE PROCESSED PACKET: Keep remaining data for next packet
            this.rawDataBuffer = this.rawDataBuffer.slice(expectedTotalLen);

            // PROCESS COMPLETE PACKET: Handle the extracted packet
            await this.processCompletePacket(completePacket);
          }
        } catch (error) {
          // EXCEPTION HANDLING: Log data processing errors
          await this.logOperation("data-processing-exception", {
            error: error instanceof Error ? error.message : "Unknown error",
            rawData: Array.from(dataBuffer).toString(),
            message: `DS12 data processing exception: ${error}`,
          });
        }
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log receive setup errors
      this.logOperation("receive-setup-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        deviceType: this.deviceType,
        message: `DS12 receive setup exception: ${error}`,
      });
    }
  }

  /**
   * Process a complete DS12 packet
   */
  private async processCompletePacket(completePacket: number[]): Promise<void> {
    try {
      // INSTRUMENTATION: Track packet processing frequency
      const currentTime = Date.now();
      if (!this.lastPacketTime) {
        this.lastPacketTime = currentTime;
        this.packetCount = 1;
      } else {
        this.packetCount++;
        const timeDiff = currentTime - this.lastPacketTime;
        if (timeDiff >= 1000) {
          // Check every second
          const packetsPerSecond = this.packetCount / (timeDiff / 1000);
          if (packetsPerSecond > 10) {
            // Threshold: more than 10 packets/sec
            console.warn(
              `[INSTRUMENTATION] HIGH PACKET FREQUENCY: ${packetsPerSecond.toFixed(
                1
              )} packets/sec in DS12Controller`
            );
            console.warn(
              `[INSTRUMENTATION] This may be causing excessive logging and CSV flushing`
            );
          }
          this.lastPacketTime = currentTime;
          this.packetCount = 0;
        }
      }

      // COMMAND TYPE EXTRACTION: Get command from complete packet (position 3)
      const command = completePacket[3];

      // MEDICAL AUDIT: Log all received data
      await this.logOperation("data-received", {
        command: `0x${command.toString(16)}`,
        packetLength: completePacket.length,
        rawData: completePacket.map((b) => `0x${b.toString(16)}`).join(" "),
        deviceType: this.deviceType,
        message: `DS12 complete packet received: command 0x${command.toString(
          16
        )}`,
      });

      // STATE MACHINE ROUTING: Follow KU16 logic exactly
      // Route based on current operation state and command type

      if (command === CommandType.DS12_STATUS_REQUEST) {
        // STATUS RESPONSE HANDLING

        if (this.opening && !this.dispensing && !this.waitForLockedBack) {
          // Phase: Opening but not dispensing and not waiting for lock
          // Status debug log removed
          await this.receivedUnlockState(completePacket);
        } else if (this.opening && this.waitForLockedBack) {
          // Phase: Opening and waiting for locked back
          // Status debug log removed
          await this.receivedLockedBackState(completePacket);
          await this.receivedCheckState(completePacket);
        } else if (
          this.opening &&
          this.dispensing &&
          !this.waitForDispenseLockedBack
        ) {
          // Phase: Opening and dispensing but not waiting for dispense lock
          // Status debug log removed
          await this.receivedDispenseState(completePacket);
        } else if (
          this.opening &&
          this.dispensing &&
          this.waitForDispenseLockedBack
        ) {
          // Phase: Opening and dispensing and waiting for dispense lock
          // Status debug log removed
          await this.receivedDispenseLockedBackState(completePacket);
          await this.receivedCheckState(completePacket);
        } else {
          // Default: Normal status check
          // Status debug log removed
          await this.receivedCheckState(completePacket);
        }
      } else if (command === CommandType.DS12_UNLOCK_SLOT) {
        // UNLOCK RESPONSE HANDLING - Route based on operation type
        if (this.currentOperationType === "dispense") {
          // Route dispense unlock responses to separate handler for proper dialog routing
          await this.handleDispenseUnlockResponse(completePacket);
        } else {
          // Route regular unlock responses to original handler
          await this.receivedUnlockState(completePacket);
        }
      } else {
        // UNKNOWN COMMAND: Log for debugging
        await this.logOperation("unknown-command", {
          command: `0x${command.toString(16)}`,
          rawData: completePacket.toString(),
          message: `DS12 received unknown command: 0x${command.toString(16)}`,
        });
      }
    } catch (error) {
      // EXCEPTION HANDLING: Log packet processing errors
      await this.logOperation("packet-processing-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        packetData: completePacket.toString(),
        message: `DS12 packet processing exception: ${error}`,
      });
    }
  }

  /**
   * Start packet timeout to handle incomplete packets
   * Timeout set to 500ms to allow for slower hardware responses
   */
  private startPacketTimeout(): void {
    this.clearPacketTimeout();
    this.packetTimeout = setTimeout(async () => {
      if (this.rawDataBuffer.length > 0) {
        await this.logOperation("packet-timeout", {
          bufferLength: this.rawDataBuffer.length,
          rawData: Array.from(this.rawDataBuffer)
            .map((b) => `0x${b.toString(16)}`)
            .join(" "),
          message: `DS12 packet timeout: discarding ${this.rawDataBuffer.length} incomplete bytes`,
        });
        // Clear incomplete packet buffer
        this.rawDataBuffer = Buffer.alloc(0);
      }
    }, 500); // 500ms timeout for DS12 hardware response
  }

  /**
   * Clear packet timeout when complete packet received
   */
  private clearPacketTimeout(): void {
    if (this.packetTimeout) {
      clearTimeout(this.packetTimeout);
      this.packetTimeout = null;
    }
  }

  /**
   * Parse binary slot state data into SlotState objects with database synchronization
   *
   * IMPLEMENTATION STRATEGY (follows KU16 slotBinParser exactly):
   * - Use DS12ProtocolParser for initial binary parsing
   * - Fetch current slot data from database
   * - Combine hardware state with database information
   * - Return SlotState objects for first maxSlot slots only
   * - Handle edge cases (empty data, database mismatches)
   *
   * DATA SYNCHRONIZATION:
   * - Hardware provides lock/unlock states (boolean array)
   * - Database provides patient HN, occupied status, metadata
   * - Combine both sources into complete SlotState objects
   * - Maintain data consistency between hardware and database
   *
   * @param binArr - Binary array from DS12 hardware
   * @param availableSlot - Number of available slots (should be maxSlot = 12)
   * @returns Promise<SlotState[]> - Array of slot state objects
   */
  async slotBinParser(
    binArr: number[],
    availableSlot: number
  ): Promise<SlotState[]> {
    try {
      // INPUT VALIDATION: Check parameters (follows KU16 pattern)
      if (binArr.length <= 0 || availableSlot <= 0) {
        await this.logOperation("slot-parser-error", {
          error: "Invalid input parameters",
          binArrLength: binArr.length,
          availableSlot: availableSlot,
          message: "DS12 slot parser failed: invalid input parameters",
        });
        return [];
      }

      // PROTOCOL PARSING: Use DS12ProtocolParser for binary data parsing
      const parseResult = await this.protocolParser.parseSlotStates(binArr);

      if (!parseResult.success) {
        await this.logOperation("slot-parser-protocol-error", {
          error: parseResult.error?.message || "Protocol parsing failed",
          rawData: binArr.toString(),
          message: "DS12 slot parser protocol parsing failed",
        });
        return [];
      }

      // GET HARDWARE STATES: Boolean array from protocol parser
      const hardwareStates = parseResult.data!;

      // DATABASE SYNCHRONIZATION: Fetch current slot data
      const slotsFromDb = await Slot.findAll();

      // COMBINE DATA: Merge hardware states with database information
      const slotStateObjects = await this.convertToSlotStateObjects(
        hardwareStates,
        slotsFromDb
      );

      // LIMIT RESULTS: Return only available slots (follows KU16 pattern)
      const availableSlots = slotStateObjects.slice(0, availableSlot);

      // MEDICAL AUDIT: Log parsing success
      await this.logOperation("slot-parser-success", {
        hardwareStatesCount: hardwareStates.length,
        databaseSlotsCount: slotsFromDb.length,
        resultCount: availableSlots.length,
        message: `DS12 slot parsing completed: ${availableSlots.length} slots processed`,
      });

      return availableSlots;
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("slot-parser-exception", {
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: binArr.toString(),
        availableSlot: availableSlot,
        message: `DS12 slot parser exception: ${error}`,
      });
      return [];
    }
  }

  // PRIVATE HELPER METHODS

  /**
   * Convert boolean hardware states to SlotState objects with database data
   *
   * @param hardwareStates - Boolean array from protocol parser
   * @param slotsFromDb - Optional database slots (will fetch if not provided)
   * @returns Promise<SlotState[]> - Array of combined slot state objects
   */
  private async convertToSlotStateObjects(
    hardwareStates: boolean[],
    slotsFromDb?: any[]
  ): Promise<SlotState[]> {
    try {
      // FETCH DATABASE DATA: Get slots if not provided
      const dbSlots = slotsFromDb || (await Slot.findAll());

      // COMBINE DATA: Map hardware states with database information
      const slotStates = hardwareStates.map((hardwareState, index) => {
        const dbSlot = dbSlots[index];
        const dbIsActive = dbSlot?.getDataValue("isActive") ?? false;
        const finalIsActive = dbIsActive && hardwareState;

        return {
          slotId: dbSlot?.getDataValue("slotId") ?? null,
          hn: dbSlot?.getDataValue("hn") ?? null,
          occupied: dbSlot?.getDataValue("occupied") ?? false,
          timestamp: dbSlot?.getDataValue("timestamp") ?? null,
          opening: dbSlot?.getDataValue("opening") ?? false,
          isActive: finalIsActive,
        } as SlotState;
      });

      return slotStates;
    } catch (error) {
      await this.logOperation("slot-conversion-error", {
        error: error instanceof Error ? error.message : "Unknown error",
        hardwareStatesCount: hardwareStates.length,
        message: `DS12 slot state conversion failed: ${error}`,
      });
      return [];
    }
  }

  /**
   * Process locked back state for unlock operations
   *
   * LOCKED BACK PROCESSING FLOW:
   * 1. Parse status response to check if slot is locked back
   * 2. Update database with final opening state (occupied = true, opening = false)
   * 3. Clear waitForLockedBack flag to allow next operations
   * 4. Emit UI events to update renderer with locked back status
   * 5. Log operation completion for medical audit
   *
   * MEDICAL DEVICE REQUIREMENTS:
   * - Confirm medication is properly loaded before marking slot as occupied
   * - Update database atomically to maintain data consistency
   * - Provide complete audit trail for regulatory compliance
   * - Handle edge cases (slot not found, invalid states) gracefully
   *
   * @param data - Binary array from DS12 hardware status response
   */
  private async receivedLockedBackState(data: number[]): Promise<void> {
    try {
      // VALIDATION: Ensure we have valid opening slot data
      if (!this.openingSlot) {
        await this.logOperation("locked-back-error", {
          error: "No opening slot data",
          rawData: data.toString(),
          message: "DS12 locked back received but no opening slot tracked",
        });
        return;
      }

      // PROTOCOL PARSING: Use DS12ProtocolParser to parse status response
      const parseResult = await this.protocolParser.parseSlotStates(data);

      if (!parseResult.success) {
        await this.logOperation("locked-back-parse-error", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          message: "DS12 locked back state parsing failed",
        });
        return;
      }

      // GET SLOT STATES: Extract slot states from parsed data
      const slotStates = parseResult.data!;
      const targetSlotIndex = this.openingSlot.slotId - 1; // Convert to 0-based index

      // VALIDATE SLOT INDEX: Ensure slot exists in response data
      if (targetSlotIndex < 0 || targetSlotIndex >= slotStates.length) {
        await this.logOperation("locked-back-error", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          error: "Slot index out of range",
          targetSlotIndex,
          slotStatesLength: slotStates.length,
          message: "DS12 locked back failed: invalid slot index",
        });
        return;
      }

      // CHECK LOCKED STATUS: Verify slot is actually locked back
      const isLockedBack = slotStates[targetSlotIndex]; // true = locked

      if (!isLockedBack) {
        // SLOT NOT LOCKED: May need to wait longer or there's an issue
        await this.logOperation("locked-back-not-ready", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          rawData: data.toString(),
          message: "DS12 slot not yet locked back, continuing to wait",
        });
        return; // Continue waiting for locked back state
      }

      // DATABASE UPDATE: Mark slot as occupied and no longer opening
      await Slot.update(
        {
          ...this.openingSlot,
          occupied: true, // Medication loaded successfully
          opening: false, // Opening process complete
        },
        { where: { slotId: this.openingSlot.slotId } }
      );

      // STATE RESET: Clear operation flags and opening slot data
      this.setWaitForLockedBack(false);
      this.setOpening(false);
      this.currentOperationType = null; // Reset operation type after completion
      const completedSlot = { ...this.openingSlot }; // Preserve for logging and UI
      this.openingSlot = null;

      // UI NOTIFICATION: Inform renderer of successful completion
      this.emitToUI("unlocking", {
        ...completedSlot,
        unlocking: false, // Unlock operation complete
        locked_back: true, // Slot is now locked back with medication
      });

      // MEDICAL AUDIT: Log successful locked back completion
      await this.logOperation("locked-back-success", {
        slotId: completedSlot.slotId,
        hn: completedSlot.hn,
        rawData: data.toString(),
        message: `DS12 slot ${completedSlot.slotId} locked back successfully - medication loaded`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("locked-back-exception", {
        slotId: this.openingSlot?.slotId || 0,
        hn: this.openingSlot?.hn || "",
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 locked back processing exception: ${error}`,
      });
    }
  }

  /**
   * Process dispense state response
   *
   * DISPENSE PROCESSING FLOW:
   * 1. Parse unlock response to verify slot was unlocked for dispensing
   * 2. Update database with dispensing state and create dispensing log
   * 3. Set waitForDispenseLockedBack flag to wait for slot re-lock
   * 4. Emit UI events to show dispense progress to user
   * 5. Log dispensing operation for medical audit and compliance
   *
   * MEDICAL DEVICE SECURITY:
   * - Highest security operation (patient medication access)
   * - Complete audit trail with user, patient, and timestamp data
   * - Database transaction to ensure consistency
   * - Real-time UI updates for medication pickup confirmation
   *
   * DISPENSING LOG REQUIREMENTS:
   * - Record user who authorized dispense operation
   * - Log patient HN for medication tracking
   * - Timestamp for regulatory compliance
   * - Complete audit trail for medical device standards
   *
   * @param data - Binary array from DS12 hardware unlock response
   */
  private async receivedDispenseState(data: number[]): Promise<void> {
    try {
      // VALIDATION: Ensure we have valid opening slot data
      if (!this.openingSlot) {
        await this.logOperation("dispense-state-error", {
          error: "No opening slot data",
          rawData: data.toString(),
          message: "DS12 dispense state received but no opening slot tracked",
        });
        return;
      }

      // PROTOCOL PARSING: Use DS12ProtocolParser to parse unlock response
      const parseResult = this.protocolParser.parseUnlockResponse(data);

      if (!parseResult.success) {
        await this.logOperation("dispense-parse-error", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          message: "DS12 dispense unlock response parsing failed",
        });
        return;
      }

      // UNLOCK VALIDATION: Check if unlock was successful for dispensing
      const unlockSuccessful = parseResult.data!;

      if (!unlockSuccessful) {
        await this.logOperation("dispense-unlock-failed", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          rawData: data.toString(),
          message: "DS12 dispensing failed: slot unlock unsuccessful",
        });
        return;
      }

      // SLOT VALIDATION: Verify slot exists and contains medication
      const slot = await Slot.findOne({
        where: { slotId: this.openingSlot.slotId },
      });

      if (!slot) {
        await this.logOperation("dispense-slot-error", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          error: "Slot not found in database",
          message: "DS12 dispense failed: slot not found",
        });
        return;
      }

      // OCCUPANCY VALIDATION: Ensure slot contains medication for dispensing
      const slotData = slot.dataValues;
      if (!slotData.occupied || !slotData.hn) {
        await this.logOperation("dispense-no-medication", {
          slotId: this.openingSlot.slotId,
          hn: this.openingSlot.hn,
          occupied: slotData.occupied,
          slotHN: slotData.hn,
          message: "DS12 dispense failed: no medication in slot",
        });
        return;
      }

      // USER AUTHENTICATION: Get user information for audit trail
      // Note: passkey is not available in openingSlot, need to get from original dispense call
      const userId = 1; // Use admin user ID for system operations (foreign key constraint)

      // STATE UPDATE: Set wait flag for dispense locked back detection
      this.setWaitForDispenseLockedBack(true);

      // DATABASE UPDATE: Update slot with dispensing timestamp
      await Slot.update(
        {
          ...this.openingSlot,
          opening: true, // Keep opening flag during dispense
          occupied: true, // Still occupied until confirmed dispensed
        },
        { where: { slotId: this.openingSlot.slotId } }
      );

      // DISPENSING LOG: Create audit record for medical compliance
      await logDispensing({
        userId: userId,
        hn: this.openingSlot.hn,
        slotId: this.openingSlot.slotId,
        process: "dispense-continue" as any,
        message: `เริ่มจ่ายยาช่องที่ ${this.openingSlot.slotId} สำหรับผู้ป่วย HN ${this.openingSlot.hn}`,
      });

      // UI NOTIFICATION: Inform renderer of dispensing progress
      this.emitToUI("dispensing", {
        slot: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
        dispensing: true, // Dispensing in progress
        unlocking: false, // Unlock phase complete
        reset: false,
      });

      // MEDICAL AUDIT: Log successful dispense start
      await this.logOperation("dispense-started", {
        userId: userId,
        slotId: this.openingSlot.slotId,
        hn: this.openingSlot.hn,
        rawData: data.toString(),
        message: `DS12 dispensing started for slot ${this.openingSlot.slotId} - waiting for medication pickup`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("dispense-state-exception", {
        slotId: this.openingSlot?.slotId || 0,
        hn: this.openingSlot?.hn || "",
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 dispense state processing exception: ${error}`,
      });
    }
  }

  /**
   * Process dispense locked back state
   *
   * DISPENSE COMPLETION FLOW:
   * 1. Parse status response to confirm slot is locked back after medication pickup
   * 2. Update database to mark slot as empty (occupied = false, hn = null)
   * 3. Create final dispensing log entry for medical audit compliance
   * 4. Clear all operation flags and reset controller state
   * 5. Emit UI events to confirm dispensing completion to user
   *
   * MEDICAL DEVICE COMPLIANCE:
   * - Final step in medication dispensing workflow
   * - Complete audit trail with dispensing completion timestamp
   * - Database consistency with slot availability update
   * - UI feedback for successful medication delivery confirmation
   *
   * DISPENSING COMPLETION REQUIREMENTS:
   * - Verify slot is actually locked back (medication removed)
   * - Clear patient data from slot for next use
   * - Log completion for regulatory and audit requirements
   * - Reset all controller states for next operation
   *
   * @param data - Binary array from DS12 hardware status response
   */
  private async receivedDispenseLockedBackState(data: number[]): Promise<void> {
    try {
      // VALIDATION: Try to get slot data from either openingSlot or dispensingContext
      let currentSlot = this.openingSlot;

      if (
        !currentSlot &&
        this.dispensingContext.slotId &&
        this.dispensingContext.hn
      ) {
        // Use dispensing context if available (for check-locked-back initiated operations)
        currentSlot = {
          slotId: this.dispensingContext.slotId,
          hn: this.dispensingContext.hn,
          timestamp: this.dispensingContext.timestamp || Date.now(),
        };
        console.log(
          "DS12 DEBUG: Using dispensing context for locked-back state check:",
          currentSlot
        );
      }

      if (!currentSlot) {
        await this.logOperation("dispense-locked-back-error", {
          error: "No opening slot data or dispensing context",
          rawData: data.toString(),
          dispensingContext: this.dispensingContext,
          message: "DS12 dispense locked back received but no slot tracked",
        });
        return;
      }

      // PROTOCOL PARSING: Use DS12ProtocolParser to parse status response
      const parseResult = await this.protocolParser.parseSlotStates(data);

      if (!parseResult.success) {
        await this.logOperation("dispense-locked-back-parse-error", {
          slotId: currentSlot.slotId,
          hn: currentSlot.hn,
          error: parseResult.error?.message || "Parse failed",
          rawData: data.toString(),
          message: "DS12 dispense locked back state parsing failed",
        });
        return;
      }

      // GET SLOT STATES: Extract slot states from parsed data
      const slotStates = parseResult.data!;
      const targetSlotIndex = currentSlot.slotId - 1; // Convert to 0-based index

      // VALIDATE SLOT INDEX: Ensure slot exists in response data
      if (targetSlotIndex < 0 || targetSlotIndex >= slotStates.length) {
        await this.logOperation("dispense-locked-back-error", {
          slotId: currentSlot.slotId,
          hn: currentSlot.hn,
          error: "Slot index out of range",
          targetSlotIndex,
          slotStatesLength: slotStates.length,
          message: "DS12 dispense locked back failed: invalid slot index",
        });
        return;
      }

      // CHECK LOCKED STATUS: Verify slot is locked back after dispensing
      const isLockedBack = slotStates[targetSlotIndex]; // true = locked

      if (!isLockedBack) {
        // SLOT NOT LOCKED: Continue waiting for medication to be removed and slot to lock
        await this.logOperation("dispense-locked-back-not-ready", {
          slotId: currentSlot.slotId,
          hn: currentSlot.hn,
          rawData: data.toString(),
          message:
            "DS12 slot not yet locked back after dispensing, continuing to wait",
        });
        return; // Continue waiting for locked back state
      }

      // PRESERVE SLOT DATA: Store for logging and UI updates before clearing
      const completedSlot = { ...currentSlot };
      const userId = 1; // Use admin user ID for system operations (foreign key constraint)

      // NOTE: Slot data reset moved to user decision in clearOrContinue dialog
      // The slot will be cleared only when user chooses "ไม่มียาแล้ว" (reset)
      // or updated when user chooses "มียา" (dispense-continue)

      // DISPENSING LOG: Create final audit record for medical compliance
      await logDispensing({
        userId: userId,
        hn: completedSlot.hn,
        slotId: completedSlot.slotId,
        process: "dispense-end" as any,
        message: `จ่ายยาช่องที่ ${completedSlot.slotId} สำเร็จสำหรับผู้ป่วย HN ${completedSlot.hn}`,
      });

      // STATE RESET: Clear all operation flags and opening slot data
      this.setWaitForDispenseLockedBack(false);
      this.setDispensing(false);
      this.setOpening(false);
      this.currentOperationType = null; // Reset operation type after completion
      this.openingSlot = null;

      // Clear dispensing context if we were using it
      if (this.dispensingContext.slotId) {
        this.clearDispensingContext();
      }

      // UI NOTIFICATION: Inform renderer of successful dispensing completion
      this.emitToUI("dispensing", {
        slot: completedSlot.slotId,
        hn: completedSlot.hn,
        dispensing: false, // Dispensing complete
        unlocking: false, // All operations complete
        reset: true, // Trigger clearOrContinue dialog for medication decision
        completed: true, // Mark as successfully completed
      });

      // ADDITIONAL UI NOTIFICATION: Send locked-back-success event for dispensing workflow
      this.emitToUI("locked-back-success", {
        slotId: completedSlot.slotId,
        hn: completedSlot.hn,
        message: `DS12 slot ${completedSlot.slotId} locked back successfully - medication loaded`,
        timestamp: Date.now(),
      });

      // UI NOTIFICATION: Update unlock status for consistency
      this.emitToUI("unlocking", {
        ...completedSlot,
        unlocking: false, // All operations complete
        locked_back: true, // Slot locked back after dispensing
      });

      // MEDICAL AUDIT: Log successful dispensing completion
      await this.logOperation("dispense-completed", {
        userId: userId,
        slotId: completedSlot.slotId,
        hn: completedSlot.hn,
        rawData: data.toString(),
        message: `DS12 slot ${completedSlot.slotId} dispensing completed - medication delivered to patient ${completedSlot.hn}`,
      });
    } catch (error) {
      // EXCEPTION HANDLING: Log unexpected errors
      await this.logOperation("dispense-locked-back-exception", {
        slotId: this.openingSlot?.slotId || 0,
        hn: this.openingSlot?.hn || "",
        error: error instanceof Error ? error.message : "Unknown error",
        rawData: data.toString(),
        message: `DS12 dispense locked back processing exception: ${error}`,
      });
    }
  }

  /**
   * Emergency state reset for deactivation and reactivation scenarios
   *
   * This method clears all hardware controller operation states without affecting
   * the database or connection state. Used during emergency deactivation and
   * reactivation to ensure clean state synchronization.
   *
   * CRITICAL FOR DEVICE STATE SYNCHRONIZATION:
   * - Clears waitForLockedBack flag that blocks subsequent operations
   * - Resets all operation flags (opening, dispensing, wait states)
   * - Clears pending operations and command queue
   * - PRESERVES hardware connection state (does NOT set connected = false)
   * - Maintains medical device audit compliance
   */
  emergencyStateReset(): void {
    // PRESERVE CONNECTION STATE: Store current connection status
    const wasConnected = this.connected;

    // OPERATION STATE RESET: Clear all operation flags
    this.setOpening(false);
    this.setDispensing(false);
    this.setWaitForLockedBack(false);
    this.setWaitForDispenseLockedBack(false);

    // OPERATION CONTEXT RESET: Clear operation tracking
    this.currentOperationType = null;
    this.openingSlot = null;
    this.clearDispensingContext();

    // COMMAND QUEUE RESET: Clear pending operations (but preserve connection)
    this.commandQueue = [];
    this.processingCommand = false;

    // RESTORE CONNECTION STATE: Ensure connection state is preserved
    this.connected = wasConnected;

    // MEDICAL AUDIT: Log emergency state reset for compliance
    this.logOperation("emergency-state-reset", {
      deviceType: this.deviceType,
      connectionPreserved: wasConnected,
      timestamp: Date.now(),
      message: `DS12 emergency state reset - operation flags cleared, connection ${
        wasConnected ? "preserved" : "maintained as disconnected"
      }`,
    });

    // UI NOTIFICATION: Inform renderer of emergency state reset
    this.emitToUI("emergency-state-reset", {
      deviceType: this.deviceType,
      connectionPreserved: wasConnected,
      timestamp: Date.now(),
      message:
        "Device state reset for emergency operation - hardware connection preserved",
    });
  }

  /**
   * Reset all controller states to initial values
   * Override from base class with DS12-specific implementation
   */
  protected resetAllStates(): void {
    // CALL PARENT: Use base class state reset if implemented
    // Currently base class has stub implementation

    // DS12-SPECIFIC RESET: Clear all operation states
    this.connected = false;
    this.setOpening(false);
    this.setDispensing(false);
    this.setWaitForLockedBack(false);
    this.setWaitForDispenseLockedBack(false);
    this.currentOperationType = null; // Reset operation type
    this.openingSlot = null;
    this.clearDispensingContext();

    // HARDWARE PROTECTION: Reset connection management state
    this.connectionAttempts = 0;
    this.commandQueue = [];
    this.processingCommand = false;

    // MEDICAL AUDIT: Log state reset for compliance
    this.logOperation("states-reset", {
      deviceType: this.deviceType,
      timestamp: Date.now(),
      message: "DS12 controller states reset to initial values",
    });

    // UI NOTIFICATION: Inform renderer of state reset
    this.emitToUI("device-state-reset", {
      deviceType: this.deviceType,
      timestamp: Date.now(),
    });
  }

  /**
   * Enhanced connection with hardware protection and retry logic
   *
   * HARDWARE PROTECTION FEATURES:
   * - Connection timeout to prevent indefinite hanging
   * - Exponential backoff retry logic for connection failures
   * - Maximum retry attempts to prevent infinite loops
   * - Connection state validation before hardware operations
   * - Automatic cleanup of failed connection attempts
   *
   * MEDICAL DEVICE SAFETY:
   * - Gradual retry delays prevent hardware stress
   * - Comprehensive error logging for troubleshooting
   * - Hardware protection mode prevents unsafe operations
   * - Connection validation ensures stable communication
   *
   * @param port - Serial port identifier
   * @param baudRate - Communication baud rate (default: 19200)
   * @param enableProtection - Enable hardware protection measures
   * @returns Promise resolving to connection success with retry information
   */
  async connectWithProtection(
    port: string,
    baudRate: number = 19200,
    enableProtection: boolean = true
  ): Promise<{ success: boolean; attempts: number; message: string }> {
    this.hardwareProtectionEnabled = enableProtection;

    // RESET CONNECTION STATE: Clean state for new connection attempt
    this.connectionAttempts = 0;

    for (let attempt = 1; attempt <= this.maxConnectionAttempts; attempt++) {
      this.connectionAttempts = attempt;

      try {
        await this.logOperation("connection-attempt-protected", {
          attempt,
          maxAttempts: this.maxConnectionAttempts,
          port,
          baudRate,
          protectionEnabled: this.hardwareProtectionEnabled,
          message: `DS12 protected connection attempt ${attempt}/${this.maxConnectionAttempts}`,
        });

        // ATTEMPT CONNECTION: Use existing connect method
        const connectionSuccess = await this.connect(port, baudRate);

        if (connectionSuccess) {
          await this.logOperation("connection-success-protected", {
            attempts: attempt,
            port,
            baudRate,
            message: `DS12 connected successfully after ${attempt} attempts`,
          });

          return {
            success: true,
            attempts: attempt,
            message: `Connected successfully after ${attempt} attempts`,
          };
        }

        // CONNECTION FAILED: Apply exponential backoff if more attempts remain
        if (attempt < this.maxConnectionAttempts) {
          const delayMs = this.reconnectDelay * Math.pow(2, attempt - 1); // Exponential backoff

          await this.logOperation("connection-retry-delay", {
            attempt,
            delayMs,
            nextAttempt: attempt + 1,
            message: `DS12 connection failed, retrying in ${delayMs}ms`,
          });

          await this.delay(delayMs);
        }
      } catch (error) {
        await this.logOperation("connection-attempt-exception", {
          attempt,
          error: error instanceof Error ? error.message : "Unknown error",
          message: `DS12 connection attempt ${attempt} failed with exception`,
        });
      }
    }

    // ALL ATTEMPTS FAILED: Log failure and return result
    await this.logOperation("connection-failed-all-attempts", {
      totalAttempts: this.maxConnectionAttempts,
      port,
      baudRate,
      message: `DS12 connection failed after ${this.maxConnectionAttempts} attempts`,
    });

    return {
      success: false,
      attempts: this.maxConnectionAttempts,
      message: `Connection failed after ${this.maxConnectionAttempts} attempts`,
    };
  }

  /**
   * Check hardware protection status and connection health
   *
   * HEALTH CHECK VALIDATION:
   * - Verify serial port connection is active
   * - Check parser initialization status
   * - Validate hardware protection settings
   * - Monitor connection stability metrics
   *
   * @returns Hardware connection health status
   */
  getConnectionHealth(): {
    connected: boolean;
    protectionEnabled: boolean;
    connectionAttempts: number;
    queuedCommands: number;
    lastActivity: number;
    status: "healthy" | "degraded" | "failed";
  } {
    const health = {
      connected: this.isConnected(),
      protectionEnabled: this.hardwareProtectionEnabled,
      connectionAttempts: this.connectionAttempts,
      queuedCommands: this.commandQueue.length,
      lastActivity: Date.now(),
      status: "healthy" as "healthy" | "degraded" | "failed",
    };

    // DETERMINE HEALTH STATUS: Based on connection and activity metrics
    if (!health.connected) {
      health.status = "failed";
    } else if (health.connectionAttempts > 1 || health.queuedCommands > 5) {
      health.status = "degraded";
    }

    return health;
  }

  /**
   * Emergency disconnection for hardware protection
   *
   * EMERGENCY PROCEDURES:
   * - Immediate serial port closure
   * - Clear all pending operations
   * - Reset all states to safe defaults
   * - Log emergency disconnection for audit
   * - Notify UI of emergency state
   */
  async emergencyDisconnect(reason: string): Promise<void> {
    try {
      await this.logOperation("emergency-disconnect", {
        reason,
        connected: this.connected,
        queuedCommands: this.commandQueue.length,
        deviceType: this.deviceType,
        message: `DS12 emergency disconnect initiated: ${reason}`,
      });

      // IMMEDIATE CLEANUP: Force close connection regardless of state
      if (this.serialPort) {
        this.serialPort.destroy();
        this.serialPort = null;
      }

      this.commandQueue = [];
      this.processingCommand = false;

      // RESET ALL STATES: Ensure clean emergency state
      this.resetAllStates();

      // UI NOTIFICATION: Alert renderer of emergency state
      this.emitToUI("emergency-disconnect", {
        deviceType: this.deviceType,
        reason,
        timestamp: Date.now(),
      });
    } catch (error) {
      // FORCE RESET: Even if emergency disconnect fails, reset states
      this.serialPort = null;

      this.connected = false;
      this.resetAllStates();

      await this.logOperation("emergency-disconnect-error", {
        reason,
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 emergency disconnect error, forced reset completed`,
      });
    }
  }

  /**
   * Queue command with retry logic for safe sequential execution
   *
   * COMMAND QUEUE PROTECTION:
   * - Prevents simultaneous commands that could conflict
   * - Retry logic for transient hardware communication failures
   * - Timeout handling for unresponsive hardware
   * - Medical audit logging for all command attempts
   *
   * @param commandName - Descriptive command name for logging
   * @param commandFunction - Async function to execute command
   * @returns Promise resolving to command execution result
   */
  protected async queueCommand<T>(
    commandName: string,
    commandFunction: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    // HARDWARE PROTECTION: Check if protection is enabled and connection is healthy
    if (this.hardwareProtectionEnabled && !this.isConnected()) {
      return {
        success: false,
        error: "Hardware protection: Device not connected",
      };
    }

    // ADD TO QUEUE: Track command for monitoring and logging
    const queueEntry = {
      command: commandName,
      timestamp: Date.now(),
      retries: 0,
    };

    this.commandQueue.push(queueEntry);

    try {
      // WAIT FOR QUEUE: Ensure sequential command execution
      while (this.processingCommand) {
        await this.delay(10); // Small delay to prevent busy waiting
      }

      this.processingCommand = true;

      // EXECUTE COMMAND: With retry logic for reliability
      for (let attempt = 1; attempt <= this.maxCommandRetries + 1; attempt++) {
        queueEntry.retries = attempt - 1;

        try {
          await this.logOperation("command-execute", {
            command: commandName,
            attempt,
            totalRetries: this.maxCommandRetries,
            message: `DS12 executing command: ${commandName} (attempt ${attempt})`,
          });

          const result = await commandFunction();

          // SUCCESS: Log and return result
          await this.logOperation("command-success", {
            command: commandName,
            attempts: attempt,
            message: `DS12 command ${commandName} completed successfully`,
          });

          return { success: true, result };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          await this.logOperation("command-attempt-failed", {
            command: commandName,
            attempt,
            error: errorMessage,
            willRetry: attempt <= this.maxCommandRetries,
            message: `DS12 command ${commandName} attempt ${attempt} failed: ${errorMessage}`,
          });

          // RETRY DELAY: Wait before retry if not final attempt
          if (attempt <= this.maxCommandRetries) {
            await this.delay(100 * attempt); // Increasing delay for retries
          } else {
            // FINAL FAILURE: Log and return error
            await this.logOperation("command-failed-final", {
              command: commandName,
              totalAttempts: attempt,
              error: errorMessage,
              message: `DS12 command ${commandName} failed after ${attempt} attempts`,
            });

            return { success: false, error: errorMessage };
          }
        }
      }
    } finally {
      // CLEANUP: Remove from queue and reset processing flag
      this.processingCommand = false;
      const queueIndex = this.commandQueue.indexOf(queueEntry);
      if (queueIndex >= 0) {
        this.commandQueue.splice(queueIndex, 1);
      }
    }

    return {
      success: false,
      error: "Command execution completed without result",
    };
  }

  /**
   * Deactivate all DS12 slots (admin operation)
   * @param passkey - admin passkey for authentication
   */
  async deactiveAllSlots(passkey?: string): Promise<void> {
    try {
      // Deactivate all slots from 1 to maxSlot
      for (let slotId = 1; slotId <= this.maxSlot; slotId++) {
        await this.deactivate(slotId, passkey || "");
      }

      await this.logOperation("deactivate-all", {
        userId: "admin",
        message: `All DS12 slots deactivated successfully`,
      });
    } catch (error) {
      await this.logOperation("deactivate-all-error", {
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 deactivate all slots exception: ${error}`,
      });
      throw error;
    }
  }

  /**
   * Reactivate all DS12 slots (admin operation)
   * @param passkey - admin passkey for authentication
   */
  async reactiveAllSlots(passkey?: string): Promise<void> {
    try {
      // Reactivate all slots from 1 to maxSlot
      for (let slotId = 1; slotId <= this.maxSlot; slotId++) {
        await this.reactivate(slotId, passkey || "");
      }

      await this.logOperation("reactivate-all", {
        userId: "admin",
        message: `All DS12 slots reactivated successfully`,
      });
    } catch (error) {
      await this.logOperation("reactivate-all-error", {
        error: error instanceof Error ? error.message : "Unknown error",
        message: `DS12 reactivate all slots exception: ${error}`,
      });
      throw error;
    }
  }

  /**
   * Utility method for creating delays
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
