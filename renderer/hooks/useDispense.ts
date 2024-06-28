import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Dispensing {
  slot?: number;
  hn?: string;
  timestamp?: number;
  dispensing: boolean;
  unlocking: boolean;
  reset?: boolean;
}

export const useDispense = () => {
  const [dispensing, setDispensing] = useState<Dispensing>({
    dispensing: false,
    unlocking: false,
    reset: false,
  });

  const reset = (slot: number) => {
    const dataToReset = {
      hn: "",
      timestamp: null,
      slot: null,
      reset: false,
      unlocking: false,
      dispensing: false,
    };
    setDispensing(dataToReset);
    toast(`Slot #${slot} clearing Successful`, { toastId: 2, type: "success" });
  };

  const keep = () => {
    setDispensing({
      reset: false,
      unlocking: false,
      dispensing: false,
    });
  };

  useEffect(() => {
    ipcRenderer.on("dispensing", (event, payload) => {
      setDispensing(payload);
    });

    ipcRenderer.on("dispensing-reset", (event, payload) => {
      setDispensing({
        ...dispensing,
        slot: payload.slotId,
        hn: payload.hn,
        dispensing: false,
        reset: true,
      });
    });

    ipcRenderer.on("deactivated", () => {
      setDispensing({ reset: false, unlocking: false, dispensing: false });
    });
  }, [dispensing]);

  const dispense = ({ slot, hn, timestamp }: Partial<Dispensing>) => {
    ipcRenderer.invoke("dispense", { hn, slotId: slot, timestamp });
  };

  return {
    dispense,
    reset,
    keep,
    dispensing,
  };
};
