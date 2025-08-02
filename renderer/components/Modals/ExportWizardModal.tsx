import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';
import { toast } from 'react-toastify';
import { 
  ExportWizardConfig, 
  ExportConfig, 
  ExportFormat, 
  ExportProgress,
  ExportResult,
  EXPORT_PRESETS,
  formatFileSize
} from '../../types/export.types';

interface ExportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: ExportResult) => void;
  adminName: string;
}

export default function ExportWizardModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  adminName 
}: ExportWizardModalProps) {
  const [wizardConfig, setWizardConfig] = useState<ExportWizardConfig>({
    step: 'format',
    config: {
      format: 'csv',
      includeDebug: false
    }
  });

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [availableFormats, setAvailableFormats] = useState<ExportFormat[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{path: string; name: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load available formats and set default folder when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableFormats();
      setDefaultFolder();
    }
  }, [isOpen]);

  // Listen for export progress updates
  useEffect(() => {
    const handleProgress = (event: any, data: { exportId: string; progress: ExportProgress }) => {
      if (wizardConfig.step === 'progress') {
        setWizardConfig(prev => ({
          ...prev,
          progress: data.progress
        }));

        if (data.progress.phase === 'completed') {
          setTimeout(() => {
            setWizardConfig(prev => ({
              ...prev,
              step: 'complete'
            }));
          }, 1000);
        }

        if (data.progress.phase === 'error') {
          toast.error(data.progress.message);
          setWizardConfig(prev => ({
            ...prev,
            step: 'format'
          }));
        }
      }
    };

    ipcRenderer.on('export_progress', handleProgress);
    return () => {
      ipcRenderer.removeListener('export_progress', handleProgress);
    };
  }, [wizardConfig.step]);

  const loadAvailableFormats = async () => {
    try {
      const result = await ipcRenderer.invoke('get_export_formats');
      if (result.success) {
        setAvailableFormats(result.formats);
      }
    } catch (error) {
      console.error('Failed to load export formats:', error);
    }
  };

  const setDefaultFolder = () => {
    // Set Desktop as default folder
    const desktopPath = process.platform === 'win32' 
      ? `${process.env.USERPROFILE}\\Desktop`
      : `${process.env.HOME}/Desktop`;
    
    setSelectedFolder({
      path: desktopPath,
      name: 'Desktop'
    });
    
    setWizardConfig(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        folderPath: desktopPath,
        filename: generateDefaultFilename(prev.config.format || 'csv')
      }
    }));
  };

  const generateDefaultFilename = (format: 'csv' | 'xlsx') => {
    const timestamp = new Date().toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, '-')
      .replace('T', '-');
    return `logs-export-${timestamp}`;
  };

  const handleFormatSelect = (format: 'csv' | 'xlsx') => {
    setWizardConfig(prev => ({
      ...prev,
      config: { 
        ...prev.config, 
        format,
        filename: prev.config.filename || generateDefaultFilename(format)
      }
    }));
  };

  const handlePresetSelect = (preset: keyof typeof EXPORT_PRESETS) => {
    const presetConfig = EXPORT_PRESETS[preset];
    setWizardConfig(prev => ({
      ...prev,
      config: { ...prev.config, ...presetConfig.config }
    }));
  };

  const handleSelectFolder = async () => {
    setIsLoading(true);
    try {
      const result = await ipcRenderer.invoke('select_export_folder');
      if (result.success && !result.canceled) {
        setSelectedFolder({
          path: result.folderPath,
          name: result.folderName
        });
        setWizardConfig(prev => ({
          ...prev,
          config: { ...prev.config, folderPath: result.folderPath }
        }));
      }
    } catch (error) {
      console.error('Folder selection error:', error);
      toast.error('เกิดข้อผิดพลาดในการเลือกโฟลเดอร์');
    } finally {
      setIsLoading(false);
    }
  };


  const handleStartExport = async () => {
    if (!wizardConfig.config.folderPath) {
      toast.error('กรุณาเลือกโฟลเดอร์สำหรับบันทึกไฟล์');
      return;
    }

    setWizardConfig(prev => ({ ...prev, step: 'progress' }));

    try {
      const result = await ipcRenderer.invoke('export_logs_enhanced', {
        adminName,
        config: wizardConfig.config as ExportConfig
      });

      if (result.success) {
        setWizardConfig(prev => ({
          ...prev,
          result: result
        }));
        
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        toast.error(result.error || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล');
        setWizardConfig(prev => ({ ...prev, step: 'format' }));
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
      setWizardConfig(prev => ({ ...prev, step: 'format' }));
    }
  };

  const handleCancelExport = async () => {
    const confirmed = window.confirm('คุณต้องการยกเลิกการส่งออกข้อมูลหรือไม่?');
    if (!confirmed) return;

    try {
      // Cancel the export if we have an export ID
      if (wizardConfig.result?.exportId) {
        await ipcRenderer.invoke('cancel_export', {
          exportId: wizardConfig.result.exportId
        });
      }
      
      toast.info('ยกเลิกการส่งออกข้อมูลแล้ว');
      setWizardConfig(prev => ({ ...prev, step: 'format' }));
    } catch (error) {
      console.error('Cancel export error:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกการส่งออก');
    }
  };

  const handleClose = () => {
    setWizardConfig({
      step: 'format',
      config: { format: 'csv', includeDebug: false }
    });
    setSelectedFolder(null);
    onClose();
  };

  const nextStep = () => {
    const steps = ['format', 'filters', 'destination', 'progress', 'complete'];
    const currentIndex = steps.indexOf(wizardConfig.step);
    if (currentIndex < steps.length - 1) {
      setWizardConfig(prev => ({ 
        ...prev, 
        step: steps[currentIndex + 1] as any 
      }));
    }
  };

  const prevStep = () => {
    const steps = ['format', 'filters', 'destination', 'progress', 'complete'];
    const currentIndex = steps.indexOf(wizardConfig.step);
    if (currentIndex > 0) {
      setWizardConfig(prev => ({ 
        ...prev, 
        step: steps[currentIndex - 1] as any 
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && wizardConfig.step !== 'progress' && handleClose()}>
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            ตัวช่วยส่งออกข้อมูล Logs
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={wizardConfig.step === 'progress'}
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between text-sm">
            {[
              { key: 'format', label: 'รูปแบบ' },
              { key: 'filters', label: 'ตัวกรอง' },
              { key: 'destination', label: 'ปรับแต่ง' },
              { key: 'progress', label: 'ดำเนินการ' },
              { key: 'complete', label: 'เสร็จสิ้น' }
            ].map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${
                  wizardConfig.step === step.key 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${
                    wizardConfig.step === step.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {index + 1}
                </div>
                {step.label}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* Step 1: Format Selection */}
          {wizardConfig.step === 'format' && (
            <div className="space-y-4">
              <h3 className="text-base font-medium mb-4">เลือกรูปแบบไฟล์</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableFormats.map((format) => (
                  <div
                    key={format.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      wizardConfig.config.format === format.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFormatSelect(format.value)}
                  >
                    <div className="font-medium text-base mb-2">{format.label}</div>
                    <div className="text-sm text-gray-600">{format.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Filter Selection */}
          {wizardConfig.step === 'filters' && (
            <div className="space-y-4">
              <h3 className="text-base font-medium mb-4">เลือกข้อมูลที่ต้องการส่งออก</h3>
              
              <div className="space-y-3">
                <h4 className="font-medium">ชุดข้อมูลที่กำหนดไว้</h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(EXPORT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => {
                        handlePresetSelect(key as keyof typeof EXPORT_PRESETS);
                        setSelectedPreset(key);
                      }}
                      className={`text-left p-3 border-2 rounded-lg transition-all ${
                        selectedPreset === key
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`font-medium ${
                        selectedPreset === key ? 'text-blue-700' : 'text-gray-900'
                      }`}>{preset.name}</div>
                      <div className={`text-sm ${
                        selectedPreset === key ? 'text-blue-600' : 'text-gray-600'
                      }`}>{preset.description}</div>
                      {selectedPreset === key && (
                        <div className="flex items-center mt-2 text-blue-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium">เลือกแล้ว</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">ตัวเลือกเพิ่มเติม</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  เลือกชุดข้อมูลด้านบนเพื่อกำหนดประเภท logs ที่ต้องการส่งออก
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Destination */}
          {wizardConfig.step === 'destination' && (
            <div className="space-y-4">
              <h3 className="text-base font-medium mb-4">เลือกตำแหน่งบันทึกไฟล์</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">โฟลเดอร์ปลายทาง</label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSelectFolder}
                      disabled={isLoading}
                      className="btn btn-outline flex-1 justify-start"
                    >
                      {selectedFolder ? selectedFolder.name : 'เลือกโฟลเดอร์...'}
                    </button>
                    <button
                      onClick={handleSelectFolder}
                      disabled={isLoading}
                      className="btn btn-primary"
                    >
                      เลือก
                    </button>
                  </div>
                  {selectedFolder && (
                    <div className="text-xs text-gray-500 mt-1">{selectedFolder.path}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ชื่อไฟล์</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="logs-export"
                      className="input input-bordered flex-1"
                      value={wizardConfig.config.filename || ''}
                      onChange={(e) => setWizardConfig(prev => ({
                        ...prev,
                        config: { ...prev.config, filename: e.target.value }
                      }))}
                    />
                    <button
                      onClick={() => setWizardConfig(prev => ({
                        ...prev,
                        config: { 
                          ...prev.config, 
                          filename: generateDefaultFilename(prev.config.format || 'csv')
                        }
                      }))}
                      className="btn btn-outline btn-sm"
                      type="button"
                    >
                      สร้างใหม่
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ไฟล์สุดท้าย: {wizardConfig.config.filename || 'logs-export'}.{wizardConfig.config.format || 'csv'}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Step 4: Progress */}
          {wizardConfig.step === 'progress' && wizardConfig.progress && (
            <div className="space-y-4">
              <h3 className="text-base font-medium mb-4">กำลังส่งออกข้อมูล</h3>
              
              <div className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${wizardConfig.progress.progress}%` }}
                  ></div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-800 mb-2">
                    {wizardConfig.progress.progress}%
                  </div>
                  <div className="text-sm text-gray-600">{wizardConfig.progress.message}</div>
                  {wizardConfig.progress.recordCount && (
                    <div className="text-xs text-gray-500 mt-1">
                      {wizardConfig.progress.recordCount.toLocaleString()} รายการ
                    </div>
                  )}
                </div>

                {/* Cancel button - only show if not completed */}
                {wizardConfig.progress.phase !== 'completed' && wizardConfig.progress.phase !== 'error' && (
                  <div className="text-center">
                    <button
                      onClick={handleCancelExport}
                      className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
                    >
                      ยกเลิกการส่งออก
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {wizardConfig.step === 'complete' && wizardConfig.result && (
            <div className="space-y-4 text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h3 className="text-base font-medium text-green-600 mb-4">ส่งออกข้อมูลเรียบร้อย!</h3>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div><strong>ไฟล์:</strong> {wizardConfig.result.filename}</div>
                  <div><strong>จำนวนรายการ:</strong> {wizardConfig.result.recordCount?.toLocaleString()}</div>
                  <div><strong>รูปแบบ:</strong> {wizardConfig.result.format?.toUpperCase()}</div>
                  {wizardConfig.result.fileSize && (
                    <div><strong>ขนาดไฟล์:</strong> {formatFileSize(wizardConfig.result.fileSize)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={prevStep}
            disabled={wizardConfig.step === 'format' || wizardConfig.step === 'progress'}
            className="btn btn-outline"
          >
            ย้อนกลับ
          </button>
          
          <div className="space-x-2">
            {wizardConfig.step === 'complete' ? (
              <button onClick={handleClose} className="btn btn-primary">
                เสร็จสิ้น
              </button>
            ) : wizardConfig.step === 'destination' ? (
              <button
                onClick={handleStartExport}
                disabled={!wizardConfig.config.folderPath}
                className="btn btn-primary"
              >
                เริ่มส่งออก
              </button>
            ) : wizardConfig.step !== 'progress' ? (
              <button onClick={nextStep} className="btn btn-primary">
                ถัดไป
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}