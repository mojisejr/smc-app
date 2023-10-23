import { MqttClient } from "mqtt/*";
import { BrowserWindow } from "electron";

interface State {
  slot: number;
  hn?: string;
  timestamp?: string;
  opening: boolean;
  occupied: boolean;
}
export const handleKuStates = (win: BrowserWindow, payload: State[]) => {
    win.webContents.send("ku_states", payload);
};
