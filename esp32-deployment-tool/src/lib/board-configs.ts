/**
 * ESP32 Board Configuration Mapping
 * 
 * This module provides board configuration mappings for different ESP32 chip variants
 * used in the medical device license system. Each chip type is mapped to its
 * corresponding PlatformIO board configuration for proper firmware deployment.
 * 
 * Medical Device Context: These configurations ensure proper hardware compatibility
 * for ESP32-based license validation in medical device environments.
 */

export interface ESP32ChipInfo {
  chipType: string;
  boardConfig: string;
  isSupported: boolean;
  description: string;
  features: string[];
  medicalDeviceCompatible: boolean;
}

export interface BoardConfigMapping {
  [chipType: string]: ESP32ChipInfo;
}

/**
 * Comprehensive ESP32 board configuration mapping
 * Maps chip types to their PlatformIO board configurations
 */
export const BOARD_CONFIGS: BoardConfigMapping = {
  'ESP32': {
    chipType: 'ESP32',
    boardConfig: 'esp32dev',
    isSupported: true,
    description: 'Original ESP32 chip with dual-core Xtensa LX6',
    features: ['WiFi', 'Bluetooth Classic', 'BLE', 'Dual Core'],
    medicalDeviceCompatible: true
  },
  'ESP32-S3': {
    chipType: 'ESP32-S3',
    boardConfig: 'esp32-s3-devkitc-1',
    isSupported: true,
    description: 'ESP32-S3 with dual-core Xtensa LX7 and AI acceleration',
    features: ['WiFi', 'BLE', 'Dual Core', 'AI Acceleration', 'USB OTG'],
    medicalDeviceCompatible: true
  },
  'ESP32-C3': {
    chipType: 'ESP32-C3',
    boardConfig: 'esp32-c3-devkitm-1',
    isSupported: true,
    description: 'ESP32-C3 with single-core RISC-V processor',
    features: ['WiFi', 'BLE', 'Single Core RISC-V', 'Low Power'],
    medicalDeviceCompatible: true
  },
  'ESP32-S2': {
    chipType: 'ESP32-S2',
    boardConfig: 'esp32-s2-devkitm-1',
    isSupported: true,
    description: 'ESP32-S2 with single-core Xtensa LX7 and USB OTG',
    features: ['WiFi', 'Single Core', 'USB OTG', 'Touch Sensors'],
    medicalDeviceCompatible: true
  },
  'ESP32-C6': {
    chipType: 'ESP32-C6',
    boardConfig: 'esp32-c6-devkitc-1',
    isSupported: true,
    description: 'ESP32-C6 with dual-core RISC-V and 802.11ax support',
    features: ['WiFi 6', 'BLE', 'Zigbee', 'Thread', 'Dual Core RISC-V'],
    medicalDeviceCompatible: true
  },
  'ESP32-H2': {
    chipType: 'ESP32-H2',
    boardConfig: 'esp32-h2-devkitm-1',
    isSupported: false, // Limited support for medical device licensing
    description: 'ESP32-H2 with single-core RISC-V for IoT connectivity',
    features: ['BLE', 'Zigbee', 'Thread', 'Single Core RISC-V'],
    medicalDeviceCompatible: false
  }
};

/**
 * Get board configuration for a specific chip type
 * @param chipType - ESP32 chip type (e.g., 'ESP32-S3')
 * @returns Board configuration string or null if not supported
 */
export function getBoardConfig(chipType: string): string | null {
  const chipInfo = BOARD_CONFIGS[chipType.toUpperCase()];
  return chipInfo?.isSupported ? chipInfo.boardConfig : null;
}

/**
 * Check if a chip type is supported for medical device licensing
 * @param chipType - ESP32 chip type
 * @returns True if chip is supported and medical device compatible
 */
export function isMedicalDeviceCompatible(chipType: string): boolean {
  const chipInfo = BOARD_CONFIGS[chipType.toUpperCase()];
  return chipInfo?.isSupported && chipInfo?.medicalDeviceCompatible || false;
}

/**
 * Get all supported ESP32 chip types
 * @returns Array of supported chip type strings
 */
export function getSupportedChipTypes(): string[] {
  return Object.keys(BOARD_CONFIGS).filter(
    chipType => BOARD_CONFIGS[chipType].isSupported
  );
}

/**
 * Get all medical device compatible chip types
 * @returns Array of medical device compatible chip type strings
 */
export function getMedicalDeviceCompatibleChips(): string[] {
  return Object.keys(BOARD_CONFIGS).filter(
    chipType => BOARD_CONFIGS[chipType].isSupported && 
                BOARD_CONFIGS[chipType].medicalDeviceCompatible
  );
}

/**
 * Get detailed chip information
 * @param chipType - ESP32 chip type
 * @returns ESP32ChipInfo object or null if not found
 */
export function getChipInfo(chipType: string): ESP32ChipInfo | null {
  return BOARD_CONFIGS[chipType.toUpperCase()] || null;
}

/**
 * Validate chip type against supported configurations
 * @param chipType - ESP32 chip type to validate
 * @returns Validation result with details
 */
export interface ChipValidationResult {
  isValid: boolean;
  isSupported: boolean;
  isMedicalDeviceCompatible: boolean;
  boardConfig?: string;
  chipInfo?: ESP32ChipInfo;
  error?: string;
}

export function validateChipType(chipType: string): ChipValidationResult {
  if (!chipType || typeof chipType !== 'string') {
    return {
      isValid: false,
      isSupported: false,
      isMedicalDeviceCompatible: false,
      error: 'Invalid chip type: must be a non-empty string'
    };
  }

  const normalizedChipType = chipType.toUpperCase();
  const chipInfo = BOARD_CONFIGS[normalizedChipType];

  if (!chipInfo) {
    return {
      isValid: false,
      isSupported: false,
      isMedicalDeviceCompatible: false,
      error: `Unknown chip type: ${chipType}. Supported types: ${getSupportedChipTypes().join(', ')}`
    };
  }

  return {
    isValid: true,
    isSupported: chipInfo.isSupported,
    isMedicalDeviceCompatible: chipInfo.medicalDeviceCompatible,
    boardConfig: chipInfo.isSupported ? chipInfo.boardConfig : undefined,
    chipInfo
  };
}

/**
 * Generate PlatformIO board configuration section
 * @param chipType - ESP32 chip type
 * @returns PlatformIO board configuration string
 */
export function generatePlatformIOBoardConfig(chipType: string): string {
  const validation = validateChipType(chipType);
  
  if (!validation.isValid || !validation.isSupported || !validation.boardConfig) {
    throw new Error(`Cannot generate board config for unsupported chip: ${chipType}`);
  }

  return `board = ${validation.boardConfig}`;
}

// Export constants for external use
export const SUPPORTED_CHIP_TYPES = getSupportedChipTypes();
export const MEDICAL_DEVICE_COMPATIBLE_CHIPS = getMedicalDeviceCompatibleChips();