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
| [Phase 1](./phase1-foundation.md) | 2-3 วัน | Docker Foundation & Detection | ✅ Complete - Container Operational |
| [Phase 1.1](./phase1-foundation.md) | 0.5-1 วัน | USB Device Mapping Fix | ✅ Complete - Multi-Method Detection |
| [Phase 2](./phase2-core-deployment.md) | 4-5 วัน | Containerized Deployment Workflow | ✅ **COMPLETE** - Production Ready |
| [Phase 2.1](./phase2-core-deployment.md) | 1 วัน | Cross-Platform Development Strategy | ✅ **COMPLETE** - Cross-Platform Ready |
| [Phase 2.2](./phase2-core-deployment.md) | 0.5 วัน | macOS Development Mode Integration | ✅ **COMPLETE** - Development Mode Ready |
| [Phase 2.3](./phase3-stability.md) | 1 วัน | Manual Testing & Hardware Integration | ✅ **COMPLETE** - Manual Testing Successful |
| [Phase 3](./phase3-csv-export-enhancement.md) | 1-1.5 ชั่วโมง | CSV Export Enhancement & Daily Batch System | ✅ **COMPLETE** - Sales Team Workflow Ready |

**รวมระยะเวลา:** 11-14 วัน + 1.5 ชั่วโมง - **✅ Phase 3 Complete - Ready for Phase 4 CLI Enhancement**

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

### **MVP Features (8 Features):***
1. **Customer Input Form** - กรอกข้อมูลลูกค้า ✅
2. **ESP32 Detection** - หา ESP32 ที่เสียบอยู่ ✅
3. **WiFi Auto-Generate** - สร้าง SSID/Password อัตโนมัติ ✅
4. **Firmware Generation** - สร้าง firmware จาก template ✅
5. **ESP32 Programming** - upload firmware ลง ESP32 ✅
6. **MAC Address Extract** - ดึง MAC address หลัง deploy ✅
7. **JSON Export** - สร้างไฟล์ให้ dev import (individual) ✅
8. **CSV Export** - สร้างไฟล์รายวันสำหรับ batch processing ✅ **Phase 3 Complete**

## 🏗️ Simplified Architecture

### **Technology Stack (Cross-Platform Hybrid):**
- **Cross-Platform Strategy:** macOS local development + Windows container production
- **Framework:** Next.js 14 (App Router) with platform-aware API detection
- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes with cross-platform execution logic
- **ESP32 Integration:** 
  - macOS: Global PlatformIO CLI with real USB device access
  - Container: PlatformIO CLI with multi-method detection fallbacks
- **Platform Detection:** Automatic switching between `darwin` (local) and `linux` (container) modes
- **Storage:** Container volumes for temp files and exports
- **Development:** Hybrid approach - local Next.js + global PlatformIO for hardware access
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

### **Current State (August 22, 2025):**
```
✅ Phase 3 Complete - CSV Export Enhancement Implemented Successfully
   ├── Cross-platform development strategy implemented successfully
   ├── macOS Development: Local PlatformIO + real ESP32 detection working
   ├── Windows Development: npm run dev working with Desktop export (C:\Users\[user]\Desktop\esp32-exports\)
   ├── Container Production: Docker stable + ready for Windows deployment
   ├── 7 API Endpoints operational with platform-aware detection logic
   ├── Complete end-to-end workflow: Form → Deploy → Extract → Export JSON + CSV
   ├── Template system with AM2302 sensor integration
   ├── WiFi auto-generation algorithm (deterministic)
   ├── Dual PlatformIO integration: local + containerized workflows
   ├── MAC address extraction with retry mechanism (intelligent mode switching)
   ├── Dual export system: JSON (individual) + CSV (daily batch) to Desktop
   ├── CSV export features: date rollover, append mode, field escaping
   ├── Platform detection: automatic switching between local/container modes
   ├── macOS Development Mode: MAC extraction from deployment log (no ESP32 WiFi needed)
   ├── Development workflow verified on macOS with real ESP32 hardware
   ├── Manual testing successful: upload firmware + extract MAC + export JSON + CSV
   └── CLI integration ready (JSON + CSV formats compatible)

✅ Phase 3 Complete: CSV export enhancement for sales team workflow
   ├── Implementation complete: Dual export system operational
   ├── Daily CSV files: esp32-deployments-YYYY-MM-DD.csv format
   ├── Sales workflow ready: Daily batch files for CLI processing
   └── Cross-platform compatibility: Windows npm run dev working

✅ Cross-Platform Strategy: macOS dev + Windows dev + Container prod seamlessly
✅ Manual Testing Complete: Hardware integration verified
✅ Phase 3 Complete: Ready for Phase 4 CLI Enhancement
```

