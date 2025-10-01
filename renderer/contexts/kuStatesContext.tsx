import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from "react";
import { ipcRenderer } from "electron";

interface IPayload {
  slotId: number;
  hn?: string;
  timestamp?: number;
  occupied: boolean;
}

interface KuStatesContextType {
  slots: IPayload[];
  canDispense: boolean;
  refreshSlots: () => void;
  isLoading: boolean;
}

const KuStatesContext = createContext<KuStatesContextType | undefined>(
  undefined
);

interface KuStatesProviderProps {
  children: ReactNode;
}

export const KuStatesProvider: React.FC<KuStatesProviderProps> = ({
  children,
}) => {
  console.log(
    "[KuStatesProvider] Provider component rendered at",
    new Date().toISOString()
  );
  const [slots, setSlots] = useState<IPayload[]>([]);
  const [canDispense, setCanDispense] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  const refreshSlots = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isRefreshingRef.current) {
      console.log(
        "[KuStatesContext] refreshSlots() blocked - already refreshing"
      );
      return;
    }

    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Debounce rapid calls
    refreshTimeoutRef.current = setTimeout(async () => {
      console.log(
        "[KuStatesContext] refreshSlots() executing at",
        new Date().toISOString()
      );
      isRefreshingRef.current = true;
      setIsLoading(true);

      try {
        console.log("DEBUG refreshSlots() - invoking init");
        await ipcRenderer.invoke("init", { init: true });
      } catch (error) {
        console.error("Failed to refresh slots:", error);
      } finally {
        setIsLoading(false);
        isRefreshingRef.current = false;
      }
    }, 100); // 100ms debounce
  }, []);

  const handleGetKuStates = (
    _event: Electron.IpcRendererEvent,
    payload: IPayload[]
  ) => {
    console.log(
      "[KuStatesContext] Received slots update:",
      payload?.length || 0,
      "slots"
    );
    if (payload != undefined) {
      setSlots(payload);
      isDispensible(payload);
      setIsLoading(false);
    }
  };

  const isDispensible = (payload: IPayload[]) => {
    const isDispensible = payload.filter((p) => p.occupied == true);
    setCanDispense(isDispensible.length <= 0 ? false : true);
  };

  useEffect(() => {
    // Only initialize once when the context is first created
    if (!isInitialized) {
      console.log(
        "[KuStatesContext] Initializing - calling init for the first time"
      );
      refreshSlots();
      setIsInitialized(true);
    }

    // Set up IPC listener
    const handleInitRes = (
      event: Electron.IpcRendererEvent,
      payload: IPayload[]
    ) => {
      console.log("DEBUG handleInitRes() - received slots update:", payload);
      handleGetKuStates(event, payload);
    };

    ipcRenderer.on("init-res", handleInitRes);

    // Cleanup listener on unmount
    return () => {
      ipcRenderer.removeListener("init-res", handleInitRes);

      // Cleanup timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isInitialized, refreshSlots]);

  const value: KuStatesContextType = {
    slots,
    canDispense,
    refreshSlots,
    isLoading,
  };

  return (
    <KuStatesContext.Provider value={value}>
      {children}
    </KuStatesContext.Provider>
  );
};

export const useKuStatesContext = (): KuStatesContextType => {
  const context = useContext(KuStatesContext);
  if (context === undefined) {
    throw new Error(
      "useKuStatesContext must be used within a KuStatesProvider"
    );
  }
  return context;
};
