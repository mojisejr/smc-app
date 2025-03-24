import { Log } from "../../db/model/logs.model";
import { DispensingLog } from "../../db/model/dispensing-logs.model";
import { ipcMain } from "electron";
import { KU16 } from "../ku16";
import { User } from "../../db/model/user.model";
import fs from "fs";

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

export const LoggingHandler = (ku16: KU16) => {
  ipcMain.handle("get_logs", async () => {
    const data = await getLogs();
    const logs = data.map((log) => log.dataValues);
    ku16.win.webContents.send("retrive_logs", logs);
  });
};

export const exportLogsHandler = (ku16: KU16) => {
  ipcMain.handle("export_logs", async () => {
    const filename = await exportLogs();
    return filename;
  });
};

export const logDispensingHanlder = (ku16: KU16) => {
  ipcMain.handle("get_dispensing_logs", async () => {
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
  await DispensingLog.create({
    timestamp: new Date().getTime(),
    userId: data.userId,
    hn: data.hn,
    slotId: data.slotId,
    process: data.process,
    message: data.message,
  });
};

export const exportLogs = async () => {
  const logs = await getDispensingLogs();
  const csvData = logs.map((log) => {
    return {
      timestamp: new Date(log.dataValues.timestamp).toLocaleString(),
      user: log.dataValues.User?.dataValues.name || "N/A",
      hn: log.dataValues.hn,
      slotId: log.dataValues.slotId,
      process: log.dataValues.process,
      message: log.dataValues.message,
    };
  });

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

  const timestamp = new Date().getTime();
  let filename = `logs-${timestamp}.csv`;
  let counter = 1;

  while (fs.existsSync(filename)) {
    filename = `logs-${timestamp}-${counter}.csv`;
    counter++;
  }

  fs.writeFileSync(filename, csvContent);
  return filename;
};
