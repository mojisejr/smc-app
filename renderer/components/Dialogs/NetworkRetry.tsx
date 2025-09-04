import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ipcRenderer } from 'electron';
import {
  DialogBase,
  DialogHeader,
  StatusIndicator,
  DialogButton,
} from '../Shared/DesignSystem';

/**
 * Network Retry Dialog
 * 
 * แสดงเมื่อ ESP32 connection ล้มเหลว
 * ให้ user retry หรือเปลี่ยน network settings
 */

interface NetworkRetryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => Promise<void>;
  onChangeNetwork: () => void;
  currentNetwork?: {
    ssid?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'failed';
  };
  esp32Status?: {
    ip?: string;
    macAddress?: string;
    lastSeen?: Date;
    status: 'online' | 'offline' | 'timeout';
  };
}

export default function NetworkRetryDialog({
  isOpen,
  onClose,
  onRetry,
  onChangeNetwork,
  currentNetwork,
  esp32Status,
}: NetworkRetryDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset retry count when dialog opens
  useEffect(() => {
    if (isOpen) {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [isOpen]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } catch (error) {
      console.error('Network retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getNetworkStatusColor = () => {
    switch (currentNetwork?.status) {
      case 'connected': return 'success';
      case 'connecting': return 'info';
      case 'failed': return 'error';
      default: return 'warning';
    }
  };

  const getESP32StatusColor = () => {
    switch (esp32Status?.status) {
      case 'online': return 'success';
      case 'timeout': return 'warning';
      case 'offline': return 'error';
      default: return 'warning';
    }
  };

  const getNetworkStatusText = () => {
    switch (currentNetwork?.status) {
      case 'connected': return 'เชื่อมต่อแล้ว';
      case 'connecting': return 'กำลังเชื่อมต่อ...';
      case 'failed': return 'เชื่อมต่อล้มเหลว';
      case 'disconnected': return 'ไม่ได้เชื่อมต่อ';
      default: return 'ไม่ทราบสถานะ';
    }
  };

  const getESP32StatusText = () => {
    switch (esp32Status?.status) {
      case 'online': return 'ออนไลน์';
      case 'timeout': return 'หมดเวลาตอบสนอง';
      case 'offline': return 'ออฟไลน์';
      default: return 'ไม่ทราบสถานะ';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <DialogBase maxWidth="max-w-[500px]">
        <DialogHeader 
          title="การเชื่อมต่อเครือข่ายล้มเหลว" 
          variant="warning" 
        />

        <div className="p-6 space-y-4">
          {/* Network Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">สถานะเครือข่าย</h3>
            <StatusIndicator
              status={getNetworkStatusColor()}
              message={`${currentNetwork?.ssid || 'ไม่ระบุ'}: ${getNetworkStatusText()}`}
            />
          </div>

          {/* ESP32 Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">สถานะอุปกรณ์ ESP32</h3>
            <StatusIndicator
              status={getESP32StatusColor()}
              message={`${esp32Status?.ip || 'ไม่ทราบ IP'}: ${getESP32StatusText()}`}
            />
            
            {esp32Status?.macAddress && (
              <div className="text-xs text-gray-500">
                MAC Address: {esp32Status.macAddress}
              </div>
            )}
            
            {esp32Status?.lastSeen && (
              <div className="text-xs text-gray-500">
                ติดต่อครั้งล่าสุด: {esp32Status.lastSeen.toLocaleString('th-TH')}
              </div>
            )}
          </div>

          {/* Retry Information */}
          {retryCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="text-sm text-yellow-800">
                ลองเชื่อมต่อแล้ว {retryCount} ครั้ง
              </div>
            </div>
          )}

          {/* Connection Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">💡 วิธีแก้ไขปัญหา:</div>
              <ul className="space-y-1 text-xs">
                <li>• ตรวจสอบว่า ESP32 เปิดเครื่องและทำงานอยู่</li>
                <li>• ตรวจสอบการเชื่อมต่อ WiFi ของคอมพิวเตอร์</li>
                <li>• ลองเปลี่ยนไปใช้เครือข่าย WiFi อื่น</li>
                <li>• รีสตาร์ท ESP32 และลองใหม่</li>
              </ul>
            </div>
          </div>

          {/* Progress indicator when retrying */}
          {isRetrying && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center p-4"
            >
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">กำลังลองเชื่อมต่อใหม่...</span>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-3 pt-4">
            <DialogButton
              variant="primary"
              onClick={handleRetry}
              loading={isRetrying}
              className="flex-1"
            >
              {isRetrying ? 'กำลังลองใหม่...' : 'ลองเชื่อมต่อใหม่'}
            </DialogButton>
            
            <DialogButton
              variant="secondary"
              onClick={onChangeNetwork}
              disabled={isRetrying}
              className="flex-1"
            >
              เปลี่ยนเครือข่าย
            </DialogButton>
          </div>

          <div className="flex justify-center pt-2">
            <DialogButton
              variant="secondary"
              onClick={onClose}
              disabled={isRetrying}
              className="text-gray-500 hover:text-gray-700"
            >
              ปิด
            </DialogButton>
          </div>
        </div>
      </DialogBase>
    </motion.div>
  );
}

/**
 * Hook สำหรับใช้ NetworkRetryDialog
 */
export function useNetworkRetry() {
  const [isOpen, setIsOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{
    ssid?: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'failed';
  }>({ status: 'disconnected' });
  
  const [esp32Status, setESP32Status] = useState<{
    ip?: string;
    macAddress?: string;
    lastSeen?: Date;
    status: 'online' | 'offline' | 'timeout';
  }>({ status: 'offline' });

  const showRetryDialog = () => setIsOpen(true);
  const hideRetryDialog = () => setIsOpen(false);

  const handleRetry = async () => {
    // อัปเดตสถานะเป็น connecting
    setNetworkStatus(prev => ({ ...prev, status: 'connecting' }));
    setESP32Status(prev => ({ ...prev, status: 'offline' }));

    try {
      // ส่ง IPC request ไปยัง main process เพื่อลองเชื่อมต่อ ESP32 ใหม่
      const result = await ipcRenderer.invoke('test-esp32-connection');
      
      if (result.success) {
        setNetworkStatus(prev => ({ ...prev, status: 'connected' }));
        setESP32Status({
          ip: result.ip,
          macAddress: result.macAddress,
          lastSeen: new Date(),
          status: 'online'
        });
        
        // ปิด dialog เมื่อเชื่อมต่อสำเร็จ
        setTimeout(() => {
          hideRetryDialog();
        }, 1500);
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      console.error('ESP32 connection retry failed:', error);
      setNetworkStatus(prev => ({ ...prev, status: 'failed' }));
      setESP32Status(prev => ({ ...prev, status: 'timeout' }));
      throw error;
    }
  };

  const handleChangeNetwork = () => {
    // ปิด dialog และเปิด network settings
    hideRetryDialog();
    
    // ส่ง IPC request ไปยัง main process เพื่อเปิด network settings
    ipcRenderer.invoke('open-network-settings');
  };

  return {
    isOpen,
    networkStatus,
    esp32Status,
    showRetryDialog,
    hideRetryDialog,
    handleRetry,
    handleChangeNetwork,
    setNetworkStatus,
    setESP32Status,
  };
}