'use client'

import { useState, useEffect, useCallback } from 'react';
import { SensorReading, SensorTestPanelProps } from '@/types';

export default function SensorTestPanel({ deviceIP, isVisible, onClose }: SensorTestPanelProps) {
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "testing">("testing");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSensorData = useCallback(async () => {
    if (!isVisible || !deviceIP) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://${deviceIP}/sensor`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SensorReading = await response.json();
      setCurrentReading(data);
      setConnectionStatus("connected");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setConnectionStatus("disconnected");
      setCurrentReading(null);
    } finally {
      setIsLoading(false);
    }
  }, [deviceIP, isVisible]);

  // Auto-refresh logic
  useEffect(() => {
    if (isAutoRefresh && isVisible) {
      const interval = setInterval(fetchSensorData, 3000);
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh, isVisible, fetchSensorData]);

  // Initial fetch when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchSensorData();
    }
  }, [isVisible, fetchSensorData]);

  const handleTestConnection = () => {
    setConnectionStatus("testing");
    fetchSensorData();
  };

  const formatTimestamp = () => {
    return new Date().toLocaleTimeString('th-TH');
  };

  const getSensorModeDisplay = (mode: string) => {
    switch (mode) {
      case 'live':
        return { text: '🟢 เซ็นเซอร์ทำงานปกติ', color: 'text-green-600' };
      case 'mock_fallback':
        return { text: '🟡 ใช้ข้อมูลสำรอง', color: 'text-yellow-600' };
      case 'mock':
        return { text: '🔴 ใช้ข้อมูลจำลอง', color: 'text-red-600' };
      default:
        return { text: '⚪ ไม่ทราบสถานะ', color: 'text-gray-600' };
    }
  };

  const getConnectionStatusDisplay = (status: string) => {
    switch (status) {
      case 'connected':
        return { text: '📡 เชื่อมต่อแล้ว', color: 'text-green-600' };
      case 'disconnected':
        return { text: '⚠️ ขาดการเชื่อมต่อ', color: 'text-red-600' };
      case 'testing':
        return { text: '🔄 กำลังทดสอบ', color: 'text-blue-600' };
      default:
        return { text: '⚪ ไม่ทราบสถานะ', color: 'text-gray-600' };
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">🌡️ ทดสอบเซ็นเซอร์ DHT22</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Current Reading Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">📊 ข้อมูลปัจจุบัน</h3>
          
          {error ? (
            <div className="text-red-600 text-center py-4">
              <p className="font-medium">เกิดข้อผิดพลาด</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : currentReading ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentReading.temp.toFixed(1)}°C
                </div>
                <div className="text-sm text-gray-600">🌡️ อุณหภูมิ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">
                  {currentReading.humid.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">💧 ความชื้น</div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">กำลังอ่านข้อมูล...</p>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>

        {/* Status Information */}
        {currentReading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600">สถานะเซ็นเซอร์</div>
              <div className={`font-medium ${getSensorModeDisplay(currentReading.mode).color}`}>
                {getSensorModeDisplay(currentReading.mode).text}
              </div>
            </div>
            
            <div className="bg-white border rounded-lg p-3">
              <div className="text-sm text-gray-600">การเชื่อมต่อ</div>
              <div className={`font-medium ${getConnectionStatusDisplay(connectionStatus).color}`}>
                {getConnectionStatusDisplay(connectionStatus).text}
              </div>
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => fetchSensorData()}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            <span>🔄</span>
            <span>{isLoading ? 'กำลังอ่าน...' : 'รีเฟรช'}</span>
          </button>

          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              isAutoRefresh 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>{isAutoRefresh ? '⏸️' : '▶️'}</span>
            <span>Auto-refresh: {isAutoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-gray-400"
          >
            <span>🧪</span>
            <span>ทดสอบการเชื่อมต่อ</span>
          </button>
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">🔧 การแก้ไขปัญหา</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            {currentReading ? (
              <>
                <div>• GPIO Pin: {currentReading.gpio} (Fixed)</div>
                <div>• Sensor Type: {currentReading.sensor}</div>
                <div>• Device IP: {deviceIP}</div>
                <div>• Customer ID: {currentReading.customer_id}</div>
                <div>• Last Update: {formatTimestamp()}</div>
              </>
            ) : (
              <>
                <div>• ตรวจสอบการเชื่อมต่อ WiFi กับ ESP32</div>
                <div>• ตรวจสอบว่า DHT22 เชื่อมต่อกับ GPIO 4 ถูกต้อง</div>
                <div>• ลอง Reset ESP32 และเชื่อมต่อใหม่</div>
                <div>• Device IP: {deviceIP}</div>
              </>
            )}
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}