import { User } from "../../db/model/user.model";
import { Slot } from "../../db/model/slot.model";
import { BrowserWindow } from "electron";

export const getAllSlots = async (win: BrowserWindow) => {
  try {
    const result = await Slot.findAll();
    const data = result.map((d) => d.dataValues);
    win.webContents.send("unlocking", data);
  } catch (error) {
    console.log(error);
  }
};
