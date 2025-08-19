# SMC Application

## 1. Project Overview

### 1.1 Introduction

SMC Application (Smart Medication Cart Version 1) เป็นแอปพลิเคชันที่พัฒนาขึ้นเพื่อ [รอข้อมูลจากคุณเกี่ยวกับจุดประสงค์หลักของแอปพลิเคชัน]

### 1.2 Key Features

- [รอรายละเอียดฟีเจอร์หลักๆ ของแอปพลิเคชัน]
- [รอรายละเอียดฟีเจอร์หลักๆ ของแอปพลิเคชัน]
- [รอรายละเอียดฟีเจอร์หลักๆ ของแอปพลิเคชัน]

### 1.3 Technology Stack

- Frontend:
  - Next.js (React Framework)
  - React 18
  - TailwindCSS
  - DaisyUI
  - Framer Motion (สำหรับ Animation)
  - React Hook Form (สำหรับจัดการ Form)
  - React Icons
  - React Toastify (สำหรับแสดง Notification)
- Backend:
  - Electron (Desktop Application Framework)
  - Node.js
- Database:
  - SQLite3
  - Sequelize (ORM)
- Communication:
  - MQTT (สำหรับการสื่อสารแบบ Real-time)
  - SerialPort (สำหรับการเชื่อมต่อกับอุปกรณ์ Serial)
- Development Tools:
  - TypeScript
  - Electron Builder (สำหรับ Build Desktop Application)
  - Nextron (Next.js + Electron)
- License System:
  - SMC License CLI (Production-ready license generation)
  - AES-256-CBC Encryption with ESP32 hardware binding
  - SQLite database activation flag management
  - Cross-platform WiFi management for ESP32 communication

## 2. Installation and Setup

### 2.1 Prerequisites

- Node.js (version 18 หรือสูงกว่า)
- Git
- SQLite3

### 2.2 Installation Steps

1. Clone the repository

```bash
git clone [รอ URL ของ repository]
cd smc-app
```

2. Install dependencies

```bash
npm install
```

3. License System Setup (Required)

**Generate License File:**
```bash
# Navigate to CLI directory
cd cli/

# Generate license for development/testing
npm run build
node dist/index.js generate -o "Test Hospital" -c "TEST001" -a "SMC_Test" -e "2025-12-31" --test-mode

# Get shared secret key for application
node dist/index.js show-key
```

**Configure Application Environment:**
```bash
# Return to application root
cd ../

# Create .env file with shared key (copy from CLI output)
echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" > .env

# Or use CLI to export directly
cd cli/ && node dist/index.js export-env --output ../.env

# Copy test license file to application root
cp license_test.lic ../license.lic
```

4. Additional Environment Configuration

- Copy `.env.example` to `.env` (if not created above)
- Add additional environment variables as needed:
  - `ESP32_DEFAULT_IP=192.168.4.1`
  - `LICENSE_FILE_PATH=license.lic`
  - `NODE_ENV=development`

### 2.3 Development Setup

1. Start the development server

```bash
npm run dev
```

2. Access the application

- The application will open automatically in development mode

### 2.4 Build and Deployment

1. Build the application

```bash
# สำหรับ Windows 64-bit
npm run build:win63

# สำหรับ Linux
npm run build:linux
```

2. The built application will be available in the `dist` directory

## 3. Project Structure

### 3.1 Directory Structure

