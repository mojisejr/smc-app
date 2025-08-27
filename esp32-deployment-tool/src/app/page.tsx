'use client'

import { useState } from 'react';
import CustomerForm from '@/components/CustomerForm';
import DeviceList from '@/components/DeviceList';
import ProgressBar from '@/components/ProgressBar';
import SensorTestPanel from '@/components/SensorTestPanel';
import { CustomerInfo, ESP32Device, DeploymentState } from '@/types';

export default function Home() {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    customer: null,
    selectedDevice: null,
    isDeploying: false,
    progress: 0,
    status: 'กรุณากรอกข้อมูลลูกค้า',
    deploymentComplete: false,
    deviceIP: '192.168.4.1'
  });

  const [showSensorTest, setShowSensorTest] = useState(false);

  const handleCustomerSubmit = (customer: CustomerInfo) => {
    setDeploymentState(prev => ({
      ...prev,
      customer,
      status: 'กรุณาเลือก ESP32 device'
    }));
  };

  const handleDeviceSelect = (device: ESP32Device) => {
    setDeploymentState(prev => ({
      ...prev,
      selectedDevice: device,
      status: 'พร้อม deploy firmware'
    }));
  };

  const handleDeploy = async () => {
    if (!deploymentState.customer || !deploymentState.selectedDevice) return;

    setDeploymentState(prev => ({
      ...prev,
      isDeploying: true,
      progress: 0,
      status: 'เริ่มต้น deployment...'
    }));

    try {
      // Step 1: Deploy firmware (25% - 75%)
      setDeploymentState(prev => ({ ...prev, progress: 25, status: 'สร้าง firmware...' }));
      
      const deployResponse = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: deploymentState.customer,
          device: deploymentState.selectedDevice
        })
      });

      const deployResult = await deployResponse.json();
      
      if (!deployResult.success) {
        throw new Error(deployResult.error);
      }

      setDeploymentState(prev => ({ ...prev, progress: 75, status: 'Upload สำเร็จ, ดึง MAC address...' }));

      // Step 2: Extract MAC address (75% - 90%)
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for ESP32 to boot
      
      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deviceIP: '192.168.4.1',
          customerInfo: deploymentState.customer,
          deploymentLog: deployResult.buildOutput // Pass deployment log for MAC extraction
        })
      });

      const extractResult = await extractResponse.json();
      
      if (!extractResult.success) {
        throw new Error(extractResult.error);
      }

      setDeploymentState(prev => ({ ...prev, progress: 90, status: 'สร้าง JSON file...' }));

      // Step 3: Export JSON (90% - 100%)
      const exportResponse = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: deploymentState.customer,
          wifi: deployResult.wifi,
          macAddress: extractResult.macAddress,
          ipAddress: '192.168.4.1'
        })
      });

      const exportResult = await exportResponse.json();
      
      if (!exportResult.success) {
        throw new Error(exportResult.error);
      }

      // Complete
      setDeploymentState(prev => ({
        ...prev,
        progress: 100,
        status: `เสร็จสิ้น! ไฟล์: ${exportResult.filename}`,
        isDeploying: false,
        deploymentComplete: true,
        macAddress: extractResult.macAddress
      }));

      console.log('info: Complete deployment workflow finished successfully');
      
    } catch (error) {
      console.error('error: Deployment workflow failed:', error);
      setDeploymentState(prev => ({
        ...prev,
        status: `ข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isDeploying: false
      }));
    }
  };

  const isReadyToDeploy = deploymentState.customer && deploymentState.selectedDevice;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">สถานะ:</p>
            <p className="font-medium">{deploymentState.status}</p>
          </div>
          {deploymentState.progress > 0 && (
            <div className="w-64">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${deploymentState.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">{deploymentState.progress}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Form */}
      <CustomerForm 
        onSubmit={handleCustomerSubmit}
        disabled={deploymentState.isDeploying}
      />

      {/* Device List - only show after customer form is filled */}
      {deploymentState.customer && (
        <DeviceList
          onDeviceSelect={handleDeviceSelect}
          selectedDevice={deploymentState.selectedDevice}
          disabled={deploymentState.isDeploying}
        />
      )}

      {/* Progress Bar - show during deployment */}
      {deploymentState.isDeploying && (
        <ProgressBar
          progress={deploymentState.progress}
          status={deploymentState.status}
          isActive={deploymentState.isDeploying}
        />
      )}

      {/* Deploy Button */}
      {isReadyToDeploy && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">🚀 พร้อม Deploy</h3>
            <p className="text-gray-600 mb-4">
              ลูกค้า: {deploymentState.customer?.organization} ({deploymentState.customer?.customerId})
              <br />
              Device: {deploymentState.selectedDevice?.port}
            </p>
            <button
              onClick={handleDeploy}
              disabled={deploymentState.isDeploying}
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {deploymentState.isDeploying ? 'กำลัง Deploy...' : 'Deploy Firmware'}
            </button>
          </div>
        </div>
      )}

      {/* Deployment Success Message */}
      {deploymentState.deploymentComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-medium text-green-800 mb-3">✅ Deployment สำเร็จ!</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="text-sm">
              <div className="text-gray-700">📋 ข้อมูลสำคัญ:</div>
              <ul className="text-green-700 mt-1 space-y-1">
                <li>• ลูกค้า: {deploymentState.customer?.organization}</li>
                <li>• Customer ID: {deploymentState.customer?.customerId}</li>
                <li>• MAC Address: {deploymentState.macAddress}</li>
                <li>• Device IP: {deploymentState.deviceIP}</li>
              </ul>
            </div>
            <div className="text-sm">
              <div className="text-gray-700">🔧 ขั้นตอนถัดไป:</div>
              <ul className="text-green-700 mt-1 space-y-1">
                <li>• ทดสอบเซ็นเซอร์ DHT22</li>
                <li>• ส่งออกข้อมูลเป็น CSV file</li>
                <li>• ส่งมอบไฟล์ให้ทีมพัฒนา</li>
              </ul>
            </div>
          </div>
          
          {/* Test Sensor Button */}
          <div className="text-center">
            <button
              onClick={() => setShowSensorTest(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🌡️ ทดสอบเซ็นเซอร์ DHT22
            </button>
            <p className="text-xs text-green-700 mt-2">
              คลิกเพื่อทดสอบการทำงานของเซ็นเซอร์อุณหภูมิและความชื้น
            </p>
          </div>
        </div>
      )}

      {/* Sensor Test Panel */}
      {deploymentState.deviceIP && (
        <SensorTestPanel
          deviceIP={deploymentState.deviceIP}
          isVisible={showSensorTest}
          onClose={() => setShowSensorTest(false)}
        />
      )}

      {/* Phase Information */}
      {!deploymentState.deploymentComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">✅ Phase 2 Complete: Core Deployment</h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>• Template system พร้อม AM2302 sensor integration</li>
            <li>• WiFi credentials auto-generation</li>
            <li>• PlatformIO build และ upload workflow</li>
            <li>• MAC address extraction และ JSON export</li>
            <li>• Complete end-to-end deployment ready!</li>
          </ul>
          <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
            <strong>Ready for production:</strong> กรอกข้อมูล → เลือก ESP32 → Deploy → ได้ JSON file ลง Desktop
          </div>
        </div>
      )}
    </div>
  );
}
