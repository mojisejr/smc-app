import React from "react";
import Tooltip from "../Shared/Tooltip";

interface SystemSettingProps {
  setting: any;
  portList: any[];
  selectedPort: string;
  handleSetSelectedPort: (port: string) => void;
  setSelectedPort: (port: string) => void;
}

export default function SystemSetting({
  setting,
  portList,
  selectedPort,
  handleSetSelectedPort,
  setSelectedPort,
}: SystemSettingProps) {
  return (
    <div className="bg-white rounded-lg p-6 min-h-[60vh] text-[#000]">
      <h2 className="text-start text-xl font-semibold mb-4">
        จัดการการตั้งค่าระบบ
      </h2>
      <table className="table table-sm">
        <tbody>
          <tr>
            <td className="font-semibold">port ที่กำลังใช้งาน</td>
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
        </tbody>
      </table>
    </div>
  );
}