```
smc-app/
├── app/                    # Electron main process - จัดการการทำงานหลักของแอปพลิเคชัน
│   ├── background.js      # จุดเริ่มต้นของ Electron process
│   └── preload.js         # Script ที่โหลดก่อน renderer process
│
├── renderer/              # Next.js application (Frontend) - ส่วนติดต่อผู้ใช้
│   ├── pages/            # หน้าต่างๆ ของแอปพลิเคชัน
│   ├── components/       # React components ที่นำกลับมาใช้ใหม่ได้
│   ├── styles/          # ไฟล์ CSS และ Tailwind configuration
│   └── public/          # ไฟล์ static เช่น รูปภาพ, fonts
│
├── resources/             # ไฟล์ทรัพยากรที่ใช้ในแอปพลิเคชัน
│   └── db/               # ไฟล์ฐานข้อมูล SQLite
│
├── main/                 # โค้ดหลักของแอปพลิเคชัน
│   ├── services/        # บริการต่างๆ เช่น การเชื่อมต่อ MQTT, Serial
│   └── utils/           # ฟังก์ชัน utility ต่างๆ
│
├── dist/                 # โฟลเดอร์สำหรับไฟล์ที่ build แล้ว
│   ├── win-unpacked/    # แอปพลิเคชันสำหรับ Windows
│   └── linux-unpacked/  # แอปพลิเคชันสำหรับ Linux
│
├── db/                   # ไฟล์ที่เกี่ยวข้องกับฐานข้อมูล
│   ├── migrations/      # ไฟล์สำหรับอัพเดทโครงสร้างฐานข้อมูล
│   └── models/          # Sequelize models สำหรับการจัดการข้อมูล
│
├── cli/                  # SMC License CLI Tool (Production Ready v1.0.0)
│   ├── index.ts         # CLI entry point with Commander.js
│   ├── modules/         # Core modules (esp32.ts, encryption.ts, license-generator.ts)
│   ├── types/           # TypeScript definitions
│   └── README.md        # CLI documentation
│
├── scripts/              # สคริปต์สำหรับการทำงานอัตโนมัติ
│   └── start.sh         # สคริปต์สำหรับเริ่มต้นแอปพลิเคชัน
│
└── .vscode/             # การตั้งค่า VS Code สำหรับโปรเจค
```

### 3.2 Key Components

#### 3.2.1 Frontend (renderer/)

- `pages/` - หน้าต่างๆ ของแอปพลิเคชัน ใช้ Next.js routing

  - `_app.tsx` - ไฟล์หลักสำหรับการตั้งค่า Next.js
  - `index.tsx` - หน้าหลักของแอปพลิเคชัน
  - `[dynamic]` - หน้าที่ใช้ dynamic routing

- `components/` - React components ที่นำกลับมาใช้ใหม่ได้

  - `ui/` - UI components พื้นฐาน
  - `layout/` - components สำหรับจัดการ layout
  - `features/` - components เฉพาะสำหรับฟีเจอร์ต่างๆ

- `styles/` - ไฟล์ที่เกี่ยวข้องกับการ styling
  - `globals.css` - CSS global styles
  - `tailwind.config.js` - การตั้งค่า Tailwind CSS

#### 3.2.2 Backend (app/)

- `background.js` - จุดเริ่มต้นของ Electron process

  - จัดการการสร้างหน้าต่างแอปพลิเคชัน
  - ตั้งค่า IPC (Inter-Process Communication)
  - จัดการ lifecycle ของแอปพลิเคชัน

- `preload.js` - Script ที่โหลดก่อน renderer process
  - กำหนด API ที่ renderer process สามารถเรียกใช้ได้
  - จัดการความปลอดภัยในการเข้าถึง Node.js APIs

#### 3.2.3 Database (db/)

- `database.db` - ไฟล์ฐานข้อมูล SQLite

  - เก็บข้อมูลทั้งหมดของแอปพลิเคชัน
  - ใช้ Sequelize ORM ในการจัดการ

- `migrations/` - ไฟล์สำหรับอัพเดทโครงสร้างฐานข้อมูล

  - ใช้ Sequelize migrations
  - เก็บประวัติการเปลี่ยนแปลงโครงสร้างฐานข้อมูล

- `models/` - Sequelize models
  - กำหนดโครงสร้างข้อมูล
  - กำหนดความสัมพันธ์ระหว่างตาราง

#### 3.2.4 License System (cli/ และ main/license/)

**SMC License CLI Tool:**
- `cli/index.ts` - CLI entry point พร้อม 6 commands
- `cli/modules/encryption.ts` - AES-256-CBC encryption with ESP32 binding
- `cli/modules/esp32.ts` - ESP32 communication และ MAC address retrieval
- `cli/modules/license-generator.ts` - License file generation และ validation

**Application License Integration:**
- `main/license/validator.ts` - License validation และ database flag management
- `main/license/file-manager.ts` - License.lic file parsing และ decryption
- `main/license/esp32-client.ts` - ESP32 WiFi connection และ MAC validation
- `main/license/wifi-manager.ts` - Cross-platform WiFi management
- `main/license/ipcMain/` - IPC handlers สำหรับ activation workflow
- `renderer/pages/activate-key.tsx` - 8-step activation UI พร้อม real-time progress

