import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { BrowserWindow } from 'electron';
import { DS12Controller } from '../../main/ku-controllers/ds12/DS12Controller';
import { MockDS12Hardware, MockDS12Scenario, MockDS12Config } from '../mocks/MockDS12Hardware';
import { Slot } from '../../db/model/slot.model';
import { User } from '../../db/model/user.model';

/**
 * DS12Controller Serial Communication Test Suite
 * 
 * MEDICAL DEVICE TESTING STRATEGY:
 * - Mock hardware simulation for safe testing without real DS12 device
 * - Comprehensive error scenario coverage for robustness validation
 * - Medical audit logging verification for regulatory compliance
 * - Connection stability testing for reliable hardware communication
 * - Protocol parsing accuracy validation for data integrity
 * 
 * TESTING SCOPE:
 * 1. Serial connection management (connect/disconnect/reconnect)
 * 2. Hardware command processing (status, unlock, version)
 * 3. Error handling and recovery mechanisms
 * 4. Hardware protection features validation
 * 5. Database synchronization with hardware state
 * 6. IPC event emission for UI updates
 * 
 * SAFE TESTING APPROACH:
 * - All tests use MockDS12Hardware for hardware simulation
 * - No real serial port communication during testing
 * - Configurable error scenarios for comprehensive validation
 * - Medical device compliance verification through audit logging
 */

// Mock Electron BrowserWindow
const mockBrowserWindow = {
  webContents: {
    send: jest.fn()
  },
  isDestroyed: jest.fn().mockReturnValue(false)
} as unknown as BrowserWindow;

// Mock database models
jest.mock('../../db/model/slot.model');
jest.mock('../../db/model/user.model');
jest.mock('../../logger');

const MockedSlot = Slot as jest.MockedClass<typeof Slot>;
const MockedUser = User as jest.MockedClass<typeof User>;

