import React from 'react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

interface ConnectionStatusBarProps {
  className?: string;
  showRefreshButton?: boolean;
}

const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({ 
  className = '',
  showRefreshButton = true 
}) => {
  const { 
    isConnected, 
    isLoading, 
    hardwareType, 
    message, 
    refreshConnection,
    getStatusClass 
  } = useConnectionStatus();

  const handleRefresh = async () => {
    await refreshConnection();
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
      );
    }
    
    if (isConnected) {
      return (
        <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
          <div className="h-2 w-2 bg-white rounded-full"></div>
        </div>
      );
    }
    
    return (
      <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
        <div className="h-2 w-2 bg-white rounded-full"></div>
      </div>
    );
  };

  const getStatusStyles = () => {
    if (isLoading) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    
    if (isConnected) {
      return 'bg-green-50 border-green-200 text-green-800';
    }
    
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const getHardwareTypeDisplay = () => {
    if (hardwareType === 'UNKNOWN') return '';
    return ` (${hardwareType})`;
  };

  return (
    <div className={`flex items-center justify-between px-4 py-2 border rounded-lg transition-all duration-300 ${getStatusStyles()} ${className}`}>
      <div className="flex items-center space-x-3">
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {message}{getHardwareTypeDisplay()}
          </span>
          {isLoading && (
            <span className="text-xs opacity-75">
              กำลังตรวจสอบ...
            </span>
          )}
        </div>
      </div>
      
      {showRefreshButton && (
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-xs px-3 py-1 rounded border transition-colors duration-200 hover:bg-white hover:bg-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="รีเฟรชสถานะการเชื่อมต่อ"
        >
          {isLoading ? (
            <div className="flex items-center space-x-1">
              <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
              <span>รีเฟรช</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>รีเฟรช</span>
            </div>
          )}
        </button>
      )}
    </div>
  );
};

export default ConnectionStatusBar;