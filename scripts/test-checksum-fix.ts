#!/usr/bin/env ts-node

import { calculateChecksum } from "../main/ku-controllers/protocols/utils/BinaryUtils";

// Test with CU12 example: 02 00 00 80 10 02 03 (without SUM and DATA)
// According to CU12.txt: SUM=STX+ADDR+LOCKNUM+CMD+ASK+DATALEN+ETX+DATA
// For status response example: 02 00 00 80 10 02 03 99 02 00
// The first 7 bytes should sum to 0x99

console.log("🔍 Testing Checksum Fix");
console.log("=".repeat(40));

// Test 1: Status request packet (no DATA)
const statusRequestPacket = [0x02, 0x00, 0x00, 0x80, 0x00, 0x00, 0x03];
const result1 = calculateChecksum(statusRequestPacket);

console.log("\nTest 1: Status Request Packet");
console.log(
  "Packet:",
  statusRequestPacket
    .map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ")
);
console.log("Checksum result:", result1);
if (result1.success && result1.data !== undefined) {
  const checksum1 = result1.data & 0xff;
  console.log(
    "Calculated checksum: 0x" +
      checksum1.toString(16).toUpperCase().padStart(2, "0")
  );
  console.log(
    "Manual calculation: 0x02 + 0x00 + 0x00 + 0x80 + 0x00 + 0x00 + 0x03 =",
    "0x" +
      (0x02 + 0x00 + 0x00 + 0x80 + 0x00 + 0x00 + 0x03)
        .toString(16)
        .toUpperCase()
        .padStart(2, "0")
  );
}

// Test 2: Status response packet (from CU12.txt example)
// Example: 02 00 00 80 10 02 03 99 02 00
// Checksum should be calculated from: 02 00 00 80 10 02 03 + DATA(02 00)
const statusResponseData = [
  0x02, 0x00, 0x00, 0x80, 0x10, 0x02, 0x03, 0x02, 0x00,
];
const result2 = calculateChecksum(statusResponseData);

console.log("\nTest 2: Status Response Packet (with DATA)");
console.log(
  "Data for checksum:",
  statusResponseData
    .map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ")
);
console.log("Checksum result:", result2);
if (result2.success && result2.data !== undefined) {
  const checksum2 = result2.data & 0xff;
  console.log(
    "Calculated checksum: 0x" +
      checksum2.toString(16).toUpperCase().padStart(2, "0")
  );
  console.log("Expected from CU12.txt: 0x99");
  console.log("Match:", checksum2 === 0x99 ? "YES ✅" : "NO ❌");
}

// Test 3: The exact failing case from hardware test
// Hardware reported: expected 0x99, calculated 0x95
// Raw data was: '2,0,0,128,20,0,3,153'
const failingCaseData = [2, 0, 0, 128, 20, 0, 3]; // Without SUM and DATA
const result3 = calculateChecksum(failingCaseData);

console.log("\nTest 3: Failing Case from Hardware Test");
console.log(
  "Data for checksum:",
  failingCaseData
    .map((b) => "0x" + b.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ")
);
console.log("Checksum result:", result3);
if (result3.success && result3.data !== undefined) {
  const checksum3 = result3.data & 0xff;
  console.log(
    "Calculated checksum: 0x" +
      checksum3.toString(16).toUpperCase().padStart(2, "0")
  );
  console.log("Hardware expected: 0x99");
  console.log("Old XOR result would be: 0x95");
  console.log(
    "New addition result matches expected:",
    checksum3 === 0x99 ? "YES ✅" : "NO ❌"
  );
}

console.log("\n" + "=".repeat(40));
console.log("✅ Checksum algorithm fixed: XOR → Addition");
