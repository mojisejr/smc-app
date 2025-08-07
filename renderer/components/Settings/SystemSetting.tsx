import React, { useState, useEffect } from "react";
import Tooltip from "../Shared/Tooltip";
import { ipcRenderer } from "electron";
import HardwareConfigWizard from "./HardwareConfigWizard";

interface SystemSettingProps {
  setting: any;
  portList: any[];
  selectedPort: string;
  handleSetSelectedPort: (port: string) => void;
  handleSetIndicatorPort: (port: string) => void;
  setSelectedPort: (port: string) => void;
}

interface HardwareConfig {
  type: 'CU12' | 'KU16';
  port: string;
  baudrate: number;
  maxSlots: number;
  requiresRestart: boolean;
}

export default function SystemSetting({
  setting,
  portList,
  selectedPort,
  handleSetSelectedPort,
  handleSetIndicatorPort,
  setSelectedPort,
}: SystemSettingProps) {
  const [currentHardwareInfo, setCurrentHardwareInfo] = useState<any>(null);
  const [currentConfig, setCurrentConfig] = useState<HardwareConfig | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [portExists, setPortExists] = useState<boolean>(true);

  // Load current hardware info and configuration
  useEffect(() => {
    loadHardwareInfo();
    loadCurrentConfig();
  }, [setting]);

  // Real-time port existence check (hybrid validation)
  useEffect(() => {
    if (currentHardwareInfo?.port) {
      checkPortExistence(currentHardwareInfo.port);
    }
  }, [currentHardwareInfo]);

  const loadHardwareInfo = async () => {
    try {
      const result = await ipcRenderer.invoke('get-hardware-type');
      if (result.success) {
        setCurrentHardwareInfo(result.hardwareInfo);
      }
    } catch (error) {
      console.error('Failed to load hardware info:', error);
    }
  };

  const loadCurrentConfig = async () => {
    try {
      const config = await ipcRenderer.invoke('get-current-hardware-config');
      setCurrentConfig(config);
    } catch (error) {
      console.error('Failed to load current config:', error);
    }
  };

  const checkPortExistence = async (port: string) => {
    try {
      const exists = await ipcRenderer.invoke('check-port-exists', port);
      setPortExists(exists);
    } catch (error) {
      console.error('Failed to check port existence:', error);
      setPortExists(false);
    }
  };

  const handleOpenWizard = () => {
    setIsWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
  };

  const handleConfigSaved = (newConfig: HardwareConfig) => {
    setCurrentConfig(newConfig);
    // Refresh hardware info after saving
    setTimeout(() => {
      loadHardwareInfo();
    }, 500);
  };

  const getCurrentPort = () => {
    if (!currentHardwareInfo) return 'ยังไม่ได้ตั้งค่า';
    
    const port = currentHardwareInfo.port;
    if (!port) return 'ยังไม่ได้ตั้งค่า';
    
    return port;
  };

  const getPortStatusColor = () => {
    if (!currentHardwareInfo?.port) return 'text-gray-500';
    return portExists ? 'text-blue-500' : 'text-red-500';
  };

  const getPortStatusIcon = () => {
    if (!currentHardwareInfo?.port) return '';
    return portExists ? '✅' : '❌';
  };

  return (
    <>
      <div className="bg-white rounded-lg p-4 text-[#000]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-start text-xl font-semibold">
            จัดการการตั้งค่าระบบ
          </h2>
          <button
            onClick={handleOpenWizard}
            className="btn btn-primary btn-sm"
          >
            🔧 ตั้งค่าฮาร์ดแวร์
          </button>
        </div>

        <div className="space-y-4">
          {/* Hardware Configuration Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">สถานะการตั้งค่าปัจจุบัน</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-sm text-gray-600 mb-1">ประเภทฮาร์ดแวร์</div>
                <div className="font-semibold text-lg">
                  {currentHardwareInfo ? 
                    `${currentHardwareInfo.type} (${currentHardwareInfo.maxSlots} ช่อง)` : 
                    'ยังไม่ได้ตั้งค่า'
                  }
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-sm text-gray-600 mb-1">Port ระบบ Lock</div>
                <div className={`font-semibold text-lg flex items-center gap-2 ${getPortStatusColor()}`}>
                  <span>{getCurrentPort()}</span>
                  <span>{getPortStatusIcon()}</span>
                </div>
                {!portExists && currentHardwareInfo?.port && (
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ ไม่พบ port ในระบบ
                  </div>
                )}
              </div>
            </div>

            {currentConfig && (
              <div className="mt-4 bg-blue-50 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <strong>การตั้งค่าล่าสุด:</strong> {currentConfig.type} | 
                  Port: {currentConfig.port} | 
                  Baudrate: {currentConfig.baudrate} | 
                  {currentConfig.maxSlots} ช่อง
                </div>
              </div>
            )}
          </div>

          {/* Legacy Indicator Port Setting */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">การตั้งค่า Indicator Port</h3>
            
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Port Indicator ปัจจุบัน</div>
                  <div className="font-semibold text-blue-500">
                    {setting?.indi_port || 'ยังไม่ได้ตั้งค่า'}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    onChange={(e) => setSelectedPort(e.target.value)}
                    className="select select-sm bg-white border-gray-300"
                  >
                    <option value="">เลือก port</option>
                    {portList.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSetIndicatorPort(selectedPort)}
                    className="btn btn-sm btn-outline"
                    disabled={!selectedPort}
                  >
                    แก้ไข
                  </button>
                  <Tooltip text="เลือก port สำหรับ indicator แล้วกดแก้ไข" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-2">💡</div>
              <div>
                <div className="font-semibold text-yellow-800 mb-1">คำแนะนำ</div>
                <div className="text-sm text-yellow-700">
                  • ใช้ปุ่ม "ตั้งค่าฮาร์ดแวร์" เพื่อเปลี่ยนประเภทฮาร์ดแวร์หรือ port แบบครบถ้วน<br/>
                  • ระบบจะทดสอบการเชื่อมต่อก่อนบันทึกการตั้งค่า<br/>
                  • การเปลี่ยนฮาร์ดแวร์จะต้องรีสตาร์ทแอปพลิเคชัน
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Configuration Wizard */}
      <HardwareConfigWizard
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        currentConfig={currentConfig}
        onConfigSaved={handleConfigSaved}
      />
    </>
  );
}