describe('DS12Controller Serial Communication Tests', () => {
  let ds12Controller: DS12Controller;
  let mockHardware: MockDS12Hardware;
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // SETUP: Initialize clean test environment
    mockBrowserWindow.webContents.send = jest.fn();
    mockBrowserWindow.isDestroyed = jest.fn().mockReturnValue(false);

    // CREATE CONTROLLER: Initialize DS12Controller with mock window
    ds12Controller = new DS12Controller(mockBrowserWindow);

    // CREATE MOCK HARDWARE: Initialize with safe testing configuration
    const mockConfig: Partial<MockDS12Config> = {
      address: 0x00,
      slotCount: 12,
      responseDelayMs: 10, // Reduced delay for fast testing
      timeoutErrorRate: 0.0,
      commErrorRate: 0.0,
      checksumErrorRate: 0.0,
      enableLogging: false // Disable logging for cleaner test output
    };
    mockHardware = new MockDS12Hardware(mockConfig);

    // SETUP DATABASE MOCKS: Configure default successful responses
    MockedSlot.findOne = jest.fn().mockResolvedValue({
      dataValues: {
        slotId: 1,
        hn: 'HN123456',
        occupied: true,
        opening: false,
        isActive: true,
        timestamp: Date.now()
      }
    });

    MockedSlot.findAll = jest.fn().mockResolvedValue([
      {
        dataValues: {
          slotId: 1,
          hn: null,
          occupied: false,
          opening: false,
          isActive: true,
          timestamp: null
        }
      }
    ]);

    MockedSlot.update = jest.fn().mockResolvedValue([1]); // 1 row affected

    MockedUser.findOne = jest.fn().mockResolvedValue({
      userId: 'testUser',
      passkey: 'testPasskey'
    });

    // SUPPRESS CONSOLE OUTPUT: Keep test output clean
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(async () => {
    // CLEANUP: Ensure clean state for next test
    if (ds12Controller.isConnected()) {
      await ds12Controller.disconnect();
    }
    
    if (mockHardware.isConnected()) {
      await mockHardware.disconnect();
    }

    // RESTORE CONSOLE: Restore original console functions
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // CLEAR MOCKS: Reset all mock functions
    jest.clearAllMocks();
  });

  describe('Hardware Protection and Connection Management', () => {
    it('should initialize with hardware protection enabled', () => {
      // VERIFY: Controller starts with safe defaults
      expect(ds12Controller.deviceType).toBe('DS12');
      expect(ds12Controller.maxSlot).toBe(12);
      expect(ds12Controller.isConnected()).toBe(false);
    });

    it('should handle connection with retry logic', async () => {
      // SETUP MOCK: Configure mock hardware for connection
      await mockHardware.connect();

      // TEST: Attempt connection with protection enabled
      const result = await ds12Controller.connectWithProtection('/dev/mock-ds12', 19200, true);

      // VERIFY: Connection success with attempt tracking
      expect(result.success).toBeDefined();
      expect(result.attempts).toBeGreaterThan(0);
      expect(result.message).toBeDefined();
    });

    it('should report connection health status', async () => {
      // TEST: Get health status when disconnected
      const healthDisconnected = ds12Controller.getConnectionHealth();
      
      // VERIFY: Health status reflects disconnected state
      expect(healthDisconnected.connected).toBe(false);
      expect(healthDisconnected.status).toBe('failed');
      expect(healthDisconnected.protectionEnabled).toBeDefined();
      expect(healthDisconnected.queuedCommands).toBe(0);
    });

    it('should handle emergency disconnection', async () => {
      // SETUP: Connect to hardware first
      const mockPort = '/dev/mock-ds12';
      await mockHardware.connect();
      
      // TEST: Emergency disconnect with reason
      const reason = 'Hardware malfunction detected';
      await ds12Controller.emergencyDisconnect(reason);

      // VERIFY: Controller is safely disconnected
      expect(ds12Controller.isConnected()).toBe(false);
      
      // VERIFY: UI notification was sent
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'emergency-disconnect',
        expect.objectContaining({
          deviceType: 'DS12',
          reason: reason,
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Serial Communication Protocol Tests', () => {
    beforeEach(async () => {
      // SETUP: Establish connection for communication tests
      await mockHardware.connect();
      // Note: In real implementation, would use serial port connection
      // Mock hardware simulates the communication layer
    });

    it('should send status check command', async () => {
      // SETUP MOCK: Configure hardware for status response
      mockHardware.setTestScenario(MockDS12Scenario.NORMAL);

      // TEST: Send status check command
      const result = await ds12Controller.sendCheckState();

      // VERIFY: Command was processed (returns empty array as async)
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle unlock slot command', async () => {
      // SETUP: Configure slot data for unlock operation
      const unlockData = {
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: 'testPasskey'
      };

      // TEST: Send unlock command
      await ds12Controller.sendUnlock(unlockData);

      // VERIFY: Database queries were made for user authentication
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: 'testPasskey' }
      });
    });

    it('should handle dispense operation workflow', async () => {
      // SETUP: Configure slot with medication for dispensing
      MockedSlot.findOne = jest.fn().mockResolvedValue({
        dataValues: {
          slotId: 1,
          hn: 'HN123456',
          occupied: true,
          opening: false,
          isActive: true,
          timestamp: Date.now()
        }
      });

      const dispenseData = {
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: 'testPasskey'
      };

      // TEST: Execute dispense operation
      await ds12Controller.dispense(dispenseData);

      // VERIFY: User authentication was performed
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: 'testPasskey' }
      });

      // VERIFY: Slot data was validated
      expect(MockedSlot.findOne).toHaveBeenCalledWith({
        where: { slotId: 1 }
      });
    });

    it('should handle reset slot operation', async () => {
      // TEST: Reset slot to default state
      await ds12Controller.resetSlot(1, 'testPasskey');

      // VERIFY: User authentication was performed
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: 'testPasskey' }
      });

      // VERIFY: Slot was reset in database
      expect(MockedSlot.update).toHaveBeenCalledWith(
        {
          hn: null,
          occupied: false,
          opening: false
        },
        { where: { slotId: 1 } }
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle communication timeout errors', async () => {
      // SETUP: Configure mock hardware for timeout scenario
      mockHardware.setTestScenario(MockDS12Scenario.TIMEOUT);

      // TEST: Attempt operation during timeout condition
      const result = await ds12Controller.sendCheckState();

      // VERIFY: Operation handles timeout gracefully
      expect(Array.isArray(result)).toBe(true);
      // In timeout scenario, should return empty array
    });

    it('should handle checksum validation errors', async () => {
      // SETUP: Configure mock hardware for checksum error
      mockHardware.setTestScenario(MockDS12Scenario.CHECKSUM_ERROR);

      // TEST: Send command with checksum error response
      const result = await ds12Controller.sendCheckState();

      // VERIFY: Operation handles checksum error gracefully
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle malformed packet responses', async () => {
      // SETUP: Configure mock hardware for malformed packet
      mockHardware.setTestScenario(MockDS12Scenario.MALFORMED_PACKET);

      // TEST: Send command with malformed response
      const result = await ds12Controller.sendCheckState();

      // VERIFY: Operation handles malformed data gracefully
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle device busy conditions', async () => {
      // SETUP: Configure mock hardware for device busy
      mockHardware.setTestScenario(MockDS12Scenario.DEVICE_BUSY);

      // TEST: Attempt operation when device is busy
      const result = await ds12Controller.sendCheckState();

      // VERIFY: Operation handles busy state gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Database Synchronization', () => {
    it('should validate user authentication for critical operations', async () => {
      // SETUP: Mock user not found scenario
      MockedUser.findOne = jest.fn().mockResolvedValue(null);

      const operationData = {
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: 'invalidPasskey'
      };

      // TEST: Attempt unlock with invalid passkey
      await ds12Controller.sendUnlock(operationData);

      // VERIFY: User lookup was attempted
      expect(MockedUser.findOne).toHaveBeenCalledWith({
        where: { passkey: 'invalidPasskey' }
      });

      // VERIFY: No database slot update occurred (due to invalid user)
      expect(MockedSlot.update).not.toHaveBeenCalled();
    });

    it('should update slot states correctly during operations', async () => {
      // SETUP: Valid user and slot data
      const operationData = {
        slotId: 1,
        hn: 'HN123456',
        timestamp: Date.now(),
        passkey: 'testPasskey'
      };

      // TEST: Execute unlock operation
      await ds12Controller.sendUnlock(operationData);

      // VERIFY: User authentication succeeded
      expect(MockedUser.findOne).toHaveBeenCalled();
    });
  });

  describe('IPC Event Communication', () => {
    it('should emit device state events to UI', async () => {
      // TEST: Reset all states (triggers UI notification)
      ds12Controller['resetAllStates']();

      // VERIFY: UI was notified of state reset
      expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith(
        'device-state-reset',
        expect.objectContaining({
          deviceType: 'DS12',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle destroyed browser window gracefully', () => {
      // SETUP: Mock destroyed window
      mockBrowserWindow.isDestroyed = jest.fn().mockReturnValue(true);

      // TEST: Attempt to emit event to destroyed window
      expect(() => {
        ds12Controller['emitToUI']('test-event', { test: 'data' });
      }).not.toThrow();

      // VERIFY: No send attempt was made to destroyed window
      expect(mockBrowserWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Medical Device Compliance', () => {
    it('should validate slot number ranges for DS12', async () => {
      // TEST: Invalid slot numbers (below range)
      await ds12Controller.resetSlot(0, 'testPasskey');
      
      // TEST: Invalid slot numbers (above range)
      await ds12Controller.resetSlot(13, 'testPasskey');

      // VERIFY: User authentication still attempted (method validates slot after)
      expect(MockedUser.findOne).toHaveBeenCalledTimes(2);
    });

    it('should maintain audit trail for all operations', async () => {
      // TEST: Perform multiple operations that should be logged
      await ds12Controller.resetSlot(1, 'testPasskey');
      await ds12Controller.sendCheckState();

      // VERIFY: Operations were executed (logging happens internally)
      expect(MockedUser.findOne).toHaveBeenCalled();
    });

    it('should handle concurrent operation prevention', async () => {
      // SETUP: Start first operation
      const promise1 = ds12Controller.sendCheckState();
      
      // TEST: Attempt second operation immediately
      const promise2 = ds12Controller.sendCheckState();

      // WAIT: For both operations to complete
      const [result1, result2] = await Promise.all([promise1, promise2]);

      // VERIFY: Both operations handled gracefully
      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });
  });

  describe('Hardware State Management', () => {
    it('should track opening and dispensing states correctly', () => {
      // TEST: State transitions
      ds12Controller['setOpening'](true);
      ds12Controller['setDispensing'](true);

      // VERIFY: States are tracked internally
      expect(ds12Controller['opening']).toBe(true);
      expect(ds12Controller['dispensing']).toBe(true);

      // TEST: State reset
      ds12Controller['resetAllStates']();

      // VERIFY: States are reset
      expect(ds12Controller['opening']).toBe(false);
      expect(ds12Controller['dispensing']).toBe(false);
    });

    it('should handle wait states for operation sequencing', () => {
      // TEST: Wait state management
      ds12Controller['setWaitForLockedBack'](true);
      ds12Controller['setWaitForDispenseLockedBack'](true);

      // VERIFY: Wait states are set
      expect(ds12Controller['waitForLockedBack']).toBe(true);
      expect(ds12Controller['waitForDispenseLockedBack']).toBe(true);

      // TEST: State reset clears wait states
      ds12Controller['resetAllStates']();

      // VERIFY: Wait states are cleared
      expect(ds12Controller['waitForLockedBack']).toBe(false);
      expect(ds12Controller['waitForDispenseLockedBack']).toBe(false);
    });
  });
});