import { Log } from "../../db/model/logs.model";
import { ipcMain } from "electron";
import { KU16 } from "../ku16";

export interface LogData {
    id?: number;
    user: string;
    message: string;
    createdAt?: Date;
}

export const logger = async (data: LogData) => {
 await Log.create({ ...data, message: `${data.message} by ${data.user}`});
}

export const getLogs = async () => {
    return await Log.findAll();
}

export const LoggingHandler = (ku16: KU16) => {
    ipcMain.handle("get_logs", async () => {
        const data = await getLogs();
        const logs =  data.map(log => log.dataValues);
        ku16.win.webContents.send("retrive_logs", logs);
        
    })
}


export const  systemLog  = (message: string) => {
    console.log(`${message}`.toUpperCase());
}
