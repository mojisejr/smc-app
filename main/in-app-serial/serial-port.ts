import { SerialPort, PacketLengthParser } from "serialport";
import { Slot } from "../../db/model/slot.model";
import { BrowserWindow, ipcMain } from "electron";

let commands = [
  {
    channel: 0,
    channelNo: 1,
    unlock: [0x02, 0x00, 0x31, 0x03, 0x36],
  },
  {
    channel: 1,
    channelNo: 2,
    unlock: [0x02, 0x01, 0x31, 0x03, 0x37],
  },
  {
    channel: 2,
    channelNo: 3,
    unlock: [0x02, 0x02, 0x31, 0x03, 0x38],
  },
  {
    channel: 3,
    channelNo: 4,
    unlock: [0x02, 0x03, 0x31, 0x03, 0x39],
  },
  {
    channel: 4,
    channelNo: 5,
    unlock: [0x02, 0x04, 0x31, 0x03, 0x3a],
  },
  {
    channel: 5,
    channelNo: 6,
    unlock: [0x02, 0x05, 0x31, 0x03, 0x3b],
  },
  {
    channel: 6,
    channelNo: 7,
    unlock: [0x02, 0x06, 0x31, 0x03, 0x3c],
  },
  {
    channel: 7,
    channelNo: 8,
    unlock: [0x02, 0x07, 0x31, 0x03, 0x3d],
  },
  {
    channel: 8,
    channelNo: 9,
    unlock: [0x02, 0x08, 0x31, 0x03, 0x3e],
  },
  {
    channel: 9,
    channelNo: 10,
    unlock: [0x02, 0x09, 0x31, 0x03, 0x3f],
  },
  {
    channel: 10,
    channelNo: 11,
    unlock: [0x02, 0x0a, 0x31, 0x03, 0x40],
  },
  {
    channel: 11,
    channelNo: 12,
    unlock: [0x02, 0x0b, 0x31, 0x03, 0x41],
  },
  {
    channel: 12,
    channelNo: 13,
    unlock: [0x02, 0x0c, 0x31, 0x03, 0x42],
  },
  {
    channel: 13,
    channelNo: 14,
    unlock: [0x02, 0x0d, 0x31, 0x03, 0x43],
  },
  {
    channel: 14,
    channelNo: 15,
    unlock: [0x02, 0x0e, 0x31, 0x03, 0x44],
  },
  {
    channel: 15,
    channelNo: 16,
    unlock: [0x02, 0x0f, 0x31, 0x03, 0x45],
  },
];

const status = [0x02, 0x00, 0x30, 0x03, 0x35];

const activeSlotValue = [1, 2, 4, 8, 16, 32, 64, 128];

export class KU16 {
  serialPort: SerialPort;
  parser: PacketLengthParser;
  baudRate: number = 19200;
  path: string;
  autoOpen: boolean = true;
  receiveDataMessage: string = "";
  availableSlot: number;
  win: BrowserWindow;
  opening = false;
  dispensing = false;
  openingSlot: { slotId: number; hn: string; timestamp: number };
  commands = [
    {
      channel: 0,
      channelNo: 1,
      unlock: [0x02, 0x00, 0x31, 0x03, 0x36],
    },
    {
      channel: 1,
      channelNo: 2,
      unlock: [0x02, 0x01, 0x31, 0x03, 0x37],
    },
    {
      channel: 2,
      channelNo: 3,
      unlock: [0x02, 0x02, 0x31, 0x03, 0x38],
    },
    {
      channel: 3,
      channelNo: 4,
      unlock: [0x02, 0x03, 0x31, 0x03, 0x39],
    },
    {
      channel: 4,
      channelNo: 5,
      unlock: [0x02, 0x04, 0x31, 0x03, 0x3a],
    },
    {
      channel: 5,
      channelNo: 6,
      unlock: [0x02, 0x05, 0x31, 0x03, 0x3b],
    },
    {
      channel: 6,
      channelNo: 7,
      unlock: [0x02, 0x06, 0x31, 0x03, 0x3c],
    },
    {
      channel: 7,
      channelNo: 8,
      unlock: [0x02, 0x07, 0x31, 0x03, 0x3d],
    },
    {
      channel: 8,
      channelNo: 9,
      unlock: [0x02, 0x08, 0x31, 0x03, 0x3e],
    },
    {
      channel: 9,
      channelNo: 10,
      unlock: [0x02, 0x09, 0x31, 0x03, 0x3f],
    },
    {
      channel: 10,
      channelNo: 11,
      unlock: [0x02, 0x0a, 0x31, 0x03, 0x40],
    },
    {
      channel: 11,
      channelNo: 12,
      unlock: [0x02, 0x0b, 0x31, 0x03, 0x41],
    },
    {
      channel: 12,
      channelNo: 13,
      unlock: [0x02, 0x0c, 0x31, 0x03, 0x42],
    },
    {
      channel: 13,
      channelNo: 14,
      unlock: [0x02, 0x0d, 0x31, 0x03, 0x43],
    },
    {
      channel: 14,
      channelNo: 15,
      unlock: [0x02, 0x0e, 0x31, 0x03, 0x44],
    },
    {
      channel: 15,
      channelNo: 16,
      unlock: [0x02, 0x0f, 0x31, 0x03, 0x45],
    },
  ];

  constructor(_path: string, _availableSlot: number, _win: BrowserWindow) {
    this.win = _win;
    this.serialPort = new SerialPort({
      path: _path,
      baudRate: this.baudRate,
      autoOpen: this.autoOpen,
    });

    this.parser = this.serialPort.pipe(
      new PacketLengthParser({
        delimiter: 0x02,
        packetOverhead: 8,
      })
    );

    this.availableSlot = _availableSlot;
  }

  getSerialPort() {
    return this.serialPort;
  }

  public static async LIST() {
    return await SerialPort.list();
  }

  open() {
    this.serialPort.open((error) => {
      if (error) {
        console.log("opening port error: ", error.message);
        return;
      }
      console.log("opening");
    });
  }

  close() {
    this.serialPort.close((error) => {
      if (error) {
        console.log("closing port error: ", error.message);
        return;
      }
    });
  }

  async checkState() {
    this.serialPort.write(Buffer.from(status));
    const slots = await Slot.findAll();
    this.win.webContents.send(
      "ku_states",
      slots.map((s) => s.dataValues)
    );
  }

  async unlock(inputSlot: { slotId: number; hn: string; timestamp: number }) {
    const data = this.commands[inputSlot.slotId - 1];

    if (!data) return;

    const result = this.serialPort.write(Buffer.from(data.unlock));

    //update state
    if (result) {
      this.receiveDataMessage = `slot #${data.channelNo} unlocked`;
      this.opening = true;
      this.openingSlot = inputSlot;
      while (this.opening) {
        console.log("opening");
        this.win.webContents.send("unlocking", {
          slot: inputSlot.slotId,
          ...inputSlot,
          dispensing: false,
          unlocking: true,
        });
        await this.checkState();
        await this.sleep(1000);
      }
    }
  }

  async dispense(inputSlot: { slotId: number; hn: string; timestamp: number }) {
    const data = this.commands[inputSlot.slotId - 1];

    if (!data) return;

    const result = this.serialPort.write(Buffer.from(data.unlock));

    //update state
    if (result) {
      this.receiveDataMessage = `slot #${data.channelNo} is dispensing`;
      this.opening = true;
      this.dispensing = true;
      this.openingSlot = inputSlot;
      while (this.opening) {
        console.log("dispensing");
        this.win.webContents.send("dispensing", {
          slot: inputSlot.slotId,
          ...inputSlot,
          dispensing: true,
          unlocking: false,
          reset: false,
        });
        await this.checkState();
        await this.sleep(1000);
      }
    }
  }

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  receive() {
    this.parser.on("data", async (data: Buffer) => {
      console.log(`received: ${this.receiveDataMessage}`, data);
      // const binary = this.hex2bin(data[3].toString(16));
      // const arr = this.bin2arr(binary);
      // console.log("binary", binary, arr);
      await this.updateSlot(data[1], data[3], data[4]);
    });
  }

  async updateSlot(address: number, slots1: number, slots2: number) {
    // console.log(address);
    if (address == 0) {
      if (this.availableSlot == slots1) {
        if (this.opening) {
          this.opening = false;
          //set unlocking false
          this.win.webContents.send("unlocking", {
            hn: "",
            dispensing: false,
            unlocking: false,
          });
          //update slot state
          await Slot.update(
            { ...this.openingSlot, occupied: true },
            { where: { slotId: this.openingSlot.slotId } }
          );

          //update front state
          await this.checkState();
        }

        if (this.dispensing) {
          this.dispensing = false;
          this.opening = false;
          //set dispensing false
          this.win.webContents.send("dispensing", {
            hn: "",
            dispensing: false,
            unlocking: false,
          });
          //update slot state
          await Slot.update(
            { hn: "", occupied: false },
            { where: { slotId: this.openingSlot.slotId } }
          );

          //update front state
          await this.checkState();
        }
      }
    }

    if (address == 1) {
      if (this.availableSlot >= slots2) {
        this.win.webContents.send("unlocking", {
          hn: "",
          dispensing: false,
          unlocking: false,
        });
      }
    }
  }

  hex2bin(hex: string) {
    return parseInt(hex, 16).toString(2).padStart(8, "0");
  }

  bin2arr(bstr: string) {
    return bstr.split("").map((i) => parseInt(i));
  }
}
