import { SlowBuffer } from "buffer";

export const  commands = [
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


export const cmdCheckStatus = () => {
    return Buffer.from(status);
}

export const cmdUnlock = (channel: number) => {
    return Buffer.from(commands[channel - 1].unlock);
}

export const cmdCheckOpeningSlot = (binArr: number[], availableSlots: number) => {
  if(binArr.length <= 0) return -1;

  let openingSLot  = -1;
  let reversed = binArr.reverse();
    for (let i = 0; i < availableSlots; i++) {
      if(reversed[i] == 0) {
        openingSLot = i + 1;
        break;
      }
    }
    return openingSLot;
}


export const checkCommand = (command: number) => { 
    switch(command) {
        case 0x30: return "STATUS";
        case 0x31: return "UNLOCK";
        case 0x32: return "ALL_CU_STATES";
        case 0x33: return "UNLOCK_ALL";
        case 0x35: return "RETURN_SINGLE_DATA";
        case 0x36: return "RETURN_ALL_DATA";
        default: return "UNKNOWN";

    }
}






