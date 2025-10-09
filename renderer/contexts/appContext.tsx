import { createContext, useContext, useEffect, useState } from "react";
import { appProviderProps } from "../interfaces/appProviderProps";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { logActivationEvent } from "../utils/debugLogger";

type appContextType = {
  admin: string | null;
  isActivated: boolean;
  setAdmin: (admin: string) => void;
  refreshActivationStatus: () => Promise<void>;
};

const appContextDefaultValue: appContextType = {
  admin: null,
  isActivated: false,
  setAdmin: () => {},
  refreshActivationStatus: async () => {},
};

const AppContext = createContext<appContextType>(appContextDefaultValue);

export function AppProvider({ children }: appProviderProps) {
  const { replace } = useRouter();
  const [admin, setAdmin] = useState<string | null>(null);
  const [isActivated, setActivated] = useState<boolean>(false);

  useEffect(() => {
    initializeActivationStatus();
    
    // Listen for activation state changes from main process
    const handleActivationStateChange = (event: any, changeEvent: any) => {
      logActivationEvent('AppContext', 'ACTIVATION_STATE_CHANGED_EVENT', {
        previousState: isActivated,
        newState: changeEvent.newState.isActivated,
        currentPath: window.location.pathname
      });
      
      setActivated(changeEvent.newState.isActivated);
      
      // Handle navigation based on new state
      if (!changeEvent.newState.isActivated && window.location.pathname !== "/activate-key") {
        logActivationEvent('AppContext', 'NAVIGATION_TO_ACTIVATE_KEY', {
          reason: 'not_activated',
          currentPath: window.location.pathname
        });
        replace("/activate-key");
      } else if (changeEvent.newState.isActivated && window.location.pathname === "/activate-key") {
        logActivationEvent('AppContext', 'NAVIGATION_TO_HOME', {
          reason: 'activated',
          currentPath: window.location.pathname
        });
        replace("/home");
      }
    };
    
    // Register event listener
    ipcRenderer.on('activation-state-changed', handleActivationStateChange);
    
    // Cleanup event listener
    return () => {
      ipcRenderer.removeListener('activation-state-changed', handleActivationStateChange);
    };
  }, []); // Only run once on mount to avoid infinite loops

  const initializeActivationStatus = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 500;
    
    while (retryCount < maxRetries) {
      try {
        // Use existing activation check system
        const result = await ipcRenderer.invoke("check-activation");
        
        // Set initial state based on existing system
        setActivated(result.isActivated);
        return; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`error: Failed to initialize activation status (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('error: Max retries reached for activation status initialization');
          // Default to not activated
          setActivated(false);
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  };

  const handleCheckActivated = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 500;
    
    while (retryCount < maxRetries) {
      try {
        // Use existing activation check system
        const result = await ipcRenderer.invoke("check-activation");
        
        setActivated(result.isActivated);
        
        // Only redirect if we're on a protected page and not activated
        if (!result.isActivated) {
          const currentPath = window.location.pathname;
          const isOnActivationPage = currentPath.includes('/activate-key');
          
          // Don't redirect if already on activation page
          if (!isOnActivationPage) {
            replace("/activate-key");
          }
        }
        return; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`error: Failed to check activation (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('error: Max retries reached for activation check');
          setActivated(false);
          
          // Only redirect on error if not already on activation page
          const currentPath = window.location.pathname;
          const isOnActivationPage = currentPath.includes('/activate-key');
          
          if (!isOnActivationPage) {
            replace("/activate-key");
          }
          return;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  };

  const refreshActivationStatus = async () => {
    logActivationEvent('AppContext', 'REFRESH_ACTIVATION_STATUS_START');
    
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 500;
    
    while (retryCount < maxRetries) {
      try {
        // Force a fresh validation through existing system
        logActivationEvent('AppContext', 'IPC_CHECK_ACTIVATION_INVOKE_START', { retryCount });
        const result = await ipcRenderer.invoke("check-activation");
        logActivationEvent('AppContext', 'IPC_CHECK_ACTIVATION_INVOKE_COMPLETE', { 
          isActivated: result.isActivated,
          retryCount 
        });
        
        logActivationEvent('AppContext', 'SET_ACTIVATED_STATE', { 
          previousState: isActivated,
          newState: result.isActivated 
        });
        setActivated(result.isActivated);
        
        logActivationEvent('AppContext', 'REFRESH_ACTIVATION_STATUS_SUCCESS', { 
          isActivated: result.isActivated 
        });
        return result;
        
      } catch (error) {
        retryCount++;
        logActivationEvent('AppContext', 'REFRESH_ACTIVATION_STATUS_ERROR', { 
          error: error.message,
          retryCount,
          maxRetries 
        });
        console.error(`error: Failed to refresh activation status (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('error: Max retries reached for activation refresh');
          setActivated(false);
          logActivationEvent('AppContext', 'REFRESH_ACTIVATION_STATUS_FAILED', { 
            finalError: error.message 
          });
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  };

  return (
    <AppContext.Provider value={{ admin, setAdmin, isActivated, refreshActivationStatus }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
