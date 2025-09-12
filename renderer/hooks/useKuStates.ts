import { useEffect, useState } from "react";
import { ipcRenderer } from "electron";

interface IPayload {
  slotId: number;
  hn?: string;
  timestamp?: number;
  occupied: boolean;
}

export const useKuStates = () => {
  console.log('[useKuStates] Hook initialized at', new Date().toISOString());
  const [slots, setSlots] = useState<IPayload[]>([]);

  const [canDispense, setCanDispense] = useState<boolean>(false);

  const get = () => {
    console.log('[useKuStates] get() called - invoking init at', new Date().toISOString());
    console.log('[useKuStates] Getting KU states via init call');
    ipcRenderer.invoke("init", { init: true });
  };

  const handleGetKuStates = (
    _event: Electron.IpcRendererEvent,
    payload: IPayload[]
  ) => {
    if (payload != undefined) {
      setSlots(payload);
      isDispensible(payload);
    }
  };

  const isDispensible = (payload: IPayload[]) => {
    const isDispensible = payload.filter((p) => p.occupied == true);
    setCanDispense(isDispensible.length <= 0 ? false : true);
  };

  useEffect(() => {
    get();
    ipcRenderer.on("init-res", (event, payload) => {
      handleGetKuStates(event, payload);
    });
  }, []);

  return {
    slots,
    get,
    canDispense,
  };
};
