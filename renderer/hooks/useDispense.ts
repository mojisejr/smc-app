import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Dispensing {
  slotId?: number;
  hn?: string;
  timestamp?: number;
  dispensing: boolean;
  reset?: boolean;
  continue?: boolean;
  passkey?: string;
}

export const useDispense = () => {
  const [dispensing, setDispensing] = useState<Dispensing>({
    dispensing: false,
    reset: false,
    continue: false,
  });

  // Debug: Log dispensing state changes
  useEffect(() => {
    // Debug log removed for production
  }, [dispensing]);

  const reset = (slot: number) => {
    const dataToReset = {
      hn: null,
      timestamp: null,
      slot: null,
      reset: false,
      dispensing: false,
    };
    setDispensing(dataToReset);
    toast(`ช่อง #${slot} เคลียร์เรียบร้อยแล้ว`, {
      toastId: 2,
      type: "success",
    });
  };

  const keep = () => {
    setDispensing({
      reset: false,
      dispensing: false,
    });
  };

  useEffect(() => {
    const handleDispensingEvent = (event: any, payload: any) => {
      // Debug log removed for production
      setDispensing(payload);
    };

    const handleDispensingResetEvent = (event: any, payload: any) => {
      // Debug log removed for production
      setDispensing({
        ...dispensing,
        slotId: payload.slotId,
        hn: payload.hn,
        dispensing: false,
        reset: true,
      });
    };

    const handleLockedBackSuccessEvent = (event: any, payload: any) => {
      // Debug log removed for production
      // This should trigger clearOrContinue dialog
      setDispensing((prev) => ({
        ...prev,
        slotId: payload.slotId,
        hn: payload.hn,
        dispensing: false,
        reset: true,
      }));
    };

    const handleDeactivatedEvent = () => {
      // Debug log removed for production
      setDispensing({ reset: false, dispensing: false });
    };

    ipcRenderer.on("dispensing", handleDispensingEvent);
    ipcRenderer.on("dispensing-reset", handleDispensingResetEvent);
    ipcRenderer.on("locked-back-success", handleLockedBackSuccessEvent);
    ipcRenderer.on("deactivated", handleDeactivatedEvent);

    return () => {
      ipcRenderer.removeListener("dispensing", handleDispensingEvent);
      ipcRenderer.removeListener(
        "dispensing-reset",
        handleDispensingResetEvent
      );
      ipcRenderer.removeListener(
        "locked-back-success",
        handleLockedBackSuccessEvent
      );
      ipcRenderer.removeListener("deactivated", handleDeactivatedEvent);
    };
  }, []);

  const dispense = ({
    slotId,
    hn,
    timestamp,
    passkey,
  }: Partial<Dispensing>) => {
    ipcRenderer.invoke("dispense", { hn, slotId, timestamp, passkey });
  };

  return {
    dispense,
    reset,
    keep,
    dispensing,
  };
};
