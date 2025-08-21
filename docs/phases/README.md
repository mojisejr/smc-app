# ESP32 Deployment Tool - MVP Implementation Plan

การพัฒนา ESP32 Deployment Tool แบบ Docker-First & Cross-Platform สำหรับ SMC Medical Device Customer Deployment Pipeline

## 🎯 MVP Vision

**Core User Journey เท่านั้น:**
```
กรอกฟอร์ม → เสียบ ESP32 → กดปุ่ม → ได้ไฟล์
```

**เป้าหมาย:** เครื่องมือภายในองค์กรที่ stable, ใช้งานง่าย, ไม่ซับซ้อน

## 📋 Phase Overview

| Phase | ระยะเวลา | หน้าที่หลัก | Status |
|-------|---------|------------|--------|
| [Phase 1](./phase1-foundation.md) | 2-3 วัน | Docker Foundation & Detection | ✅ Complete |
| [Phase 2](./phase2-core-deployment.md) | 4-5 วัน | Containerized Deployment Workflow | ✅ Complete |
| [Phase 3](./phase3-stability.md) | 3-4 วัน | Docker Production & Polish | ⏳ In Progress |

**รวมระยะเวลา:** 9-12 วัน (2 สัปดาห์) - **Docker approach ทำให้ deployment ง่ายขึ้น**

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

### **Technology Stack (Docker-First):**
- **Container Platform:** Docker + Docker Compose
- **Framework:** Next.js 14 (App Router) in containerized environment
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes with container-based execution
- **ESP32 Integration:** Containerized PlatformIO CLI with USB device mapping
- **Storage:** Container volumes for temp files and exports
- **Development:** Docker development environment with hot reload
- **Production:** Optimized Docker images for cross-platform deployment

### **Dockerized Application Structure:**
```
esp32-deployment-tool/
├── Dockerfile               # Container image definition
├── docker-compose.yml       # Development environment
├── docker-compose.prod.yml  # Production deployment
├── src/
│   ├── app/
│   │   ├── page.tsx          # Single page application
│   │   ├── api/
│   │   │   ├── detect/route.ts   # ESP32 detection (containerized)
│   │   │   ├── deploy/route.ts   # Complete deploy workflow
│   │   │   ├── extract/route.ts  # MAC extraction
│   │   │   └── health/route.ts   # Container health check
│   │   └── layout.tsx
│   ├── components/
│   │   ├── CustomerForm.tsx      # Input form (3 fields)
│   │   ├── DeviceList.tsx        # ESP32 device selection
│   │   └── ProgressBar.tsx       # Real-time progress indicator
│   ├── lib/
│   │   ├── esp32.ts              # ESP32 hardware functions
│   │   ├── template.ts           # Template processing
│   │   └── export.ts             # JSON file generation
│   └── templates/
│       └── main.cpp.template     # ESP32 firmware template
├── exports/                  # Volume for JSON exports
└── temp/                     # Volume for build temp files
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

### **Docker MVP Target State:**
```
Sales Staff → Docker Container → Web Form → Auto Deploy → JSON Export → Dev CLI Auto-import
```

### **Containerized Technical Flow:**
```
1. [Docker Start] docker-compose up → Container with PlatformIO ready
         ↓
2. [Web Form] 3 fields: องค์กร, รหัสลูกค้า, แอป
         ↓
3. [Auto Generate] WiFi SSID/Password + Template (in container)
         ↓  
4. [Container PlatformIO] Build + Upload firmware via USB mapping
         ↓
5. [Extract] MAC address via HTTP (container → ESP32)
         ↓
6. [Export] Generate customer-{id}.json → Host Desktop
         ↓
7. [CLI Integration] smc-license --from-json customer-{id}.json
```

## 🎨 MVP Development Approach

### **Minimal & Stable Principles:**
- **7 Features เท่านั้น:** ไม่เพิ่ม feature ใดๆ นอกเหนือจากนี้
- **Single Page App:** ไม่มี routing ซับซ้อน
- **Fixed Settings:** ไม่มี customization options
- **Internal Use Only:** ออกแบบสำหรับใช้ภายในองค์กร
- **Stable > Feature-Rich:** ความเสถียร สำคัญกว่า features

### **Docker Development Guidelines:**
1. **Container-First:** ทุกอย่างรันใน Docker environment
2. **Cross-Platform Ready:** Mac dev → Windows prod seamlessly
3. **Core Journey Only:** focus แค่ "Docker Start → กรอกฟอร์ม → Deploy → ได้ไฟล์"
4. **USB Device Mapping:** ESP32 access ผ่าน Docker device mapping
5. **Volume Management:** File exports ผ่าน Docker volumes
6. **Health Monitoring:** Container health checks และ monitoring
7. **Simple Error Handling:** error message ง่ายๆ ที่เข้าใจได้พร้อม container troubleshooting

## 📚 Phase Documents

แต่ละ Phase จะมีเอกสารแยก containing:

- **📖 Overview & Goals** - เป้าหมายของ phase
- **🔧 Technical Requirements** - ข้อกำหนดทางเทคนิค (minimal)
- **📝 Implementation Steps** - ขั้นตอนการทำงานแบบ step-by-step
- **💻 Code Examples** - Code snippets สำคัญ
- **✅ Success Criteria** - เช็คลิสต์ความสำเร็จ (เฉพาะจำเป็น)

## ⚡ Quick Start

### **Docker Development Environment:**
```bash
# Required tools
docker --version          # Docker Desktop
docker-compose --version  # Docker Compose

# ESP32 hardware (for testing)
# USB ESP32 development board
```

### **Setup Steps (Docker-First):**
```bash
# Clone/Navigate to project
cd esp32-deployment-tool

# Start Docker development environment
docker-compose up --build

# Access application
# → http://localhost:3000

# Test ESP32 detection (ในอีก terminal)
docker-compose exec esp32-tool pio device list

# Stop development
docker-compose down
```

## 🎯 Success Metrics

### **เมื่อจบทุก Phase จะได้:**
- ✅ Docker-containerized web app ที่พนักงานขายใช้งานได้จริง
- ✅ Cross-platform deployment (Mac dev → Windows prod)
- ✅ ESP32 deployment เป็น one-click operation ใน container
- ✅ JSON export system พร้อมใช้งาน (container → host Desktop)
- ✅ smc-license CLI integration สมบูรณ์
- ✅ End-to-end containerized workflow ทำงานไม่มีปัญหา
- ✅ Production-ready Docker images สำหรับ distribution
- ✅ Self-contained system ไม่ต้องติดตั้ง dependencies

### **Docker MVP Success Criteria:**
- ✅ พนักงานขายรัน `docker-compose up` ได้สำเร็จ
- ✅ สามารถกรอกฟอร์ม 3 fields ได้ใน container
- ✅ ระบบหา ESP32 device ได้อัตโนมัติผ่าน Docker USB mapping
- ✅ Deploy firmware สำเร็จ ไม่ error ใน containerized environment
- ✅ ได้ JSON file ใน host Desktop ที่ dev สามารถ import ได้
- ✅ ใช้เวลาไม่เกิน 5 นาที per deployment (รวม container startup)
- ✅ Cross-platform: Mac development → Windows production seamlessly
- ✅ Container stable ไม่ crash, พร้อม health monitoring

---

**โปรเจกต์นี้เป็นส่วนหนึ่งของ SMC License System Integration**  
สำหรับคำถามและการติดตาม กลับไปดู [License CLI Integration](../system-architecture/10-license-cli-integration.md)