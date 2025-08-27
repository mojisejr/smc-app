# ESP32 Deployment Tool

## Phase 1: Foundation & Form & Detection ✅ Complete
## Phase 2: Core Deployment & API Integration ✅ Complete

ESP32 Deployment Tool สำหรับ SMC Customer ESP32 Configuration ระบบจัดการการ deploy firmware ลง ESP32 devices

## 🚀 Features (Phase 1 + 2)

- **Customer Input Form**: กรอกข้อมูลลูกค้า 3 fields พร้อม validation
- **ESP32 Device Detection**: ตรวจหา ESP32 devices ผ่าน PlatformIO CLI
- **Complete API Suite**: 7 API endpoints สำหรับ deployment workflow
- **Firmware Generation**: สร้าง firmware template พร้อม WiFi credentials
- **Cross-Platform Build**: PlatformIO integration สำหรับ Windows/Linux/macOS
- **DHT22 Sensor Support**: Real-time sensor testing และ validation
- **Export System**: JSON และ CSV export สำหรับ deployment records
- **Responsive UI**: ใช้ Next.js 14 + TypeScript + Tailwind CSS
- **State Management**: การจัดการ state ด้วย React hooks

## 🛠 Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Hardware Detection**: PlatformIO CLI integration
- **API**: Next.js API routes

## 📁 Project Structure

```
esp32-deployment-tool/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with header
│   │   ├── page.tsx           # Main application page
│   │   └── api/               # Complete API suite
│   │       ├── detect/route.ts    # ESP32 detection API
│   │       ├── deploy/route.ts    # Full deployment workflow
│   │       ├── export/route.ts    # JSON/CSV export system
│   │       ├── extract/route.ts   # MAC address extraction
│   │       ├── generate/route.ts  # Firmware template generation
│   │       ├── health/route.ts    # System health check
│   │       └── sensor/route.ts    # DHT22 sensor testing
│   ├── components/
│   │   ├── CustomerForm.tsx    # Customer input form
│   │   ├── DeviceList.tsx      # ESP32 device list
│   │   └── SensorTestPanel.tsx # DHT22 sensor testing UI
│   ├── lib/
│   │   ├── template.ts         # Firmware template processor
│   │   ├── platformio.ts       # Cross-platform PlatformIO integration
│   │   ├── export.ts           # JSON export functionality
│   │   └── csv-export.ts       # CSV export functionality
│   └── types/
│       └── index.ts           # TypeScript definitions
```

## 🏃‍♂️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📡 API Documentation

### Core Deployment APIs

#### 1. `/api/health` - System Health Check
```bash
GET /api/health
# Returns: System status, PlatformIO availability, USB devices
```

#### 2. `/api/detect` - ESP32 Device Detection
```bash
GET /api/detect
# Returns: List of available ESP32 devices with COM ports
```

#### 3. `/api/generate` - Firmware Template Generation
```bash
POST /api/generate
# Body: { customer: { customerId: string } }
# Returns: Generated firmware code with WiFi credentials
```

#### 4. `/api/deploy` - Complete Deployment Workflow
```bash
POST /api/deploy
# Body: { customer: object, device: { port: string } }
# Returns: Build output, deployment status, WiFi config
```

#### 5. `/api/extract` - MAC Address Extraction
```bash
POST /api/extract
# Body: { device: { port: string } }
# Returns: ESP32 MAC address and device info
```

#### 6. `/api/sensor` - DHT22 Sensor Testing
```bash
GET /api/sensor?ip=192.168.4.1
# Returns: Real-time sensor data (temperature, humidity)
```

#### 7. `/api/export` - Data Export System
```bash
POST /api/export
# Body: { customer, wifi, macAddress, ipAddress }
# Returns: JSON file path and CSV batch export status
```

## ✅ Phase 1 Success Criteria

### Functional Requirements
- [x] Next.js app รันได้: `npm run dev` ทำงานโดยไม่มี error
- [x] Customer form ทำงาน: กรอกข้อมูล 3 fields ได้ถูกต้อง
- [x] Form validation: แสดง error message เมื่อข้อมูลไม่ถูกต้อง
- [x] ESP32 detection: API endpoint สำหรับ detect ESP32 devices
- [x] Device selection: เลือก ESP32 device ได้
- [x] State management: Customer + Device state เชื่อมต่อกันถูกต้อง
- [x] Deploy button: แสดงเมื่อมีข้อมูลครบแล้ว

