import { BrowserWindow } from "electron";

export interface SensorData {
    site?: string;
    data?: {
        p00?: Sensor,
        p01?: Sensor
    };
    v_batt?: number;
    percent_batt?: number;

}

interface Sensor {
    temp?: string;
    humid?: string;
    ir?: string;
}


export const handleRetriveSensor = (win: BrowserWindow, payload: SensorData) => {
    win.webContents.send("get_sensors", payload);
};
