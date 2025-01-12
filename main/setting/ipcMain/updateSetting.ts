import { BrowserWindow, ipcMain } from "electron";
import  { logger } from "../../logger";
import { updateSetting } from "../updateSetting";
import { IUpdateSetting } from "../../interfaces/setting";
import { KU16 } from "../../ku16";
import { SerialPort } from "serialport";

export const updateSettingHandler = (win: BrowserWindow, ku16: KU16) => {
  ipcMain.handle("set-setting", async (event, payload: IUpdateSetting) => {
    const testPort = new SerialPort({ path: payload.ku_port, baudRate: payload.ku_baudrate, autoOpen: false });
    testPort.open(async (error) => {
      console.log("port test: ", error)
      if (error && !error.message.trim().toLowerCase().includes("access denied")) {
        win.webContents.send("set-setting-res", null);
        win.webContents.send("connection", { title: "KU16", message: "ไม่สามารถบันทึกข้อมูลการเชื่อมต่อได้", suggestion: "ตรวจสอบข้อมูล port อีกครั้ง" }); 
        logger({ user: "system", message: "port updates failed." });
        return;
      }  else {
        win.webContents.send("set-setting-res", payload);
        win.webContents.send("connection", { title: "KU16", message: "บันทึกข้อมูลการเชื่อมต่อสำเร็จ", suggestion: "สามารถกลับไปใช้งานได้อีกครั้ง" }); 
        await updateSetting(payload);
        await logger({ user: "system", message: `Update to use Port: ${payload.ku_port}` });
        return;
      }
    });
  });
};



