import { BrowserWindow } from "electron";
import { SlotState } from "../../interfaces/slotState";
import {
  logger,
  logDispensing,
  DispensingLogData,
  LogData,
} from "../../logger";

// SECURITY NOTE: Consider adding role-based access control types
// TODO: Create interfaces for user roles and permissions
// interface UserRole { role: 'admin' | 'operator' | 'viewer'; permissions: string[] }
// interface SecurityContext { userId: string; role: UserRole; timestamp: number }

export abstract class KuControllerBase {
  protected win: BrowserWindow;
  protected connected = false;

  // STATE MANAGEMENT ISSUE: Multiple boolean flags create complex state combinations
  // RECOMMENDATION: Consider using a state machine pattern with enum states
  // enum DeviceState { IDLE, CONNECTING, UNLOCKING, DISPENSING, WAITING_LOCK }
  protected opening = false;
  protected dispensing = false;
  protected waitForLockedBack = false;
  protected waitForDispenseLockedBack = false;

  // TYPE SAFETY: Consider creating an interface for openingSlot
  // interface OpeningSlotData { slotId: number; hn: string; timestamp: number }
  protected openingSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
  } | null;

  //TELL AI: I need to change from CU12 -> DS12 and from CU(KU16) -> DS16 instead
  abstract readonly deviceType: "DS12" | "DS16";
  abstract readonly maxSlot: number;

  constructor(win: BrowserWindow) {
    // INPUT VALIDATION: Good practice to validate constructor parameters
    // TESTING: Add unit tests for constructor with null, undefined, and destroyed windows
    if (!win) {
      throw new Error("BrowserWindow instance is required");
    }

    // INITIALIZATION: Consider adding additional initialization checks
    // TESTING: Create test case for destroyed window scenario
    if (win.isDestroyed()) {
      throw new Error(
        "Cannot initialize controller with destroyed BrowserWindow"
      );
    }

    this.win = win;
    this.openingSlot = null;

    // INITIALIZATION: Consider initializing all state variables explicitly for clarity
    // TESTING OPPORTUNITY: Test that all states are properly initialized
    // this.resetAllStates(); // Call after implementing the method

    // SECURITY ENHANCEMENT: Consider adding device initialization logging
    // this.logOperation('controller-initialized', { deviceType: this.deviceType, timestamp: Date.now() });
  }

  /**
   * Establishes connection to the device
   * @param port - Serial port identifier (e.g., "COM3", "/dev/ttyUSB0")
   * @param baudRate - Communication baud rate (e.g., 9600, 115200)
   * @returns Promise<boolean> - Connection success status
   * @throws Error if connection fails
   *
   * IMPLEMENTATION NOTE: Ensure connection timeout handling and retry logic
   * LOGGING: Should log connection attempts and results for debugging
   */
  abstract connect(port: string, baudRate: number): Promise<boolean>;
  /**
   * Disconnects from the device and cleans up resources
   * IMPLEMENTATION NOTE: Should reset all states and clean up event listeners
   */
  abstract disconnect(): Promise<void>;

  /**
   * Checks current connection status
   * @returns boolean - true if device is connected and responsive
   * TYPO FIX: Changed "of" to "if" in documentation
   */
  abstract isConnected(): boolean;

  /**
   * Sends command to check all slots state
   * @returns boolean if command was sent successfully
   *
   * ENHANCEMENT OPPORTUNITY: Consider returning Promise<SlotState[]> for better async handling
   * CURRENT ISSUE: Boolean return doesn't provide slot state data to caller
   * RECOMMENDED: abstract sendCheckState(): Promise<SlotState[]>
   */
  abstract sendCheckState(): Promise<SlotState[]>;
  /**
   * Unlocks a specific slot for patient access
   * @param inputSlot - Slot information including patient HN and timestamp
   *
   * TYPO FIX: "acess" -> "access"
   * SECURITY ANSWER: YES, passkey is essential for unlock operations for these reasons:
   * 1. Prevents unauthorized access to medication slots
   * 2. Maintains audit trail of who performed operations
   * 3. Complies with medical device security standards
   * 4. Protects against accidental or malicious unlocks
   *
   * SECURITY ENHANCEMENT: Consider adding role-based validation:
   * - Only 'operator' or 'admin' roles should unlock slots
   * - Log all unlock attempts (successful and failed)
   * - Implement rate limiting to prevent brute force attacks
   */
  abstract sendUnlock(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string; // REQUIRED: User authentication for security compliance
  }): Promise<void>;

  /**
   * Dispense medication from a slot with security verification
   * @param inputSlot - slot information with passkey for additional security
   *
   * SECURITY NOTE: Dispense operations should have highest security level
   * IMPLEMENTATION REQUIREMENTS:
   * - Validate passkey before hardware operation
   * - Confirm slot contains correct medication for patient (HN validation)
   * - Log all dispense attempts with detailed audit trail
   * - Implement timeout mechanism for dispense operations
   */
  abstract dispense(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }): Promise<void>;

  /**
   * Reset a slot to its default/locked state (empties slot for reuse with another patient)
   * @param slotId - Target slot number
   * @param passkey - User verification token
   *
   * ROLE-BASED ACCESS ANSWER: YES, critical operations need role restrictions:
   * RECOMMENDED ROLE HIERARCHY:
   * - resetSlot: 'admin' or 'supervisor' only (removes medication data)
   * - deactivate: 'admin' only (takes slot out of service)
   * - reactivate: 'admin' only (returns slot to service)
   *
   * IMPLEMENTATION: Add role parameter and validation:
   * abstract resetSlot(slotId: number, passkey: string, userRole: UserRole): Promise<void>
   */
  abstract resetSlot(slotId: number, passkey: string): Promise<void>;

  /**
   * Deactivate a slot (makes it unavailable for use)
   * @param slotId - target slot number
   * @param passkey - user passkey
   *
   * TYPO FIX: "Deactive" -> "Deactivate"
   * CRITICAL OPERATION: Should require 'admin' role only
   * SAFETY CHECK: Ensure no patient medication is in slot before deactivating
   */
  abstract deactivate(slotId: number, passkey: string): Promise<void>;

  /**
   * Reactivates a previously deactivated slot
   * @param slotId - target slot number
   * @param passkey - user passkey
   *
   * TYPO FIX: "proviously" -> "previously"
   * CRITICAL OPERATION: Should require 'admin' role only
   * SAFETY CHECK: Validate slot hardware integrity before reactivating
   */
  abstract reactivate(slotId: number, passkey: string): Promise<void>;

  // TYPO FIX: "recievedCheckState" -> "receivedCheckState"
  // TESTING REQUIREMENT: This method needs comprehensive unit tests for different data formats
  // Test cases: empty array, DS12 format (5 bytes), DS16 format (7 bytes), invalid data
  abstract receivedCheckState(data: number[]): Promise<void>;
  // SECURITY CRITICAL: This method processes hardware unlock responses
  // TESTING REQUIREMENT: Mock hardware responses for different unlock scenarios
  // Test cases: successful unlock, unlock failure, timeout, malformed response
  // AUDIT LOGGING: Should log all unlock attempts and responses
  abstract receivedUnlockState(data: number[]): Promise<void>;

  // HARDWARE COMMUNICATION: Main receive loop for serial communication
  // ERROR HANDLING: Should handle connection drops gracefully
  // TESTING CHALLENGE: Requires hardware simulation or mocking for unit tests
  // PERFORMANCE: Consider adding receive buffer management for high-frequency data
  abstract receive(): void;
  /**
   * BINARY PARSING ARCHITECTURE ANALYSIS & RECOMMENDATIONS
   *
   * CURRENT PROTOCOL ANALYSIS:
   * DS12 Format (5 bytes): STX + ADDR + CMD + DATA1 + DATA2
   * DS16 Format (7 bytes): STX + ADDR + CMD + DATA1 + DATA2 + DATA3 + DATA4
   *
   * ARCHITECTURE PROBLEM: Single method handling multiple hardware protocols
   *
   * RECOMMENDED SOLUTION - Strategy Pattern Implementation:
   *
   * 1. CREATE PROTOCOL STRATEGY INTERFACES:
   * interface ProtocolParser {
   *   parseSlotStates(binArr: number[], availableSlots: number): Promise<SlotState[]>;
   *   validateProtocolFormat(binArr: number[]): boolean;
   *   extractLockStates(data: number[]): number[];
   *   extractItemDetection(data: number[]): number[];
   * }
   *
   * 2. IMPLEMENT SPECIFIC PARSERS:
   * class DS12ProtocolParser implements ProtocolParser {
   *   parseSlotStates(binArr: number[], availableSlots: number): Promise<SlotState[]> {
   *     // Handle 5-byte format: bits in DATA1 (slots 1-8), DATA2 (slots 9-12)
   *   }
   * }
   *
   * class DS16ProtocolParser implements ProtocolParser {
   *   parseSlotStates(binArr: number[], availableSlots: number): Promise<SlotState[]> {
   *     // Handle 7-byte format: DATA1(1-8), DATA2(9-16), DATA3+DATA4(infrared)
   *   }
   * }
   *
   * 3. USE FACTORY PATTERN FOR PARSER SELECTION:
   * protected getProtocolParser(): ProtocolParser {
   *   switch(this.deviceType) {
   *     case 'DS12': return new DS12ProtocolParser();
   *     case 'DS16': return new DS16ProtocolParser();
   *     default: throw new Error(`Unsupported device type: ${this.deviceType}`);
   *   }
   * }
   *
   * 4. REFACTOR THIS METHOD TO USE STRATEGY:
   * async slotBinParser(binArr: number[], availableSlot: number): Promise<SlotState[]> {
   *   const parser = this.getProtocolParser();
   *
   *   if (!parser.validateProtocolFormat(binArr)) {
   *     throw new Error(`Invalid protocol format for ${this.deviceType}`);
   *   }
   *
   *   return await parser.parseSlotStates(binArr, availableSlot);
   * }
   *
   * BENEFITS OF THIS APPROACH:
   * - Easy to add new hardware protocols (DS20, DS24, etc.)
   * - Clear separation of parsing logic per device type
   * - Testable individual protocol parsers
   * - Follows Open/Closed Principle (open for extension, closed for modification)
   * - Type-safe bit manipulation with proper validation
   *
   * TESTING STRATEGY:
   * - Unit tests for each protocol parser with known binary inputs
   * - Integration tests with simulated hardware responses
   * - Edge case tests for malformed data, partial data, wrong device type
   */
  abstract slotBinParser(
    binArr: number[],
    availableSlot: number
  ): Promise<SlotState[]>;

  /**
   * Emits events to the UI renderer process
   * ex : this.emitToUI('unlocking', { slotId, hn, status: 'success' })
   * @param eventName - Event name that renderer will listen to
   * @param data - Data payload to send with the event
   *
   * SECURITY REVIEW: Implementation looks safe with proper null checks
   * ENHANCEMENT OPPORTUNITIES:
   * 1. Add event name validation (whitelist of allowed events)
   * 2. Sanitize data payload to prevent XSS in renderer
   * 3. Add retry mechanism for critical events
   * 4. Consider rate limiting to prevent event flooding
   */
  protected emitToUI(eventName: string, data: any): void {
    // SAFETY CHECK: Comprehensive validation before sending events
    if (this.win && this.win.webContents && !this.win.isDestroyed()) {
      try {
        this.win.webContents.send(eventName, data);
      } catch (error) {
        // ERROR HANDLING: Log IPC sending failures
        console.error(`Failed to emit ${eventName}:`, error);
      }
    } else {
      console.warn(
        `Cannot emit ${eventName}: BrowserWindow not available or destroyed`
      );
    }
  }

  /**
   * Log operations to appropriate database on both tables
   * @param operation - type of operation (unlock, dispense, connect, error, etc)
   * @param data - operation data including slotId, hn, userId, message, etc.
   *
   * CRITICAL LOGGING METHOD: This handles audit trails for medical device operations
   */
  protected async logOperation(operation: string, data: any): Promise<void> {
    try {
      const dispensingOperations = [
        "unlock",
        "dispense-continue",
        "dispense-end",
        "unlock-error",
        "dispense-error",
        "deactivate",
        "deactivate-error",
        "force-reset",
        "force-reset-error",
      ];

      if (dispensingOperations.includes(operation)) {
        // Dispensing Operation Related
        await logDispensing({
          userId: data.userId || "system",
          hn: data.hn || "",
          slotId: data.slotId,
          process: operation as any,
          message: data.message || `${operation} operation`,
        });
      }

      // Others -> Logs table
      await logger({
        user: data.userId || "system",
        message: `${operation}: ${data.message || JSON.stringify(data)}`,
      });

      console.log(`[${new Date().toISOString()}] ${operation}: `, data);
    } catch (error) {
      console.error("Failed to log operation:", error);

      // DEVELOPER QUESTION ANSWER (Line 163):
      // คุณถูกต้องแล้ว! ไม่ควร throw error ตรงนี้เพราะ:
      // 1. Logging ล้มเหลวไม่ควรทำให้ main operation ล้มเหลวด้วย
      // 2. การ throw จะทำให้ระบบพังเวลา runtime หากมีปัญหา database
      // 3. Logging เป็น secondary operation, ไม่ใช่ primary business logic
      //
      // CORRECT APPROACH: Log the error และ continue ต่อไป (ตามที่ทำอยู่แล้ว)
      // ENHANCEMENT: อาจจะเพิ่ม fallback logging mechanism (เช่น file logging)
      // when database logging fails
    }
  }

  /**
   * Sets the opening state of the device
   * @param state - opening state
   *
   * DEVELOPER CONCERN (Lines 172-174): State redundancy และ best practices
   *
   * CURRENT ISSUE ANALYSIS:
   * 1. Triple state management: Class state + Database state + UI state
   * 2. Complex state synchronization across multiple layers
   * 3. Potential race conditions between UI, database, and hardware
   *
   * RECOMMENDED SOLUTION - Single Source of Truth Pattern:
   * 1. Use database as primary state store
   * 2. Class state เป็น cache เท่านั้น (sync from database)
   * 3. UI state derived from class state via events
   *
   * IMPLEMENTATION STRATEGY:
   * - Create getSlotState(slotId): Promise<SlotState> method
   * - Remove redundant boolean flags
   * - Use enum SlotState { IDLE, OPENING, DISPENSING, WAITING_LOCK }
   * - Emit state changes to UI automatically
   *
   * CODE EXAMPLE:
   * protected async updateSlotState(slotId: number, newState: SlotState): Promise<void> {
   *   await updateSlotInDatabase(slotId, newState);
   *   this.slotStates[slotId] = newState;
   *   this.emitToUI('slot-state-changed', { slotId, state: newState });
   * }
   */
  protected setOpening(state: boolean): void {
    this.opening = state;
    // TODO: Implement unified state management pattern described above
  }

  // DEVELOPER QUESTION (Line 179): YES, these are runtime state management methods
  protected setDispensing(state: boolean): void {
    /**
     * DEVELOPER CONCERN (Lines 181-182): Process flow confusion
     *
     * CURRENT FLOW ANALYSIS:
     * Phase 1: Unlock (for medication loading) -> unlock wait dialog -> IPC flow A
     * Phase 2: Dispensing (for patient pickup) -> dispense wait dialog -> IPC flow B
     * Problem: Same hardware check command used for different phases
     *
     * RECOMMENDED SOLUTION - Cleaner Process Flow:
     *
     * 1. SEPARATE HARDWARE COMMANDS:
     *    - sendCheckStateForUnlock(): boolean  // Check if slot locked after loading
     *    - sendCheckStateForDispense(): boolean // Check if slot locked after pickup
     *
     * 2. UNIFIED IPC PATTERN:
     *    - Use single IPC channel with operation type parameter
     *    - this.emitToUI('slot-operation-update', { slotId, phase: 'unlock'|'dispense', status })
     *
     * 3. STATE MACHINE APPROACH:
     *    enum SlotPhase { IDLE, UNLOCKING, LOADING_MEDICATION, WAITING_PATIENT, DISPENSING }
     *
     * 4. CLEAR METHOD NAMING:
     *    - handleUnlockFlow(slotId) -> for medication loading phase
     *    - handleDispenseFlow(slotId) -> for patient pickup phase
     */
    this.dispensing = state;
  }

  protected setWaitForLockedBack(state: boolean): void {
    // RELATED STATE: Connected to setOpening, setDispensing
    // TODO: Replace with unified state management system
    this.waitForLockedBack = state;
  }

  protected setWaitForDispenseLockedBack(state: boolean): void {
    // RELATED STATE: Connected to above state methods
    // TODO: Replace with unified state management system
    this.waitForDispenseLockedBack = state;
  }

  protected getDeviceState() {
    // DEVELOPER QUESTION (Lines 197-203): Implementation guidance needed
    //
    // RECOMMENDED IMPLEMENTATION:
    // protected getDeviceState(): DeviceState {
    //   return {
    //     connected: this.connected,
    //     deviceType: this.deviceType,
    //     currentOperation: this.getCurrentOperation(),
    //     slots: this.getAllSlotStates(),
    //     lastActivity: this.lastActivityTimestamp,
    //     errors: this.getActiveErrors()
    //   };
    // }
    //
    // USAGE: For health checks, debugging, and UI synchronization
  }

  protected resetAllStates(): void {
    // DEVELOPER QUESTION (Lines 201-203): Implementation guidance needed
    //
    // RECOMMENDED IMPLEMENTATION:
    // protected resetAllStates(): void {
    //   this.connected = false;
    //   this.opening = false;
    //   this.dispensing = false;
    //   this.waitForLockedBack = false;
    //   this.waitForDispenseLockedBack = false;
    //   this.openingSlot = null;
    //
    //   // Clear any timers or intervals
    //   // Reset error states
    //   // Emit state reset event to UI
    //   this.emitToUI('device-state-reset', { timestamp: Date.now() });
    // }
    //
    // USAGE: Called during disconnect, error recovery, or system shutdown
  }
}