### **Complete Workflow:**
```
Sales Staff → Manual ESP32 setup → Manual data collection → Dev Manual CLI
```

### **Achieved MVP State (Phase 3 Complete):**
```
Sales Staff → Cross-Platform Tool → Web Form → Auto Deploy → JSON + CSV Export → Dev CLI Batch Import
```

### **Cross-Platform Technical Flow (Phase 3 Complete):**
```
1. [Platform Setup] npm run dev (Windows/macOS) หรือ docker-compose up (Container)
         ↓
2. [Web Form] 3 fields: องค์กร, รหัสลูกค้า, แอป
         ↓
3. [Auto Generate] WiFi SSID/Password + Template (platform-aware)
         ↓  
4. [Cross-Platform PlatformIO] Build + Upload firmware (local/container)
         ↓
5. [Extract] MAC address via deployment log (macOS) หรือ HTTP (production)
         ↓
6. [Dual Export] Generate customer-{id}.json + daily CSV → Desktop export
         ↓  
7. [Ready for Phase 4] smc-license batch --input daily-csv-file.csv
```

## 🎨 MVP Development Approach

### **Minimal & Stable Principles:**
- **8 Features Core:** CSV export enhancement เป็น feature สุดท้าย
- **Single Page App:** ไม่มี routing ซับซ้อน
- **Fixed Settings:** ไม่มี customization options
- **Internal Use Only:** ออกแบบสำหรับใช้ภายในองค์กร
- **Stable > Feature-Rich:** ความเสถียร สำคัญกว่า features
- **Backward Compatibility:** CSV export ไม่กระทบ existing JSON functionality

### **Cross-Platform Development Guidelines:**
1. **Hybrid Strategy:** Local development (macOS) + container production (Windows)
2. **Platform-Aware APIs:** Automatic detection mode switching based on environment
3. **Core Journey Focus:** "Start → กรอกฟอร์ม → Deploy → ได้ไฟล์" ใน both modes
4. **Hardware Access Strategy:** 
   - macOS: Direct USB access via global PlatformIO
   - Container: Multi-method fallback detection for Windows production
5. **Volume Management:** File exports ผ่าน Docker volumes + local filesystem
6. **Development Workflow:** Real hardware testing บน macOS, container testing สำหรับ production simulation
7. **Cross-Platform Error Handling:** Error messages เหมาะสำหรับทั้ง local และ container environments

## 📚 Phase Documents

แต่ละ Phase จะมีเอกสารแยก containing:

- **📖 Overview & Goals** - เป้าหมายของ phase
- **🔧 Technical Requirements** - ข้อกำหนดทางเทคนิค (minimal)
- **📝 Implementation Steps** - ขั้นตอนการทำงานแบบ step-by-step
- **💻 Code Examples** - Code snippets สำคัญ
- **✅ Success Criteria** - เช็คลิสต์ความสำเร็จ (เฉพาะจำเป็น)

## ⚡ Quick Start & Resume

### **Current Development Status (For Session Resume):**
```bash
# Container is working - ready to continue from here:
cd /Users/non/dev/smc/smc-app/esp32-deployment-tool

# Container operational status:
docker-compose ps                           # Should show esp32-tool-1 running  
curl http://localhost:3000/api/health       # Should return healthy status
curl http://localhost:3000/api/detect       # Should detect ESP32 (⚠️ currently failing)

# Next immediate task: Fix USB mapping
# Problem: ESP32 devices not detected in container despite being plugged in
# Expected solution: Docker USB device mapping configuration
```

### **Phase 2 Complete Checklist:**
- ✅ Docker container starts and runs stable
- ✅ Web interface accessible at localhost:3000
- ✅ Customer form and UI working with validation
- ✅ Multi-method ESP32 device detection working
- ✅ Complete deployment workflow operational
- ✅ Template system with AM2302 sensor integration
- ✅ WiFi auto-generation algorithm working
- ✅ PlatformIO build & upload integration
- ✅ MAC address extraction with retry mechanism
- ✅ JSON export to Desktop via Docker volumes
- ✅ 7 API endpoints all functional
- ✅ **Manual Testing Complete with ESP32 hardware**

