import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useApp } from "../contexts/appContext";

interface Dispensing {
  slotId?: number;
  hn?: string;
  timestamp?: number;
  dispensing: boolean;
  reset?: boolean;
  continue?: boolean
}

export const useDispense = () => {
  const { user } = useApp();
  const [dispensing, setDispensing] = useState<Dispensing>({
    dispensing: false,
    reset: false,
    continue: false,
  });

  const reset = (slot: number) => {
    const dataToReset = {
      hn: null,
      timestamp: null,
      slot: null,
      reset: false,
      dispensing: false,
    };
    setDispensing(dataToReset);
    toast(`ช่อง #${slot} เคลียร์เรียบร้อยแล้ว`, { toastId: 2, type: "success" });
  };

  const keep = () => {
    setDispensing({
      reset: false,
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
        slotId: payload.slotId,
        hn: payload.hn,
        dispensing: false,
        reset: true,
      });
    });

    ipcRenderer.on("deactivated", () => {
      setDispensing({ reset: false, dispensing: false });
    });
  }, []);

  const dispense = ({ slotId, hn, timestamp }: Partial<Dispensing>) => {
    ipcRenderer.invoke("dispense", { hn, slotId, timestamp, user: user.name });
  };

  return {
    dispense,
    reset,
    keep,
    dispensing,
  };
};
