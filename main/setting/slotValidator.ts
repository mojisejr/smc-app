import { getHardwareType, HardwareType } from "./getHardwareType";

export interface SlotValidationResult {
  isValid: boolean;
  error?: string;
  hardware: HardwareType;
  maxSlots: number;
}

/**
 * Validate if a slot ID is valid for the current hardware configuration
 */
export async function validateSlotId(slotId: number): Promise<SlotValidationResult> {
  const hardware = await getHardwareType();
  
  if (!hardware.isConfigured) {
    return {
      isValid: false,
      error: 'No hardware configured',
      hardware: hardware.type,
      maxSlots: 0
    };
  }

  if (slotId < 1) {
    return {
      isValid: false,
      error: 'Slot ID must be greater than 0',
      hardware: hardware.type,
      maxSlots: hardware.maxSlots
    };
  }

  if (slotId > hardware.maxSlots) {
    return {
      isValid: false,
      error: `Slot ID ${slotId} exceeds maximum slots for ${hardware.type} system (max: ${hardware.maxSlots})`,
      hardware: hardware.type,
      maxSlots: hardware.maxSlots
    };
  }

  return {
    isValid: true,
    hardware: hardware.type,
    maxSlots: hardware.maxSlots
  };
}

/**
 * Validate multiple slot IDs
 */
export async function validateSlotIds(slotIds: number[]): Promise<SlotValidationResult[]> {
  const results: SlotValidationResult[] = [];
  
  for (const slotId of slotIds) {
    const result = await validateSlotId(slotId);
    results.push(result);
  }
  
  return results;
}

/**
 * Get valid slot range for current hardware
 */
export async function getValidSlotRange(): Promise<{ min: number; max: number; hardware: HardwareType }> {
  const hardware = await getHardwareType();
  
  return {
    min: 1,
    max: hardware.maxSlots,
    hardware: hardware.type
  };
}

/**
 * Filter slot IDs to only include valid ones for current hardware
 */
export async function filterValidSlotIds(slotIds: number[]): Promise<number[]> {
  const hardware = await getHardwareType();
  
  if (!hardware.isConfigured) {
    return [];
  }
  
  return slotIds.filter(slotId => slotId >= 1 && slotId <= hardware.maxSlots);
}