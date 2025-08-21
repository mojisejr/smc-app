# ESP32 Deployment Tool - MVP Implementation Plan

การพัฒนา ESP32 Deployment Tool แบบ Minimal & Stable สำหรับ SMC Medical Device Customer Deployment Pipeline

## 🎯 MVP Vision

**Core User Journey เท่านั้น:**
```
กรอกฟอร์ม → เสียบ ESP32 → กดปุ่ม → ได้ไฟล์
```

**เป้าหมาย:** เครื่องมือภายในองค์กรที่ stable, ใช้งานง่าย, ไม่ซับซ้อน

## 📋 Phase Overview

| Phase | ระยะเวลา | หน้าที่หลัก | Status |
|-------|---------|------------|--------|
| [Phase 1](./phase1-foundation.md) | 3-4 วัน | Foundation & Form & Detection | ⏳ Not Started |
| [Phase 2](./phase2-core-deployment.md) | 4-5 วัน | Core Deployment Workflow | ⏳ Not Started |
| [Phase 3](./phase3-stability.md) | 2-3 วัน | Error Handling & Polish | ⏳ Not Started |

**รวมระยะเวลา:** 9-12 วัน (2 สัปดาห์)

## 🎯 Project Goals

### **ปัญหาที่แก้ไข:**
- พนักงานขายต้อง deploy ESP32 firmware manually แบบ technical
- ไม่มีระบบจัดการข้อมูลลูกค้าและ WiFi credentials
- Dev ต้อง manually สร้าง license file ด้วยข้อมูลยาวๆ

### **MVP Solution:**
สร้าง **Web Application** (Internal Use) ที่ให้พนักงานขาย:
1. กรอกข้อมูลลูกค้าในฟอร์มง่ายๆ (3 fields เท่านั้น)
2. เสียบ ESP32 เข้า USB → กดปุ่ม Deploy
3. ได้ ESP32 ที่ configured แล้ว + JSON file สำหรับ dev

### **MVP Features (7 Features เท่านั้น):**
1. **Customer Input Form** - กรอกข้อมูลลูกค้า
2. **ESP32 Detection** - หา ESP32 ที่เสียบอยู่
3. **WiFi Auto-Generate** - สร้าง SSID/Password อัตโนมัติ
4. **Firmware Generation** - สร้าง firmware จาก template
5. **ESP32 Programming** - upload firmware ลง ESP32
6. **MAC Address Extract** - ดึง MAC address หลัง deploy
7. **JSON Export** - สร้างไฟล์ให้ dev import

## 🏗️ Simplified Architecture

### **Technology Stack:**
- **Framework:** Next.js 14 (App Router)
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **ESP32 Integration:** PlatformIO CLI (direct execution)
- **Storage:** SQLite (single table สำหรับ log เท่านั้น)
- **Deployment:** Docker container (internal use)

### **Single Page Application Structure:**
```
esp32-deployment-tool/
├── app/
│   ├── page.tsx              # Single page application
│   ├── api/
│   │   ├── detect/route.ts   # ESP32 detection
│   │   ├── deploy/route.ts   # Complete deploy workflow
│   │   └── extract/route.ts  # MAC extraction
│   └── layout.tsx
├── components/
│   ├── CustomerForm.tsx      # Input form (3 fields)
│   ├── DeviceList.tsx        # ESP32 device selection
│   └── ProgressBar.tsx       # Simple progress indicator
├── lib/
│   ├── esp32.ts             # ESP32 hardware functions
│   ├── template.ts          # Template processing
│   └── export.ts            # JSON file generation
├── templates/
│   └── main.cpp.template    # Single firmware template
└── package.json
```

### **UI Layout (Single Page):**
```
┌─────────────────────────────────────┐
│  ESP32 Deployment Tool             │
├─────────────────────────────────────┤
│  📝 Customer Information           │
│  [Organization] [Customer ID]      │
│  [Application Name]                │
│                                     │
│  🔌 ESP32 Devices                  │
│  ○ COM3 - ESP32 Dev Module         │
│  ○ COM5 - ESP32 Dev Module         │
│                                     │
│  [🚀 Deploy Firmware]              │
│                                     │
│  📊 Progress: ████████░░ 80%        │
│  Status: Uploading firmware...     │
│                                     │
│  📁 Output: customer-ABC001.json   │
│  Location: ~/Desktop/              │
└─────────────────────────────────────┘
```

