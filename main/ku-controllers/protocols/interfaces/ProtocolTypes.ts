/**
 * ANSWER: const enum vs regular enum:
 *
 * const enum:
 * - Inlined at compile time (better performance)
 * - No JavaScript object created at runtime
 * - Smaller bundle size
 * - Better for this use case since values are static
 *
 * regular enum:
 * - Creates JavaScript object at runtime
 * - Can be used dynamically (Object.keys, Object.values)
 * - Larger bundle size
 *
 * For device types, const enum is preferred for performance.
 */
export const enum DeviceType {
  DS12 = "DS12",
  DS16 = "DS16",
}

/**
 * อันนี้ถ้ามี อุปกรณ์ใหม่ ก็เอามาใช้ได้เลย
 */
export const enum CommandType {
  DS12_STATUS_REQUEST = 0x80, // Request current slot status หมายถุึง all slot เลยถูกต้องนะครับ
  DS12_UNLOCK_SLOT = 0x81, // Unlock specific slot
  DS12_LOCK_ALL = 0x82, // ANSWER: Locks all slots simultaneously - sends command to hardware to engage all locking mechanisms
  DS12_RESET_SYSTEM = 0x83, // ANSWER: Resets the entire DS12 controller - clears memory, resets to default state, reinitializes hardware
  DS12_GET_VERSION = 0x84, // Get firmware version
  DS12_SET_CONFIG = 0x85, // ANSWER: Configures timeout, retry attempts, hook state interval, calibration mode (see DS12Config interface)

  DS16_STATUS_REQUEST = 0x30, // Request current slot status หมายถึง ทุก slot เช่นกันกับ DS12
  DS16_UNLOCK_SLOT = 0x31, // Unlock specific slot
  DS16_LOCK_ALL = 0x32, // Lock all slots
  DS16_RESET_SYSTEM = 0x33, // System reset command
  DS16_GET_VERSION = 0x34, // Get firmware version
  DS16_SET_CONFIG = 0x35, // ANSWER: Configures data field mappings, diagnostic settings, timeouts (see DS16Config interface)
}

//My Op: base packeet inteface ตัวนี้เอาไว้ ใส่เข้าใน function หรือ method ในคลาส ที่ต้องใช้ข้อมูล package โดยที่ base นี่คือ ทุก hardware จะต้องมีเหมือนกัน
export interface BasePacket {
  deviceType: DeviceType;
  command: CommandType;
  timestamp: number;
  sequenceId?: string; // ANSWER: Unique identifier to track request/response pairs - helps match responses to specific commands in async operations
}

//My Op: และตรงนี้ก็คือ ถ้าเราสร้าง function แแต่เราอยากให้ ใช้งานได้ทั้ง DS12 และ DS16 เราจะใส่ ตัวแปร type เป็น base packet แต่ตอนส่งเราสามารถส่ง DS12 packet เข้าไปแทนได้ เพราะมันมี base เดียวกัน ส่วน addition เราไปทำ conditional stateement เชคว่า อะไรเข้ามาได้ และจะได้เข้าถึงส่วนเฉพาะของแต่ละอุปกรณ์ได้ โดยไม่รบกวน function อื่นๆ
export interface DS12Packet extends BasePacket {
  deviceType: DeviceType.DS12;
  slotCount: 12;
  hookStateDatas: [number, number];
  targetSlot?: number;
}

export interface DS16Packet extends BasePacket {
  deviceType: DeviceType.DS16;
  slotCount: 16;
  data1: number;
  data2: number;
  data3: number;
  data4: number;
  targetSlot?: number;
}

//My Op: เหมือนกันเลยก็คือทำให้เอาไปใช้ง่าย ขึ้น ถ้ากำหนด protocal packet เราก็จะใช้ได้ทั้งสอง DS12 หรือ DS16 เรียกตรงนี้ว่า Type narrowing
export type ProtocolPacket = DS12Packet | DS16Packet;

/**
 * @success - operation sucess indicator
 * @data - response data (if success)
 * @error - error detail (specific type)
 * @deviceType - device type
 * @timestamp
 */
// ISSUE: ProtocolError interface is missing - define it before using
export interface ProtocolError {
  code: ProtocolErrorCode;
  message: string;
  details?: any;
}

export interface ProtocolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ProtocolError;
  deviceType: DeviceType;
  timestamp: number;
}

// ISSUE: Typo in enum name - should be "ProtocolErrorCode" not "ProtocalErrorCode"
export const enum ProtocolErrorCode {
  // Communication From app -> hardware
  CONNECTION_FAILED = "CONNECTION_FAILED",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",

  // Protocol errors
  UNSUPPORTED_COMMAND = "UNSUPPORTED_COMMAND",
  INVALID_SLOT_NUMBER = "INVALID_SLOT_NUMBER",
  DEVICE_BUSY = "DEVICE_BUSY",
  DATA_VERIFICATION_FAILURE = "DATA_VERIFICATION_FAILURE",

  //Hardware errors
  SLOT_MALFUNCTION = "SLOT_MALFUNCTION", // อันนี้ไม่แน่ใจว่าจะตรวจได้หรือเปล่า จากที่ผมทำคือ ทำ ระบบ deactivate ให้ปิดช่องถาวรเลย แล้วแจ้งให้ service เข้าซ่อม เป้นต้น
  SENSOR_ERROR = "SENSOR_ERROR", // ตอนนี้ยังไม่่มี Sensor อะไรยกเว้น Temp + RH ครับ รับจาก API ของ ESP32 web server ที่ติดตั้งในระบบ
  POWER_FAILURE = "POWER_FAILURE", // อันนี้ยังไม่ได้ implement คิดว่าจะ implement ผ่าน ESP32 ที่ใช้อยู่เพิ่ม Current Sensor เข้าไปเพื่อตรวจจับอีกที

  // Confiuration errors
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  FIRMWARE_INCOMPATIBLE = "FIRMWARE_INCOMPATIBLE",
}

