import { Log } from "../../db/model/logs.model";
import { DispensingLog } from "../../db/model/dispensing-logs.model";
import { dialog, ipcMain, BrowserWindow, IpcMainEvent } from "electron";
import { User } from "../../db/model/user.model";
import fs from "fs";
import { Setting } from "../../db/model/setting.model";
import path from "path";
import * as XLSX from "xlsx";

export interface LogData {
  id?: number;
  user: string;
  message: string;
  createdAt?: Date;
}

export interface DispensingLogData {
  id?: number;
  userId: string;
  hn: string;
  slotId: number;
  process:
    | "unlock"
    | "dispense-continue"
    | "dispense-end"
    | "unlock-error"
    | "dispense-error"
    | "deactivate"
    | "deactivate-error"
    | "force-reset"
    | "force-reset-error";
  message?: string;
}

export const logger = async (data: LogData) => {
  await Log.create({ ...data, message: `${data.message} by ${data.user}` });
};

export const getLogs = async () => {
  return await Log.findAll();
};

export const getDispensingLogs = async () => {
  return await DispensingLog.findAll({
    include: [User],
  });
};

export const LoggingHandler = () => {
  ipcMain.handle("get_logs", async (event: IpcMainEvent) => {
    const data = await getLogs();
    const logs = data.map((log) => log.dataValues);
    
    // Use BrowserWindow from IPC event for Phase 4.2 pattern
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.webContents.send("retrive_logs", logs);
    }
  });
};

export const exportLogsHandler = () => {
  ipcMain.handle("export_logs", async (event: IpcMainEvent, format: string = "csv") => {
    if (format === "xlsx") {
      const result = await exportXlsxLogs();
      return result.filePath;
    } else {
      const result = await exportLogs();
      return result.csvPath;
    }
  });
};

export const logDispensingHanlder = () => {
  ipcMain.handle("get_dispensing_logs", async (event: IpcMainEvent) => {
    const data = await getDispensingLogs();
    const logs = data.map((log) => {
      return {
        ...log.dataValues,
        user:
          log.dataValues.User == null
            ? null
            : log.dataValues.User.dataValues.name,
      };
    });
    return logs;
  });
};

export const systemLog = (message: string) => {
  console.log(`${message}`.toUpperCase());
};

export const logDispensing = async (data: DispensingLogData) => {
  const setting = await Setting.findOne({ where: { id: 1 } });
  const logLimit = await setting.dataValues?.max_log_counts;

  if (!logLimit) {
    console.error("Log Limit not found in setting");
  }

  const logCounts = await DispensingLog.count();

  if (logCounts >= logLimit) {
    await removeOldestDispensingLogs(logCounts - logLimit + 1);
  }

  await createDispensingLog(data);
};

// ฟังก์ชันสำหรับเตรียมข้อมูล logs ที่จะ export
const prepareLogData = async () => {
  const logs = await getDispensingLogs();
  return logs.map((log) => {
    return {
      timestamp: new Date(log.dataValues.timestamp).toLocaleString(),
      user: log.dataValues.User?.dataValues.name || "N/A",
      hn: log.dataValues.hn,
      slotId: log.dataValues.slotId,
      process: log.dataValues.process,
      message: log.dataValues.message,
    };
  });
};

export const exportLogs = async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const saveDir = result.filePaths[0];
      const csvData = await prepareLogData();

      const csvHeaders = [
        "เวลา",
        "ผู้ใช้งาน",
        "เลข HN",
        "หมายเลขช่อง",
        "กระบวนการ",
        "ข้อความ",
      ];
      const csvRows = [
        csvHeaders,
        ...csvData.map((row) => [
          row.timestamp,
          row.user,
          row.hn,
          row.slotId,
          row.process,
          row.message,
        ]),
      ];

      const csvContent = csvRows.map((row) => row.join(",")).join("\n");
      const csvPath = path.join(saveDir, `smc-log-${new Date().getTime()}.csv`);

      // เพิ่ม BOM (Byte Order Mark) เพื่อให้ Excel รู้ว่าไฟล์นี้ใช้ UTF-8 encoding
      // ซึ่งจะช่วยให้สามารถแสดงผลภาษาไทยได้ถูกต้อง
      // ถ้าไม่ใส่ BOM Excel อาจจะไม่สามารถอ่านภาษาไทยได้
      const BOM = "\uFEFF";
      fs.writeFileSync(csvPath, BOM + csvContent, { encoding: "utf-8" });

      return {
        success: true,
        csvPath,
      };
    }
    return { success: false, error: "ยกเลิกการบันทึกไฟล์" };
  } catch (error) {
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกไฟล์" };
  }
};