## 🔄 Simplified Workflow

### **Current State:**
```
Sales Staff → Manual ESP32 setup → Manual data collection → Dev Manual CLI
```

### **MVP Target State:**
```
Sales Staff → Web Form → Auto Deploy → JSON Export → Dev CLI Auto-import
```

### **Technical Flow (Minimal):**
```
1. [Web Form] 3 fields: องค์กร, รหัสลูกค้า, แอป
         ↓
2. [Auto Generate] WiFi SSID/Password + Template
         ↓  
3. [PlatformIO] Build + Upload firmware (direct)
         ↓
4. [Extract] MAC address via HTTP
         ↓
5. [Export] Generate customer-{id}.json → Desktop
         ↓
6. [CLI Integration] smc-license --from-json customer-{id}.json
```

## 🎨 MVP Development Approach

### **Minimal & Stable Principles:**
- **7 Features เท่านั้น:** ไม่เพิ่ม feature ใดๆ นอกเหนือจากนี้
- **Single Page App:** ไม่มี routing ซับซ้อน
- **Fixed Settings:** ไม่มี customization options
- **Internal Use Only:** ออกแบบสำหรับใช้ภายในองค์กร
- **Stable > Feature-Rich:** ความเสถียร สำคัญกว่า features

### **Development Guidelines:**
1. **Core Journey Only:** focus แค่ "กรอกฟอร์ม → Deploy → ได้ไฟล์"
2. **No Nice-to-Have:** ถ้าไม่จำเป็นต่อ core journey ไม่ทำ
3. **Simple Error Handling:** error message ง่ายๆ ที่เข้าใจได้
4. **Fixed Locations:** save file ตำแหน่งเดียว (Desktop)
5. **Trust & Deploy:** ไม่มี preview หรือ confirmation ซับซ้อน

## 📚 Phase Documents

แต่ละ Phase จะมีเอกสารแยก containing:

- **📖 Overview & Goals** - เป้าหมายของ phase
- **🔧 Technical Requirements** - ข้อกำหนดทางเทคนิค (minimal)
- **📝 Implementation Steps** - ขั้นตอนการทำงานแบบ step-by-step
- **💻 Code Examples** - Code snippets สำคัญ
- **✅ Success Criteria** - เช็คลิสต์ความสำเร็จ (เฉพาะจำเป็น)

## ⚡ Quick Start

### **Development Environment:**
```bash
# Required tools
node -v          # v18+
npm -v           # v8+
pio --version    # PlatformIO Core

# ESP32 development
pio device list  # ตรวจสอบ ESP32 connection
```

### **Setup Steps:**
```bash
# Create Next.js project
npx create-next-app@14 esp32-deployment-tool --typescript --tailwind --app
cd esp32-deployment-tool

# Install dependencies
npm install

# Start development
npm run dev
```

## 🎯 Success Metrics

### **เมื่อจบทุก Phase จะได้:**
- ✅ Web app ที่พนักงานขายใช้งานได้จริง (single page)
- ✅ ESP32 deployment เป็น one-click operation  
- ✅ JSON export system พร้อมใช้งาน (save to Desktop)
- ✅ smc-license CLI integration สมบูรณ์
- ✅ End-to-end workflow ทำงานไม่มีปัญหา
- ✅ Stable & reliable สำหรับใช้งานภายในองค์กร

### **MVP Success Criteria:**
- ✅ พนักงานขายสามารถกรอกฟอร์ม 3 fields ได้
- ✅ ระบบหา ESP32 device ได้อัตโนมัติ
- ✅ Deploy firmware สำเร็จ ไม่ error
- ✅ ได้ JSON file ที่ dev สามารถ import ได้
- ✅ ใช้เวลาไม่เกิน 5 นาที per deployment
- ✅ Stable ไม่ crash บ่อย

---

**โปรเจกต์นี้เป็นส่วนหนึ่งของ SMC License System Integration**  
สำหรับคำถามและการติดตาม กลับไปดู [License CLI Integration](../system-architecture/10-license-cli-integration.md)