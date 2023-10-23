import { createContext, useContext, useEffect, useState } from "react";
import { ISlot } from "../interfaces/slot";
import { appProviderProps } from "../interfaces/appProviderProps";

//@Dev: Define Context Type
type appContextType = {
  user?: {
    stuffId: string;
    role: string;
  };
  logged: boolean;
  setUser?: (user: { stuffId: string; role: string }) => void;
};

//@Dev define context default values
const appContextDefaultValue: appContextType = {
  user: null,
  logged: false,
};

//@Dev create context with context type
const AppContext = createContext<appContextType>(appContextDefaultValue);

//@Dev create provider

export function AppProvider({ children }: appProviderProps) {
  const [user, setActiveUser] = useState<{ stuffId: string; role: string }>();
  const [logged, setLogged] = useState<boolean>(false);

  useEffect(() => {
    if (user !== null || user !== undefined) {
      console.log(user);
      setLogged(true);
    }

  }, [user]);

 
  const setUser = (user: { stuffId: string; role: string }) => {
    console.log('user', user);
    setActiveUser(user);
  };

  const value = {
    user,
    logged,

    setUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
