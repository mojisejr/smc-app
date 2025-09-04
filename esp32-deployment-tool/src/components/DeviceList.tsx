'use client'

import { useState, useEffect } from 'react';
import { ESP32Device } from '@/types';

interface DeviceListProps {
  onDeviceSelect: (device: ESP32Device) => void;
  selectedDevice: ESP32Device | null;
  disabled?: boolean;
}

export default function DeviceList({ onDeviceSelect, selectedDevice, disabled }: DeviceListProps) {
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectDevices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/detect');
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices);
        console.log(`info: Found ${data.count} ESP32 devices`);
      } else {
        setError(data.error || 'Failed to detect devices');
      }
    } catch (err) {
      setError('Network error while detecting devices');
      console.error('error: Device detection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    detectDevices();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">🔌 ESP32 Devices</h2>
        <button
          onClick={detectDevices}
          disabled={isLoading || disabled}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
        >
          {isLoading ? 'กำลังค้นหา...' : 'ค้นหาใหม่'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">ข้อผิดพลาด:</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-1">
            กรุณาตรวจสอบ:
            <br />• ESP32 เสียบ USB เรียบร้อย
            <br />• Driver ติดตั้งแล้ว (CH340, CP210x)
            <br />• PlatformIO CLI installed
          </p>
        </div>
      )}

      {devices.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          <p>ไม่พบ ESP32 devices</p>
          <p className="text-sm">กรุณาเสียบ ESP32 เข้า USB และกดค้นหาใหม่</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="space-y-2">
          {devices.map((device, index) => (
            <div
              key={`${device.port}-${index}`}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedDevice?.port === device.port
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => !disabled && onDeviceSelect(device)}
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  selectedDevice?.port === device.port ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{device.port}</p>
                  <p className="text-sm text-gray-600">{device.description}</p>
                  {device.manufacturer && (
                    <p className="text-xs text-gray-500">{device.manufacturer}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDevice && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-medium">เลือกแล้ว: {selectedDevice.port}</p>
          <p className="text-green-700 text-sm">{selectedDevice.description}</p>
        </div>
      )}
    </div>
  );
}