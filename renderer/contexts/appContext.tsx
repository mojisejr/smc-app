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

// localStorage key for activation state persistence
const ACTIVATION_STATE_KEY = "smc-activation-state";

// Helper functions for localStorage operations
const saveActivationStateToStorage = (isActivated: boolean) => {
  // Check if we're in browser environment
  if (typeof window === "undefined") return;

  try {
    const stateData = {
      isActivated,
      timestamp: Date.now(),
      version: "1.0",
    };
    localStorage.setItem(ACTIVATION_STATE_KEY, JSON.stringify(stateData));
    logActivationEvent("AppContext", "ACTIVATION_STATE_SAVED_TO_STORAGE", {
      isActivated,
    });
  } catch (error) {
    console.error("Failed to save activation state to localStorage:", error);
  }
};

const loadActivationStateFromStorage = (): boolean | null => {
  // Check if we're in browser environment
  if (typeof window === "undefined") return null;

  try {
    const storedData = localStorage.getItem(ACTIVATION_STATE_KEY);
    if (!storedData) return null;

    const parsedData = JSON.parse(storedData);
    const isValid = parsedData && typeof parsedData.isActivated === "boolean";

    if (isValid) {
      logActivationEvent("AppContext", "ACTIVATION_STATE_LOADED_FROM_STORAGE", {
        isActivated: parsedData.isActivated,
        timestamp: parsedData.timestamp,
      });
      return parsedData.isActivated;
    }

    return null;
  } catch (error) {
    console.error("Failed to load activation state from localStorage:", error);
    return null;
  }
};

const clearActivationStateFromStorage = () => {
  // Check if we're in browser environment
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(ACTIVATION_STATE_KEY);
    logActivationEvent("AppContext", "ACTIVATION_STATE_CLEARED_FROM_STORAGE");
  } catch (error) {
    console.error("Failed to clear activation state from localStorage:", error);
  }
};

