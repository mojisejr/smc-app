import { BrowserWindow } from "electron";
import { SerialPort } from "serialport";
import { ReadlineParser } from "serialport";

export class IndicatorDevice {
  serialPort: SerialPort;
  parser: ReadlineParser;
  win: BrowserWindow;

  constructor(_path: string, _baudRate: number, _win: BrowserWindow) {
    this.win = _win;
    this.serialPort = new SerialPort({
      path: _path,
      baudRate: _baudRate,
      autoOpen: true,
    });

    this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));
  }

  receive() {
    this.parser.on("data", async (data: Buffer) => {
      // Debug log removed for production
      if (!data) {
        this.win.webContents.send("retrive-indicator", {
          success: false,
          message: "ไม่ได้รับข้อมูล indicator",
          data: null,
        });
      }
      const indicators = JSON.parse(data.toString());
      // Debug log removed for production
      this.win.webContents.send("retrive-indicator", {
        success: true,
        message: null,
        data: indicators,
      });
    });
  }
}
