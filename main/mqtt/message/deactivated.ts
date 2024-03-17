import { MqttClient } from "mqtt/*";
import { BrowserWindow } from "electron";

export const handleDeactivated= (win: BrowserWindow) => {
    win.webContents.send("deactivated");
};
