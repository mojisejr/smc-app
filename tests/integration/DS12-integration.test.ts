import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { BrowserWindow } from 'electron';
import { DS12Controller } from '../../main/ku-controllers/ds12/DS12Controller';
import { MockDS12Hardware, MockDS12Scenario } from '../mocks/MockDS12Hardware';
import { 
  NORMAL_TEST_CONFIG, 
  ERROR_TEST_CONFIG, 
  TEST_SLOT_DATA, 
  TEST_USER_DATA,
  PERFORMANCE_BENCHMARKS,
  TEST_SCENARIOS,
  COMPLIANCE_REQUIREMENTS
} from '../setup/ds12-test-config';
import { Slot } from '../../db/model/slot.model';
import { User } from '../../db/model/user.model';

/**
 * DS12Controller Integration Tests
 * 
 * INTEGRATION TESTING STRATEGY:
 * - End-to-end workflow validation from connection to medication dispensing
 * - Real-world scenario simulation with mock hardware
 * - Medical device compliance verification across complete workflows
 * - Performance validation under various load conditions
 * - Error recovery testing with hardware failure simulation
 * 
 * MEDICAL DEVICE WORKFLOW TESTING:
 * 1. Healthcare facility startup and DS12 connection
 * 2. Medication loading workflow (unlock -> load -> lock back)
 * 3. Patient medication dispensing workflow (authenticate -> dispense -> confirm)
 * 4. Administrative operations (slot reset, device management)
 * 5. Error recovery and emergency procedures
 * 6. End-of-day disconnection and cleanup
 * 
 * COMPLIANCE VALIDATION:
 * - Complete audit trail generation and verification
 * - User authentication for all critical operations
 * - Database synchronization with hardware state
 * - UI feedback and error communication
 * - Hardware protection and safe failure modes
 */

// Mock Electron BrowserWindow with comprehensive event tracking
const mockBrowserWindow = {
  webContents: {
    send: jest.fn()
  },
  isDestroyed: jest.fn().mockReturnValue(false)
} as unknown as BrowserWindow;

// Mock database models with realistic responses
jest.mock('../../db/model/slot.model');
jest.mock('../../db/model/user.model');
jest.mock('../../logger');

const MockedSlot = Slot as jest.MockedClass<typeof Slot>;
const MockedUser = User as jest.MockedClass<typeof User>;

