import { ipcRenderer } from "electron";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

interface Unlocking {
  slot?: number;
  hn?: string;
  timestamp?: number;
  dispensing: boolean;
  unlocking: boolean;
}

export const useUnlock = () => {
  const [unlocking, setUnlocking] = useState<Unlocking>({
    dispensing: false,
    unlocking: false,
  });

  useEffect(() => {
    ipcRenderer.on("unlocking", (event, payload) => {
      setUnlocking(payload);
      if (!payload.dispensing && !payload.unlocking && payload.hn != "") {
        toast(`Unlock Successful`, { toastId: 1, type: "success" });
      }
    });
  }, []);

  const unlock = (slot: number, hn: string) => {
    ipcRenderer.invoke("unlock", {
      slot,
      hn,
      timestamp: new Date().getTime(),
    });
  };

  return {
    unlock,
    unlocking,
  };
};