### 3.3 Configuration Files

- `package.json` - ไฟล์กำหนดค่าโปรเจค

  - รายการ dependencies
  - scripts สำหรับการพัฒนาและ build
  - การตั้งค่า electron-builder

- `tsconfig.json` - การตั้งค่า TypeScript

  - กำหนด compiler options
  - กำหนด paths และ aliases

- `electron-builder.yml` - การตั้งค่าสำหรับ build แอปพลิเคชัน

  - กำหนดชื่อและข้อมูลแอปพลิเคชัน
  - กำหนดการ build สำหรับแต่ละ platform

- `docker-compose.yml` - การตั้งค่า Docker

  - กำหนด services ที่จำเป็น
  - กำหนดการเชื่อมต่อระหว่าง services

- `.env` - ตัวแปรสภาพแวดล้อม
  - เก็บค่าการตั้งค่าที่ sensitive
  - กำหนดค่าต่างๆ ตาม environment

### 3.4 Build and Distribution

- `dist/` - โฟลเดอร์สำหรับไฟล์ที่ build แล้ว
  - `win-unpacked/` - แอปพลิเคชันสำหรับ Windows
  - `linux-unpacked/` - แอปพลิเคชันสำหรับ Linux
  - `resources/` - ไฟล์ทรัพยากรที่จำเป็น
  - `*.exe` (Windows) - Installer สำหรับ Windows
  - `*.AppImage` (Linux) - Executable สำหรับ Linux

## 4. Development and Usage

### 4.1 Development Workflow

#### 4.1.1 การเริ่มต้นพัฒนา

**ขั้นตอนที่ 1: เตรียม License System**

```bash
# 1. สร้าง test license
cd cli/
npm run build
node dist/index.js generate -o "Test Hospital" -c "DEV001" -a "SMC_Test" -e "2025-12-31" --test-mode

# 2. Setup .env file
node dist/index.js export-env --output ../.env

# 3. คัดลอก license file
cp license_test.lic ../license.lic

# 4. กลับไปที่ application root
cd ../
```

**ขั้นตอนที่ 2: เริ่มต้น development server**

```bash
npm run dev
```

**พฤติกรรมการทำงาน:**
- แอปพลิเคชันจะเปิดขึ้นมาในโหมด development
- ถ้ายังไม่ activate: จะแสดงหน้า `/activate-key` พร้อม 8-step activation process
- ถ้า activate แล้ว: จะแสดงหน้า `/home` หลัก
- มีการ hot-reload เมื่อมีการแก้ไขโค้ด
- สามารถดู console logs ได้จาก Developer Tools

#### 4.1.2 การพัฒนา Frontend

- ใช้ Next.js และ React สำหรับการพัฒนา UI
- ใช้ TailwindCSS และ DaisyUI สำหรับ styling
- ใช้ TypeScript สำหรับ type safety
- ใช้ React Hook Form สำหรับจัดการ forms
- ใช้ React Toastify สำหรับแสดง notifications

#### 4.1.3 การพัฒนา Backend

- ใช้ Electron main process สำหรับการทำงานหลัก
- ใช้ IPC (Inter-Process Communication) สำหรับการสื่อสารระหว่าง processes
- ใช้ Sequelize ORM สำหรับการจัดการฐานข้อมูล
- ใช้ MQTT สำหรับการสื่อสารแบบ real-time
- ใช้ SerialPort สำหรับการเชื่อมต่อกับอุปกรณ์ serial

#### 4.1.4 การพัฒนา License System

**CLI Commands สำหรับ Development:**

```bash
# เข้าไปใน CLI directory
cd cli/

# Build CLI
npm run build

# Generate test license
node dist/index.js generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-12-31" --test-mode

# แสดง shared key
node dist/index.js show-key

# Export .env file
node dist/index.js export-env --output ../.env

# Validate license
node dist/index.js validate -f license_test.lic

# แสดงข้อมูล license
node dist/index.js info -f license_test.lic

# กลับไปที่ application root
cd ../
```

**การทดสอบ License System:**

```bash
# ลบ activation flag เพื่อทดสอบ activation ใหม่
# (ทำได้โดยการลบ database หรือ reset activated_key field)

# รัน application - จะแสดงหน้า activation
npm run dev

# หรือ test activation workflow โดยตรง
# Application จะทำการ activate อัตโนมัติเมื่อมี license.lic และ .env
```

### 4.2 การใช้งานแอปพลิเคชัน

#### 4.2.1 การเริ่มต้นใช้งาน

1. เปิดแอปพลิเคชัน
2. [รอรายละเอียดขั้นตอนการเริ่มต้นใช้งาน]

#### 4.2.2 ฟีเจอร์หลัก

1. [รอรายละเอียดฟีเจอร์หลัก]
2. [รอรายละเอียดฟีเจอร์หลัก]
3. [รอรายละเอียดฟีเจอร์หลัก]

#### 4.2.3 การเชื่อมต่อกับอุปกรณ์

1. การเชื่อมต่อ Serial Port

   - [รอรายละเอียดการเชื่อมต่อ]
   - [รอรายละเอียดการตั้งค่า]

2. การเชื่อมต่อ MQTT
   - [รอรายละเอียดการเชื่อมต่อ]
   - [รอรายละเอียดการตั้งค่า]

### 4.3 การแก้ไขปัญหาเบื้องต้น

#### 4.3.1 ปัญหาที่พบบ่อย

1. [รอรายละเอียดปัญหาและวิธีแก้ไข]
2. [รอรายละเอียดปัญหาและวิธีแก้ไข]
3. [รอรายละเอียดปัญหาและวิธีแก้ไข]

#### 4.3.2 การตรวจสอบ Logs

- Windows: `%APPDATA%/smc/logs/`
- Linux: `~/.config/smc/logs/`

#### 4.3.3 การรีเซ็ตแอปพลิเคชัน

1. ปิดแอปพลิเคชัน
2. ลบไฟล์ในโฟลเดอร์ logs
3. เริ่มต้นแอปพลิเคชันใหม่

### 4.4 การอัพเดทแอปพลิเคชัน

1. ดาวน์โหลดเวอร์ชันใหม่
2. ติดตั้งทับเวอร์ชันเดิม
3. ข้อมูลจะถูกเก็บไว้ในฐานข้อมูลเดิม

## 5. Deployment and Maintenance

### 5.1 การ Build แอปพลิเคชัน

#### 5.1.1 การ Build สำหรับ Windows

```bash
# Build สำหรับ Windows 64-bit
npm run build:win63

# ผลลัพธ์จะอยู่ในโฟลเดอร์ dist/
# - dist/win-unpacked/ - แอปพลิเคชันที่ยังไม่ได้ติดตั้ง
# - dist/smc Setup x.x.x.exe - ไฟล์ติดตั้ง
```

#### 5.1.2 การ Build สำหรับ Linux

```bash
# Build สำหรับ Linux
npm run build:linux

# ผลลัพธ์จะอยู่ในโฟลเดอร์ dist/
# - dist/linux-unpacked/ - แอปพลิเคชันที่ยังไม่ได้ติดตั้ง
# - dist/smc-x.x.x.AppImage - ไฟล์ executable
```

### 5.2 การ Deploy

#### 5.2.1 การติดตั้งบน Windows

1. รันไฟล์ `smc Setup x.x.x.exe`
2. ตามขั้นตอนการติดตั้ง
3. แอปพลิเคชันจะถูกติดตั้งที่ `C:\Users\[username]\AppData\Local\smc`

#### 5.2.2 การติดตั้งบน Linux

1. ให้สิทธิ์การรันกับไฟล์ AppImage

```bash
chmod +x smc-x.x.x.AppImage
```

2. รันไฟล์ AppImage

```bash
./smc-x.x.x.AppImage
```

### 5.3 การบำรุงรักษา

#### 5.3.1 การสำรองข้อมูล

- ฐานข้อมูล SQLite อยู่ใน:
  - Windows: `%APPDATA%/smc/db/database.db`
  - Linux: `~/.config/smc/db/database.db`
- ควรสำรองข้อมูลเป็นประจำ

#### 5.3.2 การอัพเดทแอปพลิเคชัน

1. สำรองข้อมูลก่อนอัพเดท
2. ติดตั้งเวอร์ชันใหม่
3. ตรวจสอบการทำงานของแอปพลิเคชัน

#### 5.3.3 การลบแอปพลิเคชัน

