import { BrowserWindow, ipcMain } from "electron";
import { getAllSlots } from "../getallSlots";

export const getAllSlotsHandler = () => {
  ipcMain.handle("get-all-slots", async (event, payload) => {
    const slots = await getAllSlots();
    return slots;
  });
};
