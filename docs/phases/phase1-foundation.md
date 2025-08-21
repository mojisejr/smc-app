# Phase 1: Foundation & Form & Detection

**ระยะเวลา:** 3-4 วัน  
**เป้าหมาย:** Next.js setup + Customer form + ESP32 device detection

## 📖 Overview & Goals

### **วัตถุประสงค์:**
- **Day 1-2:** Setup Next.js 14 project พร้อม basic UI
- **Day 3-4:** Customer input form + ESP32 detection system
- สร้าง foundation ที่แข็งแรงสำหรับ Phase 2-3

### **Deliverables:**
- ✅ Next.js 14 project พร้อม TypeScript + Tailwind
- ✅ Single page application layout
- ✅ Customer input form (3 fields เท่านั้น)
- ✅ ESP32 device detection + selection
- ✅ Basic UI components

## 🔧 Technical Requirements

### **Software Dependencies:**
```json
{
  "next": "14.x",
  "react": "^18.x", 
  "typescript": "^5.x",
  "tailwindcss": "^3.x"
}
```

### **Development Tools:**
- Node.js v18+
- PlatformIO Core (สำหรับ ESP32 detection)

### **Hardware Requirements:**
- ESP32 development board (สำหรับทดสอบ detection)
- USB cable

## 📝 Implementation Steps

### **Step 1.1: Next.js Project Setup (Day 1 - 4 hours)**

#### **Step 1.1a: Create Project (30 นาที)**

```bash
# Create Next.js 14 project
npx create-next-app@14 esp32-deployment-tool --typescript --tailwind --app
cd esp32-deployment-tool

# Install additional dependencies
npm install
```

#### **Step 1.1b: Project Structure (30 นาที)**

```
esp32-deployment-tool/
├── app/
│   ├── page.tsx              # Main single page
│   ├── layout.tsx            # Root layout
│   └── api/
│       └── detect/route.ts   # ESP32 detection API
├── components/
│   ├── CustomerForm.tsx      # Input form
│   ├── DeviceList.tsx        # ESP32 devices
│   └── ProgressBar.tsx       # Progress indicator
├── lib/
│   └── esp32.ts             # ESP32 utilities
└── types/
    └── index.ts             # TypeScript definitions
```

#### **Step 1.1c: Basic Layout (60 นาที)**

สร้าง `app/layout.tsx`:

```typescript
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'ESP32 Deployment Tool',
  description: 'SMC Customer ESP32 Configuration Tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-blue-600 text-white p-4">
            <h1 className="text-xl font-bold">ESP32 Deployment Tool</h1>
          </header>
          <main className="container mx-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

### **Step 1.2: Customer Input Form (Day 2 - 4 hours)**

#### **Step 1.2a: TypeScript Types (30 นาที)**

สร้าง `types/index.ts`:

```typescript
// Customer data types (minimal)
export interface CustomerInfo {
  organization: string;
  customerId: string;
  applicationName: string;
}

// ESP32 device info
export interface ESP32Device {
  port: string;
  description: string;
  manufacturer?: string;
}

// Deployment state
export interface DeploymentState {
  customer: CustomerInfo | null;
  selectedDevice: ESP32Device | null;
  isDeploying: boolean;
  progress: number;
  status: string;
}
```

#### **Step 1.2b: Customer Form Component (120 นาที)**

สร้าง `components/CustomerForm.tsx`:

```typescript
'use client'

import { useState } from 'react';
import { CustomerInfo } from '@/types';

interface CustomerFormProps {
  onSubmit: (customer: CustomerInfo) => void;
  disabled?: boolean;
}