1. ปิดแอปพลิเคชัน
2. ลบโฟลเดอร์แอปพลิเคชัน
3. สำรองข้อมูลก่อนลบ (ถ้าต้องการ)

### 5.4 การแก้ไขปัญหา

#### 5.4.1 ปัญหาการติดตั้ง

- ตรวจสอบสิทธิ์การเข้าถึง
- ตรวจสอบพื้นที่ว่างในดิสก์
- ตรวจสอบเวอร์ชันของระบบปฏิบัติการ

#### 5.4.2 ปัญหาการทำงาน

- ตรวจสอบ logs
- ตรวจสอบการเชื่อมต่อกับอุปกรณ์
- ตรวจสอบการตั้งค่า

#### 5.4.3 การติดต่อผู้พัฒนา

- อีเมล: nonthasak.l@gmail.com
- [รอข้อมูลการติดต่อเพิ่มเติม]

## 6. Testing and Quality Assurance

### 6.1 การทดสอบในขั้นตอนการพัฒนา

#### 6.1.1 การทดสอบ Frontend

- ใช้ React Developer Tools สำหรับตรวจสอบ components
- ใช้ Browser Developer Tools สำหรับตรวจสอบ UI และ performance
- ใช้ React Hook Form DevTools สำหรับตรวจสอบ forms

#### 6.1.2 การทดสอบ Backend

- ใช้ Electron DevTools สำหรับตรวจสอบ main process
- ใช้ SQLite Browser สำหรับตรวจสอบฐานข้อมูล
- ใช้ MQTT Client สำหรับทดสอบการเชื่อมต่อ MQTT
- ใช้ Serial Port Monitor สำหรับทดสอบการเชื่อมต่อ Serial

### 6.2 การทดสอบการทำงาน

#### 6.2.1 การทดสอบการเชื่อมต่อ

1. การเชื่อมต่อ Serial Port

   - ทดสอบการเชื่อมต่อกับอุปกรณ์
   - ทดสอบการส่งและรับข้อมูล
   - ทดสอบการจัดการข้อผิดพลาด

2. การเชื่อมต่อ MQTT
   - ทดสอบการเชื่อมต่อกับ broker
   - ทดสอบการ publish และ subscribe
   - ทดสอบการจัดการข้อผิดพลาด

#### 6.2.2 การทดสอบฐานข้อมูล

- ทดสอบการบันทึกข้อมูล
- ทดสอบการอ่านข้อมูล
- ทดสอบการอัพเดทข้อมูล
- ทดสอบการลบข้อมูล

### 6.3 การทดสอบประสิทธิภาพ

#### 6.3.1 การทดสอบความเร็ว

- วัดเวลาการโหลดหน้า
- วัดเวลาการตอบสนอง
- วัดการใช้ทรัพยากรระบบ

#### 6.3.2 การทดสอบความเสถียร

- ทดสอบการทำงานต่อเนื่อง
- ทดสอบการจัดการหน่วยความจำ
- ทดสอบการจัดการข้อผิดพลาด

### 6.4 การทดสอบความปลอดภัย

#### 6.4.1 การทดสอบการเข้าถึง

- ทดสอบการเข้าถึงไฟล์ระบบ
- ทดสอบการเข้าถึงฐานข้อมูล
- ทดสอบการเข้าถึงเครือข่าย

#### 6.4.2 การทดสอบข้อมูล

- ทดสอบการเข้ารหัสข้อมูล
- ทดสอบการสำรองข้อมูล
- ทดสอบการกู้คืนข้อมูล

### 6.5 การทดสอบการใช้งาน

#### 6.5.1 การทดสอบ UI/UX

- ทดสอบความสะดวกในการใช้งาน
- ทดสอบความเข้าใจของ UI
- ทดสอบการตอบสนองต่อการใช้งาน

#### 6.5.2 การทดสอบฟีเจอร์

- ทดสอบฟีเจอร์หลัก
- ทดสอบฟีเจอร์รอง
- ทดสอบการทำงานร่วมกันของฟีเจอร์

### 6.6 การรายงานปัญหา

#### 6.6.1 การบันทึกปัญหา

- บันทึกขั้นตอนการเกิดปัญหา
- บันทึกข้อความแสดงข้อผิดพลาด
- บันทึกสภาพแวดล้อมที่เกิดปัญหา

#### 6.6.2 การติดตามปัญหา

