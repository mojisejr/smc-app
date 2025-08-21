# ESP32 Deployment Tool

## Phase 1: Foundation & Form & Detection ✅ Complete

ESP32 Deployment Tool สำหรับ SMC Customer ESP32 Configuration ระบบจัดการการ deploy firmware ลง ESP32 devices

## 🚀 Features (Phase 1)

- **Customer Input Form**: กรอกข้อมูลลูกค้า 3 fields พร้อม validation
- **ESP32 Device Detection**: ตรวจหา ESP32 devices ผ่าน PlatformIO CLI
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
│   │   └── api/detect/route.ts # ESP32 detection API
│   ├── components/
│   │   ├── CustomerForm.tsx    # Customer input form
│   │   └── DeviceList.tsx      # ESP32 device list
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

## 🚨 Known Issues

1. **PlatformIO Not Found**: 
   ```bash
   # แก้ไข: Install PlatformIO Core
   pip install platformio
   ```

2. **No ESP32 Detected**:
   - ตรวจสอบ ESP32 driver installation
   - ทดสอบ `pio device list` ใน terminal

## ⏭️ Next Phase

Phase 1 เสร็จเรียบร้อย พร้อมสำหรับ **Phase 2: Core Deployment**:
- Template system + WiFi generation
- PlatformIO build + upload workflow
- MAC address extraction  
- JSON file export

## 🔗 Integration

เชื่อมต่อกับ SMC ecosystem:
- CLI Tool: `/cli/` สำหรับ license generation
- ESP32 Hardware: `/smc-key-temp/` สำหรับ hardware configuration