export default function CustomerForm({ onSubmit, disabled }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    organization: '',
    customerId: '',
    applicationName: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};
    
    if (!formData.organization.trim()) {
      newErrors.organization = 'กรุณากรอกชื่อองค์กร';
    }
    
    if (!formData.customerId.trim()) {
      newErrors.customerId = 'กรุณากรอกรหัสลูกค้า';
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.customerId)) {
      newErrors.customerId = 'รหัสลูกค้าต้องเป็นตัวอักษรใหญ่และตัวเลข 3-10 ตัว';
    }
    
    if (!formData.applicationName.trim()) {
      newErrors.applicationName = 'กรุณากรอกชื่อแอปพลิเคชัน';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">📝 ข้อมูลลูกค้า</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อองค์กร
          </label>
          <input
            type="text"
            value={formData.organization}
            onChange={(e) => handleChange('organization', e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น โรงพยาบาลกรุงเทพ"
          />
          {errors.organization && (
            <p className="text-red-500 text-sm mt-1">{errors.organization}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            รหัสลูกค้า
          </label>
          <input
            type="text"
            value={formData.customerId}
            onChange={(e) => handleChange('customerId', e.target.value.toUpperCase())}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น BGK001"
          />
          {errors.customerId && (
            <p className="text-red-500 text-sm mt-1">{errors.customerId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อแอปพลิเคชัน
          </label>
          <input
            type="text"
            value={formData.applicationName}
            onChange={(e) => handleChange('applicationName', e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            placeholder="เช่น SMC_Cabinet_Ward_A"
          />
          {errors.applicationName && (
            <p className="text-red-500 text-sm mt-1">{errors.applicationName}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          ถัดไป: ตรวจหา ESP32
        </button>
      </form>
    </div>
  );
}
```

### **Step 1.3: ESP32 Device Detection (Day 3 - 4 hours)**

#### **Step 1.3a: ESP32 Detection API (90 นาที)**

สร้าง `app/api/detect/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { ESP32Device } from '@/types';

export async function GET() {
  try {
    console.log('info: Starting ESP32 device detection...');
    
    const devices = await detectESP32Devices();
    
    return NextResponse.json({
      success: true,
      devices,
      count: devices.length
    });
  } catch (error) {
    console.error('error: ESP32 detection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      devices: []
    }, { status: 500 });
  }
}

async function detectESP32Devices(): Promise<ESP32Device[]> {
  return new Promise((resolve, reject) => {
    // ใช้ PlatformIO device list
    const platformio = spawn('pio', ['device', 'list', '--json-output']);
    let output = '';
    let errorOutput = '';

    platformio.stdout.on('data', (data) => {
      output += data.toString();
    });

    platformio.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    platformio.on('close', (code) => {
      if (code === 0) {
        try {
          const devices = parseDeviceList(output);
          resolve(devices);
        } catch (error) {
          reject(new Error(`Failed to parse device list: ${error.message}`));
        }
      } else {
        reject(new Error(`PlatformIO command failed: ${errorOutput}`));
      }
    });

    platformio.on('error', (error) => {
      reject(new Error(`Failed to execute PlatformIO: ${error.message}`));
    });
  });
}

function parseDeviceList(output: string): ESP32Device[] {
  try {
    const data = JSON.parse(output);
    return data
      .filter((device: any) => 
        device.description && 
        (device.description.includes('ESP32') || 
         device.description.includes('CH340') ||
         device.description.includes('CP210') ||
         device.description.includes('Silicon Labs'))
      )
      .map((device: any) => ({
        port: device.port,
        description: device.description,
        manufacturer: device.manufacturer || 'Unknown'
      }));
  } catch (error) {
    console.error('error: Failed to parse PlatformIO output:', error);
    return [];
  }
}
```

#### **Step 1.3b: Device List Component (90 นาที)**

สร้าง `components/DeviceList.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react';
import { ESP32Device } from '@/types';

interface DeviceListProps {
  onDeviceSelect: (device: ESP32Device) => void;
  selectedDevice: ESP32Device | null;
  disabled?: boolean;
}

export default function DeviceList({ onDeviceSelect, selectedDevice, disabled }: DeviceListProps) {
  const [devices, setDevices] = useState<ESP32Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectDevices = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/detect');
      const data = await response.json();
      
      if (data.success) {
        setDevices(data.devices);
        console.log(`info: Found ${data.count} ESP32 devices`);
      } else {
        setError(data.error || 'Failed to detect devices');
      }
    } catch (err) {
      setError('Network error while detecting devices');
      console.error('error: Device detection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    detectDevices();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">🔌 ESP32 Devices</h2>
        <button
          onClick={detectDevices}
          disabled={isLoading || disabled}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 disabled:bg-gray-400"
        >
          {isLoading ? 'กำลังค้นหา...' : 'ค้นหาใหม่'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">ข้อผิดพลาด:</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-1">
            กรุณาตรวจสอบ:
            <br />• ESP32 เสียบ USB เรียบร้อย
            <br />• Driver ติดตั้งแล้ว (CH340, CP210x)
            <br />• PlatformIO CLI installed
          </p>
        </div>
      )}

      {devices.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-gray-500">
          <p>ไม่พบ ESP32 devices</p>
          <p className="text-sm">กรุณาเสียบ ESP32 เข้า USB และกดค้นหาใหม่</p>
        </div>
      )}

      {devices.length > 0 && (
        <div className="space-y-2">
          {devices.map((device, index) => (
            <div
              key={`${device.port}-${index}`}
              className={`p-3 border rounded-md cursor-pointer transition-colors ${
                selectedDevice?.port === device.port
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              onClick={() => !disabled && onDeviceSelect(device)}
            >
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  selectedDevice?.port === device.port ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1">
                  <p className="font-medium">{device.port}</p>
                  <p className="text-sm text-gray-600">{device.description}</p>
                  {device.manufacturer && (
                    <p className="text-xs text-gray-500">{device.manufacturer}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDevice && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 font-medium">เลือกแล้ว: {selectedDevice.port}</p>
          <p className="text-green-700 text-sm">{selectedDevice.description}</p>
        </div>
      )}
    </div>
  );
}
```

### **Step 1.4: Main Page Integration (Day 4 - 4 hours)**

#### **Step 1.4a: Main Page Component (120 นาที)**

สร้าง `app/page.tsx`:

```typescript
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
```

## ✅ Success Criteria

### **Functional Requirements:**
- [ ] **Next.js app รันได้**: `npm run dev` ทำงานโดยไม่มี error
- [ ] **Customer form ทำงาน**: กรอกข้อมูล 3 fields ได้ถูกต้อง
- [ ] **Form validation**: แสดง error message เมื่อข้อมูลไม่ถูกต้อง
- [ ] **ESP32 detection**: สามารถ detect ESP32 devices ได้ (ถ้ามีเสียบอยู่)
- [ ] **Device selection**: เลือก ESP32 device ได้
- [ ] **State management**: Customer + Device state เชื่อมต่อกันถูกต้อง
- [ ] **Deploy button**: แสดงเมื่อมีข้อมูลครบแล้ว

### **UI/UX Requirements:**
- [ ] **Responsive design**: ใช้งานได้ในหน้าจอขนาดต่างๆ
- [ ] **Loading states**: แสดง loading เมื่อกำลังค้นหา device
- [ ] **Error handling**: แสดง error message ที่เข้าใจได้
- [ ] **Visual feedback**: แสดงสถานะการเลือก device ชัดเจน

### **Technical Requirements:**
- [ ] **TypeScript**: ไม่มี type errors
- [ ] **API routes**: `/api/detect` ทำงานถูกต้อง
- [ ] **PlatformIO integration**: `pio device list` execute ได้ผ่าน API

## 🧪 Testing Guidelines

### **Manual Testing:**
1. **Form validation:**
   ```
   - ทดสอบ submit form เปล่า (ต้องมี error)
   - ทดสอบรหัสลูกค้าผิดรูปแบบ (ต้องมี error)
   - ทดสอบกรอกครบถูกต้อง (ต้องผ่าน)
   ```

2. **Device detection:**
   ```bash
   # เสียบ ESP32 เข้า USB
   # เปิด app และดู device list
   # ตรวจสอบ: ต้องเจอ ESP32 device ในรายการ
   ```

3. **State management:**
   ```
   - กรอกฟอร์ม → ต้องเห็น device list
   - เลือก device → ต้องเห็น deploy button
   - กด deploy → ต้องเห็น Phase 1 complete message
   ```

### **Error Testing:**
- ทดสอบโดยไม่เสียบ ESP32 (ต้องได้ empty list)
- ทดสอบโดยไม่มี PlatformIO installed (ต้องได้ error message)

## 🚨 Common Issues

**1. `pio: command not found`**
```bash
# แก้ไข: Install PlatformIO Core
pip install platformio
```

**2. Form validation ไม่ทำงาน**
- ตรวจสอบ TypeScript types
- ตรวจสอบ state management logic

**3. Device detection ไม่เจออะไร**
- ตรวจสอบ ESP32 driver installation
- ทดสอบ `pio device list` ใน terminal

---

## ⏭️ Next Phase

เมื่อ Phase 1 เสร็จเรียบร้อย จะได้:
- ✅ Working Next.js application
- ✅ Customer data collection 
- ✅ ESP32 device selection
- ✅ UI foundation

**Phase 2 จะ implement:**
- Template system + WiFi generation
- PlatformIO build + upload workflow  
- MAC address extraction
- JSON file export