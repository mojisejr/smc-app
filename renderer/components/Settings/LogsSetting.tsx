import React from "react";
import Tooltip from "../Shared/Tooltip";

interface LogsSettingProps {
  logs: any[];
  setting: any;
  exportLogHandler: () => void;
}

export default function LogsSetting({
  logs,
  setting,
  exportLogHandler,
}: LogsSettingProps) {
  return (
    <div className="bg-white rounded-lg p-6 min-h-[60vh] text-[#000]">
      <h2 className="text-start text-xl font-semibold mb-4">จัดการ Logs</h2>
      <table className="table table-sm">
        <tbody>
          <tr>
            <td className="flex gap-2 items-center font-bold">
              จำนวน log ทั้งหมด
              <Tooltip text={"จำนวน logs ทั้งหมด"} />
            </td>
            <td className="text-primary font-bold">{logs.length}</td>
          </tr>

          <tr>
            <td className="flex gap-2 items-center font-bold">
              จำนวน log สูงสุด
              <Tooltip text={"จำนวน logs สูงสุด"} />
            </td>
            <td className="text-primary font-bold">
              {setting?.max_log_counts}
            </td>
          </tr>
          <tr>
            <td></td>
            <td className="flex gap-2 items-center">
              <button
                onClick={exportLogHandler}
                className="btn btn-primary btn-sm"
              >
                export logs
              </button>
              <Tooltip text={"ส่ง logs ทั้งหมดไปยังไฟล์ .csv"} />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
