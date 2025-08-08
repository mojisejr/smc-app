import { Slot } from "../../db/model/slot.model";
import { getHardwareType } from "./getHardwareType";

export async function getAllSlots() {
  // Get current hardware configuration
  const hardware = await getHardwareType();
  const maxSlots = hardware.maxSlots;
  
  console.log('[getAllSlots] Hardware detection result:', {
    type: hardware.type,
    port: hardware.port,
    baudrate: hardware.baudrate,
    maxSlots: hardware.maxSlots,
    isConfigured: hardware.isConfigured
  });
  
  if (!hardware.isConfigured) {
    console.warn('[getAllSlots] No hardware configured, using fallback to prevent empty array');
    console.warn('[getAllSlots] Hardware object:', hardware);
    // Fallback: assume DS12 with 12 slots to prevent empty array
    console.log('[getAllSlots] Using fallback: 12 slots for DS12');
    // Don't return empty - continue with fallback maxSlots = 12
  }
  
  // Use fallback maxSlots if hardware detection failed
  const finalMaxSlots = hardware.isConfigured ? maxSlots : 12;
  
  // Fetch slots based on current system configuration
  const response = await Slot.findAll({
    where: {
      slotId: { [require('sequelize').Op.lte]: finalMaxSlots }
    },
    order: [['slotId', 'ASC']]
  });
  
  const slots = response.map((slot) => {
    return {
      slotId: slot.dataValues.slotId,
      status: slot.dataValues.isActive,
      statusText: slot.dataValues.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน",
    };
  });

  console.log(`[getAllSlots] Retrieved ${slots.length} slots for ${hardware.type} (${finalMaxSlots}-slot system)`);
  console.log(`[getAllSlots] Slots data:`, slots);
  return slots;
}