### **Phase 3 Ready Checklist:**
- ✅ Documentation complete: phase3-csv-export-enhancement.md
- ✅ Technical specifications prepared
- ✅ Implementation plan defined (1-1.5 hour timeline)
- ✅ Backward compatibility strategy confirmed
- 🔄 **Ready for CSV Export Implementation**

### **Docker Development Environment:**
```bash
# Required tools (already working)
docker --version          # Docker Desktop ✅
docker-compose --version  # Docker Compose ✅

# ESP32 hardware (for testing)
# USB ESP32 development board ✅
```

### **Setup Steps (Cross-Platform Hybrid):**
```bash
# Clone/Navigate to project
cd esp32-deployment-tool

# Cross-Platform Development Setup
# Option 1: macOS Development (Recommended for active development)
pip3 install platformio                    # Install global PlatformIO
npm run dev                                 # Local development with real ESP32 access
curl http://localhost:3000/api/detect      # Test real hardware detection
# Expected: {"detection_method": "macOS local PlatformIO", "devices": [ESP32]}

# Option 2: Container Development (Windows production simulation)
docker-compose up --build                  # Container environment
curl http://localhost:3000/api/detect      # Test container detection
# Expected: {"detection_method": "container multi-method", "devices": []}

# Stop development
# Local: Ctrl+C to stop npm run dev
# Container: docker-compose down
```

## 🎯 Success Metrics

### **เมื่อจบ Phase 3 จะได้:**
- ✅ Docker-containerized web app ที่พนักงานขายใช้งานได้จริง
- ✅ Cross-platform deployment (Mac dev → Windows prod)
- ✅ ESP32 deployment เป็น one-click operation ใน container
- ✅ Dual export system: JSON (individual) + CSV (daily batch)
- ✅ Sales team workflow optimization: daily CSV files for batch processing
- ✅ smc-license CLI integration พร้อมสำหรับ batch import
- ✅ End-to-end containerized workflow ทำงานไม่มีปัญหา
- ✅ Production-ready Docker images สำหรับ distribution
- ✅ Self-contained system ไม่ต้องติดตั้ง dependencies
- 🆕 **CSV Export Enhancement**: พร้อมสำหรับ Phase 4 CLI batch processing

### **Cross-Platform MVP Success Criteria: ✅ ALL COMPLETE**
- ✅ **macOS Development**: `npm run dev` รัน successfully กับ real ESP32 detection
- ✅ **Container Production**: `docker-compose up` stable สำหรับ Windows deployment
- ✅ **Platform Detection**: API automatically switches ระหว่าง local/container modes  
- ✅ **Form Integration**: กรอกฟอร์ม 3 fields ได้ใน both environments
- ✅ **Hardware Access**: Real ESP32 detection working บน macOS development
- ✅ **Dual PlatformIO**: Both local และ containerized workflows operational
- ✅ **Deploy Workflow**: Complete end-to-end สำเร็จใน development mode
- ✅ **JSON Export**: Desktop export working ใน both modes
- ✅ **Cross-Platform Ready**: macOS development → Windows production seamlessly
- ✅ **Error Handling**: Platform-aware error messages และ troubleshooting  
- ✅ **Development Verified**: Complete workflow tested กับ real ESP32 hardware
- ✅ **Manual Testing Complete**: Production hardware integration verified successfully
- ✅ **macOS Development Mode**: Intelligent MAC extraction without ESP32 WiFi connection
- ✅ **Environment-Aware APIs**: Automatic switching between deployment log parsing และ HTTP API

### **Phase 3 Success Criteria: 🔄 READY FOR IMPLEMENTATION**
- 🔄 **CSV Export System**: Daily CSV files พร้อม date rollover และ append mode
- 🔄 **Dual Export**: JSON + CSV export ทำงานควบคู่กัน
- 🔄 **Sales Workflow**: พนักงานขายได้ daily batch files สำหรับส่ง developer
- 🔄 **CLI Integration Ready**: CSV format พร้อมสำหรับ Phase 4 batch processing
- 🔄 **Backward Compatibility**: Existing JSON functionality ไม่เสีย

---

**โปรเจกต์นี้เป็นส่วนหนึ่งของ SMC License System Integration**  
สำหรับคำถามและการติดตาม กลับไปดู [License CLI Integration](../system-architecture/10-license-cli-integration.md)