//My Op: ตรงนี้เหมนกัน คือ เป็น base config แล้วถ้า ตัวไหนมี config เพิ่มก็ให้มา extend อันนี้ไป
export interface ProtocolConfig {
  deviceType: DeviceType;
  portPath: string;
  baudRate: number;
  timeout: number; // ตรง timeout ตรงนี้ก่อนหน้านี้ มี implement branch เก่าก่อนจะ ย้อนมาที่ repo ก่อนที่จะ refactor แล้วเริ่ม refactor ให่ในครั้งนี้ ระบบมีการเชคทุกๆ x นาที คลอดเลย แต่ผมไม่ค่อยชอบ เพราะมันน่าจะ กิน resource ผมเลยคิดว่า ให้มัน detect ตอนกดปุ่ม unlock / dispense หรือ activation ที่ต้องคุยกับ hardware จริงๆ เท่านั้น ตรงนี้ ค่อยทำตอนถึเเวบาทำจริงๆ ก่อน
  retryAttempts: number;
  enableLogging: boolean;
}

export interface DS12Config extends ProtocolConfig {
  deviceType: DeviceType.DS12;
  hookStateInterval: number;
  calibrationMode: boolean;
}

export interface DS16Config extends ProtocolConfig {
  deviceType: DeviceType.DS16;
  dataFieldMapping: {
    // ANSWER: Maps generic data1-4 fields to meaningful names
    // Example: { data1: "temperature", data2: "humidity", data3: "pressure", data4: "voltage" }
    data1: string; // Field 1 semantic meaning
    data2: string; // Field 2 semantic meaning
    data3: string; // Field 3 semantic meaning
    data4: string; // Field 4 semantic meaning
  };
  advanceDiagnostics: boolean; // ANSWER: Enables detailed diagnostic data collection and logging for troubleshooting
}

export type AnyProtocolConfig = DS12Config | DS16Config;

//GUARD for runtime safety
export function isDS12packet(packet: ProtocolPacket): packet is DS12Packet {
  return packet.deviceType === DeviceType.DS12;
}

export function isDS16packet(packet: ProtocolPacket): packet is DS16Packet {
  return packet.deviceType === DeviceType.DS16;
}

export function isDS12Config(config: AnyProtocolConfig): config is DS12Config {
  return config.deviceType === DeviceType.DS12;
}

export function isDS16Config(config: AnyProtocolConfig): config is DS16Config {
  return config.deviceType === DeviceType.DS16;
  // ANSWER: == vs === comparison:
  // === (strict equality): Checks type AND value (recommended)
  // == (loose equality): Performs type coercion before comparison
  // Example: 5 === "5" → false, 5 == "5" → true
  // Always use === for TypeScript/JavaScript to avoid unexpected behavior
}

export function isValidSlotNumber(
  slotNumber: number,
  deviceType: DeviceType
): boolean {
  switch (deviceType) {
    case DeviceType.DS12:
      return slotNumber >= 1 && slotNumber <= 12;
    case DeviceType.DS16:
      return slotNumber >= 1 && slotNumber <= 16;
    default:
      return false;
  }
}

export function getMaxSlotCount(deviceType: DeviceType): number {
  switch (deviceType) {
    case DeviceType.DS12:
      return 12;
    case DeviceType.DS16:
      return 16;
    default:
      throw new Error(`Unknown device type: ${deviceType}`);
  }
}

export function isValidCommand(
  command: CommandType,
  deviceType: DeviceType
): boolean {
  const ds12Commands = [
    CommandType.DS12_STATUS_REQUEST,
    CommandType.DS12_UNLOCK_SLOT,
    CommandType.DS12_LOCK_ALL,
    CommandType.DS12_RESET_SYSTEM,
    CommandType.DS12_GET_VERSION,
    CommandType.DS12_SET_CONFIG,
  ];

  const ds16Commands = [
    CommandType.DS16_STATUS_REQUEST,
    CommandType.DS16_UNLOCK_SLOT,
    CommandType.DS16_LOCK_ALL,
    CommandType.DS16_RESET_SYSTEM,
    CommandType.DS16_GET_VERSION,
    CommandType.DS16_SET_CONFIG,
  ];

  switch (deviceType) {
    case DeviceType.DS12:
      return ds12Commands.includes(command);
    case DeviceType.DS16:
      return ds16Commands.includes(command);
    default:
      return false;
  }
}
