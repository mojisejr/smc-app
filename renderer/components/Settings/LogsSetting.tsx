import React, { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import Tooltip from "../Shared/Tooltip";
import ExportWizardModal from "../Modals/ExportWizardModal";
import { ExportResult } from "../../types/export.types";
import { toast } from "react-toastify";

interface LogsSettingProps {
  logs: any[];
  setting: any;
  adminName?: string;
}

export default function LogsSetting({
  logs,
  setting,
  adminName = "Admin",
}: LogsSettingProps) {
  const [showExportWizard, setShowExportWizard] = useState(false);
  const [exportStats, setExportStats] = useState({
    activeExports: 0,
    availableFormats: 0,
  });

  // Load export statistics
  useEffect(() => {
    loadExportStats();
  }, []);

  const loadExportStats = async () => {
    try {
      const result = await ipcRenderer.invoke("get_export_stats");
      if (result.success) {
        setExportStats(result);
      }
    } catch (error) {
      console.error("Failed to load export stats:", error);
    }
  };

  const handleEnhancedExport = () => {
    setShowExportWizard(true);
  };

  const handleExportSuccess = (result: ExportResult) => {
    toast.success(
      `ส่งออกข้อมูลเรียบร้อย: ${
        result.filename
      } (${result.recordCount?.toLocaleString()} รายการ)`
    );
    loadExportStats();
  };

  // Calculate storage usage percentage
  const storageUsage = setting?.max_log_counts
    ? Math.round((logs.length / setting.max_log_counts) * 100)
    : 0;

  const getStorageColor = () => {
    if (storageUsage >= 90) return "text-red-600 bg-red-50";
    if (storageUsage >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <>
      <div className="bg-white rounded-lg p-6 min-h-[60vh] text-[#000]">
        <h2 className="text-start text-xl font-semibold mb-6">จัดการ Logs</h2>

        {/* Storage Overview Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">
            สถานะการจัดเก็บข้อมูล
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  จำนวน logs ปัจจุบัน
                </span>
                <span className="font-bold text-blue-600">
                  {logs.length.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">จำนวนสูงสุด</span>
                <span className="font-bold text-gray-800">
                  {setting?.max_log_counts?.toLocaleString() || "ไม่จำกัด"}
                </span>
              </div>
              {setting?.max_log_counts && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">การใช้งาน</span>
                    <span
                      className={`font-medium px-2 py-1 rounded-full ${getStorageColor()}`}
                    >
                      {storageUsage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full  transition-all duration-300 ${
                        storageUsage >= 90
                          ? "bg-error"
                          : storageUsage >= 70
                          ? "bg-blue-600"
                          : "bg-blue-400"
                      }`}
                      style={{ width: `${Math.min(storageUsage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">อัพเดทล่าสุด</span>
                <span className="text-sm text-gray-800">
                  {new Date().toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {storageUsage >= 80 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-2">
                  <p className="text-xs text-yellow-700">
                    <strong>คำเตือน:</strong> พื้นที่จัดเก็บใกล้เต็ม
                    ควรส่งออกข้อมูลเก่าเพื่อเว้นพื้นที่
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            ตัวเลือกการส่งออกข้อมูล
          </h3>

          <div className="flex justify-center">
            {/* Enhanced Export - Only Option */}
            <button
              onClick={handleEnhancedExport}
              className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-colors text-center max-w-md w-full"
            >
              <div className="flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="font-medium text-lg">ส่งออกข้อมูล Logs</span>
              </div>
              <p className="text-sm text-blue-100">
                เลือกรูปแบบ (CSV/Excel), ตัวกรอง และโฟลเดอร์ปลายทาง
              </p>
            </button>
          </div>

          {/* Export Statistics */}
          <div className="mt-4 pt-3 border-t border-gray-300">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center">
                <span>รูปแบบที่รองรับ: {exportStats.availableFormats}</span>
                <Tooltip text="ระบบรองรับการส่งออกในรูปแบบ CSV และ Excel (XLSX) พร้อมการเข้ารหัสภาษาไทย" />
              </div>
              {exportStats.activeExports > 0 && (
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                  <span>กำลังส่งออก {exportStats.activeExports} งาน</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Wizard Modal */}
      <ExportWizardModal
        isOpen={showExportWizard}
        onClose={() => setShowExportWizard(false)}
        onSuccess={handleExportSuccess}
        adminName={adminName}
      />
    </>
  );
}
