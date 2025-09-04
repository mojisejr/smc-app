import { ipcMain, IpcMainEvent, BrowserWindow } from "electron";
import { SerialPort } from "serialport";

export const getPortListHandler = () => {
  ipcMain.handle("get-port-list", async (event: IpcMainEvent, payload) => {
    // Get BrowserWindow from IPC event instead of using KU16 reference
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      throw new Error("Could not find BrowserWindow from IPC event");
    }

    // Use SerialPort.list() directly instead of KU16.LIST()
    // This is platform-agnostic serial port detection without KU16 dependency
    try {
      const ports = await SerialPort.list();
      return ports;
    } catch (error) {
      console.error("Failed to list serial ports:", error);
      throw new Error("ไม่สามารถค้นหาพอร์ตการเชื่อมต่อได้");
    }
  });
};