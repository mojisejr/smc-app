import { createContext, useContext, useEffect, useState } from "react";
import { appProviderProps } from "../interfaces/appProviderProps";
import { ipcRenderer } from "electron";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

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
      // Info log removed for production
      setActivated(changeEvent.newState.isActivated);
      
      // Handle navigation based on new state
      if (!changeEvent.newState.isActivated && window.location.pathname !== "/activate-key") {
        // Info log removed for production
        replace("/activate-key");
      } else if (changeEvent.newState.isActivated && window.location.pathname === "/activate-key") {
        // Info log removed for production
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
    try {
      // Get current activation state from unified state manager
      const activationState = await ipcRenderer.invoke("activation-state:get-current");
      // Info log removed for production
      
      // Set initial state based on unified state manager
      setActivated(activationState.isActivated);
      
    } catch (error) {
      console.error('error: Failed to initialize activation status:', error);
      // Fallback to legacy check
      await handleCheckActivated();
    }
  };

  const handleCheckActivated = async () => {
    try {
      // Use unified activation state manager for validation
      const activationState = await ipcRenderer.invoke("activation-state:validate");
      // Info log removed for production
      
      setActivated(activationState.isActivated);
      
      // Only redirect if we're on a protected page and not activated
      if (!activationState.isActivated) {
        const currentPath = window.location.pathname;
        const isOnActivationPage = currentPath.includes('/activate-key');
        
        // Don't redirect if already on activation page
        if (!isOnActivationPage) {
          // Info log removed for production
          replace("/activate-key");
        }
      }
    } catch (error) {
      console.error('error: Failed to check activation:', error);
      setActivated(false);
      
      // Only redirect on error if not already on activation page
      const currentPath = window.location.pathname;
      const isOnActivationPage = currentPath.includes('/activate-key');
      
      if (!isOnActivationPage) {
        // Error log kept for debugging
        replace("/activate-key");
      }
    }
  };

  const refreshActivationStatus = async () => {
    try {
      // Force a fresh validation through the unified state manager
      const activationState = await ipcRenderer.invoke("activation-state:validate");
      // Info log removed for production
      
      setActivated(activationState.isActivated);
      
      return activationState;
    } catch (error) {
      console.error('error: Failed to refresh activation status:', error);
      setActivated(false);
      throw error;
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
