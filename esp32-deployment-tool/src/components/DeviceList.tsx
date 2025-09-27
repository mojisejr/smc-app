'use client'

import { useState, useEffect } from 'react';
import { ESP32Device } from '@/types';

interface DeviceListProps {
  onDeviceSelect: (device: ESP32Device) => void;
  selectedDevice: ESP32Device | null;
  disabled?: boolean;
}

/**
 * Badge component for chip type display
 */
function ChipTypeBadge({ chipType }: { chipType?: string }): JSX.Element {
  if (!chipType) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Unknown
      </span>
    );
  }

  // Color coding based on chip type
  const getChipTypeColor = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'ESP32':
        return 'bg-blue-100 text-blue-800';
      case 'ESP32-S3':
        return 'bg-green-100 text-green-800';
      case 'ESP32-C3':
        return 'bg-purple-100 text-purple-800';
      case 'ESP32-S2':
        return 'bg-yellow-100 text-yellow-800';
      case 'ESP32-C6':
        return 'bg-indigo-100 text-indigo-800';
      case 'ESP32-H2':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChipTypeColor(chipType)}`}>
      {chipType}
    </span>
  );
}

/**
 * Badge component for compatibility status
 */
function CompatibilityBadge({ 
  isSupported, 
  isMedicalDeviceCompatible 
}: { 
  isSupported?: boolean; 
  isMedicalDeviceCompatible?: boolean; 
}): JSX.Element {
  if (isSupported === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        ⚪ Unknown
      </span>
    );
  }

  if (!isSupported) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        ❌ Not Supported
      </span>
    );
  }

  if (isMedicalDeviceCompatible) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✅ Medical Compatible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      ⚠️ Limited Support
    </span>
  );
}

/**
 * Detection status indicator
 */
function DetectionStatusIndicator({ device }: { device: ESP32Device }): JSX.Element {
  const { detectionStatus, detectionError } = device;

  switch (detectionStatus) {
    case 'detecting':
      return (
        <div className="flex items-center text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
          <span className="text-xs">Detecting...</span>
        </div>
      );
    case 'detected':
      return (
        <div className="flex items-center text-green-600">
          <span className="text-xs">✓ Detected</span>
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center text-red-600" title={detectionError}>
          <span className="text-xs">✗ Detection Failed</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center text-gray-500">
          <span className="text-xs">⏳ Pending</span>
        </div>
      );
  }
}

export default function DeviceList({ onDeviceSelect, selectedDevice, disabled }: DeviceListProps) {
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectDevices = async (): Promise<void> => {
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

  /**
   * Trigger chip detection for a specific device
   */
  const detectChipInfo = async (device: ESP32Device): Promise<void> => {
    // Update device status to detecting
    setDevices(prevDevices => 
      prevDevices.map(d => 
        d.port === device.port 
          ? { ...d, detectionStatus: 'detecting' as const, detectionError: undefined }
          : d
      )
    );

    try {
      const response = await fetch('/api/chip-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ port: device.port }),
      });

      const result = await response.json();

      // Update device with detection results
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.port === device.port 
            ? {
                ...d,
                detectionStatus: result.success ? 'detected' as const : 'failed' as const,
                chipType: result.chipType,
                boardConfig: result.boardConfig,
                isSupported: result.isSupported,
                isMedicalDeviceCompatible: result.isMedicalDeviceCompatible,
                macAddress: result.macAddress,
                chipDetails: result.chipDetails,
                detectionError: result.error
              }
            : d
        )
      );

      if (result.success) {
        console.log(`INFO: Chip detection successful for ${device.port}: ${result.chipType}`);
      } else {
        console.error(`ERROR: Chip detection failed for ${device.port}: ${result.error}`);
      }
    } catch (err) {
      console.error('ERROR: Chip detection request failed:', err);
      
      // Update device with error status
      setDevices(prevDevices => 
        prevDevices.map(d => 
          d.port === device.port 
            ? { 
                ...d, 
                detectionStatus: 'failed' as const, 
                detectionError: 'Network error during chip detection' 
              }
            : d
        )
      );
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
        <div className="space-y-3">
          {devices.map((device, index) => (
            <div
              key={`${device.port}-${index}`}
              className={`p-4 border rounded-md cursor-pointer transition-colors ${
                selectedDevice?.port === device.port
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => !disabled && onDeviceSelect(device)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className={`w-3 h-3 rounded-full mr-3 mt-1 ${
                    selectedDevice?.port === device.port ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{device.port}</p>
                      <DetectionStatusIndicator device={device} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{device.description}</p>
                    {device.manufacturer && (
                      <p className="text-xs text-gray-500 mb-2">{device.manufacturer}</p>
                    )}
                    
                    {/* Chip Information Display */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <ChipTypeBadge chipType={device.chipType} />
                      <CompatibilityBadge 
                        isSupported={device.isSupported} 
                        isMedicalDeviceCompatible={device.isMedicalDeviceCompatible} 
                      />
                    </div>
                    
                    {/* Additional chip details */}
                    {device.macAddress && (
                      <p className="text-xs text-gray-500">
                        MAC: {device.macAddress}
                      </p>
                    )}
                    
                    {device.boardConfig && (
                      <p className="text-xs text-gray-500">
                        Board: {device.boardConfig}
                      </p>
                    )}
                    
                    {device.detectionError && (
                      <p className="text-xs text-red-600 mt-1">
                        Error: {device.detectionError}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Chip Detection Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    detectChipInfo(device);
                  }}
                  disabled={device.detectionStatus === 'detecting' || disabled}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Detect chip information"
                >
                  {device.detectionStatus === 'detecting' ? '...' : '🔍'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDevice && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-medium">เลือกแล้ว: {selectedDevice.port}</p>
          <p className="text-green-700 text-sm">{selectedDevice.description}</p>
          {selectedDevice.chipType && (
            <div className="flex items-center gap-2 mt-2">
              <ChipTypeBadge chipType={selectedDevice.chipType} />
              <CompatibilityBadge 
                isSupported={selectedDevice.isSupported} 
                isMedicalDeviceCompatible={selectedDevice.isMedicalDeviceCompatible} 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}