- ติดตามสถานะการแก้ไข
- ติดตามการอัพเดท
- ติดตามการทดสอบซ้ำ

## 7. Support and Additional Resources

### 7.1 การติดต่อและสนับสนุน

#### 7.1.1 ช่องทางการติดต่อ

- อีเมล: nonthasak.l@gmail.com
- [รอข้อมูลการติดต่อเพิ่มเติม]

#### 7.1.2 ชั่วโมงการสนับสนุน

- วันจันทร์ - วันศุกร์: 09:00 - 18:00 น.
- [รอข้อมูลเวลาสนับสนุนเพิ่มเติม]

### 7.2 เอกสารเพิ่มเติม

#### 7.2.1 คู่มือการใช้งาน

- [รอลิงก์หรือที่อยู่ของคู่มือการใช้งาน]
- [รอข้อมูลเอกสารเพิ่มเติม]

#### 7.2.2 API Documentation

- [รอลิงก์หรือที่อยู่ของ API Documentation]
- [รอข้อมูลเอกสารเพิ่มเติม]

### 7.3 ทรัพยากรสำหรับนักพัฒนา

#### 7.3.1 เทคโนโลยีที่ใช้

- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Sequelize Documentation](https://sequelize.org/docs)
- [MQTT Documentation](https://mqtt.org/documentation)
- [SerialPort Documentation](https://serialport.io/docs)

#### 7.3.2 เครื่องมือที่แนะนำ

- VS Code
- SQLite Browser
- MQTT Client
- Serial Port Monitor
- [รอรายการเครื่องมือเพิ่มเติม]

### 7.4 การอัพเดทและเวอร์ชัน

#### 7.4.1 ประวัติการอัพเดท

- [รอประวัติการอัพเดท]
- [รอรายละเอียดการเปลี่ยนแปลง]

#### 7.4.2 แผนการพัฒนาต่อไป

- [รอแผนการพัฒนา]
- [รอฟีเจอร์ที่จะเพิ่มเติม]

### 7.5 การมีส่วนร่วมในการพัฒนา

#### 7.5.1 การรายงานปัญหา

- [รอช่องทางการรายงานปัญหา]
- [รอรูปแบบการรายงานปัญหา]

#### 7.5.2 การเสนอแนะฟีเจอร์

- [รอช่องทางการเสนอแนะ]
- [รอรูปแบบการเสนอแนะ]

### 7.6 ทรัพยากรเพิ่มเติม

#### 7.6.1 วิดีโอสอนการใช้งาน

- [รอลิงก์วิดีโอสอนการใช้งาน]
- [รอรายการวิดีโอเพิ่มเติม]

#### 7.6.2 บทความและบล็อก

- [รอลิงก์บทความ]
- [รอรายการบทความเพิ่มเติม]

### 7.7 การฝึกอบรม

#### 7.7.1 หลักสูตรการใช้งาน

- [รอรายละเอียดหลักสูตร]
- [รอตารางการฝึกอบรม]

#### 7.7.2 เอกสารการฝึกอบรม

- [รอลิงก์เอกสารการฝึกอบรม]
- [รอรายการเอกสารเพิ่มเติม]

## 8. References and Appendices

### 8.1 การอ้างอิง

#### 8.1.1 ไลบรารีที่ใช้

- Next.js v12.3.4
- Electron v21.3.3
- React v18.2.0
- TailwindCSS v3.1.8
- Sequelize v6.37.3
- SQLite3 v5.1.6
- MQTT v5.0.5
- SerialPort v12.0.0
- [รายการไลบรารีอื่นๆ]

#### 8.1.2 เอกสารอ้างอิง

- [รายการเอกสารอ้างอิง]
- [รายการเว็บไซต์อ้างอิง]

### 8.2 ภาคผนวก

#### 8.2.1 คำสั่งที่ใช้บ่อย

```bash
# การพัฒนา
npm run dev          # เริ่ม development server
npm run build        # build แอปพลิเคชัน
npm run build:win63  # build สำหรับ Windows 64-bit
npm run build:linux  # build สำหรับ Linux

# การติดตั้ง
npm install          # ติดตั้ง dependencies
npm run postinstall  # ติดตั้ง electron dependencies

# License System (CLI)
cd cli/
npm run build                    # build CLI
node dist/index.js generate --test-mode  # สร้าง test license
node dist/index.js show-key      # แสดง shared key
node dist/index.js export-env    # export .env file
```

#### 8.2.2 ตารางรหัสข้อผิดพลาด

| รหัส       | ความหมาย   | วิธีแก้ไข  |
| ---------- | ---------- | ---------- |
| [รอข้อมูล] | [รอข้อมูล] | [รอข้อมูล] |
| [รอข้อมูล] | [รอข้อมูล] | [รอข้อมูล] |

#### 8.2.3 ตารางการตั้งค่า

| การตั้งค่า | ค่าเริ่มต้น | คำอธิบาย   |
| ---------- | ----------- | ---------- |
| [รอข้อมูล] | [รอข้อมูล]  | [รอข้อมูล] |
| [รอข้อมูล] | [รอข้อมูล]  | [รอข้อมูล] |

### 8.3 ข้อตกลงและเงื่อนไข

#### 8.3.1 ข้อตกลงการใช้งาน

- [รอข้อตกลงการใช้งาน]
- [รอเงื่อนไขการใช้งาน]

#### 8.3.2 นโยบายความเป็นส่วนตัว

- [รอนโยบายความเป็นส่วนตัว]
- [รอการจัดการข้อมูล]

### 8.4 การเปลี่ยนแปลงเอกสาร

#### 8.4.1 ประวัติการแก้ไข

| วันที่     | เวอร์ชัน   | การเปลี่ยนแปลง | ผู้แก้ไข   |
| ---------- | ---------- | -------------- | ---------- |
| [รอข้อมูล] | [รอข้อมูล] | [รอข้อมูล]     | [รอข้อมูล] |
| [รอข้อมูล] | [รอข้อมูล] | [รอข้อมูล]     | [รอข้อมูล] |

#### 8.4.2 การอัพเดทเอกสาร

- เอกสารนี้จะถูกอัพเดทเมื่อมีการเปลี่ยนแปลงที่สำคัญ
- เวอร์ชันล่าสุดของเอกสารสามารถดูได้ที่ [รอลิงก์]

### 8.5 สิทธิ์การใช้งาน

#### 8.5.1 ลิขสิทธิ์

- © 2024 SMC Application
- สงวนลิขสิทธิ์

#### 8.5.2 การอนุญาต

- [รอรายละเอียดการอนุญาต]
- [รอเงื่อนไขการใช้งาน]

---

# สรุป

เอกสารนี้ได้อธิบายรายละเอียดเกี่ยวกับ SMC Application อย่างครบถ้วน ตั้งแต่การติดตั้ง การใช้งาน การพัฒนา การทดสอบ การ deploy และการบำรุงรักษา

หากมีคำถามหรือต้องการความช่วยเหลือเพิ่มเติม สามารถติดต่อได้ตามช่องทางที่ระบุใน Chapter 7

---

## License System Integration Summary

### Key Features Implemented:
- ✅ **SMC License CLI v1.0.0**: Production-ready CLI with 6 commands
- ✅ **AES-256-CBC Encryption**: Hardware-bound licenses with ESP32 MAC addresses
- ✅ **8-Step Activation Process**: Real-time progress with automatic ESP32 validation
- ✅ **Environment Management**: Automated .env setup with shared key export
- ✅ **Cross-Platform Support**: Windows, macOS, Linux compatibility
- ✅ **Medical Device Compliance**: Audit-ready logging and security patterns

### Quick Start for New Developers:
```bash
# 1. Setup license system
cd cli/ && npm run build
node dist/index.js generate -o "Test" -c "DEV001" -a "SMC_Test" -e "2025-12-31" --test-mode
node dist/index.js export-env --output ../.env
cp license_test.lic ../license.lic

# 2. Run application
cd ../ && npm run dev
```

### For Production Deployment:
```bash
# 1. Generate production license with real ESP32
smc-license generate -o "Hospital Name" -c "CUST001" -a "SMC_Cabinet" -e "2025-12-31"

# 2. Deploy with application
cp license.lic /path/to/deployment/
smc-license export-env --output /path/to/deployment/.env
```

---

_เอกสารนี้จัดทำขึ้นโดยทีมพัฒนา SMC Application_
_เวอร์ชัน 1.0.0 with License System Integration_
_อัพเดทล่าสุด: 2025-08-19_
