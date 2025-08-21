'use client'

import { useState } from 'react';
import CustomerForm from '@/components/CustomerForm';
import DeviceList from '@/components/DeviceList';
import { CustomerInfo, ESP32Device, DeploymentState } from '@/types';

export default function Home() {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    customer: null,
    selectedDevice: null,
    isDeploying: false,
    progress: 0,
    status: 'กรุณากรอกข้อมูลลูกค้า'
  });

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

  const handleDeploy = () => {
    // Phase 2 จะ implement ฟังก์ชันนี้
    console.log('info: Deploy button clicked');
    console.log('Customer:', deploymentState.customer);
    console.log('Device:', deploymentState.selectedDevice);
    
    setDeploymentState(prev => ({
      ...prev,
      status: 'รอ Phase 2 implementation...'
    }));
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

      {/* Deploy Button */}
      {isReadyToDeploy && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">🚀 พร้อม Deploy</h3>
            <p className="text-gray-600 mb-4">
              ลูกค้า: {deploymentState.customer.organization} ({deploymentState.customer.customerId})
              <br />
              Device: {deploymentState.selectedDevice.port}
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

      {/* Phase 1 Complete Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">✅ Phase 1 Complete</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Customer input form พร้อมใช้งาน</li>
          <li>• ESP32 device detection ทำงานได้</li>
          <li>• UI components เชื่อมต่อกันแล้ว</li>
          <li>• พร้อมสำหรับ Phase 2: Core Deployment</li>
        </ul>
      </div>
    </div>
  );
}
