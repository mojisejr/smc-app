import React, { useState, useEffect } from "react";
import Tooltip from "../Shared/Tooltip";
import { ipcRenderer } from "electron";

interface SystemSettingProps {
  setting: any;
  portList: any[];
  selectedPort: string;
  handleSetSelectedPort: (port: string) => void;
  handleSetIndicatorPort: (port: string) => void;
  setSelectedPort: (port: string) => void;
}

export default function SystemSetting({
  setting,
  portList,
  selectedPort,
  handleSetSelectedPort,
  handleSetIndicatorPort,
  setSelectedPort,
}: SystemSettingProps) {
  const [hardwareType, setHardwareType] = useState<'AUTO' | 'KU16' | 'CU12'>('AUTO');
  const [currentHardwareInfo, setCurrentHardwareInfo] = useState<any>(null);

  // Load current hardware type on component mount
  useEffect(() => {
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
    
    loadHardwareInfo();
    setHardwareType(setting?.hardware_type || 'AUTO');
  }, [setting]);

  const handleSetHardwareType = async () => {
    try {
      const result = await ipcRenderer.invoke('set-hardware-type', hardwareType);
      if (result.success) {
        alert(result.message);
      } else {
        alert(`Failed to set hardware type: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 min-h-[60vh] text-[#000]">
      <h2 className="text-start text-xl font-semibold mb-4">
        จัดการการตั้งค่าระบบ
      </h2>
      <table className="table table-sm">
        <tbody>
          <tr>
            <td className="font-semibold">ประเภทฮาร์ดแวร์ที่ใช้งาน</td>
            <td className="text-center text-blue-500 font-bold">
              {currentHardwareInfo ? 
                `${currentHardwareInfo.type} (${currentHardwareInfo.maxSlots} ช่อง)` : 
                setting?.hardware_type || 'AUTO'
              }
            </td>
            <td className="flex gap-2 items-center justify-center">
              <select
                value={hardwareType}
                onChange={(e) => setHardwareType(e.target.value as 'AUTO' | 'KU16' | 'CU12')}
                className="select select-sm bg-white"
              >
                <option value="AUTO">AUTO (อัตโนมัติ)</option>
                <option value="KU16">KU16 (15 ช่อง)</option>
                <option value="CU12">CU12 (12 ช่อง)</option>
              </select>
              <button
                onClick={handleSetHardwareType}
                className="btn btn-sm btn-primary"
              >
                ตั้งค่า
              </button>
              <Tooltip text="เลือกประเภทฮาร์ดแวร์ที่ต้องการใช้งาน (ต้องรีสตาร์ทแอปพลิเคชัน)" />
            </td>
          </tr>
          <tr>
            <td className="font-semibold">port ระบบ lock ที่กำลังใช้งาน</td>
            <td className="text-center text-blue-500 font-bold">
              {setting?.ku_port}
            </td>
            <td className="flex gap-2 items-center justify-center">
              <select
                onChange={(e) => setSelectedPort(e.target.value)}
                className="select select-sm bg-white"
              >
                <option value={null}>เลือก port</option>
                {portList.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSetSelectedPort(selectedPort)}
                className="btn btn-sm btn-primary"
              >
                แก้ไข
              </button>
              <Tooltip text="เลือก port ที่ต้องการใช้งาน แล้วกดแก้ไข" />
            </td>
          </tr>
          <tr>
            <td className="font-semibold">
              port ระบบ indicator ที่กำลังใช้งาน
            </td>
            <td className="text-center text-blue-500 font-bold">
              {setting?.indi_port}
            </td>
            <td className="flex gap-2 items-center justify-center">
              <select
                onChange={(e) => setSelectedPort(e.target.value)}
                className="select select-sm bg-white"
              >
                <option value={null}>เลือก port</option>
                {portList.map((port) => (
                  <option key={port.path} value={port.path}>
                    {port.path}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleSetIndicatorPort(selectedPort)}
                className="btn btn-sm btn-primary"
              >
                แก้ไข
              </button>
              <Tooltip text="เลือก port ที่ต้องการใช้งาน แล้วกดแก้ไข" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
