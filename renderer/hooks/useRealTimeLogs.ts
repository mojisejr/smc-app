/**
 * Real-time Logs Hook
 * Manages log fetching, filtering, and real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface LogFilters {
  levels?: string[];
  categories?: string[];
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hardwareType?: string;
  userId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: string;
  category: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  hardwareType?: string;
}

export interface EnhancedLogEntry extends LogEntry {
  // Enhanced fields for the table component
  context?: {
    operation?: string;
    hn?: string;
    slotId?: string;
    [key: string]: any;
  };
  user?: {
    username: string;
    id: string;
  };
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RealTimeLogsOptions {
  maxLogs: number;
  enableWebSocket: boolean;
  fallbackToPolling: boolean;
  pollingInterval: number;
  autoReconnect: boolean;
}

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Hook for managing real-time logs with filtering and connection management
 */
const useRealTimeLogs = (
  filters: LogFilters,
  options: RealTimeLogsOptions
) => {
  const [logs, setLogs] = useState<EnhancedLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Filter logs based on current filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (filters.levels && filters.levels.length > 0) {
        if (!filters.levels.includes(log.level)) return false;
      }

      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(log.category)) return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!log.message.toLowerCase().includes(query)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const logTime = new Date(log.timestamp);
        if (logTime < filters.dateRange.start || logTime > filters.dateRange.end) {
          return false;
        }
      }

      // Hardware type filter
      if (filters.hardwareType && log.hardwareType !== filters.hardwareType) {
        return false;
      }

      // User ID filter
      if (filters.userId && log.userId !== filters.userId) {
        return false;
      }

      return true;
    });
  }, [logs, filters]);

  // Mock data for initial load
  const generateMockLogs = useCallback((): EnhancedLogEntry[] => {
    const levels = ['INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const categories = ['HARDWARE', 'SYSTEM', 'USER', 'NETWORK'];
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const operations = ['DISPENSE', 'LOGIN', 'RESET', 'STATUS_CHECK'];
    const hardwareTypes = ['DS12', 'DS16', 'SENSOR'];
    const messages = [
      'System initialized successfully',
      'Hardware connection established',
      'User login detected',
      'Network connection restored',
      'Warning: Low memory detected',
      'Error: Unable to connect to device',
      'Critical: Hardware failure detected'
    ];

    return Array.from({ length: 50 }, (_, i) => ({
      id: `log-${Date.now()}-${i}`,
      timestamp: new Date(Date.now() - (Math.random() * 86400000)), // Random time in last 24h
      level: levels[Math.floor(Math.random() * levels.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      metadata: {
        source: 'mock-generator',
        index: i
      },
      context: {
        operation: operations[Math.floor(Math.random() * operations.length)],
        hn: `HN${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
        slotId: `slot-${Math.floor(Math.random() * 12) + 1}`
      },
      user: {
        username: `user${Math.floor(Math.random() * 10) + 1}`,
        id: `user-${Math.floor(Math.random() * 1000)}`
      },
      hardwareType: hardwareTypes[Math.floor(Math.random() * hardwareTypes.length)],
      riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)] as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }));
  }, []);

  // Initialize with mock data
  useEffect(() => {
    const mockLogs = generateMockLogs();
    setLogs(mockLogs);
    setConnectionStatus('connected');
    setIsConnected(true);
    setLastUpdate(new Date());
  }, [generateMockLogs]);

  // Simulate real-time updates when live mode is enabled
  useEffect(() => {
    if (!isLiveMode || !options.enableWebSocket) return;

    const interval = setInterval(() => {
      const newLog: EnhancedLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        level: ['INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 3)],
        category: ['HARDWARE', 'SYSTEM'][Math.floor(Math.random() * 2)],
        message: `Real-time log entry generated at ${new Date().toLocaleTimeString()}`,
        metadata: {
          source: 'real-time-generator'
        },
        context: {
          operation: 'REAL_TIME_UPDATE',
          hn: 'RT001'
        },
        user: {
          username: 'system',
          id: 'system-user'
        },
        hardwareType: 'SYSTEM',
        riskLevel: 'LOW'
      };

      setLogs(prevLogs => {
        const updated = [newLog, ...prevLogs];
        return updated.slice(0, options.maxLogs);
      });
      setLastUpdate(new Date());
    }, options.pollingInterval);

    return () => clearInterval(interval);
  }, [isLiveMode, options.enableWebSocket, options.pollingInterval, options.maxLogs]);

  // Update filters
  const updateFilters = useCallback((newFilters: LogFilters) => {
    // Filters are handled by the component state, this is just for consistency
    console.log('[REAL-TIME-LOGS] Filters updated:', newFilters);
  }, []);

  // Toggle live mode
  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => !prev);
  }, []);

  // Reconnect functionality
  const reconnect = useCallback(() => {
    setError(null);
    setConnectionStatus('reconnecting');
    
    setTimeout(() => {
      setConnectionStatus('connected');
      setIsConnected(true);
      setLastUpdate(new Date());
    }, 1000);
  }, []);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    setLastUpdate(new Date());
  }, []);

  // Get statistics
  const getStats = useCallback(() => {
    const levelCounts = logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryCounts = logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: logs.length,
      filtered: filteredLogs.length,
      levels: levelCounts,
      categories: categoryCounts,
      lastUpdate
    };
  }, [logs, filteredLogs, lastUpdate]);

  return {
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
  };
};

export default useRealTimeLogs;