export const exportXlsxLogs = async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const saveDir = result.filePaths[0];
      const xlsxData = await prepareLogData();

      // สร้าง workbook และ worksheet
      const workbook = XLSX.utils.book_new();
      
      // สร้าง headers เป็นภาษาไทย
      const headers = [
        "เวลา",
        "ผู้ใช้งาน", 
        "เลข HN",
        "หมายเลขช่อง",
        "กระบวนการ",
        "ข้อความ",
      ];

      // เตรียมข้อมูลสำหรับ worksheet
      const worksheetData = [
        headers,
        ...xlsxData.map((row) => [
          row.timestamp,
          row.user,
          row.hn,
          row.slotId,
          row.process,
          row.message,
        ]),
      ];

      // สร้าง worksheet จาก array
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // เพิ่ม worksheet เข้า workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "SMC Logs");

      // กำหนดชื่อไฟล์และ path
      const xlsxPath = path.join(saveDir, `smc-log-${new Date().getTime()}.xlsx`);
      
      // เขียนไฟล์ Excel
      XLSX.writeFile(workbook, xlsxPath);

      return {
        success: true,
        filePath: xlsxPath,
      };
    }
    return { success: false, error: "ยกเลิกการบันทึกไฟล์" };
  } catch (error) {
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกไฟล์" };
  }
};

export const removeOldestDispensingLogs = async (excessLogs: number) => {
  const oldestLogs = await DispensingLog.findAll({
    order: [["timestamp", "ASC"]],
    limit: excessLogs,
  });

  const idsToDelete = oldestLogs.map((log) => log.dataValues.id);

  if (idsToDelete.length > 0) {
    await DispensingLog.destroy({ where: { id: idsToDelete } });
  }
};

export const createDispensingLog = async (data: DispensingLogData) => {
  await DispensingLog.create({
    timestamp: new Date().getTime(),
    userId: data.userId,
    hn: data.hn,
    slotId: data.slotId,
    process: data.process,
    message: data.message,
  });
};

// async function saveLogFiles() {
//   try {
//     // เลือก directory ที่จะบันทึกไฟล์
//     const result = await dialog.showOpenDialog({
//       properties: ["openDirectory"],
//     });

//     if (!result.canceled && result.filePaths.length > 0) {
//       const saveDir = result.filePaths[0];

//       // บันทึก key.txt
//       const keyPath = path.join(saveDir, "key.txt");
//       fs.writeFileSync(keyPath, licenseKey);

//       // บันทึก out.csv
//       const csvPath = path.join(saveDir, "out.csv");
//       const currentDate = new Date().toISOString().split("T")[0];
//       const expiryDate = new Date();
//       expiryDate.setDate(expiryDate.getDate() + data.days);

//       const csvContent = [
//         "Customer Name,Organization,Hardware ID,Days,Generated Date,Expiry Date",
//         `${data.customerName},${data.organization},${data.hardwareId},${
//           data.days
//         },${currentDate},${expiryDate.toISOString().split("T")[0]}`,
//       ].join("\n");

//       fs.writeFileSync(csvPath, csvContent);

//       return {
//         success: true,
//         keyPath,
//         csvPath,
//       };
//     }
//     return { success: false, error: "ยกเลิกการบันทึกไฟล์" };
//   } catch (error) {
//     return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกไฟล์" };
//   }
// }
