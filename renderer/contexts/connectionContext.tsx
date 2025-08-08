import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { toast } from 'react-toastify';

export interface ConnectionStatus {
  isConnected: boolean;
  hardwareType: 'DS16' | 'DS12' | 'UNKNOWN';
  lastChecked: Date;
  error?: string;
  message: string;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  status: ConnectionStatus;
  errorMessage?: string;
}

interface ConnectionContextType {
  status: ConnectionStatus | null;
  isConnected: boolean;
  isLoading: boolean;
  checkConnection: () => Promise<void>;
  validateBeforeOperation: (operationName: string) => Promise<boolean>;
  refreshConnection: () => Promise<void>;
  isOperationAllowed: boolean;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};

interface ConnectionProviderProps {
  children: React.ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Debounced status update to prevent UI flickering
  const [pendingStatus, setPendingStatus] = useState<ConnectionStatus | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const updateStatusWithDebounce = useCallback((newStatus: ConnectionStatus, immediate: boolean = false) => {
    if (immediate) {
      setStatus(newStatus);
      setIsLoading(false);
      return;
    }

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    setPendingStatus(newStatus);

    // Set new timer for debounced update (3 seconds to prevent flickering)
    const timer = setTimeout(() => {
      setStatus(newStatus);
      setIsLoading(false);
      setPendingStatus(null);
    }, 3000);

    setDebounceTimer(timer);
  }, [debounceTimer]);

  const checkConnection = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await ipcRenderer.invoke('get-connection-status');
      
      if (response.success) {
        updateStatusWithDebounce(response.status, false);
      } else {
        console.error('Connection status check failed:', response.error);
        const errorStatus: ConnectionStatus = {
          isConnected: false,
          hardwareType: 'UNKNOWN',
          lastChecked: new Date(),
          message: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ',
          error: response.error
        };
        updateStatusWithDebounce(errorStatus, true);
      }
    } catch (error) {
      console.error('Connection check error:', error);
      const errorStatus: ConnectionStatus = {
        isConnected: false,
        hardwareType: 'UNKNOWN',
        lastChecked: new Date(),
        message: 'เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ',
        error: error.message
      };
      updateStatusWithDebounce(errorStatus, true);
    }
  }, [updateStatusWithDebounce]);

  const validateBeforeOperation = useCallback(async (operationName: string): Promise<boolean> => {
    try {
      const response = await ipcRenderer.invoke('validate-connection-before-operation', {
        operationName
      });
      
      if (response.success) {
        const validation: ConnectionValidationResult = response.validation;
        
        if (!validation.isValid) {
          // Show error toast for operation validation failure
          toast.error(validation.errorMessage || `ไม่สามารถ${operationName}ได้ - ตรวจสอบการเชื่อมต่อ Hardware`, {
            position: "top-center",
            autoClose: 3000,
          });
          
          // Update status immediately if validation fails
          updateStatusWithDebounce(validation.status, true);
          return false;
        }
        
        // Update status if validation succeeds
        updateStatusWithDebounce(validation.status, false);
        return true;
      } else {
        console.error('Operation validation failed:', response.error);
        toast.error('เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ', {
          position: "top-center",
          autoClose: 3000,
        });
        return false;
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('เกิดข้อผิดพลาดในการตรวจสอบการเชื่อมต่อ', {
        position: "top-center",
        autoClose: 3000,
      });
      return false;
    }
  }, [updateStatusWithDebounce]);

  const refreshConnection = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await ipcRenderer.invoke('refresh-connection-status');
      
      if (response.success) {
        updateStatusWithDebounce(response.status, true); // Immediate update for manual refresh
        toast.success('อัปเดตสถานะการเชื่อมต่อเรียบร้อย', {
          position: "top-center",
          autoClose: 2000,
        });
      } else {
        console.error('Connection refresh failed:', response.error);
        toast.error('ไม่สามารถอัปเดตสถานะการเชื่อมต่อได้', {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Refresh connection error:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะการเชื่อมต่อ', {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [updateStatusWithDebounce]);

  // Initialize connection status on mount
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await ipcRenderer.invoke('initialize-connection-status');
        // Status will be updated via IPC event listener
      } catch (error) {
        console.error('Connection initialization error:', error);
        const errorStatus: ConnectionStatus = {
          isConnected: false,
          hardwareType: 'UNKNOWN',
          lastChecked: new Date(),
          message: 'เกิดข้อผิดพลาดในการเริ่มต้นระบบ',
          error: error.message
        };
        updateStatusWithDebounce(errorStatus, true);
      }
    };

    initializeConnection();
  }, [updateStatusWithDebounce]);

  // Set up IPC event listeners
  useEffect(() => {
    // Listen for connection status updates from backend
    const handleStatusUpdate = (event: any, payload: any) => {
      console.log('Connection status updated:', payload);
      
      if (payload.status) {
        const immediate = payload.isInitial || payload.isManualRefresh || payload.error;
        updateStatusWithDebounce(payload.status, immediate);
      }
    };

    // Listen for connection validation errors
    const handleValidationError = (event: any, payload: any) => {
      console.log('Connection validation error:', payload);
      
      toast.error(payload.message, {
        position: "top-center",
        autoClose: 3000,
      });
      
      if (payload.status) {
        updateStatusWithDebounce(payload.status, true);
      }
    };

    ipcRenderer.on('connection-status-updated', handleStatusUpdate);
    ipcRenderer.on('connection-validation-error', handleValidationError);

    return () => {
      ipcRenderer.removeListener('connection-status-updated', handleStatusUpdate);
      ipcRenderer.removeListener('connection-validation-error', handleValidationError);
      
      // Clean up debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [updateStatusWithDebounce, debounceTimer]);

  // Computed values
  const isConnected = status?.isConnected || false;
  const isOperationAllowed = isConnected && !isLoading;

  const contextValue: ConnectionContextType = {
    status,
    isConnected,
    isLoading,
    checkConnection,
    validateBeforeOperation,
    refreshConnection,
    isOperationAllowed
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};