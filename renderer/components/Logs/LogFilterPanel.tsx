/**
 * Advanced Log Filter Panel
 * SAFETY: Enhanced filtering with feature flag fallback
 * CRITICAL: Optimized for <100ms response time requirement
 */

import React, { useState, useCallback, useMemo } from 'react';
import { LogFilters } from '../../hooks/useRealTimeLogs';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface LogFilterPanelProps {
  filters: LogFilters;
  onFiltersChange: (filters: Partial<LogFilters>) => void;
  isLoading?: boolean;
  totalLogs?: number;
  filteredLogs?: number;
}

const LogFilterPanel: React.FC<LogFilterPanelProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
  totalLogs = 0,
  filteredLogs = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Predefined filter options
  const logLevels = [
    { value: 'DEBUG', label: 'Debug', color: 'gray', count: 0 },
    { value: 'INFO', label: 'Info', color: 'blue', count: 0 },
    { value: 'WARN', label: 'Warning', color: 'yellow', count: 0 },
    { value: 'ERROR', label: 'Error', color: 'red', count: 0 },
    { value: 'CRITICAL', label: 'Critical', color: 'purple', count: 0 },
  ];

  const logCategories = [
    { value: 'SYSTEM', label: 'System', icon: '⚙️', count: 0 },
    { value: 'HARDWARE', label: 'Hardware', icon: '🔧', count: 0 },
    { value: 'DATABASE', label: 'Database', icon: '💾', count: 0 },
    { value: 'AUTH', label: 'Authentication', icon: '🔐', count: 0 },
    { value: 'IPC', label: 'IPC Communication', icon: '📡', count: 0 },
    { value: 'SECURITY', label: 'Security', icon: '🛡️', count: 0 },
  ];

  const datePresets = [
    { label: 'ล่าสุด 1 ชั่วโมง', range: () => [new Date(Date.now() - 60 * 60 * 1000), new Date()] },
    { label: 'วันนี้', range: () => [new Date(new Date().setHours(0, 0, 0, 0)), new Date()] },
    { label: '7 วันที่แล้ว', range: () => [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()] },
    { label: '30 วันที่แล้ว', range: () => [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()] },
    { label: 'ทั้งหมด', range: () => [new Date(0), new Date()] },
  ];

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Debounce search query updates
    const timeoutId = setTimeout(() => {
      onFiltersChange({ searchQuery: value.trim() || undefined });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onFiltersChange]);

  // Level filter handler
  const handleLevelChange = useCallback((level: string, checked: boolean) => {
    const newLevels = checked
      ? [...filters.levels, level]
      : filters.levels.filter(l => l !== level);
    
    onFiltersChange({ levels: newLevels });
  }, [filters.levels, onFiltersChange]);

  // Category filter handler
  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    
    onFiltersChange({ categories: newCategories });
  }, [filters.categories, onFiltersChange]);

  // Date range handler
  const handleDateRangeChange = useCallback((range: [Date, Date] | undefined) => {
    const dateRange = range ? { start: range[0], end: range[1] } : undefined;
    onFiltersChange({ dateRange });
  }, [onFiltersChange]);

  // Hardware type handler
  const handleHardwareTypeChange = useCallback((hardwareType: 'DS16' | 'DS12' | undefined) => {
    onFiltersChange({ hardwareType });
  }, [onFiltersChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    onFiltersChange({
      levels: ['INFO', 'WARN', 'ERROR', 'CRITICAL'],
      categories: ['SYSTEM', 'HARDWARE', 'DATABASE'],
      searchQuery: undefined,
      dateRange: undefined,
      hardwareType: undefined,
      userId: undefined,
    });
  }, [onFiltersChange]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.dateRange) count++;
    if (filters.hardwareType) count++;
    if (filters.userId) count++;
    if (filters.levels.length !== 4) count++; // Default is 4 levels
    if (filters.categories.length !== 3) count++; // Default is 3 categories
    return count;
  }, [filters]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* Filter Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">ตัวกรองบันทึก</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {activeFiltersCount} ตัวกรองที่เปิดใช้งาน
            </span>
          )}
          {filteredLogs !== totalLogs && (
            <span className="text-sm text-gray-500">
              แสดง {filteredLogs.toLocaleString()} จาก {totalLogs.toLocaleString()} รายการ
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
            disabled={activeFiltersCount === 0}
          >
            ล้างตัวกรอง
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-100"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar (Always Visible) */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ค้นหาบันทึก... (ข้อความ, ผู้ใช้, HN, ช่องยา)"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {isExpanded && (
        <div className="px-4 py-4 space-y-6">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ช่วงเวลา
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {datePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const [start, end] = preset.range();
                    handleDateRangeChange(preset.label === 'ทั้งหมด' ? undefined : [start, end]);
                  }}
                  className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                    (!filters.dateRange && preset.label === 'ทั้งหมด') ||
                    (filters.dateRange && 
                     filters.dateRange[0].getTime() === preset.range()[0].getTime() &&
                     filters.dateRange[1].getTime() === preset.range()[1].getTime())
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log Levels Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ระดับบันทึก
            </label>
            <div className="flex flex-wrap gap-2">
              {logLevels.map((level) => (
                <label key={level.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.levels.includes(level.value)}
                    onChange={(e) => handleLevelChange(level.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                    level.color === 'gray' ? 'bg-gray-100 text-gray-800' :
                    level.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    level.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    level.color === 'red' ? 'bg-red-100 text-red-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {level.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมวดหมู่
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {logCategories.map((category) => (
                <label key={category.value} className="flex items-center p-2 border rounded-md hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.value)}
                    onChange={(e) => handleCategoryChange(category.value, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm">
                    {category.icon} {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Hardware Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภทฮาร์ดแวร์
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hardwareType"
                  checked={!filters.hardwareType}
                  onChange={() => handleHardwareTypeChange(undefined)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">ทั้งหมด</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hardwareType"
                  checked={filters.hardwareType === 'DS16'}
                  onChange={() => handleHardwareTypeChange('DS16')}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">DS16 (15 ช่อง)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="hardwareType"
                  checked={filters.hardwareType === 'DS12'}
                  onChange={() => handleHardwareTypeChange('DS12')}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm">DS12 (12 ช่อง)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>กำลังกรองข้อมูล...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogFilterPanel;