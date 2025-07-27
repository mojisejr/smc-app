import { Slot } from "../../db/model/slot.model";
import { getHardwareType } from "./getHardwareType";

export async function getAllSlots() {
  // Get current hardware configuration
  const hardware = await getHardwareType();
  const maxSlots = hardware.maxSlots;
  
  if (!hardware.isConfigured) {
    console.warn('[getAllSlots] No hardware configured, returning empty slot list');
    return [];
  }
  
  // Fetch slots based on current system configuration
  const response = await Slot.findAll({
    where: {
      slotId: { [require('sequelize').Op.lte]: maxSlots }
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

  console.log(`[getAllSlots] Retrieved ${slots.length} slots for ${hardware.type} (${maxSlots}-slot system)`);
  return slots;
}
