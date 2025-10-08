import { ipcRenderer } from "electron";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import {
  DialogBase,
  DialogHeader,
  StatusIndicator,
  DialogButton,
} from "../components/Shared/DesignSystem";
import { useApp } from "../contexts/appContext";

/**
 * CLI License File Activation Page
 *
 * แทนที่ระบบ text key activation เดิมด้วย
 * CLI License File + ESP32 validation system
 */

type ActivationStep =
  | "loading"
  | "file-loading"
  | "file-parsing"
  | "expiry-check"
  | "organization-validation"
  | "wifi-credentials"
  | "wifi-connecting"
  | "mac-retrieval"
  | "mac-validation"
  | "saving"
  | "success"
  | "error";

interface ActivationData {
  organization?: string;
  customerId?: string;
  expiryDate?: string;
  macAddress?: string;
}

interface ProgressUpdate {
  step: string;
  progress: number;
  message?: string;
  timestamp: number;
  data?: any;
}

interface ActivationResult {
  success: boolean;
  error?: string;
  step?: string;
  data?: ActivationData;
}

const STEP_LABELS: Record<ActivationStep, string> = {
  loading: "เริ่มต้นการ activation",
  "file-loading": "กำลังโหลดไฟล์ license",
  "file-parsing": "ตรวจสอบไฟล์ license",
  "expiry-check": "ตรวจสอบวันหมดอายุ",
  "organization-validation": "ตรวจสอบข้อมูลองค์กร",
  "wifi-credentials": "ดึงข้อมูล WiFi",
  "wifi-connecting": "เชื่อมต่อ WiFi ESP32",
  "mac-retrieval": "ดึง MAC Address",
  "mac-validation": "ตรวจสอบ MAC Address",
  saving: "บันทึกการ activation",
  success: "เสร็จสิ้น",
  error: "เกิดข้อผิดพลาด",
};

const STEP_ICONS: Record<ActivationStep, string> = {
  loading: "🚀",
  "file-loading": "📄",
  "file-parsing": "🔍",
  "expiry-check": "📅",
  "organization-validation": "🏢",
  "wifi-credentials": "🔐",
  "wifi-connecting": "📶",
  "mac-retrieval": "🔗",
  "mac-validation": "✅",
  saving: "💾",
  success: "🎉",
  error: "❌",
};

