import { useConnection } from '../contexts/connectionContext';

/**
 * Hook for accessing connection status throughout the application
 * 
 * Provides easy access to:
 * - Current connection status
 * - Connection validation functions
 * - Manual refresh capability
 * - Operation-ready state
 */
export const useConnectionStatus = () => {
  const connection = useConnection();

  return {
    // Connection state
    status: connection.status,
    isConnected: connection.isConnected,
    isLoading: connection.isLoading,
    hardwareType: connection.status?.hardwareType || 'UNKNOWN',
    lastChecked: connection.status?.lastChecked,
    error: connection.status?.error,
    message: connection.status?.message || '',

    // Connection actions
    checkConnection: connection.checkConnection,
    validateBeforeOperation: connection.validateBeforeOperation,
    refreshConnection: connection.refreshConnection,

    // Operation control
    isOperationAllowed: connection.isOperationAllowed,
    
    // Helper functions
    canPerformOperation: (operationName?: string) => {
      if (!connection.isOperationAllowed) {
        return false;
      }
      
      // Additional operation-specific checks can be added here
      return true;
    },

    getStatusMessage: () => {
      if (connection.isLoading) {
        return 'กำลังตรวจสอบการเชื่อมต่อ...';
      }
      
      return connection.status?.message || 'ไม่ทราบสถานะการเชื่อมต่อ';
    },

    getStatusClass: () => {
      if (connection.isLoading) {
        return 'status-loading';
      }
      
      if (connection.isConnected) {
        return 'status-connected';
      }
      
      return 'status-disconnected';
    }
  };
};