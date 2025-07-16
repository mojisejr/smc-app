/**
 * CU12 Protocol Test Suite
 *
 * Test cases for CU12 protocol implementation
 */

import {
  buildCommand,
  parseResponse,
  getAskMeaning,
  CU12_COMMANDS,
  ASK_VALUES,
  PROTOCOL_CONSTANTS,
  createGetStatusCommand,
  createUnlockCommand,
  createInitializeCommand,
  createSetUnlockTimeCommand,
  createGetVersionCommand,
} from "./utils/command-parser";

/**
 * Test packet building and parsing
 */
function testPacketBuilding(): void {
  console.log("=== Testing Packet Building ===");

  // Test 1: Basic get status command
  const statusCmd = createGetStatusCommand(0x00);
  console.log("Get Status Command:", statusCmd.toString("hex"));
  console.log("Expected: 02 00 0c 80 00 00 03 91");

  // Test 2: Unlock command for lock 5
  const unlockCmd = createUnlockCommand(0x00, 5);
  console.log("Unlock Command (lock 5):", unlockCmd.toString("hex"));
  console.log("Expected: 02 00 05 81 00 00 03 8b");

  // Test 3: Initialize command
  const initCmd = createInitializeCommand(0x00);
  console.log("Initialize Command:", initCmd.toString("hex"));
  console.log("Expected: 02 00 0c 8e 00 00 03 9f");

  // Test 4: Set unlock time command (550ms = 0x0037)
  const setTimeCmd = createSetUnlockTimeCommand(0x00, 0x0037);
  console.log("Set Unlock Time Command:", setTimeCmd.toString("hex"));
  console.log("Expected: 02 00 0c 82 00 02 03 37 00 c8");

  console.log("\n");
}

/**
 * Test response parsing
 */
function testResponseParsing(): void {
  console.log("=== Testing Response Parsing ===");

  // Test 1: Valid status response
  const statusResponse = Buffer.from([
    0x02, 0x00, 0x0c, 0x80, 0x10, 0x0c, 0x03, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
  ]);
  const parsedStatus = parseResponse(statusResponse);
  console.log("Status Response:", parsedStatus);
  console.log("Valid:", parsedStatus.valid);
  console.log("ASK:", getAskMeaning(parsedStatus.ask));

  // Test 2: Valid unlock response
  const unlockResponse = Buffer.from([
    0x02, 0x00, 0x05, 0x81, 0x10, 0x00, 0x03, 0x9b,
  ]);
  const parsedUnlock = parseResponse(unlockResponse);
  console.log("Unlock Response:", parsedUnlock);
  console.log("Valid:", parsedUnlock.valid);
  console.log("ASK:", getAskMeaning(parsedUnlock.ask));

  // Test 3: Invalid checksum response
  const invalidChecksum = Buffer.from([
    0x02, 0x00, 0x05, 0x81, 0x14, 0x00, 0x03, 0x00,
  ]); // Wrong checksum
  const parsedInvalid = parseResponse(invalidChecksum);
  console.log("Invalid Checksum Response:", parsedInvalid);
  console.log("Valid:", parsedInvalid.valid);
  console.log("Error:", parsedInvalid.error);

  console.log("\n");
}

/**
 * Test ASK value meanings
 */
function testAskValues(): void {
  console.log("=== Testing ASK Values ===");

  console.log("0x10:", getAskMeaning(0x10)); // Success
  console.log("0x11:", getAskMeaning(0x11)); // Failure
  console.log("0x12:", getAskMeaning(0x12)); // Timeout
  console.log("0x13:", getAskMeaning(0x13)); // Unknown command
  console.log("0x14:", getAskMeaning(0x14)); // Checksum error
  console.log("0x00:", getAskMeaning(0x00)); // Default
  console.log("0xFF:", getAskMeaning(0xff)); // Unknown

  console.log("\n");
}

/**
 * Test command validation
 */
function testCommandValidation(): void {
  console.log("=== Testing Command Validation ===");

  try {
    // Test invalid address
    buildCommand(0x20, 0x00, CU12_COMMANDS.GET_STATUS);
    console.log("❌ Should have thrown error for invalid address");
  } catch (error) {
    console.log("✅ Correctly rejected invalid address:", error.message);
  }

  try {
    // Test invalid lock number
    buildCommand(0x00, 0x20, CU12_COMMANDS.UNLOCK);
    console.log("❌ Should have thrown error for invalid lock number");
  } catch (error) {
    console.log("✅ Correctly rejected invalid lock number:", error.message);
  }

  try {
    // Test invalid command
    buildCommand(0x00, 0x00, 0xff);
    console.log("❌ Should have thrown error for invalid command");
  } catch (error) {
    console.log("✅ Correctly rejected invalid command:", error.message);
  }

  try {
    // Test valid command
    buildCommand(0x00, 0x0c, CU12_COMMANDS.GET_STATUS);
    console.log("✅ Valid command accepted");
  } catch (error) {
    console.log("❌ Should have accepted valid command");
  }

  console.log("\n");
}

/**
 * Test checksum calculation
 */
function testChecksumCalculation(): void {
  console.log("=== Testing Checksum Calculation ===");

  // Test 1: Command without data
  const cmd1 = buildCommand(0x00, 0x0c, CU12_COMMANDS.GET_STATUS);
  const expectedChecksum1 =
    (0x02 + 0x00 + 0x0c + 0x80 + 0x00 + 0x00 + 0x03) & 0xff;
  console.log("Command 1 checksum:", cmd1[7], "Expected:", expectedChecksum1);
  console.log("Match:", cmd1[7] === expectedChecksum1 ? "✅" : "❌");

  // Test 2: Command with data
  const cmd2 = buildCommand(
    0x00,
    0x0c,
    CU12_COMMANDS.SET_UNLOCK_TIME,
    Buffer.from([0x37, 0x00])
  );
  const expectedChecksum2 =
    (0x02 + 0x00 + 0x0c + 0x82 + 0x00 + 0x02 + 0x03 + 0x37 + 0x00) & 0xff;
  console.log("Command 2 checksum:", cmd2[9], "Expected:", expectedChecksum2);
  console.log("Match:", cmd2[9] === expectedChecksum2 ? "✅" : "❌");

  console.log("\n");
}

/**
 * Run all tests
 */
function runAllTests(): void {
  console.log("🚀 Starting CU12 Protocol Tests\n");

  testPacketBuilding();
  testResponseParsing();
  testAskValues();
  testCommandValidation();
  testChecksumCalculation();

  console.log("✅ All tests completed");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export {
  testPacketBuilding,
  testResponseParsing,
  testAskValues,
  testCommandValidation,
  testChecksumCalculation,
  runAllTests,
};
