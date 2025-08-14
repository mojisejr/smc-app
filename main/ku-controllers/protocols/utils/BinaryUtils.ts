import { DeviceType } from "../interfaces/ProtocolTypes";

/**
 * จากการเรียนรู้ file นี้ ผมเห็นการ ตรวจสอบ data type และ data integrity ที่เข้มงวด และ ใช้ algorithm ไม่ยากเย็น และไม่มี pattern พิเศษอะไรที่ ซับซ้อน แต่ก็ทำงานได้อย่างมีขั้นตอนและมีประสิทธิภาพ ตาม best practice
 * ผมชอบ BinaryOperationResult<T> มาก ปกติ มองไม่ออกเลยว่าจะเอา  Generic มาใช้ยังไงได้บ้าง ตอนนรี้เริ่มเข้าใจมากขึ้น คุณสามารถสอบผมเพิ่มได้ในส่วนนี้ครับ ผมน่าจะยังอ่อน
 */

export interface BinaryOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function hexToDecimal(hex: string): BinaryOperationResult<number> {
  if (!hex || typeof hex !== "string") {
    return {
      success: false,
      error: "Invalid hex input: must be a non-empty string",
    };
  }

  //ตรงนี้ก็คือ แปลงให้เป็น standard คือเอา 0x อะไรพวกนี้ออกให้เหลือแค่ตัวเลขกับตัวอักษร
  const cleanHex = hex.trim().toLowerCase().replace(/^0x/, "");

  const hexPattern = /^[0-9a-f]+$/; //อธิบายความหมายตรงนี้หน่อยครับ RegEx ส่วนนี้หมายความว่ายังไง

  if (!hexPattern.test(cleanHex)) {
    return {
      success: false,
      error: `Invalid hex characters in : ${hex}`,
    };
  }

  try {
    const decimal = parseInt(cleanHex, 16);
    if (isNaN(decimal)) {
      return {
        success: false,
        error: `Failed to convert hex to decimal: ${hex}`,
      };
    }

    return {
      success: true,
      data: decimal,
    };
  } catch (error) {
    return {
      success: false,
      error: `Hex conversion error: ${error}`,
    };
  }
}

export function decimalToBinary(
  decimal: number,
  padLength: number = 8
): BinaryOperationResult<string> {
  if (typeof decimal !== "number" || isNaN(decimal)) {
    return {
      success: false,
      error: "Invalid decimal input: must be a number",
    };
  }

  if (decimal < 0) {
    return {
      success: false,
      error: "Negative numbers not supported in this context",
    };
  }

  if (typeof padLength !== "number" || padLength < 0) {
    return {
      success: false,
      error: "Invalid padLength: must be a positive number",
    };
  }

  try {
    let binary = decimal.toString(2);
    binary = binary.padStart(padLength, "0");

    return {
      success: true,
      data: binary,
    };
  } catch (error) {
    return {
      success: false,
      error: `Binary conversion error: ${error}`,
    };
  }
}

export function binaryStringToArray(
  binary: string
): BinaryOperationResult<number[]> {
  if (!binary || typeof binary !== "string") {
    return {
      success: false,
      error: "Invalid binary input: must be a non-empty string",
    };
  }

  const binaryPattern = /^[01]+$/; //ASK AI: อธิบายตรงนี้หน่อยครับ ว่าหมายความว่ายังไง ทำไมถึงต้องเป็น pattern นี้ ดูจาก code ด้านล่างก็คือ เชคว่า string มีแค่เลข 0 - 1 หรือเปล่า

  if (!binaryPattern.test(binary)) {
    return {
      success: false,
      error: `Invalid binary string: ${binary} (must contain only 0 and 1)`,
    };
  }

  try {
    const bitArray = binary.split("").map((bit) => parseInt(bit, 10)); //parseInt(bit, 10)  10 ในที่นี้คือ 10 ตำแหน่ง หรือ array.length = 10

    return {
      success: true,
      data: bitArray,
    };
  } catch (error) {
    return {
      success: false,
      error: `Binary array conversion error: ${error}`,
    };
  }
}

export function calculateChecksum(
  data: number[]
): BinaryOperationResult<number> {
  if (!Array.isArray(data)) {
    return {
      success: false,
      error: "Invalid data input: must be an array",
    };
  }

  if (data.length === 0) {
    return {
      success: false,
      error: "Data array cannot be empty",
    };
  }

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (
      typeof byte !== "number" ||
      byte < 0 ||
      byte > 255 ||
      !Number.isInteger(byte)
    ) {
      return {
        success: false,
        error: `Invalid byte at index ${i}: ${byte} (must be integer 0-255)`,
      };
    }
  }

  try {
    let checksum = 0;
    for (const byte of data) {
      checksum += byte; // Fixed: CU12 protocol uses addition, not XOR
    }

    return {
      success: true,
      data: checksum,
    };
  } catch (error) {
    return {
      success: false,
      error: `Checksum calculation error: ${error}`,
    };
  }
}

