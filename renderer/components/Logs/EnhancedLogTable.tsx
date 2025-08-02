/**
 * Enhanced Log Table with Virtualization
 * SAFETY: Performance-optimized with virtual scrolling
 * CRITICAL: Handles 10,000+ logs without lag requirement
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { EnhancedLogEntry } from '../../hooks/useRealTimeLogs';

export interface EnhancedLogTableProps {
  logs: EnhancedLogEntry[];
  searchQuery?: string;
  isLoading?: boolean;
  onLogClick?: (log: EnhancedLogEntry) => void;
  onExportSelected?: (logs: EnhancedLogEntry[]) => void;
  className?: string;
}

export interface SortConfig {
  key: keyof EnhancedLogEntry;
  direction: 'asc' | 'desc';
}

const EnhancedLogTable: React.FC<EnhancedLogTableProps> = ({
  logs,
  searchQuery,
  isLoading = false,
  onLogClick,
  onExportSelected,
  className = '',
}) => {
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'desc' });
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'compact'>('table');
  const listRef = useRef<List>(null);

  // Sort logs based on current configuration
  const sortedLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      
      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [logs, sortConfig]);

  // Handle sort change
  const handleSort = useCallback((key: keyof EnhancedLogEntry) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Handle log selection
  const handleLogSelection = useCallback((logId: string, selected: boolean) => {
    setSelectedLogs(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(logId);
      } else {
        newSet.delete(logId);
      }
      return newSet;
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedLogs(new Set(logs.map(log => log.id)));
    } else {
      setSelectedLogs(new Set());
    }
  }, [logs]);

  // Export selected logs
  const handleExportSelected = useCallback(() => {
    const selectedLogEntries = logs.filter(log => selectedLogs.has(log.id));
    onExportSelected?.(selectedLogEntries);
  }, [logs, selectedLogs, onExportSelected]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedLogs(new Set());
  }, []);

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  }, []);

  // Get log level badge styling
  const getLogLevelBadge = useCallback((level: string) => {
    const configs = {
      DEBUG: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🔍' },
      INFO: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'ℹ️' },
      WARN: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⚠️' },
      ERROR: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
      CRITICAL: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🚨' },
    };
    
    const config = configs[level as keyof typeof configs] || configs.INFO;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {level}
      </span>
    );
  }, []);

  // Get category badge styling
  const getCategoryBadge = useCallback((category: string) => {
    const configs = {
      SYSTEM: { icon: '⚙️', color: 'text-gray-600' },
      HARDWARE: { icon: '🔧', color: 'text-blue-600' },
      DATABASE: { icon: '💾', color: 'text-green-600' },
      AUTH: { icon: '🔐', color: 'text-purple-600' },
      IPC: { icon: '📡', color: 'text-orange-600' },
      SECURITY: { icon: '🛡️', color: 'text-red-600' },
    };
    
    const config = configs[category as keyof typeof configs] || configs.SYSTEM;
    
    return (
      <span className={`inline-flex items-center text-sm ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {category}
      </span>
    );
  }, []);

  // Highlight search terms in text
  const highlightSearchTerms = useCallback((text: string, searchQuery?: string) => {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const log = sortedLogs[index];
    const isSelected = selectedLogs.has(log.id);
    
    return (
      <div style={style} className="border-b border-gray-200 hover:bg-gray-50">
        <div className="flex items-center px-4 py-3 min-h-[60px]">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0 mr-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleLogSelection(log.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 w-36 text-sm text-gray-500">
            {formatTimestamp(log.timestamp)}
          </div>

          {/* Level Badge */}
          <div className="flex-shrink-0 w-24 mr-3">
            {getLogLevelBadge(log.level)}
          </div>

          {/* Category Badge */}
          <div className="flex-shrink-0 w-28 mr-3">
            {getCategoryBadge(log.category)}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-sm text-gray-900 truncate">
              {highlightSearchTerms(log.message, searchQuery)}
            </div>
            {log.context && Object.keys(log.context).length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {log.context.operation && (
                  <span className="mr-2">Op: {log.context.operation}</span>
                )}
                {log.context.hn && (
                  <span className="mr-2">HN: {log.context.hn}</span>
                )}
                {log.context.slotId && (
                  <span className="mr-2">Slot: {log.context.slotId}</span>
                )}
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex-shrink-0 w-24 text-sm text-gray-600">
            {log.user ? log.user.username : '-'}
          </div>

          {/* Hardware Type */}
          <div className="flex-shrink-0 w-16 text-sm text-gray-500">
            {log.hardwareType}
          </div>

          {/* Risk Level */}
          <div className="flex-shrink-0 w-20">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              log.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
              log.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              log.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {log.riskLevel}
            </span>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 w-16">
            <button
              onClick={() => onLogClick?.(log)}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              ดูรายละเอียด
            </button>
          </div>
        </div>
      </div>
    );
  }, [sortedLogs, selectedLogs, searchQuery, formatTimestamp, getLogLevelBadge, getCategoryBadge, highlightSearchTerms, handleLogSelection, onLogClick]);

  // Sort header component
  const SortableHeader = useCallback(({ 
    label, 
    sortKey, 
    className: headerClassName = '' 
  }: { 
    label: string; 
    sortKey: keyof EnhancedLogEntry; 
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className={`flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900 ${headerClassName}`}
    >
      <span>{label}</span>
      {sortConfig.key === sortKey && (
        <svg
          className={`w-4 h-4 transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  ), [sortConfig, handleSort]);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              บันทึกระบบ ({logs.length.toLocaleString()} รายการ)
            </h3>
            {selectedLogs.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  เลือก {selectedLogs.size} รายการ
                </span>
                <button
                  onClick={handleExportSelected}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  ส่งออกที่เลือก
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  ยกเลิกการเลือก
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-md shadow-sm">
              {[
                { mode: 'table', icon: '☰', label: 'ตาราง' },
                { mode: 'card', icon: '⊞', label: 'การ์ด' },
                { mode: 'compact', icon: '≡', label: 'กะทัดรัด' },
              ].map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as any)}
                  className={`px-3 py-1 text-sm border ${
                    viewMode === mode
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${
                    mode === 'table' ? 'rounded-l-md' :
                    mode === 'compact' ? 'rounded-r-md' : ''
                  }`}
                  title={label}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="flex items-center mt-3 px-4 py-2 bg-white rounded border">
          <div className="flex-shrink-0 w-8 mr-3">
            <input
              type="checkbox"
              checked={selectedLogs.size === logs.length && logs.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex-shrink-0 w-36 mr-3">
            <SortableHeader label="วันที่/เวลา" sortKey="timestamp" />
          </div>
          <div className="flex-shrink-0 w-24 mr-3">
            <SortableHeader label="ระดับ" sortKey="level" />
          </div>
          <div className="flex-shrink-0 w-28 mr-3">
            <SortableHeader label="หมวดหมู่" sortKey="category" />
          </div>
          <div className="flex-1 min-w-0 mr-3">
            <SortableHeader label="ข้อความ" sortKey="message" />
          </div>
          <div className="flex-shrink-0 w-24 mr-3">
            <span className="text-sm font-medium text-gray-700">ผู้ใช้</span>
          </div>
          <div className="flex-shrink-0 w-16 mr-3">
            <SortableHeader label="HW" sortKey="hardwareType" />
          </div>
          <div className="flex-shrink-0 w-20 mr-3">
            <SortableHeader label="ความเสี่ยง" sortKey="riskLevel" />
          </div>
          <div className="flex-shrink-0 w-16">
            <span className="text-sm font-medium text-gray-700">การดำเนินการ</span>
          </div>
        </div>
      </div>

      {/* Table Body with Virtualization */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">ไม่พบบันทึก</h3>
            <p className="mt-1 text-sm text-gray-500">
              ไม่มีบันทึกที่ตรงกับเงื่อนไขการกรองที่เลือก
            </p>
          </div>
        ) : (
          <List
            ref={listRef}
            height={600} // Fixed height for virtualization
            itemCount={sortedLogs.length}
            itemSize={60} // Row height
            width="100%"
          >
            {Row}
          </List>
        )}
      </div>

      {/* Footer with Pagination Info */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div>
            แสดง {Math.min(logs.length, 1000).toLocaleString()} รายการ
            {logs.length > 1000 && ' (จำกัดการแสดงผลเพื่อประสิทธิภาพ)'}
          </div>
          {selectedLogs.size > 0 && (
            <div>
              เลือกไว้ {selectedLogs.size} รายการ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLogTable;