import { Slot } from "../../db/model/slot.model";

export async function getAllSlots() {
  const response = await Slot.findAll();
  const slots = response.map((slot) => {
    return {
      slotId: slot.dataValues.slotId,
      status: slot.dataValues.isActive,
      statusText: slot.dataValues.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน",
    };
  });

  return slots;
}