/**                                                                                                                                                                                                                        │ │
│ │   252 +   * LESSON 5: SLOT STATE EXTRACTION                                                                                                                                                                                         │ │
│ │   253 +   *                                                                                                                                                                                                                         │ │
│ │   254 +   * Why we need this:                                                                                                                                                                                                       │ │
│ │   255 +   * - Hardware packs multiple slot states into single bytes                                                                                                                                                                 │ │
│ │   256 +   * - DS12: 12 slots in 2 bytes (1.5 bytes of actual data)                                                                                                                                                                  │ │
│ │   257 +   * - DS16: 16 slots in 2 bytes (DATA1 + DATA2)                                                                                                                                                                             │ │
│ │   258 +   * - Each bit represents one slot (0=locked, 1=unlocked)                                                                                                                                                                   │ │
│ │   259 +   *                                                                                                                                                                                                                         │ │
│ │   260 +   * BIT MAPPING EXAMPLE:                                                                                                                                                                                                    │ │
│ │   261 +   * Byte value 0xB5 (181 decimal) = 10110101 binary                                                                                                                                                                         │ │
│ │   262 +   * Bit positions:  7 6 5 4 3 2 1 0                                                                                                                                                                                         │ │
│ │   263 +   * Slot mapping:   1 0 1 1 0 1 0 1                                                                                                                                                                                         │ │
│ │   264 +   *                                                                                                                                                                                                                         │ │
│ │   265 +   * @param dataByte - Byte containing slot states                                                                                                                                                                           │ │
│ │   266 +   * @param startSlot - Starting slot number (1-based)                                                                                                                                                                       │ │
│ │   267 +   * @returns Array of boolean slot states                                                                                                                                                                                   │ │
│ │   268 +   */
//ตรง start slot นี่เอาไว้สำหรับบอกว่า ที ่data byte นี้ มันเริ่มที่ slot ไหน เพราะมันใช้ 8bit binary ก็จะได้ 8 ช่อง ดังนั้นมันจะจบที่ 8 และชุดต่อไปก็จะต้องเริ่มที่ 9 เป้นต้น

export function extractSlotStates(
  dataByte: number,
  startSlot: number
): BinaryOperationResult<boolean[]> {
  if (
    typeof dataByte !== "number" ||
    dataByte < 0 ||
    dataByte > 255 ||
    !Number.isInteger(dataByte)
  ) {
    return {
      success: false,
      error: `Invalid data byte: ${dataByte} (must be integer 0-255)`,
    };
  }

  if (
    typeof startSlot !== "number" ||
    startSlot < 1 ||
    !Number.isInteger(startSlot)
  ) {
    return {
      success: false,
      error: `Invalid start slot: ${startSlot} (must be positive integer)`,
    };
  }

  try {
    const slotStates: boolean[] = [];
    //ASK AI ช่วยแสดงตัวอย่าง การทำ opeeration นี้ให้ชัดเจนขึ้นอีกครับ เหมือนผมที่กำลังเรียน เรื่อง bit operation ใหม่อีกครั้ง
    for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
      const bitMask = 1 << bitPosition;

      const isSlotUnlocked = (dataByte & bitMask) !== 0;

      slotStates.push(isSlotUnlocked);
    }

    return {
      success: true,
      data: slotStates,
    };
  } catch (error) {
    return {
      success: false,
      error: `Slot state extraction error: ${error}`,
    };
  }
}

export function validatePacketStructure(
  packet: number[],
  expectedLength: number
): BinaryOperationResult<boolean> {
  if (!Array.isArray(packet)) {
    return {
      success: false,
      error: `Invalid packet: must be an array`,
    };
  }

  if (
    typeof expectedLength !== "number" ||
    expectedLength < 1 ||
    !Number.isInteger(expectedLength)
  ) {
    return {
      success: false,
      error: `Invalid expected length: ${expectedLength} (must be positive integer)`,
    };
  }

  if (packet.length !== expectedLength) {
    return {
      success: false,
      error: `Packet length mismatch: expected ${expectedLength}, got ${packet.length}`,
    };
  }

  for (let i = 0; i < packet.length; i++) {
    const byte = packet[i];
    if (
      typeof byte !== "number" ||
      byte < 0 ||
      byte > 255 ||
      !Number.isInteger(byte)
    ) {
      return {
        success: false,
        error: `Invalid byte at index ${i}: ${byte} (must be integer 0 - 255)`,
      };
    }
  }
  return {
    success: true,
    data: true,
  };
}

