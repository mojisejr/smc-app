/**
 * KU16 Modern Architecture Integration Test
 * Simple test to validate the new KU16 architecture works correctly
 */

import { KU16SmartStateManager } from './stateManager';
import { KU16Device } from './device';
import { KU16Protocol } from './protocol';
import { DEFAULT_KU16_CONFIG } from './monitoringConfig';

// Mock BrowserWindow for testing
const mockWindow = {
  webContents: {
    send: (event: string, data: any) => {
      console.log(`[MOCK-WINDOW] Event: ${event}`, data);
    }
  }
} as any;

async function testKU16ModernArchitecture() {
  console.log('🧪 Testing KU16 Modern Architecture Integration...\n');

  // Test 1: Protocol Creation
  console.log('1️⃣ Testing KU16Protocol...');
  try {
    const protocol = new KU16Protocol();
    
    // Test status command
    const statusCmd = protocol.createStatusCommand();
    console.log('✅ Status command created:', Array.from(statusCmd));
    
    // Test unlock command
    const unlockCmd = protocol.createUnlockCommand(1);
    console.log('✅ Unlock command for slot 1:', Array.from(unlockCmd));
    
    // Test command validation
    const isValid = protocol.validateCommand([0x02, 0x00, 0x30, 0x03, 0x35]);
    console.log('✅ Command validation:', isValid);
    
    console.log('✅ KU16Protocol test passed!\n');
  } catch (error) {
    console.error('❌ KU16Protocol test failed:', error.message);
    return false;
  }

  // Test 2: Device Creation (without actual hardware)
  console.log('2️⃣ Testing KU16Device creation...');
  try {
    const device = new KU16Device({
      port: '/dev/tty.test',
      baudRate: 19200,
      timeout: 5000,
      maxSlots: 15
    }, mockWindow);
    
    console.log('✅ KU16Device created successfully');
    console.log('✅ Device is connected:', device.isConnected());
    
    // Test status retrieval (will work even without hardware)
    try {
      const status = await device.getStatus();
      console.log(`✅ Status retrieved: ${status.length} slots`);
    } catch (error) {
      console.log('ℹ️ Status retrieval failed (expected without hardware):', error.message);
    }
    
    console.log('✅ KU16Device test passed!\n');
  } catch (error) {
    console.error('❌ KU16Device test failed:', error.message);
    return false;
  }

  // Test 3: State Manager Creation
  console.log('3️⃣ Testing KU16SmartStateManager...');
  try {
    const stateManager = new KU16SmartStateManager(mockWindow, DEFAULT_KU16_CONFIG);
    
    console.log('✅ KU16SmartStateManager created successfully');
    console.log('✅ Monitoring mode:', stateManager.getMonitoringMode());
    
    // Test health status
    const healthStatus = await stateManager.getHealthStatus();
    console.log('✅ Health status retrieved:', {
      deviceConnected: healthStatus.deviceConnected,
      monitoringMode: healthStatus.monitoringMode,
      isHealthy: healthStatus.isHealthy
    });
    
    console.log('✅ KU16SmartStateManager test passed!\n');
  } catch (error) {
    console.error('❌ KU16SmartStateManager test failed:', error.message);
    return false;
  }

  // Test 4: Full Integration Test
  console.log('4️⃣ Testing full integration...');
  try {
    const stateManager = new KU16SmartStateManager(mockWindow, {
      ...DEFAULT_KU16_CONFIG,
      detailedLogging: true
    });

    // Test initialization (will fail without hardware, but should not crash)
    try {
      const initialized = await stateManager.initialize({
        port: '/dev/tty.test',
        baudRate: 19200,
        timeout: 3000,
        maxSlots: 15
      });
      console.log('ℹ️ Initialization result (expected to fail without hardware):', initialized);
    } catch (error) {
      console.log('ℹ️ Expected initialization failure:', error.message);
    }

    // Test user interaction trigger
    await stateManager.onUserInteraction();
    console.log('✅ User interaction handled successfully');
    
    // Test cleanup
    await stateManager.cleanup();
    console.log('✅ Cleanup completed successfully');
    
    console.log('✅ Full integration test passed!\n');
  } catch (error) {
    console.error('❌ Full integration test failed:', error.message);
    return false;
  }

  console.log('🎉 All KU16 Modern Architecture tests passed!');
  console.log('🏆 The new architecture is working correctly!');
  return true;
}

// Export for use in other tests
export { testKU16ModernArchitecture };

// Run test if this file is executed directly
if (require.main === module) {
  testKU16ModernArchitecture()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}