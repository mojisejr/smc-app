import { useEffect, useState } from "react";
import { ipcRenderer } from "electron";

interface ISlotPayload {
  slotId: number;
  hn?: string;
  timestamp?: number;
  occupied: boolean;
  opening?: boolean;
  isActive?: boolean;
}

/**
 * DS12-compatible state hook for 12-slot medication cart
 *
 * This hook handles both DS16 and DS12 hardware through the universal adapter system.
 * It limits slot operations to 12 slots (1-12) and provides DS12-specific functionality.
 */
export const useCu12States = () => {
  const [slots, setSlots] = useState<ISlotPayload[]>([]);
  const [canDispense, setCanDispense] = useState<boolean>(false);

  const get = () => {
    ipcRenderer.invoke("init", { init: true });
  };

  const handleGetSlotStates = (
    _event: Electron.IpcRendererEvent,
    payload: ISlotPayload[]
  ) => {
    if (payload != undefined) {
      // Filter to only include slots 1-12 for DS12 compatibility
      const cu12Slots = payload.filter((slot) => slot.slotId <= 12);
      setSlots(cu12Slots);
      isDispensible(cu12Slots);
    }
  };

  const isDispensible = (payload: ISlotPayload[]) => {
    // Check if any slot has medication (occupied = true) and is active
    const hasOccupiedSlots = payload.filter(
      (p) => p.occupied === true && p.isActive !== false
    );
    setCanDispense(hasOccupiedSlots.length > 0);
  };

  useEffect(() => {
    get();

    // Listen to the same IPC event as DS16 for compatibility
    ipcRenderer.on("init-res", (event, payload) => {
      handleGetSlotStates(event, payload);
    });

    // Cleanup listener on unmount
    //TOASK: How to fix this properly ?
    // return () => {
    //   ipcRenderer.removeAllListeners("init-res");
    // };
  }, []);

  return {
    slots: slots.slice(0, 12), // Ensure maximum 12 slots
    get,
    canDispense,
  };
};
