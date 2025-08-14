# RegEx and Bitwise Operations - Learning Guide

**Date**: 2025-01-12  
**Context**: Smart Medication Cart Protocol Development  
**Purpose**: Documentation of RegEx patterns and Bitwise operations concepts learned during BinaryUtils.ts implementation

---

## 📚 RegEx Patterns Learned

### Pattern 1: Hexadecimal Validation
```javascript
const hexPattern = /^[0-9a-f]+$/;
```

**Breakdown**:
- `^` - Start of string anchor (ensures pattern matches from beginning)
- `[0-9a-f]` - Character class matching:
  - `0-9` - Any digit from 0 to 9
  - `a-f` - Any lowercase letter from a to f
- `+` - One or more occurrences (at least 1 character required)
- `$` - End of string anchor (ensures pattern matches to end)

**Usage**: Validates that a string contains only valid hexadecimal characters
**Example Matches**: `"ff"`, `"123abc"`, `"0"`, `"deadbeef"`
**Example Non-matches**: `"GG"`, `"xyz"`, `""` (empty), `"0x123"`

### Pattern 2: Binary String Validation
```javascript
const binaryPattern = /^[01]+$/;
```

**Breakdown**:
- `^` - Start of string anchor
- `[01]` - Character class matching only:
  - `0` - The digit zero
  - `1` - The digit one
- `+` - One or more occurrences
- `$` - End of string anchor

**Usage**: Validates that a string contains only binary digits (0 and 1)
**Example Matches**: `"1010"`, `"0"`, `"1"`, `"11111111"`
**Example Non-matches**: `"102"`, `"abc"`, `""` (empty), `"0b1010"`

---

## 🔢 Bitwise Operations Concepts

### 1. XOR Operation (^) for Checksum
```javascript
let checksum = 0;
for (const byte of data) {
    checksum ^= byte; // XOR each byte with running checksum
}
```

**How XOR Works**:
- `0 ^ 0 = 0`
- `0 ^ 1 = 1`
- `1 ^ 0 = 1`
- `1 ^ 1 = 0`

**Visual Example**:
```
Data bytes: [0x45, 0x23, 0x67]

Step 1: checksum = 0 = 00000000 (binary)
Step 2: checksum ^= 0x45 = 01000101 (binary)
        Result = 01000101

Step 3: checksum ^= 0x23 = 00100011 (binary)
        01000101 ^ 00100011 = 01100110
        Result = 01100110 (0x66)

Step 4: checksum ^= 0x67 = 01100111 (binary)  
        01100110 ^ 01100111 = 00000001
        Final checksum = 00000001 (0x01)
```

**Why XOR for Checksums**:
- Self-inverting: `A ^ B ^ B = A`
- Order independent: `A ^ B ^ C = C ^ A ^ B`
- Error detection: Single bit flip changes checksum
- Simple to compute in hardware/software

### 2. Bit Shifting (<<) for Bit Masking
```javascript
const bitMask = 1 << bitPosition;
```

**How Left Shift Works**:
- `1 << 0 = 0b00000001` (decimal 1)
- `1 << 1 = 0b00000010` (decimal 2)
- `1 << 2 = 0b00000100` (decimal 4)
- `1 << 3 = 0b00001000` (decimal 8)

**Visual Example for Slot Position 3**:
```
Original: 1 = 00000001
Shift left 3 positions: 1 << 3
Result: 00001000 = 8 (decimal)
```

### 3. Bitwise AND (&) for Bit Testing
```javascript
const isSlotUnlocked = (dataByte & bitMask) !== 0;
```

**How AND Operation Works**:
- `0 & 0 = 0`
- `0 & 1 = 0`
- `1 & 0 = 0`
- `1 & 1 = 1`

**Practical Example - Testing Slot 3 State**:
```
dataByte = 0xB5 = 10110101 (binary)
bitMask = 1 << 3 = 00001000 (binary)

AND operation:
  10110101  (dataByte)
& 00001000  (bitMask)
  --------
  00001000  (result = 8, which is !== 0)

Therefore: Slot 3 is UNLOCKED (bit is 1)
```

**Counter Example - Testing Slot 1 State**:
```
dataByte = 0xB5 = 10110101 (binary)
bitMask = 1 << 1 = 00000010 (binary)

AND operation:
  10110101  (dataByte)
& 00000010  (bitMask)
  --------
  00000000  (result = 0)

Therefore: Slot 1 is LOCKED (bit is 0)
```

---

## 🏥 Medical Device Application Context

### DS12 Protocol Slot State Extraction
```javascript
// DS12: 12 slots across 2 bytes
// Byte 1: Slots 1-8 (8 bits)
// Byte 2: Slots 9-12 (4 bits used, 4 bits unused)

function extractSlotStates(dataByte, startSlot) {
    const slotStates = [];
    
    for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
        const bitMask = 1 << bitPosition;        // Create mask for current bit
        const isSlotUnlocked = (dataByte & bitMask) !== 0;  // Test bit
        slotStates.push(isSlotUnlocked);
    }
    
    return slotStates;
}
```

### DS16 Protocol Slot State Extraction
```javascript
// DS16: 16 slots across 2 bytes
// Byte 1: Slots 1-8 (8 bits)
// Byte 2: Slots 9-16 (8 bits)
// All bits are used for slot states
```

---

## 🧮 parseInt() Base Parameter Explanation

### parseInt(bit, 10) in Context
```javascript
const bitArray = binary.split("").map((bit) => parseInt(bit, 10));
```

**What the '10' means**:
- `10` = Base 10 (decimal number system)
- NOT array length or position
- Tells JavaScript to interpret the string as decimal number

**Base Examples**:
```javascript
parseInt("10", 10)  // Decimal: 10
parseInt("10", 2)   // Binary: 2 (binary 10 = decimal 2)
parseInt("10", 16)  // Hexadecimal: 16 (hex 10 = decimal 16)
parseInt("A", 16)   // Hexadecimal: 10 (hex A = decimal 10)
```

**Why Base 10 for Binary Bits**:
- Input: `"1"` or `"0"` (string characters)
- Output: `1` or `0` (numeric values)
- Base 10 converts string digits to numbers correctly

---

## 🎯 Key Takeaways for Protocol Development

### 1. **Data Validation Patterns**
- Use RegEx for input format validation
- Always anchor patterns with `^` and `$`
- Character classes `[0-9a-f]` more efficient than alternatives

### 2. **Bit Manipulation Strategies**
- XOR for checksum calculation (order independent)
- Left shift to create bit masks for testing
- AND operation to test specific bits
- Right shift could be used for extracting bit ranges

### 3. **Error-Safe Implementation**
- Validate inputs before bit operations
- Check array bounds before accessing
- Use consistent return types (BinaryOperationResult<T>)
- Handle edge cases (empty arrays, invalid bytes)

### 4. **Medical Device Compliance**
- All operations return structured results
- Comprehensive error messages for debugging
- No exceptions thrown in production paths
- Clear audit trail of all operations

---

## 🚀 Next Learning Objectives

1. **Advanced BitWise Operations**
   - Right shift (`>>`) for bit range extraction
   - OR (`|`) for bit setting operations
   - NOT (`~`) for bit inversion

2. **Protocol Parser Patterns**
   - State machine bit parsing
   - Multi-byte data reconstruction
   - Endianness handling

3. **Hardware Communication**
   - Serial data framing
   - Timeout and retry mechanisms
   - Error recovery strategies

---

**End of Learning Documentation**  
*Reference this guide when implementing protocol parsers and debugging bit operations*