export default function ActivatePage() {
  const { replace } = useRouter();
  const { refreshActivationStatus } = useApp();

  // State management
  const [currentStep, setCurrentStep] = useState<ActivationStep>("loading");
  const [progress, setProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [licenseData, setLicenseData] = useState<ActivationData | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [showManualWiFi, setShowManualWiFi] = useState<boolean>(false);
  const [wifiCredentials, setWifiCredentials] = useState<{ ssid: string; password: string } | null>(null);
  const [isRevalidation, setIsRevalidation] = useState<boolean>(false);
  const [revalidationError, setRevalidationError] = useState<string>("");

  // Listen for license validation failures
  useEffect(() => {
    const handleValidationFailure = (event: any, data: { error: string, isRevalidation: boolean }) => {
      setIsRevalidation(data.isRevalidation);
      setRevalidationError(data.error || "การตรวจสอบใบอนุญาตล้มเหลว กรุณาตรวจสอบการเชื่อมต่อกับ ESP32");
      setErrorMessage(data.error || "การตรวจสอบใบอนุญาตล้มเหลว กรุณาตรวจสอบการเชื่อมต่อกับ ESP32");
      setCurrentStep("error");
    };

    ipcRenderer.on('license-validation-failed', handleValidationFailure);
    
    return () => {
      ipcRenderer.removeListener('license-validation-failed', handleValidationFailure);
    };
  }, []);

  // Auto-start activation on page load
  useEffect(() => {
    if (!isRevalidation) {
      startActivationProcess();
    }
  }, [isRevalidation]);

    // Subscribe to progress updates
    const progressListener = (_event: any, update: ProgressUpdate) => {
      console.log(
        `info: Progress update - ${update.step}: ${update.progress}%`
      );

      setCurrentStep(update.step as ActivationStep);
      setProgress(update.progress);
      setCurrentMessage(update.message || "");

      if (update.data) {
        setLicenseData(update.data);
        
        // Phase 4.2: Handle manual WiFi connection requirement
        if (update.data.requiresManualConnection && update.data.wifiCredentials) {
          // Info log removed for production
          setWifiCredentials(update.data.wifiCredentials);
          setShowManualWiFi(true);
        }
      }
    };

    ipcRenderer.on("activation-progress", progressListener);

    return () => {
      ipcRenderer.removeListener("activation-progress", progressListener);
    };
  }, []);

  const startActivationProcess = async () => {
    try {
      setCurrentStep("loading");
      setProgress(0);
      setErrorMessage("");

      // Info log removed for production

      // Subscribe to progress updates
      await ipcRenderer.invoke("subscribe-activation-progress");

      // Start activation process
      const result: ActivationResult = await ipcRenderer.invoke(
        "activate-license-file"
      );

      if (result.success) {
        setCurrentStep("success");
        setProgress(100);
        setLicenseData(result.data || null);
        // Info log removed for production
        
        // Refresh activation status immediately after successful activation
        await refreshActivationStatus();
      } else {
        setCurrentStep("error");
        setProgress(0);
        setErrorMessage(result.error || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ");
        console.error("error: License activation failed:", result.error);
      }
    } catch (error: any) {
      console.error("error: Activation process failed:", error);
      setCurrentStep("error");
      setProgress(0);
      setErrorMessage(error.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
    }
  };

  const handleRetry = () => {
    startActivationProcess();
  };

  const handleContinue = async () => {
    // Refresh activation status to ensure unified state synchronization
    await refreshActivationStatus();
    replace("/home");
  };

  const handleClose = () => {
    window.close();
  };

  const getProgressColor = (): "info" | "success" | "error" | "warning" => {
    if (currentStep === "success") return "success";
    if (currentStep === "error") return "error";
    if (progress > 50) return "info";
    return "warning";
  };

  return (
    <div className="w-full flex h-screen justify-center items-center bg-base-200">
      <DialogBase maxWidth="max-w-[600px]">
        <DialogHeader
          title={isRevalidation ? "ตรวจสอบใบอนุญาตซ้ำ" : "การ Activate License"}
          variant={
            currentStep === "success"
              ? "success"
              : currentStep === "error"
              ? "error"
              : "info"
          }
        />

        <div className="p-6 space-y-6">
          {/* Progress Steps Display */}
          <div className="text-center">
            <div className="text-6xl mb-4">{STEP_ICONS[currentStep]}</div>
            <h3 className="text-xl font-semibold mb-2">
              {STEP_LABELS[currentStep]}
            </h3>
            {currentMessage && (
              <p className="text-sm text-base-content/70">{currentMessage}</p>
            )}
          </div>

          {/* Progress Bar */}
          {currentStep !== "error" && currentStep !== "success" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ความคืบหน้า</span>
                <span>{progress}%</span>
              </div>
              <progress
                className={`progress progress-${getProgressColor()} w-full`}
                value={progress}
                max="100"
              />
            </div>
          )}

          {/* Success State */}
          {currentStep === "success" && licenseData && (
            <div className="space-y-4">
              <StatusIndicator
                status="success"
                message="License activation สำเร็จเรียบร้อย!"
              />

              <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                <h4 className="font-semibold mb-3 text-success">
                  ข้อมูล License
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">องค์กร:</span>
                    <span className="font-medium">
                      {licenseData.organization}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">รหัสลูกค้า:</span>
                    <span className="font-medium">
                      {licenseData.customerId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-content/70">หมดอายุ:</span>
                    <span className="font-medium">
                      {licenseData.expiryDate}
                    </span>
                  </div>
                  {licenseData.macAddress && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">อุปกรณ์:</span>
                      <span className="font-medium font-mono text-xs">
                        {licenseData.macAddress.substring(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <DialogButton
                  variant="primary"
                  className="flex-1"
                  onClick={handleContinue}
                >
                  เข้าสู่ระบบ
                </DialogButton>
              </div>
            </div>
          )}

          {/* Error State */}
          {currentStep === "error" && (
            <div className="space-y-4">
              <StatusIndicator status="error" message={isRevalidation ? revalidationError : errorMessage} />

              <div className={`${isRevalidation ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20'} p-4 rounded-lg border`}>
                <h4 className={`font-semibold mb-2 ${isRevalidation ? 'text-warning' : 'text-error'}`}>
                  {isRevalidation ? 'การตรวจสอบใบอนุญาตล้มเหลว' : 'การแก้ไขปัญหา'}
                </h4>
                <ul className="text-sm space-y-1 text-base-content/70">
                  <li>• ตรวจสอบว่ามีไฟล์ license.lic ในโฟลเดอร์ติดตั้ง</li>
                  <li>• ตรวจสอบการเชื่อมต่อ WiFi กับ ESP32</li>
                  <li>• ตรวจสอบว่า ESP32 ทำงานปกติ (LED แสดงสถานะ)</li>
                  <li>• ติดต่อผู้ดูแลระบบหากปัญหายังคงอยู่</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <DialogButton
                  variant="secondary"
                  className="flex-1"
                  onClick={handleRetry}
                >
                  ลองใหม่
                </DialogButton>
                {isRevalidation ? (
                  <DialogButton 
                    variant="primary" 
                    onClick={() => replace('/home')}
                  >
                    กลับสู่หน้าหลัก
                  </DialogButton>
                ) : (
                  <DialogButton variant="primary" onClick={handleClose}>
                    ปิดโปรแกรม
                  </DialogButton>
                )}
              </div>
            </div>
          )}

          {/* Loading/Processing State */}
          {!["success", "error"].includes(currentStep) && (
            <div className="text-center space-y-4">
              <StatusIndicator
                status="info"
                message={currentMessage || "กำลังดำเนินการ..."}
                animated={true}
              />

              <p className="text-sm text-base-content/50">
                กรุณารอสักครู่ ระบบกำลังตรวจสอบ license และเชื่อมต่อกับ ESP32
              </p>
            </div>
          )}

          {/* Manual WiFi Instructions (Phase 4.2) - แสดงเฉพาะ macOS */}
          {showManualWiFi && wifiCredentials && (
            <div className="space-y-4 mt-6 p-4 bg-info/10 border border-info/20 rounded-lg">
              <h3 className="font-semibold text-info flex items-center gap-2">
                📶 เชื่อมต่อ WiFi แบบ Manual (macOS)
              </h3>
              
              <div className="bg-base-200 p-3 rounded space-y-2">
                <div>
                  <span className="font-medium">WiFi Network:</span>
                  <span className="ml-2 font-mono text-sm bg-base-300 px-2 py-1 rounded">
                    {wifiCredentials.ssid}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Password:</span>
                  <span className="ml-2 font-mono text-sm bg-base-300 px-2 py-1 rounded">
                    {'*'.repeat(wifiCredentials.password.length)}
                  </span>
                </div>
              </div>
              
              <ol className="text-sm space-y-2 text-base-content/80">
                <li className="flex items-start gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                  <span>เปิด System Preferences → Network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                  <span>เลือก WiFi network: <code className="bg-base-300 px-1 rounded text-xs">{wifiCredentials.ssid}</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                  <span>ใส่รหัสผ่าน WiFi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                  <span>รอให้เชื่อมต่อเสร็จ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                  <span>กดปุ่ม "ลองเชื่อมต่อใหม่" ด้านล่าง</span>
                </li>
              </ol>
              
              <div className="flex gap-3 pt-2">
                <DialogButton
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    // Info log removed for production
                    setShowManualWiFi(false);
                    startActivationProcess();
                  }}
                >
                  🔄 ลองเชื่อมต่อใหม่
                </DialogButton>
                <DialogButton 
                  variant="secondary"
                  onClick={() => setShowManualWiFi(false)}
                >
                  ปิด
                </DialogButton>
              </div>
            </div>
          )}
        </div>
      </DialogBase>
    </div>
  );
}