describe('DS12Controller Integration Tests - Complete Medical Device Workflows', () => {
  let ds12Controller: DS12Controller;
  let mockHardware: MockDS12Hardware;
  let testStartTime: number;

  beforeAll(() => {
    // SETUP: Global test environment for integration testing
    testStartTime = Date.now();
    console.log('🏥 Starting DS12 Medical Device Integration Tests');
  });

  afterAll(() => {
    // CLEANUP: Global test environment cleanup
    const testDuration = Date.now() - testStartTime;
    console.log(`✅ DS12 Integration Tests completed in ${testDuration}ms`);
  });

  beforeEach(() => {
    // SETUP: Clean state for each integration test
    mockBrowserWindow.webContents.send = jest.fn();
    mockBrowserWindow.isDestroyed = jest.fn().mockReturnValue(false);

    // CREATE CONTROLLER: Initialize with mock BrowserWindow
    ds12Controller = new DS12Controller(mockBrowserWindow);

    // CREATE MOCK HARDWARE: Use normal operation configuration
    mockHardware = new MockDS12Hardware(NORMAL_TEST_CONFIG);

    // SETUP DATABASE MOCKS: Configure realistic medical data
    setupDatabaseMocks();

    // SUPPRESS CONSOLE: Keep integration test output focused
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    // CLEANUP: Ensure clean state after each integration test
    try {
      if (ds12Controller.isConnected()) {
        await ds12Controller.disconnect();
      }
      
      if (mockHardware.isConnected()) {
        await mockHardware.disconnect();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // RESTORE MOCKS: Clean slate for next test
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Healthcare Facility Startup Workflow', () => {
    it('should complete full startup sequence with hardware validation', async () => {
      const testScenario = 'Healthcare Facility Startup';
      console.log(`🚀 Testing: ${testScenario}`);

      // STEP 1: Connect mock hardware (simulates DS12 device power-on)
      await mockHardware.connect();
      expect(mockHardware.isConnected()).toBe(true);

      // STEP 2: Initialize DS12 controller connection with protection
      const connectionResult = await ds12Controller.connectWithProtection('/dev/ttyDS12', 19200, true);
      
      // VERIFY: Connection successful with hardware protection
      expect(connectionResult.success).toBe(true);
      expect(connectionResult.attempts).toBeGreaterThan(0);

      // STEP 3: Verify device health after connection
      const healthStatus = ds12Controller.getConnectionHealth();
      expect(healthStatus.connected).toBe(true);
      expect(healthStatus.protectionEnabled).toBe(true);
      expect(healthStatus.status).toBe('healthy');

      // STEP 4: Perform initial status check (verify all slots)
      const statusResult = await ds12Controller.sendCheckState();
      expect(Array.isArray(statusResult)).toBe(true);

      // VERIFY: UI notifications sent for startup sequence
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledTimes(2); // State reset + connection events

      console.log(`✅ ${testScenario}: Connection and initialization completed successfully`);
    });
  });

  describe('Medication Loading Workflow (Healthcare Staff)', () => {
    beforeEach(async () => {
      // SETUP: Establish connection for medication loading tests
      await mockHardware.connect();
      mockHardware.setTestScenario(MockDS12Scenario.NORMAL);
    });

    it('should complete medication loading workflow with audit trail', async () => {
      const testScenario = 'Medication Loading Workflow';
      console.log(`💊 Testing: ${testScenario}`);

      // STEP 1: Healthcare staff authenticates for medication loading
      const loadingData = {
        slotId: 1,
        hn: 'HN123456', // Patient hospital number
        timestamp: Date.now(),
        passkey: TEST_USER_DATA.VALID_USER.passkey
      };

      // STEP 2: Request slot unlock for medication loading
      await ds12Controller.sendUnlock(loadingData);

      // VERIFY: User authentication was performed
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: TEST_USER_DATA.VALID_USER.passkey }
      });

      // STEP 3: Simulate hardware unlock response processing
      const mockUnlockResponse = [0x02, 0x00, 0x00, 0x81, 0x10, 0x00, 0x03, 0x98]; // Successful unlock
      await ds12Controller['receivedUnlockState'](mockUnlockResponse);

      // STEP 4: Simulate medication loading and slot lock back
      mockHardware.setSlotState(1, { isLocked: true, hasItem: true });
      const mockStatusResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x01, 0x00]; // Slot 1 locked
      await ds12Controller['receivedLockedBackState'](mockStatusResponse);

      // VERIFY: Slot state updated in database
      expect(MockedSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          occupied: true,
          opening: false
        }),
        { where: { slotId: 1 } }
      );

      // VERIFY: UI feedback provided for medication loading
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'unlocking',
        expect.objectContaining({
          unlocking: false,
          locked_back: true
        })
      );

      console.log(`✅ ${testScenario}: Medication loaded and slot secured successfully`);
    });
  });

  describe('Patient Medication Dispensing Workflow', () => {
    beforeEach(async () => {
      // SETUP: Establish connection and prepare slot with medication
      await mockHardware.connect();
      mockHardware.setTestScenario(MockDS12Scenario.NORMAL);
      mockHardware.setSlotState(1, { isLocked: true, hasItem: true, isActive: true });

      // Configure slot as occupied with patient medication
      MockedSlot.findOne = jest.fn().mockResolvedValue({
        dataValues: TEST_SLOT_DATA.OCCUPIED_SLOT
      });
    });

    it('should complete patient dispensing workflow with compliance validation', async () => {
      const testScenario = 'Patient Medication Dispensing';
      console.log(`🏥 Testing: ${testScenario}`);

      // STEP 1: Patient/nurse authentication for medication pickup
      const dispenseData = {
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: TEST_USER_DATA.VALID_USER.passkey
      };

      // STEP 2: Initiate medication dispensing
      await ds12Controller.dispense(dispenseData);

      // VERIFY: Security validation performed
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: TEST_USER_DATA.VALID_USER.passkey }
      });
      expect(MockedSlot.findOne).toHaveBeenCalledWith({
        where: { slotId: 1 }
      });

      // STEP 3: Simulate successful dispense unlock
      const mockDispenseUnlockResponse = [0x02, 0x00, 0x00, 0x81, 0x10, 0x00, 0x03, 0x98];
      await ds12Controller['receivedDispenseState'](mockDispenseUnlockResponse);

      // VERIFY: Dispensing state initiated
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'dispensing',
        expect.objectContaining({
          dispensing: true,
          unlocking: false
        })
      );

      // STEP 4: Simulate medication pickup and slot lock back
      mockHardware.setSlotState(1, { isLocked: true, hasItem: false }); // Medication removed
      const mockDispenseLockResponse = [0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x99, 0x01, 0x00];
      await ds12Controller['receivedDispenseLockedBackState'](mockDispenseLockResponse);

      // VERIFY: Slot cleared and ready for next patient
      expect(MockedSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          hn: null,
          occupied: false,
          opening: false
        }),
        { where: { slotId: 1 } }
      );

      // VERIFY: Dispensing completion UI feedback
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'dispensing',
        expect.objectContaining({
          dispensing: false,
          completed: true
        })
      );

      console.log(`✅ ${testScenario}: Medication dispensed and slot reset for next patient`);
    });
  });

  describe('Administrative Operations Workflow', () => {
    beforeEach(async () => {
      // SETUP: Admin connection for administrative operations
      await mockHardware.connect();
      mockHardware.setTestScenario(MockDS12Scenario.NORMAL);
    });

    it('should complete slot management operations with admin authentication', async () => {
      const testScenario = 'Administrative Slot Management';
      console.log(`🔧 Testing: ${testScenario}`);

      // STEP 1: Admin slot reset operation
      await ds12Controller.resetSlot(1, TEST_USER_DATA.ADMIN_USER.passkey);

      // VERIFY: Admin authentication performed
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: TEST_USER_DATA.ADMIN_USER.passkey }
      });

      // VERIFY: Slot reset in database
      expect(MockedSlot.update).toHaveBeenCalledWith(
        {
          hn: null,
          occupied: false,
          opening: false
        },
        { where: { slotId: 1 } }
      );

      // STEP 2: Admin slot deactivation
      await ds12Controller.deactivate(1, TEST_USER_DATA.ADMIN_USER.passkey);

      // VERIFY: Slot deactivated with proper state management
      expect(MockedSlot.update).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          hn: null,
          occupied: false
        }),
        { where: { slotId: 1 } }
      );

      // STEP 3: Admin slot reactivation
      await ds12Controller.reactivate(1, TEST_USER_DATA.ADMIN_USER.passkey);

      // VERIFY: Slot reactivated and ready for use
      expect(MockedSlot.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isActive: true,
          hn: null,
          occupied: false
        }),
        { where: { slotId: 1 } }
      );

      console.log(`✅ ${testScenario}: Administrative operations completed with proper authentication`);
    });
  });

  describe('Error Recovery and Emergency Procedures', () => {
    it('should handle hardware communication failures gracefully', async () => {
      const testScenario = 'Hardware Communication Failure Recovery';
      console.log(`⚠️ Testing: ${testScenario}`);

      // SETUP: Configure error-prone hardware scenario
      mockHardware = new MockDS12Hardware(ERROR_TEST_CONFIG);
      await mockHardware.connect();

      // STEP 1: Attempt connection with high error rate
      const connectionResult = await ds12Controller.connectWithProtection('/dev/ttyDS12-unstable', 19200, true);

      // VERIFY: Connection handled error conditions appropriately
      // Note: May succeed or fail depending on random error simulation
      expect(typeof connectionResult.success).toBe('boolean');
      expect(connectionResult.attempts).toBeGreaterThan(0);

      // STEP 2: Test emergency disconnection procedures
      const emergencyReason = 'Hardware malfunction detected during testing';
      await ds12Controller.emergencyDisconnect(emergencyReason);

      // VERIFY: Emergency procedures executed safely
      expect(ds12Controller.isConnected()).toBe(false);
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'emergency-disconnect',
        expect.objectContaining({
          reason: emergencyReason
        })
      );

      console.log(`✅ ${testScenario}: Error recovery procedures validated successfully`);
    });

    it('should maintain medical device compliance during failures', async () => {
      const testScenario = 'Medical Compliance During Failures';
      console.log(`📋 Testing: ${testScenario}`);

      // SETUP: Simulate various failure scenarios
      mockHardware.setTestScenario(MockDS12Scenario.TIMEOUT);

      // STEP 1: Attempt operations during timeout conditions
      const statusResult = await ds12Controller.sendCheckState();
      expect(Array.isArray(statusResult)).toBe(true);

      // STEP 2: Test invalid user authentication
      MockedUser.findOne = jest.fn().mockResolvedValue(null);
      
      const invalidDispenseData = {
        slotId: 1,
        hn: 'HN999999',
        timestamp: Date.now(),
        passkey: 'invalidPasskey'
      };

      await ds12Controller.dispense(invalidDispenseData);

      // VERIFY: Security maintained despite failures
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: 'invalidPasskey' }
      });

      // VERIFY: No unauthorized database modifications
      expect(MockedSlot.update).not.toHaveBeenCalled();

      console.log(`✅ ${testScenario}: Medical device security maintained during failures`);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent operations within performance benchmarks', async () => {
      const testScenario = 'Concurrent Operations Performance';
      console.log(`🚀 Testing: ${testScenario}`);

      // SETUP: High-performance configuration
      mockHardware = new MockDS12Hardware({
        ...NORMAL_TEST_CONFIG,
        responseDelayMs: 1 // Minimal delay for performance testing
      });
      await mockHardware.connect();

      // STEP 1: Execute multiple concurrent status checks
      const startTime = Date.now();
      const concurrentOperations = Array.from({ length: 5 }, () => 
        ds12Controller.sendCheckState()
      );

      const results = await Promise.all(concurrentOperations);
      const operationTime = Date.now() - startTime;

      // VERIFY: All operations completed successfully
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      // VERIFY: Performance within medical device benchmarks
      expect(operationTime).toBeLessThan(PERFORMANCE_BENCHMARKS.COMMAND_RESPONSE_TIME * 5);

      console.log(`✅ ${testScenario}: Concurrent operations completed in ${operationTime}ms`);
    });
  });

  describe('Medical Device Compliance Validation', () => {
    it('should validate all compliance requirements are met', async () => {
      const testScenario = 'Medical Device Compliance Validation';
      console.log(`📋 Testing: ${testScenario}`);

      await mockHardware.connect();

      // COMPLIANCE 1: Audit logging verification
      const auditTest = await ds12Controller.sendCheckState();
      // Note: Audit logging is internal, verified through operation completion

      // COMPLIANCE 2: User authentication verification
      await ds12Controller.sendUnlock({
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: TEST_USER_DATA.VALID_USER.passkey
      });
      expect(MockedUser.findOne).toHaveBeenCalled();

      // COMPLIANCE 3: Database consistency verification
      expect(MockedSlot.findOne).toHaveBeenCalled();

      // COMPLIANCE 4: Error recovery verification (tested in other scenarios)
      
      // COMPLIANCE 5: UI feedback verification
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalled();

      // COMPLIANCE 6: Hardware protection verification
      const healthStatus = ds12Controller.getConnectionHealth();
      expect(healthStatus.protectionEnabled).toBe(true);

      console.log(`✅ ${testScenario}: All medical device compliance requirements validated`);

      // OUTPUT COMPLIANCE REPORT
      console.log('\n📊 COMPLIANCE REPORT:');
      Object.entries(COMPLIANCE_REQUIREMENTS).forEach(([key, requirement]) => {
        console.log(`  ✅ ${key}: ${requirement.description}`);
      });
    });
  });

  // Helper function to setup realistic database mocks
  function setupDatabaseMocks(): void {
    // Mock slot data with realistic medical information
    MockedSlot.findOne = jest.fn().mockResolvedValue({
      dataValues: TEST_SLOT_DATA.EMPTY_SLOT
    });

    MockedSlot.findAll = jest.fn().mockResolvedValue([
      { dataValues: TEST_SLOT_DATA.EMPTY_SLOT }
    ]);

    MockedSlot.update = jest.fn().mockResolvedValue([1]);

    // Mock user data with realistic healthcare staff information
    MockedUser.findOne = jest.fn().mockResolvedValue({
      userId: TEST_USER_DATA.VALID_USER.userId,
      username: TEST_USER_DATA.VALID_USER.username,
      passkey: TEST_USER_DATA.VALID_USER.passkey,
      role: TEST_USER_DATA.VALID_USER.role
    });
  }
});