/**
 * Log Analytics Dashboard
 * SAFETY: Non-blocking analytics with optimized data visualization
 * CRITICAL: Real-time metrics with performance monitoring
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ipcRenderer } from 'electron';

export interface LogAnalytics {
  timeRange: { start: Date; end: Date };
  totalOperations: number;
  successRate: number;
  activeUsers: number;
  logLevelsDistribution: Array<{ level: string; count: number }>;
  categoriesDistribution: Array<{ category: string; count: number }>;
  operationsBreakdown: Array<{ operation: string; status: string; count: number }>;
  hardwareUsage: Array<{ hardwareType: string; count: number }>;
  recentErrors: Array<any>;
  generatedAt: Date;
}

export interface LogAnalyticsDashboardProps {
  className?: string;
  refreshInterval?: number;
  timeRange?: { start: Date; end: Date };
}

const LogAnalyticsDashboard: React.FC<LogAnalyticsDashboardProps> = ({
  className = '',
  refreshInterval = 30000, // 30 seconds
  timeRange: customTimeRange,
}) => {
  const [analytics, setAnalytics] = useState<LogAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');

  // Calculate time range based on selection
  const timeRange = useMemo(() => {
    if (customTimeRange) return customTimeRange;

    const end = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '6h':
        start.setHours(start.getHours() - 6);
        break;
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }

    return { start, end };
  }, [selectedTimeRange, customTimeRange]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await ipcRenderer.invoke('get_log_analytics', timeRange);
      
      if (result.success) {
        setAnalytics(result.analytics);
      } else {
        setError(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval]);

  // Calculate success rate color
  const getSuccessRateColor = useCallback((rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  // Format large numbers
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }, []);

  // Get time range label
  const getTimeRangeLabel = useCallback((range: string) => {
    const labels = {
      '1h': 'ชั่วโมงที่แล้ว',
      '6h': '6 ชั่วโมงที่แล้ว',
      '24h': '24 ชั่วโมงที่แล้ว',
      '7d': '7 วันที่แล้ว',
      '30d': '30 วันที่แล้ว',
    };
    return labels[range as keyof typeof labels] || range;
  }, []);

  if (isLoading && !analytics) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-lg"></div>
            <div className="h-64 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">แดชบอร์ดการวิเคราะห์บันทึก</h2>
            <p className="text-sm text-gray-500 mt-1">
              อัพเดทล่าสุด: {new Date(analytics.generatedAt).toLocaleString('th-TH')}
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '1h', label: '1ช' },
              { key: '6h', label: '6ช' },
              { key: '24h', label: '24ช' },
              { key: '7d', label: '7ว' },
              { key: '30d', label: '30ว' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedTimeRange(key as any)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedTimeRange === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Operations */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">การดำเนินการทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(analytics.totalOperations)}
                </p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">อัตราความสำเร็จ</p>
                <p className={`text-2xl font-bold ${getSuccessRateColor(analytics.successRate)}`}>
                  {analytics.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">ผู้ใช้งานที่ใช้งาน</p>
                <p className="text-2xl font-bold text-purple-900">
                  {analytics.activeUsers}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🚨</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">ข้อผิดพลาดล่าสุด</p>
                <p className="text-2xl font-bold text-red-900">
                  {analytics.recentErrors.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Log Levels Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การกระจายตัวของระดับบันทึก</h3>
            <div className="space-y-3">
              {analytics.logLevelsDistribution.map((item) => {
                const total = analytics.logLevelsDistribution.reduce((sum, level) => sum + level.count, 0);
                const percentage = total > 0 ? (item.count / total * 100) : 0;
                
                const levelColors = {
                  DEBUG: 'bg-gray-400',
                  INFO: 'bg-blue-400',
                  WARN: 'bg-yellow-400',
                  ERROR: 'bg-red-400',
                  CRITICAL: 'bg-purple-400',
                };
                
                return (
                  <div key={item.level} className="flex items-center">
                    <div className="w-20 text-sm text-gray-600">{item.level}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                      <div
                        className={`h-4 rounded-full ${levelColors[item.level as keyof typeof levelColors] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm text-gray-900 text-right">
                      {item.count}
                    </div>
                    <div className="w-12 text-sm text-gray-500 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categories Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การกระจายตัวของหมวดหมู่</h3>
            <div className="space-y-3">
              {analytics.categoriesDistribution.map((item) => {
                const total = analytics.categoriesDistribution.reduce((sum, cat) => sum + cat.count, 0);
                const percentage = total > 0 ? (item.count / total * 100) : 0;
                
                const categoryIcons = {
                  SYSTEM: '⚙️',
                  HARDWARE: '🔧',
                  DATABASE: '💾',
                  AUTH: '🔐',
                  IPC: '📡',
                  SECURITY: '🛡️',
                };
                
                return (
                  <div key={item.category} className="flex items-center">
                    <div className="w-20 text-sm text-gray-600 flex items-center">
                      <span className="mr-1">{categoryIcons[item.category as keyof typeof categoryIcons] || '📄'}</span>
                      {item.category}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                      <div
                        className="h-4 rounded-full bg-indigo-400"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm text-gray-900 text-right">
                      {item.count}
                    </div>
                    <div className="w-12 text-sm text-gray-500 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hardware Usage and Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Hardware Usage */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">การใช้ฮาร์ดแวร์</h3>
            <div className="space-y-3">
              {analytics.hardwareUsage.map((item) => {
                const total = analytics.hardwareUsage.reduce((sum, hw) => sum + hw.count, 0);
                const percentage = total > 0 ? (item.count / total * 100) : 0;
                
                return (
                  <div key={item.hardwareType} className="flex items-center">
                    <div className="w-16 text-sm text-gray-600">{item.hardwareType}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 mx-3">
                      <div
                        className={`h-4 rounded-full ${
                          item.hardwareType === 'DS16' ? 'bg-blue-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="w-12 text-sm text-gray-900 text-right">
                      {item.count}
                    </div>
                    <div className="w-12 text-sm text-gray-500 text-right">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operations Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">รายละเอียดการดำเนินการ</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analytics.operationsBreakdown.map((item, index) => (
                <div key={`${item.operation}-${item.status}-${index}`} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {item.operation}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'success' 
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Errors Section */}
        {analytics.recentErrors.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
              <span className="mr-2">🚨</span>
              ข้อผิดพลาดล่าสุด
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {analytics.recentErrors.slice(0, 5).map((error, index) => (
                <div key={index} className="bg-white rounded p-3 border-l-4 border-red-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        {error.errorType || 'Unknown Error'}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        {error.description || error.message || 'No description available'}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {new Date(error.createdAt).toLocaleString('th-TH')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      error.resolutionStatus === 'RESOLVED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {error.resolutionStatus || 'UNRESOLVED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            ช่วงเวลา: {getTimeRangeLabel(selectedTimeRange)}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAnalytics}
              className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>รีเฟรช</span>
            </button>
            <span>อัพเดททุก {refreshInterval / 1000} วินาที</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogAnalyticsDashboard;