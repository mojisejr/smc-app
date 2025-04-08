import { SerialPort, PacketLengthParser } from "serialport";
import { Slot } from "../../db/model/slot.model";
import { BrowserWindow, ipcMain } from "electron";
import {
  checkCommand,
  cmdCheckClosedSlot,
  cmdCheckOpeningSlot,
  cmdCheckStatus,
  cmdUnlock,
} from "./utils/command-parser";
import { SlotState } from "../interfaces/slotState";
import { logger, systemLog } from "../logger";
import { User } from "../../db/model/user.model";

export class KU16 {
  serialPort: SerialPort;
  parser: PacketLengthParser;
  path: string;
  autoOpen: boolean = true;
  availableSlot: number;
  win: BrowserWindow;
  opening = false;
  dispensing = false;
  openingSlot: { slotId: number; hn: string; timestamp: number };
  connected = false;
  waitForLockedBack = false;
  waitForDispenseLockedBack = false;
  constructor(
    _path: string,
    _baudRate: number,
    _availableSlot: number,
    _win: BrowserWindow
  ) {
    this.win = _win;
    this.serialPort = new SerialPort(
      {
        path: _path,
        baudRate: _baudRate,
        autoOpen: this.autoOpen,
      },
      (error) => {
        if (error) {
          this.connected = false;
          return;
        } else {
          this.connected = true;
          return;
        }
      }
    );

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
    let result = false;
    this.serialPort.open((error) => {
      if (error) {
        console.log("port open: ", error.message);
        result = false;
        return;
      }
      console.log("opening");
      return true;
    });

    return result;
  }

  close() {
    this.serialPort.close((error) => {
      if (error) {
        console.log("closing port error: ", error.message);
        return;
      }
    });
  }

  isConnected() {
    return this.connected;
  }

  sendCheckState() {
    const cmd = cmdCheckStatus();
    this.serialPort.write(cmd);
  }

  async receivedCheckState(data: number[]) {
    const slotData = await this.slotBinParser(data, this.availableSlot);

    systemLog(`check_state_received:  data ${data.toString()}`);
    await logger({
      user: "system",
      message: `check_state_received:  data ${data.toString()}`,
    });
    this.win.webContents.send("init-res", slotData);
  }

  async receivedUnlockState(data: number[]) {
    // const hexData = this.decimalToHex(data);
    // const binData = this.hex2bin(hexData);
    // const binArr = this.bin2arr(binData);
    const openingSlotNumber = cmdCheckOpeningSlot(
      data,
      this.availableSlot,
      this.openingSlot.slotId
    );
    systemLog(`unlocked_receved: unlock state for slot # ${openingSlotNumber}`);
    if (openingSlotNumber == -1) {
      systemLog("unlocked_received: slot not found something went wrong");
      await logger({
        user: "system",
        message: "unlocked_received: slot not found something went wrong",
      });
      return;
    }
    this.waitForLockedBack = true;
    await Slot.update(
      { ...this.openingSlot, opening: true, occupied: false },
      { where: { slotId: this.openingSlot.slotId } }
    );
    this.win.webContents.send("unlocking", {
      ...this.openingSlot,
      unlocking: true,
    });
  }

  async receivedDispenseState(data: number[]) {
    const openingSlotNumber = cmdCheckOpeningSlot(
      data,
      this.availableSlot,
      this.openingSlot.slotId
    );
    systemLog(
      `dispensed_received: dispense state for slot # ${openingSlotNumber}`
    );
    await logger({
      user: "system",
      message: `dispensed_received: dispense state for slot # ${openingSlotNumber}`,
    });
    if (openingSlotNumber == -1) {
      systemLog("dispensed_received: slot not found something went wrong");
      await logger({
        user: "system",
        message: "dispensed_received: slot not found something went wrong",
      });
    }
    // this.waitForLockedBack = true;
    this.waitForDispenseLockedBack = true;
    await Slot.update(
      { ...this.openingSlot, opening: true },
      { where: { slotId: this.openingSlot.slotId } }
    );
    this.win.webContents.send("dispensing", {
      ...this.openingSlot,
      dispensing: true,
    });
  }

  async receivedLockedBackState(data: number[]) {
    const openingSlotNumber = cmdCheckOpeningSlot(
      data,
      this.availableSlot,
      this.openingSlot.slotId
    );
    console.log("this.openingSlot: ", this.openingSlot);
    console.log("openingSlotNumber ForRightNow: ", openingSlotNumber);
    if (openingSlotNumber == this.openingSlot.slotId) {
      systemLog("locked_back_received: still opening");
      await logger({
        user: "system",
        message: "locked_back_received: still opening",
      });
      this.win.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: true,
      });
      return;
    }
    if (openingSlotNumber == -1) {
      systemLog(
        `locked_back_received: slot #${this.openingSlot.slotId} locked back`
      );
      await logger({
        user: "system",
        message: `locked_back_received: slot #${this.openingSlot.slotId} locked back`,
      });
      this.waitForLockedBack = false;
      this.opening = false;
      this.dispensing = false;
      await Slot.update(
        { ...this.openingSlot, opening: false, occupied: true },
        { where: { slotId: this.openingSlot.slotId } }
      );
      this.win.webContents.send("unlocking", {
        ...this.openingSlot,
        unlocking: false,
      });
    }
  }

  async receivedDispenseLockedBackState(data: number[]) {
    const openingSlotNumber = cmdCheckOpeningSlot(
      data,
      this.availableSlot,
      this.openingSlot.slotId
    );
    if (openingSlotNumber == this.openingSlot.slotId) {
      systemLog("dispense_locked_back_received: still opening");
      this.win.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: true,
        reset: false,
      });
      return;
    }
    if (openingSlotNumber == -1) {
      systemLog(
        `dispense_locked_back_received: slot #${this.openingSlot.slotId} locked back`
      );
      await logger({
        user: "system",
        message: `dispense_locked_back_received: slot #${this.openingSlot.slotId} locked back`,
      });
      this.waitForDispenseLockedBack = false;
      this.opening = false;
      this.dispensing = false;
      this.win.webContents.send("dispensing", {
        ...this.openingSlot,
        dispensing: false,
        reset: true,
      });
    }
  }

  async sendUnlock(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
  }) {
    if (!this.isConnected() || this.waitForLockedBack) return;

    await logger({
      user: "system",
      message: `sendUnlock: slot #${inputSlot.slotId}`,
    });

    const cmd = cmdUnlock(inputSlot.slotId);
    this.serialPort.write(cmd);
    this.opening = true;
    this.openingSlot = inputSlot;
  }

  async dispense(inputSlot: {
    slotId: number;
    hn: string;
    timestamp: number;
    passkey: string;
  }) {
    const user = await User.findOne({ where: { passkey: inputSlot.passkey } });

    if (!user) {
      await logger({
        user: "system",
        message: `dispense: user not found`,
      });
      throw new Error("ไม่พบผู้ใช้งาน");
    }

    if (!this.isConnected() || this.waitForDispenseLockedBack) {
      await logger({
        user: "system",
        message: `dispense: not connected or waiting for dispense locked back`,
      });
      return;
    }
    const slot = (await Slot.findOne({ where: { slotId: inputSlot.slotId } }))
      .dataValues;

    if (
      !slot.occupied ||
      slot.hn == "" ||
      slot.hn == null ||
      slot.hn == undefined
    ) {
      await logger({
        user: "system",
        message: `dispense: slot not occupied or hn is empty`,
      });
      return;
    }

    const data = cmdUnlock(inputSlot.slotId);
    if (!data) return;
    this.serialPort.write(data);

    this.opening = true;
    this.dispensing = true;
    this.openingSlot = inputSlot;
  }

  async resetSlot(slotId: number) {
    await Slot.update(
      { hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
    await logger({
      user: "system",
      message: `resetSlot: slot #${slotId}`,
    });
  }

  async deactivate(slotId: number) {
    await Slot.update(
      { isActive: false, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
    await logger({
      user: "system",
      message: `deactivate: slot #${slotId}`,
    });
    this.dispensing = false;
    this.opening = false;
    this.win.webContents.send("unlocking", {
      ...this.openingSlot,
      unlocking: false,
    });
    this.win.webContents.send("dispensing", {
      slot: slotId,
      dispensing: false,
      unlocking: false,
      reset: false,
    });
  }

  async reactive(slotId: number) {
    return await Slot.update(
      { isActive: true, hn: null, occupied: false, opening: false },
      { where: { slotId: slotId } }
    );
  }

  async deactiveAllSlots() {
    return await Slot.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  }

  async reactiveAllSlots() {
    return await Slot.update(
      { isActive: true },
      { where: { isActive: false } }
    );
  }

  sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  receive() {
    this.parser.on("data", async (data: Buffer) => {
      const status = checkCommand(data[2]);
      const slotArr = this.decToBinArrSlot(data[3], data[4]);
      console.log("STATUS: ", status);
      if (status == "RETURN_SINGLE_DATA") {
        if (this.opening && !this.dispensing && !this.waitForLockedBack) {
          //opening but not dispensing and not wait for lock
          console.log("open/!dispense/waitForLock");
          await this.receivedUnlockState(slotArr);
        } else if (this.opening && this.waitForLockedBack) {
          //opening and wait for lacked back
          console.log("open/waitForLock");
          await this.receivedLockedBackState(slotArr);
          await this.receivedCheckState(slotArr);
        } else if (
          this.opening &&
          this.dispensing &&
          !this.waitForDispenseLockedBack
        ) {
          console.log("open/dispense/!waitForLock");
          await this.receivedDispenseState(slotArr);
        } else if (
          this.opening &&
          this.dispensing &&
          this.waitForDispenseLockedBack
        ) {
          console.log("open/dispense/waitForLock");
          await this.receivedDispenseLockedBackState(slotArr);
          this.receivedCheckState(slotArr);
        } else {
          console.log("ELSE CASE");
          await this.receivedCheckState(slotArr);
        }
      } else {
        console.log("ERROR CASE");
        return;
      }
    });
  }

  slotBinParser = async (binArr: number[], availableSlot: number) => {
    if (binArr.length <= 0 || availableSlot <= 0) {
      //TODO fix null return
      return [];
    }

    const slotFromDb = await Slot.findAll();

    // const slotArr = binArr.reverse().map((slot, index) => {
    const slotArr = binArr.map((slot, index) => {
      return {
        slotId:
          slotFromDb[index] == undefined
            ? null
            : slotFromDb[index].dataValues.slotId,
        hn:
          slotFromDb[index] == undefined
            ? null
            : slotFromDb[index].dataValues.hn,
        occupied:
          slotFromDb[index] == undefined
            ? false
            : slotFromDb[index].dataValues.occupied,
        timestamp:
          slotFromDb[index] == undefined
            ? null
            : slotFromDb[index].dataValues.timestamp,
        opening:
          slotFromDb[index] == undefined
            ? false
            : slotFromDb[index].dataValues.opening,
        isActive:
          slotFromDb[index] == undefined || slot != 1
            ? false
            : slotFromDb[index].dataValues.isActive,
      } as SlotState;
    });

    if (slotArr.length <= 0) {
      return [];
    }

    const available = slotArr.splice(0, availableSlot);

    return available;
  };

  decimalToHex(decimal) {
    if (!Number.isInteger(decimal)) {
      throw new Error("Input must be an integer.");
    }

    const hex = decimal.toString(16).toUpperCase(); // Convert to hexadecimal and uppercase.

    return hex.padStart(2, "0");
  }

  hex2bin(hex: string) {
    return parseInt(hex, 16).toString(2).padStart(8, "0");
  }

  bin2arr(bstr: string) {
    return bstr.split("").map((i) => parseInt(i));
  }

  decToBinArrSlot(data1: number, data2: number) {
    const hexData1 = this.decimalToHex(data1);
    const hexData2 = this.decimalToHex(data2);
    const binData1 = this.hex2bin(hexData1);
    const binData2 = this.hex2bin(hexData2);
    const binArr1 = this.bin2arr(binData1).reverse();
    const binArr2 = this.bin2arr(binData2).reverse();
    const binArr = binArr1.concat(binArr2);

    return binArr;
  }
}
