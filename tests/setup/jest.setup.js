/**
 * Jest Setup Configuration for SMC DS12/DS16 Testing
 * 
 * This file configures the Jest testing environment for medical device testing,
 * including mock setups, timeout configurations, and medical compliance requirements.
 */

// Global test timeout for medical device operations
jest.setTimeout(30000);

// Mock Electron modules that are not available in Node.js test environment
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    webContents: {
      send: jest.fn()
    },
    isDestroyed: jest.fn().mockReturnValue(false)
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn()
  },
  app: {
    getPath: jest.fn().mockReturnValue('/tmp/test-data')
  }
}));

// NOTE: Serial Port mocks removed as we've migrated to ESP32 HTTP communication
// ESP32 sensor communication now uses HTTP fetch API instead of Serial Port

// Mock SQLite database for testing
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn((sql, params, callback) => {
      if (callback) callback();
    }),
    get: jest.fn((sql, params, callback) => {
      if (callback) callback(null, { id: 1, name: 'test' });
    }),
    all: jest.fn((sql, params, callback) => {
      if (callback) callback(null, []);
    }),
    close: jest.fn((callback) => {
      if (callback) callback();
    })
  }))
}));

// Mock Sequelize for database testing
jest.mock('sequelize', () => {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };
  
  const mockSequelize = {
    transaction: jest.fn().mockResolvedValue(mockTransaction),
    authenticate: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined)
  };
  
  const Sequelize = jest.fn().mockImplementation(() => mockSequelize);
  
  // Mock Sequelize data types
  Sequelize.STRING = 'STRING';
  Sequelize.INTEGER = 'INTEGER';
  Sequelize.BOOLEAN = 'BOOLEAN';
  Sequelize.DATE = 'DATE';
  Sequelize.TEXT = 'TEXT';
  
  return {
    Sequelize,
    DataTypes: {
      STRING: 'STRING',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      DATE: 'DATE',
      TEXT: 'TEXT'
    }
  };
});

// Global test utilities for medical device testing
global.testUtils = {
  // Create mock DS12 hardware response
  createMockDS12Response: (slotStates = []) => {
    const response = [0x02, 0x00, 0x80, 0x00, 0x00, 0x02, 0x03];
    
    // Add slot state data (2 bytes for 12 slots)
    const data1 = slotStates.slice(0, 8).reduce((byte, occupied, index) => {
      return occupied ? byte | (1 << index) : byte;
    }, 0);
    
    const data2 = slotStates.slice(8, 12).reduce((byte, occupied, index) => {
      return occupied ? byte | (1 << index) : byte;
    }, 0);
    
    response.push(data1, data2);
    
    // Calculate checksum
    const checksum = response.slice(1, -1).reduce((sum, byte) => sum + byte, 0) & 0xFF;
    response[7] = checksum;
    
    return response;
  },
  
  // Create mock user data for authentication testing
  createMockUser: (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    passkey: 'test123',
    role: 'operator',
    getDataValue: (field) => {
      const data = { id: 1, name: 'Test User', passkey: 'test123', role: 'operator', ...overrides };
      return data[field];
    },
    ...overrides
  }),
  
  // Create mock slot data
  createMockSlot: (slotId = 1, overrides = {}) => ({
    slotId,
    hn: null,
    occupied: false,
    opening: false,
    isActive: true,
    timestamp: null,
    getDataValue: (field) => {
      const data = { slotId, hn: null, occupied: false, opening: false, isActive: true, timestamp: null, ...overrides };
      return data[field];
    },
    ...overrides
  }),
  
  // Medical compliance validation helper
  validateMedicalAuditLog: (logEntry) => {
    const requiredFields = ['userId', 'slotId', 'process', 'timestamp', 'message'];
    return requiredFields.every(field => logEntry.hasOwnProperty(field));
  },
  
  // Timing validation for medical device performance
  validateResponseTime: (duration, maxMs = 100) => {
    return duration <= maxMs;
  }
};

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

global.suppressConsole = () => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
};

global.restoreConsole = () => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
};

// Medical device testing environment validation
beforeAll(() => {
  // Ensure test environment is properly configured for medical device testing
  process.env.NODE_ENV = 'test';
  process.env.MEDICAL_DEVICE_TEST = 'true';
  
  // Create test results directory
  const fs = require('fs');
  const path = require('path');
  const testResultsDir = path.join(process.cwd(), 'test-results');
  
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
});

// Cleanup after all tests
afterAll(() => {
  // Restore console if suppressed
  restoreConsole();
  
  // Clear any remaining timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Per-test cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
  
  // Reset module registry to prevent state leakage
  jest.resetModules();
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
  throw reason;
});

console.log('✅ Jest testing environment configured for SMC DS12/DS16 medical device testing');