export function extractAllSlotStates(
  deviceType: DeviceType,
  dataBytes: number[]
): BinaryOperationResult<boolean[]> {
  if (
    !deviceType ||
    (deviceType !== DeviceType.DS12 && deviceType !== DeviceType.DS16) // ตรงนี้เดี่ยวตอนที่จะมาเพิ่ม hardware จะต้องมาเพิ่มตรงนี้ด้วย มันจะหลงลืมหรือไม่ ต้อง comment เอาไว้หรือเปล่า
  ) {
    return {
      success: false,
      error: `Inavlid device type: ${deviceType}`,
    };
  }

  if (!Array.isArray(dataBytes) || dataBytes.length === 0) {
    return {
      success: false,
      error: `Invalid data bytes: must be non-empty array`,
    };
  }

  try {
    let allSlotStates: boolean[] = [];

    switch (deviceType) {
      //ตรงนี้ handle data bit ของ DS12 ตัว protocol มันจะมี 8 ช่องแรกอยู่ใน byte แรก และ อีก 4 ช่องที่เหลืออยู่ในครึ่งนึงของ byte ที่สอง (แล้วส่วนที่ไม่ได้ใช้ ก็คือถ้ายิงคำสั่งมาก็จะไม่เจอ หรือมันจะเป็น 0 ตลอดครับ ?)
      case DeviceType.DS12:
        if (dataBytes.length < 2) {
          return {
            success: false,
            error: `DS12 requires at least 2 data bytes, got ${dataBytes.length}`,
          };
        }

        const firstByteResult = extractSlotStates(dataBytes[0], 1);
        if (!firstByteResult.success) {
          return firstByteResult;
        }

        const secondByteResult = extractSlotStates(dataBytes[1], 9);
        if (!secondByteResult.success) {
          return secondByteResult;
        }

        allSlotStates = [
          ...firstByteResult.data!,
          ...secondByteResult.data!.slice(0, 4), // อ๋อก็คือไม่เอาที่ไม่ได้ใช้ ไปด้วย แบบนี้ เวลาเอามาใช้มันก็จะต่างจาก DS16 เพราะ ความยาวของ slot state ไม่เท่ากัน ต้อง implement ส่วนต่างๆ คำนึงถึงส่วนนี้ด้วย แต่น่าจะทำได้ง่ายเพราะ เรา จำกัด จากตรงนี้แล้ว ว่า output ออกไปมมีเท่าไหร่กันแน่  เป็นการกำหนดไว้เลยว่า DS12 state length = 12, DS16 state length = 16
        ];
        break;
      case DeviceType.DS16:
        if (dataBytes.length < 2) {
          return {
            success: false,
            error: `DS16 requires at least data bytes, got ${dataBytes.length}`,
          };
        }

        const byte1Result = extractSlotStates(dataBytes[0], 1);
        const byte2Result = extractSlotStates(dataBytes[1], 9);

        if (!byte1Result.success) return byte1Result;
        if (!byte2Result.success) return byte2Result;

        allSlotStates = [...byte1Result.data!, ...byte2Result.data!];
        break;
      default:
        return {
          success: false,
          error: `Unsupported device type: ${deviceType}`,
        };
    }

    return {
      success: true,
      data: allSlotStates,
    };
  } catch (error) {
    return {
      success: false,
      error: `Slot state extraction error: ${error}`,
    };
  }
}

export function hexToDecimalSafe(
  hex: string,
  defaultValue: number = 0
): number {
  const result = hexToDecimal(hex);
  return result.success ? result.data! : defaultValue;
}

export function decimalToBinarySafe(
  decimal: number,
  padLength: number = 8
): string {
  const result = decimalToBinary(decimal, padLength);
  return result.success ? result.data! : "0".repeat(padLength);
}

export function isValidChecksum(
  data: number[],
  expectedChecksum: number
): boolean {
  const result = calculateChecksum(data);
  return result.success && result.data === expectedChecksum;
}

export function formatBytesForLogging(bytes: number[]): string {
  if (!Array.isArray(bytes)) return "Invalid bytes array";

  return bytes
    .map((byte) => {
      if (typeof byte !== "number" || byte < 0 || byte > 255) {
        return "XX";
      }

      return byte.toString(16).toUpperCase().padStart(2, "0");
    })
    .join();
}

export function createTestPacketData(
  deviceType: DeviceType,
  slotStates?: boolean[]
): number[] {
  const defaultStates =
    deviceType === DeviceType.DS12
      ? new Array(12).fill(false)
      : new Array(16).fill(false);

  const states = slotStates || defaultStates;
  const maxSlots = deviceType === DeviceType.DS12 ? 12 : 16;

  const normalizeStates = states.slice(0, maxSlots);
  while (normalizeStates.length < maxSlots) {
    normalizeStates.push(false);
  }

  const bytes: number[] = [];

  for (let byteIndex = 0; byteIndex < Math.ceil(maxSlots / 8); byteIndex++) {
    let byte = 0;
    for (
      let bitIndex = 0;
      bitIndex < 8 && byteIndex * 8 + bitIndex < maxSlots;
      bitIndex++
    ) {
      const slotIndex = byteIndex * 8 + bitIndex;
      if (normalizeStates[slotIndex]) {
        byte |= 1 << bitIndex;
      }
      bytes.push(byte);
    }

    return bytes;
  }
}
