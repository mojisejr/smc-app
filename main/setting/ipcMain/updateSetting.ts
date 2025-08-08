import { BrowserWindow, ipcMain } from "electron";
import { unifiedLoggingService } from "../../services/unified-logging.service";
import { updateSetting } from "../updateSetting";
import { IUpdateSetting } from "../../interfaces/setting";
import { DS16 } from "../../ku16";
import { SerialPort } from "serialport";

export const updateSettingHandler = (win: BrowserWindow, ku16: DS16) => {
  ipcMain.handle("set-setting", async (event, payload: IUpdateSetting) => {
    // Determine which hardware type is being configured
    const isDS16 = payload.ku_port && payload.ku_baudrate;
    const isDS12 = payload.cu_port && payload.cu_baudrate;

    let testPort: string;
    let testBaudrate: number;
    let hardwareType: string;

    if (isDS12) {
      testPort = payload.cu_port!;
      testBaudrate = payload.cu_baudrate!;
      hardwareType = "DS12";
    } else if (isDS16) {
      testPort = payload.ku_port!;
      testBaudrate = payload.ku_baudrate!;
      hardwareType = "DS16";
    } else {
      win.webContents.send("set-setting-res", null);
      win.webContents.send("connection", {
        title: "Error",
        message: "ไม่พบข้อมูลการเชื่อมต่อ",
        suggestion: "กรุณาระบุ port และ baudrate",
      });
      return;
    }

    const serialTest = new SerialPort({
      path: testPort,
      baudRate: testBaudrate,
      autoOpen: false,
    });
    serialTest.open(async (error) => {
      console.log(`${hardwareType} port test: `, error);

      if (
        error &&
        !error.message.trim().toLowerCase().includes("access denied")
      ) {
        win.webContents.send("set-setting-res", null);
        win.webContents.send("connection", {
          title: hardwareType,
          message: "ไม่สามารถบันทึกข้อมูลการเชื่อมต่อได้",
          suggestion: "ตรวจสอบข้อมูล port อีกครั้ง",
        });
        await unifiedLoggingService.logError({
          message: `${hardwareType} port update failed.`,
          component: "SettingHandler",
          details: { hardwareType },
        });
        return;
      } else {
        // Add hardware type and available slots to payload
        const settingUpdate = {
          ...payload,
          hardware_type: hardwareType as "DS16" | "DS12",
          available_slots: hardwareType === "DS12" ? 12 : 15,
        };

        win.webContents.send("set-setting-res", settingUpdate);
        win.webContents.send("connection", {
          title: hardwareType,
          message: "บันทึกข้อมูลการเชื่อมต่อสำเร็จ",
          suggestion: "สามารถกลับไปใช้งานได้อีกครั้ง",
        });
        await updateSetting(settingUpdate);
        await unifiedLoggingService.logInfo({
          message: `Updated to use ${hardwareType} Port: ${testPort}`,
          component: "SettingHandler",
          details: { hardwareType, port: testPort },
        });
        return;
      }
    });
  });
};
