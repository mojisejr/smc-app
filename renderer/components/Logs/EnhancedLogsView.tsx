/**
 * Enhanced Logs View
 * SAFETY: Feature-rich logging interface with real-time capabilities
 * CRITICAL: Desktop-optimized with core viewing focus (Phase 1)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useLoggingFlags } from '../../hooks/useFeatureFlags';
import useRealTimeLogs, { LogFilters } from '../../hooks/useRealTimeLogs';
import LogFilterPanel from './LogFilterPanel';
import EnhancedLogTable from './EnhancedLogTable';

const EnhancedLogsView: React.FC = () => {
  const flags = useLoggingFlags();
  
  // Initialize with default filters for dispensing logs compatibility
  const defaultFilters: LogFilters = useMemo(() => ({
    levels: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
    categories: ['HARDWARE', 'SYSTEM'], // Focus on dispensing-related categories
    searchQuery: undefined,
    dateRange: undefined,
    hardwareType: undefined,
    userId: undefined,
  }), []);

  const [filters, setFilters] = useState<LogFilters>(defaultFilters);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

  // Initialize real-time logs hook with feature flag checks
  const realTimeLogsOptions = useMemo(() => ({
    maxLogs: flags.virtualScroll ? 10000 : 1000,
    enableWebSocket: flags.realTime,
    fallbackToPolling: true,
    pollingInterval: flags.realTime ? 5000 : 10000,
    autoReconnect: flags.realTime,
  }), [flags]);

  const {
    logs,
    filteredLogs,
    isConnected,
    connectionStatus,
    isLiveMode,
    error,
    lastUpdate,
    updateFilters,
    toggleLiveMode,
    reconnect,
    clearLogs,
    getStats,
  } = useRealTimeLogs(filters, realTimeLogsOptions);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<LogFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    updateFilters(updatedFilters);
  }, [filters, updateFilters]);

  // Handle log selection for details
  const handleLogClick = useCallback((log: any) => {
    setSelectedLogForDetails(log);
    console.log('[ENHANCED-LOGS] Log selected for details:', log.id);
  }, []);

  // Handle bulk export (Phase 1 - basic export only)
  const handleExportSelected = useCallback((selectedLogs: any[]) => {
    console.log('[ENHANCED-LOGS] Export requested for', selectedLogs.length, 'logs');
    // Phase 1: Simple console export for now
    const exportData = {
      timestamp: new Date().toISOString(),
      recordCount: selectedLogs.length,
      logs: selectedLogs,
    };
    console.table(selectedLogs.slice(0, 10)); // Show first 10 in console for debugging
    
    // Export functionality implemented in LogsSetting component
  }, []);

  // Real-time connection status indicator
  const ConnectionStatus = () => {
    if (!flags.realTime) return null;
    
    const statusConfig = {
      connected: { color: 'text-green-600', icon: '🟢', text: 'เชื่อมต่อแล้ว' },
      disconnected: { color: 'text-red-600', icon: '🔴', text: 'ตัดการเชื่อมต่อ' },
      reconnecting: { color: 'text-yellow-600', icon: '🟡', text: 'กำลังเชื่อมต่อใหม่' },
    };
    
    const status = statusConfig[connectionStatus] || statusConfig.disconnected;
    
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span>{status.icon}</span>
        <span className={status.color}>{status.text}</span>
        {lastUpdate && (
          <span className="text-gray-500">
            (อัพเดท: {lastUpdate.toLocaleTimeString('th-TH')})
          </span>
        )}
      </div>
    );
  };

  // Error boundary fallback
  if (error) {
    return (
      <div className="w-full h-[80vh] p-[2rem] flex flex-col gap-[1.2rem] overflow-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                เกิดข้อผิดพลาดในระบบบันทึกขั้นสูง
              </h3>
              <p className="mt-2 text-sm text-red-700">
                {error}
              </p>
              <div className="mt-4">
                <button
                  onClick={reconnect}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  ลองใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[80vh] p-[2rem] flex flex-col gap-[1.2rem] overflow-auto">
      {/* Header with connection status and controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ระบบบันทึกขั้นสูง
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            รายการบันทึกแบบเรียลไทม์พร้อมระบบกรองขั้นสูง
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <ConnectionStatus />
          
          {flags.realTime && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">โหมดสด:</label>
              <button
                onClick={toggleLiveMode}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  isLiveMode
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isLiveMode ? 'เปิด' : 'ปิด'}
              </button>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            {filteredLogs.length.toLocaleString()} / {logs.length.toLocaleString()} รายการ
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {flags.filtering && (
        <LogFilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={false}
          totalLogs={logs.length}
          filteredLogs={filteredLogs.length}
        />
      )}

      {/* Enhanced Log Table */}
      <div className="flex-1 min-h-0">
        <EnhancedLogTable
          logs={filteredLogs}
          searchQuery={filters.searchQuery}
          isLoading={false}
          onLogClick={handleLogClick}
          onExportSelected={handleExportSelected}
          className="h-full"
        />
      </div>

      {/* Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-100 rounded-lg p-3 text-xs">
          <details>
            <summary className="cursor-pointer font-medium text-gray-700">
              🔧 Debug Info (Development Only)
            </summary>
            <div className="mt-2 space-y-1 text-gray-600">
              <div>Flags: {JSON.stringify(flags)}</div>
              <div>Connection: {connectionStatus}</div>
              <div>Live Mode: {isLiveMode ? 'ON' : 'OFF'}</div>
              <div>Total Logs: {logs.length}</div>
              <div>Filtered Logs: {filteredLogs.length}</div>
              <div>Last Update: {lastUpdate?.toISOString()}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default EnhancedLogsView;