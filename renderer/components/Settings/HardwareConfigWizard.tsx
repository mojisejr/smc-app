import React, { useState, useEffect } from "react";
import { ipcRenderer } from "electron";
import Tooltip from "../Shared/Tooltip";

interface HardwareConfig {
  type: 'DS12' | 'DS16';
  port: string;
  baudrate: number;
  maxSlots: number;
  requiresRestart: boolean;
}

interface Port {
  path: string;
  manufacturer?: string;
}

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: HardwareConfig | null;
  onConfigSaved: (config: HardwareConfig) => void;
}

type WizardStep = 'hardware-select' | 'port-config' | 'testing' | 'restart';

export default function HardwareConfigWizard({ isOpen, onClose, currentConfig, onConfigSaved }: WizardProps) {
  const [step, setStep] = useState<WizardStep>('hardware-select');
  const [config, setConfig] = useState<HardwareConfig>({
    type: 'DS16',
    port: '',
    baudrate: 19200,
    maxSlots: 15,
    requiresRestart: true
  });
  const [availablePorts, setAvailablePorts] = useState<Port[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [autoRestartEnabled, setAutoRestartEnabled] = useState(true);

  // Load current config when modal opens
  useEffect(() => {
    if (isOpen && currentConfig) {
      setConfig(currentConfig);
    }
  }, [isOpen, currentConfig]);

  // Load available ports
  useEffect(() => {
    if (isOpen) {
      loadAvailablePorts();
    }
  }, [isOpen]);

  // Countdown timer for auto-restart
  useEffect(() => {
    if (step === 'restart' && autoRestartEnabled && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'restart' && autoRestartEnabled && countdown === 0) {
      handleRestartApp();
    }
  }, [step, countdown, autoRestartEnabled]);

  const loadAvailablePorts = async () => {
    try {
      const result = await ipcRenderer.invoke('get-available-ports');
      setAvailablePorts(result || []);
    } catch (error) {
      console.error('Failed to load ports:', error);
    }
  };

  const handleHardwareTypeChange = (type: 'DS12' | 'DS16') => {
    setConfig(prev => ({
      ...prev,
      type,
      maxSlots: type === 'DS12' ? 12 : 15,
      baudrate: 19200 // Default baudrate for both
    }));
  };

  const handlePortSelection = (port: string) => {
    setConfig(prev => ({
      ...prev,
      port
    }));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await ipcRenderer.invoke('test-hardware-connection', {
        port: config.port,
        baudrate: config.baudrate,
        hardwareType: config.type
      });
      
      setTestResult({
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        // Auto-advance to next step after successful test
        setTimeout(() => {
          setStep('testing');
        }, 1500);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsLoading(true);
    
    try {
      const result = await ipcRenderer.invoke('save-hardware-config', config);
      
      if (result.success) {
        onConfigSaved(config);
        setStep('restart');
      } else {
        setTestResult({
          success: false,
          message: result.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartApp = async () => {
    try {
      await ipcRenderer.invoke('app-restart-request');
    } catch (error) {
      console.error('Failed to restart app:', error);
    }
  };

  const handleCancelAutoRestart = () => {
    setAutoRestartEnabled(false);
    setCountdown(0);
  };

  const resetWizard = () => {
    setStep('hardware-select');
    setTestResult(null);
    setCountdown(5);
    setAutoRestartEnabled(true);
    setConfig({
      type: 'DS16',
      port: '',
      baudrate: 19200,
      maxSlots: 15,
      requiresRestart: true
    });
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            ตั้งค่าฮาร์ดแวร์ระบบ
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800"
            disabled={step === 'restart' && autoRestartEnabled}
          >
            ✕
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm ${step === 'hardware-select' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
              เลือกฮาร์ดแวร์
            </span>
            <span className={`text-sm ${step === 'port-config' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
              ตั้งค่า Port
            </span>
            <span className={`text-sm ${step === 'testing' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
              ทดสอบ
            </span>
            <span className={`text-sm ${step === 'restart' ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
              รีสตาร์ท
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: step === 'hardware-select' ? '25%' : 
                       step === 'port-config' ? '50%' : 
                       step === 'testing' ? '75%' : '100%' 
              }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {step === 'hardware-select' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">เลือกประเภทฮาร์ดแวร์</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleHardwareTypeChange('DS16')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      config.type === 'DS16' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">DS16</div>
                    <div className="text-sm text-gray-600">15 ช่อง</div>
                    <div className="text-xs text-gray-500 mt-2">เหมาะสำหรับการใช้งานทั่วไป</div>
                  </button>
                  
                  <button
                    onClick={() => handleHardwareTypeChange('DS12')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      config.type === 'DS12' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-semibold">DS12</div>
                    <div className="text-sm text-gray-600">12 ช่อง</div>
                    <div className="text-xs text-gray-500 mt-2">ระบบใหม่พร้อมฟีเจอร์ขั้นสูง</div>
                  </button>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-yellow-600 mr-2">⚠️</div>
                    <div className="text-sm text-yellow-800">
                      <strong>สำคัญ:</strong> การเปลี่ยนประเภทฮาร์ดแวร์จะต้องรีสตาร์ทแอปพลิเคชัน
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep('port-config')}
                  className="btn btn-primary"
                  disabled={!config.type}
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}

          {step === 'port-config' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                ตั้งค่า Port สำหรับ {config.type}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">เลือก Port</label>
                  <select
                    value={config.port}
                    onChange={(e) => handlePortSelection(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- เลือก Port --</option>
                    {availablePorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {port.path} {port.manufacturer && `(${port.manufacturer})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Baudrate</label>
                  <select
                    value={config.baudrate}
                    onChange={(e) => setConfig(prev => ({ ...prev, baudrate: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={9600}>9600</option>
                    <option value={19200}>19200</option>
                    <option value={38400}>38400</option>
                    <option value={57600}>57600</option>
                    <option value={115200}>115200</option>
                  </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-700">
                    <strong>การตั้งค่าปัจจุบัน:</strong><br/>
                    ประเภท: {config.type} ({config.maxSlots} ช่อง)<br/>
                    Port: {config.port || 'ยังไม่ได้เลือก'}<br/>
                    Baudrate: {config.baudrate}
                  </div>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep('hardware-select')}
                  className="btn btn-outline"
                >
                  ย้อนกลับ
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={!config.port || isLoading}
                    className="btn btn-outline"
                  >
                    {isLoading ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                  </button>
                  
                  <button
                    onClick={() => setStep('testing')}
                    disabled={!config.port}
                    className="btn btn-primary"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'testing' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">ยืนยันการตั้งค่า</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">ข้อมูลการตั้งค่าใหม่</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>ประเภทฮาร์ดแวร์: <strong>{config.type}</strong></div>
                    <div>จำนวนช่อง: <strong>{config.maxSlots} ช่อง</strong></div>
                    <div>Port: <strong>{config.port}</strong></div>
                    <div>Baudrate: <strong>{config.baudrate}</strong></div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-yellow-600 mr-2">⚠️</div>
                    <div className="text-sm text-yellow-800">
                      <strong>คำเตือน:</strong> การบันทึกการตั้งค่านี้จะต้องรีสตาร์ทแอปพลิเคชันเพื่อให้การตั้งค่าใหม่มีผล
                    </div>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep('port-config')}
                  className="btn btn-outline"
                >
                  ย้อนกลับ
                </button>
                
                <button
                  onClick={handleSaveConfiguration}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกและรีสตาร์ท'}
                </button>
              </div>
            </div>
          )}

          {step === 'restart' && (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">การตั้งค่าเสร็จสิ้น</h3>
              
              <div className="space-y-6">
                <div className="text-6xl mb-4">✅</div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800">
                    <strong>บันทึกการตั้งค่าสำเร็จ!</strong><br/>
                    ระบบจะปิดแอปพลิเคชันเพื่อใช้การตั้งค่า {config.type} ใหม่
                  </div>
                </div>

                {autoRestartEnabled && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-800 mb-2">
                      แอปพลิเคชันจะปิดอัตโนมัติใน
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {countdown} วินาที
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-4">
                  {autoRestartEnabled && (
                    <button
                      onClick={handleCancelAutoRestart}
                      className="btn btn-outline"
                    >
                      ยกเลิกการปิดอัตโนมัติ
                    </button>
                  )}
                  
                  <button
                    onClick={handleRestartApp}
                    className="btn btn-primary"
                  >
                    ปิดแอปพลิเคชันตอนนี้
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}