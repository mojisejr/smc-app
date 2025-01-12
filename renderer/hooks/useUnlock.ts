import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Unlocking {
  slotId?: number;
  hn?: string;
  timestamp?: number;
  unlocking: boolean;
}

export const useUnlock = () => {
  const [unlocking, setUnlocking] = useState<Unlocking>({
    unlocking: false,
  });

  useEffect(() => {
    ipcRenderer.on("unlocking", (event, payload) => {
      setUnlocking(payload);
      if (!payload.dispensing && !payload.unlocking && payload.hn != "") {
        toast(`ปลดล็อกช่อง #${payload.slotId} เรียบร้อยแล้ว`, { toastId: 1, type: "success" });
      }
    });

    ipcRenderer.on("deactivated", (event, payload) => {
      setUnlocking({ unlocking: false });
    });

    // return () => {
    //   ipcRenderer.removeAllListeners("unlocking");
    // }
  }, []);

  const unlock = (slot: number, hn: string) => {
    ipcRenderer.invoke("unlock", {
      slotId: slot,
      hn,
      timestamp: new Date().getTime(),
    }); 
  };

  return {
    unlock,
    unlocking,
  };
};
