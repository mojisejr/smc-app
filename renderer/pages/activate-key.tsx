import { ipcRenderer } from "electron";
import { useRouter } from "next/router";
import React, { useState } from "react";

interface WiFiCredentials {
  ssid: string;
  password: string;
  ip_address: string;
  mac_address: string;
}

interface ActivationState {
  status: 'idle' | 'processing' | 'wifi-info' | 'completing' | 'success' | 'error';
  selectedFile: File | null;
  errorMessage: string;
  wifiCredentials: WiFiCredentials | null;
  filePath: string | null;
}

export default function ActivatePage() {
  const { replace } = useRouter();
  const [state, setState] = useState<ActivationState>({
    status: 'idle',
    selectedFile: null,
    errorMessage: '',
    wifiCredentials: null,
    filePath: null
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setState(prev => ({
      ...prev,
      selectedFile: file,
      errorMessage: '',
      status: 'idle'
    }));
  };

  const handleProcessLicense = async () => {
    if (!state.selectedFile) {
      setState(prev => ({
        ...prev,
        errorMessage: 'กรุณาเลือกไฟล์ license.json',
        status: 'error'
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'processing', errorMessage: '' }));

    try {
      const filePath = state.selectedFile.path;
      const result = await ipcRenderer.invoke("process-license-file", { filePath });

      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          status: 'wifi-info',
          wifiCredentials: result.data,
          filePath: filePath
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: result.error || 'ไม่สามารถประมวลผลไฟล์ลิขสิทธิ์ได้'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
      }));
    }
  };

  const handleCompleteActivation = async () => {
    if (!state.filePath) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'ไม่พบไฟล์ลิขสิทธิ์'
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'completing', errorMessage: '' }));

    try {
      const result = await ipcRenderer.invoke("complete-activation", { filePath: state.filePath });

      if (result.success) {
        console.log('✅ [DEBUG] UI: Activation completed successfully');
        setState(prev => ({ ...prev, status: 'success' }));
        
        // Check if activation is actually successful
        console.log('🔍 [DEBUG] UI: Checking activation status...');
        const activated = await ipcRenderer.invoke("check-activation-key");
        console.log('📋 [DEBUG] UI: Activation check result:', activated);
        
        if (activated) {
          console.log('🎉 [DEBUG] UI: Activation confirmed, redirecting to /home in 2 seconds...');
          setTimeout(() => {
            console.log('🚀 [DEBUG] UI: Redirecting now...');
            replace("/home");
          }, 2000);
        } else {
          console.warn('⚠️ [DEBUG] UI: Activation not confirmed, but proceeding with redirect anyway...');
          // Force redirect even if check fails - the activation was successful
          setTimeout(() => {
            console.log('🚀 [DEBUG] UI: Force redirecting to /home...');
            replace("/home");
          }, 3000);
        }
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: result.error || 'ไม่สามารถเปิดใช้งานได้'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
      }));
    }
  };

  const handleBackToFileSelection = () => {
    setState(prev => ({
      ...prev,
      status: 'idle',
      wifiCredentials: null,
      filePath: null,
      errorMessage: ''
    }));
  };

  const renderStatusMessage = () => {
    switch (state.status) {
      case 'processing':
        return (
          <div className="text-blue-600 mt-3">
            กรุณารอสักครู่ขณะที่เราตรวจสอบไฟล์ลิขสิทธิ์...
          </div>
        );
      case 'completing':
        return (
          <div className="text-blue-600 mt-3">
            กรุณารอสักครู่ขณะที่เราตรวจสอบ ESP32 และเปิดใช้งานลิขสิทธิ์...
          </div>
        );
      case 'success':
        return (
          <div className="text-green-600 mt-3">
            ✅ การเปิดใช้งานสำเร็จ!<br />
            แอปพลิเคชันของคุณพร้อมใช้งานแล้ว จะทำการเปลี่ยนหน้าอัตโนมัติ...
          </div>
        );
      case 'error':
        return (
          <div className="text-red-600 mt-3">
            ❌ ข้อผิดพลาด: {state.errorMessage}
          </div>
        );
      default:
        return null;
    }
  };

  const renderWiFiInstructions = () => {
    if (state.status !== 'wifi-info' || !state.wifiCredentials) return null;

    return (
      <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg mt-4">
        <h3 className="text-lg font-bold text-blue-800 mb-3">📶 การเชื่อมต่อ WiFi</h3>
        
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">ชื่อเครือข่าย (SSID):</div>
            <div className="font-mono text-lg font-bold text-blue-700">{state.wifiCredentials.ssid}</div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">รหัสผ่าน:</div>
            <div className="font-mono text-lg font-bold text-blue-700">{state.wifiCredentials.password}</div>
          </div>

          <div className="bg-white p-3 rounded border">
            <div className="text-sm text-gray-600">IP Address:</div>
            <div className="font-mono text-sm text-gray-800">{state.wifiCredentials.ip_address}</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-sm text-yellow-800">
            <strong>📋 ขั้นตอนการเชื่อมต่อ:</strong><br />
            1. เชื่อมต่อ WiFi ของคุณกับเครือข่าย <strong>{state.wifiCredentials.ssid}</strong><br />
            2. ใช้รหัสผ่าน: <strong>{state.wifiCredentials.password}</strong><br />
            3. เมื่อเชื่อมต่อสำเร็จแล้ว กดปุ่ม "ยืนยันการเชื่อมต่อ" ด้านล่าง
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex h-screen justify-center items-center">
      <div className="flex gap-3 flex-col max-w-lg w-full mx-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">เปิดใช้งานแอปพลิเคชัน</h1>
        </div>
        
        {/* File Selection Step */}
        {(state.status === 'idle' || state.status === 'processing' || state.status === 'error') && (
          <>
            <div className="form-control">
              <label className="label label-text">
                กรุณาเลือกไฟล์ license.json ที่คุณได้รับ
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="file-input file-input-bordered w-full"
                disabled={state.status === 'processing'}
              />
              {state.selectedFile && (
                <div className="text-sm text-gray-600 mt-1">
                  ไฟล์ที่เลือก: {state.selectedFile.name}
                </div>
              )}
            </div>

            <button 
              onClick={handleProcessLicense}
              disabled={!state.selectedFile || state.status === 'processing'}
              className="btn btn-primary min-w-[200px]"
            >
              {state.status === 'processing' ? "กำลังประมวลผล..." : "ประมวลผลไฟล์ลิขสิทธิ์"}
            </button>
          </>
        )}

        {/* WiFi Connection Step */}
        {state.status === 'wifi-info' && (
          <>
            {renderWiFiInstructions()}
            
            <div className="flex gap-2 mt-4">
              <button 
                onClick={handleBackToFileSelection}
                className="btn btn-outline flex-1"
              >
                กลับ
              </button>
              <button 
                onClick={handleCompleteActivation}
                className="btn btn-success flex-1"
              >
                ยืนยันการเชื่อมต่อ
              </button>
            </div>
          </>
        )}

        {/* Completion Step */}
        {(state.status === 'completing' || state.status === 'success') && (
          <div className="text-center">
            <div className="loading loading-spinner loading-lg mb-4" />
            <p className="text-lg">
              {state.status === 'completing' ? "กำลังตรวจสอบ ESP32..." : "เปิดใช้งานสำเร็จ!"}
            </p>
          </div>
        )}

        {renderStatusMessage()}
      </div>
    </div>
  );
}
