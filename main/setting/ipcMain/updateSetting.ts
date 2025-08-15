import { BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import  { logger } from "../../logger";
import { updateSetting } from "../updateSetting";
import { IUpdateSetting } from "../../interfaces/setting";
import { SerialPort } from "serialport";

export const updateSettingHandler = (win: BrowserWindow) => {
  ipcMain.handle("set-setting", async (event: IpcMainEvent, payload: IUpdateSetting) => {
    // Get BrowserWindow from IPC event for consistency with Phase 4.2 pattern
    const eventWin = BrowserWindow.fromWebContents(event.sender) || win;
    
    const testPort = new SerialPort({ path: payload.ku_port, baudRate: payload.ku_baudrate, autoOpen: false });
    testPort.open(async (error) => {
      console.log("port test: ", error)
      if (error && !error.message.trim().toLowerCase().includes("access denied")) {
        eventWin.webContents.send("set-setting-res", null);
        eventWin.webContents.send("connection", { title: "DS12", message: "ไม่สามารถบันทึกข้อมูลการเชื่อมต่อได้", suggestion: "ตรวจสอบข้อมูล port อีกครั้ง" }); 
        logger({ user: "system", message: "port updates failed." });
        return;
      }  else {
        eventWin.webContents.send("set-setting-res", payload);
        eventWin.webContents.send("connection", { title: "DS12", message: "บันทึกข้อมูลการเชื่อมต่อสำเร็จ", suggestion: "สามารถกลับไปใช้งานได้อีกครั้ง" }); 
        await updateSetting(payload);
        await logger({ user: "system", message: `Update to use Port: ${payload.ku_port}` });
        return;
      }
    });
  });
};