export function AppProvider({ children }: appProviderProps) {
  const { replace } = useRouter();
  const [admin, setAdmin] = useState<string | null>(null);
  const [isActivated, setActivated] = useState<boolean>(false);

  // Enhanced setActivated function with localStorage persistence
  const setActivatedWithPersistence = (newState: boolean) => {
    setActivated(newState);
    saveActivationStateToStorage(newState);

    logActivationEvent(
      "AppContext",
      "ACTIVATION_STATE_UPDATED_WITH_PERSISTENCE",
      {
        newState,
        currentPath:
          typeof window !== "undefined" ? window.location.pathname : "SSR",
      }
    );
  };

  useEffect(() => {
    // Initialize with localStorage value if available (client-side only)
    const storedState = loadActivationStateFromStorage();
    if (storedState !== null) {
      setActivated(storedState);
      logActivationEvent(
        "AppContext",
        "ACTIVATION_STATE_INITIALIZED_FROM_STORAGE",
        {
          storedState,
        }
      );
    }

    initializeActivationStatus();

    // Listen for activation state changes from main process
    const handleActivationStateChange = (event: any, changeEvent: any) => {
      logActivationEvent("AppContext", "ACTIVATION_STATE_CHANGED_EVENT", {
        previousState: isActivated,
        newState: changeEvent.newState.isActivated,
        currentPath:
          typeof window !== "undefined" ? window.location.pathname : "SSR",
      });

      setActivatedWithPersistence(changeEvent.newState.isActivated);

      // Handle navigation based on new state
      if (
        !changeEvent.newState.isActivated &&
        typeof window !== "undefined" &&
        window.location.pathname !== "/activate-key"
      ) {
        logActivationEvent("AppContext", "NAVIGATION_TO_ACTIVATE_KEY", {
          reason: "not_activated",
          currentPath: window.location.pathname,
        });
        replace("/activate-key");
      } else if (
        changeEvent.newState.isActivated &&
        typeof window !== "undefined" &&
        window.location.pathname === "/activate-key"
      ) {
        logActivationEvent("AppContext", "NAVIGATION_TO_HOME", {
          reason: "activated",
          currentPath: window.location.pathname,
        });
        replace("/home");
      }
    };

    // Register event listener
    ipcRenderer.on("activation-state-changed", handleActivationStateChange);

    // Cleanup event listener
    return () => {
      ipcRenderer.removeListener(
        "activation-state-changed",
        handleActivationStateChange
      );
    };
  }, []); // Only run once on mount to avoid infinite loops

  const initializeActivationStatus = async () => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 500;

    // Get stored state for comparison
    const storedState = loadActivationStateFromStorage();

    while (retryCount < maxRetries) {
      try {
        // Use existing activation check system
        const result = await ipcRenderer.invoke("check-activation");

        logActivationEvent("AppContext", "ACTIVATION_STATUS_INITIALIZED", {
          ipcResult: result.isActivated,
          storedState,
          finalState: result.isActivated,
        });

        // Set initial state based on existing system and persist to localStorage
        setActivatedWithPersistence(result.isActivated);
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(
          `error: Failed to initialize activation status (attempt ${retryCount}/${maxRetries}):`,
          error
        );

        if (retryCount >= maxRetries) {
          console.error(
            "error: Max retries reached for activation status initialization"
          );

          // Fallback to stored state if available, otherwise default to false
          const fallbackState = storedState !== null ? storedState : false;

          logActivationEvent("AppContext", "ACTIVATION_STATUS_FALLBACK", {
            fallbackState,
            storedState,
            error: error.message,
          });

          setActivatedWithPersistence(fallbackState);
          return;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
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

        setActivatedWithPersistence(result.isActivated);

        // Only redirect if we're on a protected page and not activated
        if (!result.isActivated) {
          const currentPath = window.location.pathname;
          const isOnActivationPage = currentPath.includes("/activate-key");

          // Don't redirect if already on activation page
          if (!isOnActivationPage) {
            replace("/activate-key");
          }
        }
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(
          `error: Failed to check activation (attempt ${retryCount}/${maxRetries}):`,
          error
        );

        if (retryCount >= maxRetries) {
          console.error("error: Max retries reached for activation check");
          setActivatedWithPersistence(false);

          // Only redirect on error if not already on activation page
          const currentPath = window.location.pathname;
          const isOnActivationPage = currentPath.includes("/activate-key");

          if (!isOnActivationPage) {
            replace("/activate-key");
          }
          return;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  };

  const refreshActivationStatus = async () => {
    logActivationEvent("AppContext", "REFRESH_ACTIVATION_STATUS_START");

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 500;

    while (retryCount < maxRetries) {
      try {
        // Force a fresh validation through existing system
        logActivationEvent("AppContext", "IPC_CHECK_ACTIVATION_INVOKE_START", {
          retryCount,
        });
        const result = await ipcRenderer.invoke("check-activation");
        logActivationEvent(
          "AppContext",
          "IPC_CHECK_ACTIVATION_INVOKE_COMPLETE",
          {
            isActivated: result.isActivated,
            retryCount,
          }
        );

        logActivationEvent("AppContext", "SET_ACTIVATED_STATE", {
          previousState: isActivated,
          newState: result.isActivated,
        });
        setActivatedWithPersistence(result.isActivated);

        logActivationEvent("AppContext", "REFRESH_ACTIVATION_STATUS_SUCCESS", {
          isActivated: result.isActivated,
        });
        return result;
      } catch (error) {
        retryCount++;
        logActivationEvent("AppContext", "REFRESH_ACTIVATION_STATUS_ERROR", {
          error: error.message,
          retryCount,
          maxRetries,
        });
        console.error(
          `error: Failed to refresh activation status (attempt ${retryCount}/${maxRetries}):`,
          error
        );

        if (retryCount >= maxRetries) {
          console.error("error: Max retries reached for activation refresh");
          setActivatedWithPersistence(false);
          logActivationEvent("AppContext", "REFRESH_ACTIVATION_STATUS_FAILED", {
            finalError: error.message,
          });
          throw error;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  };

  return (
    <AppContext.Provider
      value={{ admin, setAdmin, isActivated, refreshActivationStatus }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
