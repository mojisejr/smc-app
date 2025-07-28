// CU12 Protocol Debug Script
const fs = require('fs');

// Test data from CU12.md documentation
const expectedResponse = "02000080100203990200";
const responseBuffer = Buffer.from(expectedResponse, 'hex');

console.log('🔍 CU12 Protocol Debug Analysis\n');

console.log('📋 Expected Response Analysis:');
console.log(`Raw: ${expectedResponse}`);
console.log(`Buffer: ${responseBuffer.toString('hex')}`);
console.log(`Length: ${responseBuffer.length} bytes\n`);

console.log('📊 Packet Structure:');
console.log(`STX (byte 0): 0x${responseBuffer[0].toString(16).padStart(2, '0')} (should be 0x02)`);
console.log(`ADDR (byte 1): 0x${responseBuffer[1].toString(16).padStart(2, '0')}`);
console.log(`LOCKNUM (byte 2): 0x${responseBuffer[2].toString(16).padStart(2, '0')}`);
console.log(`CMD (byte 3): 0x${responseBuffer[3].toString(16).padStart(2, '0')} (GET_STATUS = 0x80)`);
console.log(`ASK (byte 4): 0x${responseBuffer[4].toString(16).padStart(2, '0')} (SUCCESS = 0x10)`);
console.log(`DATALEN (byte 5): 0x${responseBuffer[5].toString(16).padStart(2, '0')} (${responseBuffer[5]} bytes)`);
console.log(`ETX (byte 6): 0x${responseBuffer[6].toString(16).padStart(2, '0')} (should be 0x03)`);
console.log(`SUM (byte 7): 0x${responseBuffer[7].toString(16).padStart(2, '0')} (checksum)`);

const dataLen = responseBuffer[5];
if (dataLen > 0 && responseBuffer.length > 8) {
  const dataBytes = responseBuffer.subarray(8, 8 + dataLen);
  console.log(`DATA (bytes 8-${7+dataLen}): ${dataBytes.toString('hex')} (hook status)`);
}
console.log();

// Test checksum calculation
console.log('🧮 Checksum Validation:');
const headerBytes = responseBuffer.subarray(0, 7); // STX to ETX
console.log(`Header bytes: ${headerBytes.toString('hex')}`);

if (dataLen > 0) {
  const dataBytes = responseBuffer.subarray(8, 8 + dataLen);
  const checksumData = Buffer.concat([headerBytes, dataBytes]);
  console.log(`Data bytes: ${dataBytes.toString('hex')}`);
  console.log(`Checksum data: ${checksumData.toString('hex')}`);
  
  let sum = 0;
  for (let i = 0; i < checksumData.length; i++) {
    sum += checksumData[i];
    console.log(`  + 0x${checksumData[i].toString(16).padStart(2, '0')} = 0x${sum.toString(16)}`);
  }
  const calculatedChecksum = sum & 0xFF;
  const expectedChecksum = responseBuffer[7];
  
  console.log(`Calculated checksum: 0x${calculatedChecksum.toString(16).padStart(2, '0')}`);
  console.log(`Expected checksum: 0x${expectedChecksum.toString(16).padStart(2, '0')}`);
  console.log(`Checksum valid: ${calculatedChecksum === expectedChecksum ? '✅' : '❌'}`);
} else {
  let sum = 0;
  for (let i = 0; i < headerBytes.length; i++) {
    sum += headerBytes[i];
  }
  const calculatedChecksum = sum & 0xFF;
  const expectedChecksum = responseBuffer[7];
  
  console.log(`Calculated checksum: 0x${calculatedChecksum.toString(16).padStart(2, '0')}`);
  console.log(`Expected checksum: 0x${expectedChecksum.toString(16).padStart(2, '0')}`);
  console.log(`Checksum valid: ${calculatedChecksum === expectedChecksum ? '✅' : '❌'}`);
}

console.log();

// Validate response codes
console.log('🔍 Response Code Validation:');
const askField = responseBuffer[4];
const validResponseCodes = [0x10, 0x11, 0x12, 0x13, 0x14, 0x00];
console.log(`ASK field: 0x${askField.toString(16).padStart(2, '0')}`);
console.log(`Valid response codes: ${validResponseCodes.map(c => '0x' + c.toString(16).padStart(2, '0')).join(', ')}`);
console.log(`ASK field valid: ${validResponseCodes.includes(askField) ? '✅' : '❌'}`);

console.log();

// Parse slot status
console.log('🎰 Slot Status Parsing:');
if (dataLen >= 2) {
  const statusBytes = responseBuffer.subarray(8, 10);
  console.log(`Status bytes: ${statusBytes.toString('hex')}`);
  console.log(`Byte 0: 0b${statusBytes[0].toString(2).padStart(8, '0')} (0x${statusBytes[0].toString(16).padStart(2, '0')})`);
  console.log(`Byte 1: 0b${statusBytes[1].toString(2).padStart(8, '0')} (0x${statusBytes[1].toString(16).padStart(2, '0')})`);
  
  console.log('Slot Status:');
  for (let slotId = 1; slotId <= 12; slotId++) {
    const byteIndex = Math.floor((slotId - 1) / 8);
    const bitIndex = (slotId - 1) % 8;
    
    if (byteIndex < statusBytes.length) {
      const isLocked = (statusBytes[byteIndex] & (1 << bitIndex)) !== 0;
      console.log(`  Slot ${slotId}: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
    }
  }
}

console.log('\n🎯 Diagnosis:');
console.log('Based on CU12.md documentation, the expected response format is:');
console.log('02 00 00 80 10 02 03 99 02 00');
console.log('│  │  │  │  │  │  │  │  └─ DATA (hook status)');
console.log('│  │  │  │  │  │  │  └─ SUM (checksum)');
console.log('│  │  │  │  │  │  └─ ETX (0x03)');
console.log('│  │  │  │  │  └─ DATALEN (2 bytes)');
console.log('│  │  │  │  └─ ASK (0x10 = SUCCESS)');
console.log('│  │  │  └─ CMD (0x80 = GET_STATUS)');
console.log('│  │  └─ LOCKNUM (0x00)');
console.log('│  └─ ADDR (0x00)');
console.log('└─ STX (0x02)');

console.log('\nIf validation is failing, check:');
console.log('1. Checksum calculation (should include header + data)');
console.log('2. Response code validation (0x10 should be valid)');
console.log('3. Packet structure validation (STX/ETX/length)');