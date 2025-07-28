import { getSetting } from "./getSetting";

export type HardwareType = 'KU16' | 'CU12' | 'UNKNOWN';

export interface HardwareInfo {
  type: HardwareType;
  port: string | null;
  baudrate: number | null;
  maxSlots: number;
  isConfigured: boolean;
}

/**
 * Detect current hardware type based on settings configuration
 */
export async function getHardwareType(): Promise<HardwareInfo> {
  try {
    const settings = await getSetting();
    
    console.log('[getHardwareType] Settings result:', {
      exists: !!settings,
      hardware_type: settings?.hardware_type,
      cu_port: settings?.cu_port,
      cu_baudrate: settings?.cu_baudrate,
      ku_port: settings?.ku_port,
      ku_baudrate: settings?.ku_baudrate
    });
    
    if (!settings) {
      console.warn('[getHardwareType] No settings found, returning UNKNOWN');
      return {
        type: 'UNKNOWN',
        port: null,
        baudrate: null,
        maxSlots: 0,
        isConfigured: false
      };
    }

    // Check for explicit hardware type setting first
    if (settings.hardware_type && settings.hardware_type !== 'AUTO') {
      if (settings.hardware_type === 'CU12' && settings.cu_port && settings.cu_baudrate) {
        return {
          type: 'CU12',
          port: settings.cu_port,
          baudrate: settings.cu_baudrate,
          maxSlots: 12,
          isConfigured: true
        };
      }
      
      if (settings.hardware_type === 'KU16' && settings.ku_port && settings.ku_baudrate) {
        return {
          type: 'KU16',
          port: settings.ku_port,
          baudrate: settings.ku_baudrate,
          maxSlots: settings.available_slots || 15,
          isConfigured: true
        };
      }
    }

    // AUTO mode: Check for CU12 configuration first (preferred)
    if (settings.cu_port && settings.cu_baudrate) {
      return {
        type: 'CU12',
        port: settings.cu_port,
        baudrate: settings.cu_baudrate,
        maxSlots: 12,
        isConfigured: true
      };
    }

    // Check for KU16 configuration (legacy)
    if (settings.ku_port && settings.ku_baudrate) {
      return {
        type: 'KU16',
        port: settings.ku_port,
        baudrate: settings.ku_baudrate,
        maxSlots: settings.available_slots || 15,
        isConfigured: true
      };
    }

    // No hardware configured
    return {
      type: 'UNKNOWN',
      port: null,
      baudrate: null,
      maxSlots: 0,
      isConfigured: false
    };

  } catch (error) {
    console.error('Error detecting hardware type:', error.message);
    return {
      type: 'UNKNOWN',
      port: null,
      baudrate: null,
      maxSlots: 0,
      isConfigured: false
    };
  }
}

/**
 * Check if system is configured for CU12
 */
export async function isCU12System(): Promise<boolean> {
  const hardware = await getHardwareType();
  return hardware.type === 'CU12' && hardware.isConfigured;
}

/**
 * Check if system is configured for KU16
 */
export async function isKU16System(): Promise<boolean> {
  const hardware = await getHardwareType();
  return hardware.type === 'KU16' && hardware.isConfigured;
}

/**
 * Get current system's maximum slot count
 */
export async function getMaxSlots(): Promise<number> {
  const hardware = await getHardwareType();
  return hardware.maxSlots || 12; // Default to CU12 (12 slots)
}