### UI/UX Requirements
- [x] Responsive design: ใช้งานได้ในหน้าจอขนาดต่างๆ
- [x] Loading states: แสดง loading เมื่อกำลังค้นหา device
- [x] Error handling: แสดง error message ที่เข้าใจได้
- [x] Visual feedback: แสดงสถานะการเลือก device ชัดเจน

### Technical Requirements
- [x] TypeScript: ไม่มี type errors
- [x] API routes: `/api/detect` ทำงานถูกต้อง
- [x] PlatformIO integration: รองรับ `pio device list` command

## 🧪 Testing

### Manual Testing Steps

1. **Form Validation Test**:
   ```
   - ทดสอบ submit form เปล่า (ต้องมี error)
   - ทดสอบรหัสลูกค้าผิดรูปแบบ (ต้องมี error) 
   - ทดสอบกรอกครบถูกต้อง (ต้องผ่าน)
   ```

2. **Device Detection Test**:
   ```bash
   # ติดตั้ง PlatformIO CLI ก่อน (ถ้าต้องการทดสอบ hardware detection)
   pip install platformio
   
   # เสียบ ESP32 เข้า USB
   # เปิด app และดู device list
   # ตรวจสอบ: ต้องเจอ ESP32 device ในรายการ
   ```

3. **State Management Test**:
   ```
   - กรอกฟอร์ม → ต้องเห็น device list
   - เลือก device → ต้องเห็น deploy button
   - กด deploy → ต้องเห็น Phase 1 complete message
   ```

## 🔌 Hardware Requirements

- **ESP32 Development Board** (สำหรับทดสอบ detection)
- **USB Cable** สำหรับเชื่อมต่อ ESP32
- **PlatformIO CLI** สำหรับ device detection

## 🪟 Windows Compatibility

### Native Windows Support

The ESP32 Deployment Tool now includes comprehensive Windows compatibility improvements:

- **Native COM Port Detection**: Uses PowerShell and Windows Management Instrumentation (WMI) for accurate COM port enumeration
- **Hardware ID Recognition**: Supports common ESP32 USB-to-Serial chips:
  - CH340/CH341 (VID_1A86)
  - CP2102/CP2105 Silicon Labs (VID_10C4)
  - FTDI FT232R/FT231X (VID_0403)
  - Prolific PL2303 (VID_067B)
- **Multi-Method Detection**: Implements fallback mechanisms for robust device detection
- **Cross-Platform API**: Automatically detects platform and uses appropriate detection method

### Windows Detection Methods

1. **Primary Method**: PowerShell WMI queries
   ```powershell
   Get-WmiObject Win32_PnpEntity | Where-Object {$_.Name -match 'COM\d+'}
   ```

2. **Fallback Method**: Registry enumeration
   ```cmd
   reg query "HKLM\HARDWARE\DEVICEMAP\SERIALCOMM"
   ```

3. **Final Fallback**: Mode command parsing
   ```cmd
   mode
   ```

### Troubleshooting Windows Issues

- **No Devices Found**: Ensure ESP32 drivers are installed (CH340, CP2102, etc.)
- **PowerShell Errors**: Check execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- **COM Port Issues**: Verify device appears in Device Manager under "Ports (COM & LPT)"

## 🚨 Known Issues

1. **PlatformIO Not Found**: 
   ```bash
   # แก้ไข: Install PlatformIO Core
   pip install platformio
   ```

2. **No ESP32 Detected**:
   - ตรวจสอบ ESP32 driver installation
   - ทดสอบ `pio device list` ใน terminal

## ⏭️ Current Status & Next Phase

**Phase 1 & 2 เสร็จเรียบร้อย** ✅

### Completed Features:
- ✅ Customer form with validation
- ✅ ESP32 device detection (Windows compatible)
- ✅ Template system + WiFi generation
- ✅ PlatformIO build + upload workflow
- ✅ MAC address extraction
- ✅ JSON/CSV export system
- ✅ DHT22 sensor testing
- ✅ Complete API suite (7 endpoints)
- ✅ Cross-platform compatibility

### Ready for **Phase 3: Advanced Features**:
- 🔄 Real-time deployment monitoring
- 🔄 Batch deployment for multiple devices
- 🔄 Advanced sensor configuration
- 🔄 Deployment history and analytics
- 🔄 Remote device management

## 🔗 Integration

เชื่อมต่อกับ SMC ecosystem:
- CLI Tool: `/cli/` สำหรับ license generation
- ESP32 Hardware: `/smc-key-temp/` สำหรับ hardware configuration
