import { Slot } from "../../db/model/slot.model";
import { getSetting } from "./getSetting";

export async function getAllSlots() {
  // Get current system configuration
  const settings = await getSetting();
  const maxSlots = settings?.available_slots || 12; // Default to CU12 (12 slots)
  
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

  console.log(`[getAllSlots] Retrieved ${slots.length} slots for ${maxSlots}-slot system`);
  return slots;
}
