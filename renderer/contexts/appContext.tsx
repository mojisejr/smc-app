import { createContext, useContext, useEffect, useState } from "react";
import { appProviderProps } from "../interfaces/appProviderProps";
import { useRouter } from "next/router";
import { AuthResponse, LogoutRequest } from "../interfaces/auth";
import { ipcRenderer } from "electron";

//@Dev: Define Context Type
type appContextType = {
  user?: AuthResponse
  logged: boolean;
  setUser?: (user: AuthResponse) => void;
  logOut?: () => void;
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
  const { replace, pathname } = useRouter()
  const [user, setActiveUser] = useState<AuthResponse>();
  const [logged, setLogged] = useState<boolean>(false);



  useEffect(() => {
    ipcRenderer.on("connection", (event, connection) => {
      if(!user || user == null) {
        replace("/setting");
      }
      replace( `/error?message=${connection.message}&title=${connection.title}&suggestion=${connection.suggestion}`);
    });

    return () => {
      ipcRenderer.removeAllListeners("connection");
    }
  },[])




  useEffect(() => {
    if (user !== null || user !== undefined) {
      setLogged(true);
    } 
    if(user == null || user == undefined) {
      if(pathname.includes("setting")) {
        replace("/setting")
      } else {
        setLogged(false);
        replace("/home");
      }
    }

  }, [user]);

 
  const setUser = (user: AuthResponse) => {
    setActiveUser(user);
  };

  const logOut = () => {
    //TODO: implement logout-req
    ipcRenderer.invoke("logout-req", { name: user.name } as LogoutRequest );
    setActiveUser(undefined);
    setLogged(false);
    replace("/home");
  }

  const value = {
    user,
    logged,
    logOut,
    setUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
