import { createContext, useContext, useEffect, useState } from "react";
import { appProviderProps } from "../interfaces/appProviderProps";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

type appContextType = {
  admin: string | null;
  isActivated: boolean;
  setAdmin: (admin: string) => void;
};

const appContextDefaultValue: appContextType = {
  admin: null,
  isActivated: false,
  setAdmin: () => {},
};

const AppContext = createContext<appContextType>(appContextDefaultValue);

export function AppProvider({ children }: appProviderProps) {
  const { replace } = useRouter();
  const [admin, setAdmin] = useState<string | null>(null);
  const [isActivated, setActivated] = useState<boolean>(false);

  useEffect(() => {
    handleCheckActivated();
  }, [isActivated]);

  const handleCheckActivated = async () => {
    const result = await ipcRenderer.invoke("check-activation-key");
    if (!result) {
      replace("/activate-key");
    }
    setActivated(result);
  };

  return (
    <AppContext.Provider value={{ admin, setAdmin, isActivated }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
