# SMC Application - Context Documentation

## 1. ชื่อโปรเจคและคำอธิบายโดยรวม (Project Overview)

### 1.1 ชื่อโปรเจค

**Smart Medication Cart (SMC) Application Version 1.0**

### 1.2 วัตถุประสงค์หลัก

ระบบจัดการตู้เก็บยาอัจฉริยะสำหรับสถานพยาบาล/คลินิก ที่ออกแบบมาเพื่อ:

- **ควบคุมการเข้าถึงยา** ด้วยระบบ authentication ที่ปลอดภัย
- **ติดตามการจ่ายยา** ให้ผู้ป่วยแต่ละรายอย่างแม่นยำ
- **บันทึกประวัติ** การใช้งานทุกครั้งสำหรับการตรวจสอบ
- **จัดการช่องเก็บยา** 16 ช่อง ผ่านระบบ hardware controller

### 1.3 การแก้ปัญหา

- **ลดความผิดพลาด** ในการจ่ายยาผิดคน
- **เพิ่มความปลอดภัย** ในการเก็บรักษายา
- **ควบคุมสต็อก** และติดตามการใช้ยาได้แม่นยำ
- **สร้างระบบ accountability** สำหรับบุคลากรทางการแพทย์

## 2. ฟีเจอร์หลัก (Key Features)

### 2.1 ระบบการยืนยันตัวตน

- **Passkey Authentication**: ใช้รหัสผ่านส่วนตัวแทน username/password
- **Role-based Access**: แยกสิทธิ์ผู้ใช้งานทั่วไปและ Admin
- **Session Management**: จัดการการ login/logout

### 2.2 การจัดการช่องเก็บยา (Slot Management)

- **16 ช่องเก็บยา** ควบคุมโดย KU16 controller
- **Real-time Status**: แสดงสถานะช่องว่าง/ใช้งาน/เปิด/ปิด
- **Patient Assignment**: กำหนดยาให้ผู้ป่วยตาม HN (Hospital Number)

### 2.3 กระบวนการจ่ายยา (Dispensing Workflow)

1. **ป้อน HN ผู้ป่วย** และ passkey ผู้ใช้งาน
2. **ค้นหาช่องเก็บยา** ที่มียาของผู้ป่วย
3. **ปลดล็อคช่อง** ให้ผู้ใช้เอายาออก
4. **ตรวจสอบการจ่ายยา** - ยังมียาเหลืออีกหรือไม่
5. **บันทึกผลการจ่ายยา** ลงฐานข้อมูล

### 2.4 ฟีเจอร์ Admin

- **Deactivate/Reactivate Slot**: ปิด/เปิดการใช้งานช่อง
- **Force Reset**: รีเซ็ตช่องในกรณีฉุกเฉิน
- **User Management**: เพิ่ม/ลบผู้ใช้งาน
- **System Configuration**: ตั้งค่า serial ports, baudrate

### 2.5 ระบบ Logging และ Monitoring

- **Comprehensive Logging**: บันทึกทุกการกระทำของผู้ใช้
- **Dispensing History**: ประวัติการจ่ายยาแต่ละครั้ง
- **System Events**: เหตุการณ์ระบบ เช่น การเชื่อมต่อ hardware
- **Error Tracking**: ติดตามข้อผิดพลาดและการแก้ไข

### 2.6 User Journey แบบคร่าวๆ

```
เข้าระบบ → เลือกจ่ายยา → กรอก HN + รหัสผ่าน →
ระบบปลดล็อคช่อง → เอายาออก → ยืนยันการจ่ายยา →
บันทึกผลลงฐานข้อมูล → กลับหน้าหลัก
```

## 3. Tech Stack ที่ใช้ (Technology Stack)

### 3.1 Frontend

- **Next.js 12.3.4** - React Framework สำหรับ SSR และ routing
- **React 18.2.0** - UI Library หลัก
- **TypeScript 5.1.6** - Static typing
- **TailwindCSS 3.1.8** - Utility-first CSS framework
- **DaisyUI 3.7.4** - Component library บน Tailwind
- **Framer Motion 10.12.16** - Animation library
- **React Hook Form 7.44.3** - Form validation และ management
- **React Icons 4.9.0** - Icon library
- **React Toastify 9.1.3** - Notification system

### 3.2 Backend/Desktop Framework

- **Electron 21.3.3** - Desktop application framework
- **Node.js** - JavaScript runtime
- **Nextron 8.5.0** - Next.js + Electron integration

### 3.3 Database

- **SQLite3 5.1.6** - Embedded database
- **Sequelize 6.37.3** - ORM (Object-Relational Mapping)

### 3.4 Hardware Communication

- **SerialPort 12.0.0** - Serial communication library
- **@serialport/parser-packet-length** - Packet parsing
- **@serialport/parser-byte-length** - Byte-level parsing

### 3.5 Third-party Libraries / APIs

- **MQTT 5.0.5** - Message queuing (ไม่ได้ใช้ในปัจจุบัน)
- **Axios 1.4.0** - HTTP client
- **Electron Store 8.1.0** - Persistent data storage
- **Dotenv 16.3.1** - Environment variables

### 3.6 DevOps / Deployment Tools

- **Electron Builder 23.6.0** - Application packaging
- **Docker Compose** - Container orchestration (มีไฟล์แต่ไม่ได้ใช้)
- **PostCSS & Autoprefixer** - CSS processing

## 4. Implementation Style

### 4.1 รูปแบบการเขียนโค้ด

- **Modular Architecture**: แยกโมดูลต่างๆ อย่างชัดเจน
- **Object-Oriented + Functional Hybrid**:
  - ใช้ Class สำหรับ hardware controllers (KU16, IndicatorDevice)
  - ใช้ Functional components และ hooks ใน React
- **TypeScript First**: พิมพ์ type definition ครอบคลุม

### 4.2 Patterns ที่ใช้

- **IPC (Inter-Process Communication)**: สื่อสารระหว่าง main และ renderer process
- **Repository Pattern**: ใช้ Sequelize models สำหรับ data access
- **Observer Pattern**: Event-driven communication กับ hardware
- **Context Pattern**: React Context สำหรับ state management
- **Custom Hooks Pattern**: แยก business logic ออกจาก UI components

### 4.3 ระดับของ Code Quality: **ดี (Good)**

#### จุดแข็ง:

- **Error Handling ครอบคลุม**: ทุก function มี try-catch และ error logging
- **Type Safety**: ใช้ TypeScript อย่างสม่ำเสมอ
- **Separation of Concerns**: แยกหน้าที่ระหว่าง UI, business logic, และ data layer ชัดเจน
- **Consistent Naming**: ใช้ naming convention ที่เข้าใจง่าย
- **Logging System**: มีระบบ logging ที่ละเอียด
- **Hardware Abstraction**: แยก hardware communication เป็นโมดูลต่างหาก

#### จุดที่ควรปรับปรุง:

- **Documentation**: ขาด inline comments และ API documentation
- **Testing**: ไม่มี unit tests หรือ integration tests
- **Configuration Management**: environment variables ยังไม่เป็นระบบ
- **Error Messages**: บาง error message เป็นภาษาไทยผสมอังกฤษ

## 5. ประเมินความสามารถของ Developer (Developer Skill Assessment)

### 5.1 ระดับทักษะ: **Intermediate ถึง Advanced**

#### หลักฐานจากโค้ด:

- **เข้าใจ Electron Architecture**: แยก main/renderer process และ IPC ได้ถูกต้อง
- **Hardware Integration**: สามารถทำ serial communication และ binary protocol ได้
- **Modern React Patterns**: ใช้ hooks, context, และ custom hooks เป็น
- **Database Design**: ออกแบบ schema และ relationships เหมาสม
- **Async Programming**: จัดการ async operations ด้วย async/await เป็น
- **State Management**: ใช้ React Context และ custom hooks จัดการ state ซับซ้อน

#### ข้อดี:

- **ความเข้าใจเทคนิค**: มีความรู้เชิงลึกเกี่ยวกับ technologies ที่ใช้
- **Problem Solving**: แก้ปัญหา hardware communication ซับซ้อนได้
- **Code Organization**: จัดโครงสร้างโค้ดเป็นระบบดี
- **Error Handling**: ให้ความสำคัญกับการจัดการ errors

#### ข้อเสีย:

- **Testing Culture**: ขาดความเข้าใจเรื่อง automated testing
- **Documentation**: ไม่ค่อยเขียน documentation
- **Performance Optimization**: อาจยังไม่ได้คิดเรื่อง optimization มาก

## 6. โครงสร้างโฟลเดอร์ (Folder Structure Overview)

### 6.1 โครงสร้างหลัก

```
smc-app/
├── main/                    # Electron Main Process
│   ├── auth/               # Authentication system
│   ├── ku16/               # KU16 hardware controller
│   ├── indicator/          # Indicator device controller
│   ├── setting/            # Application settings
│   ├── user/               # User management
│   ├── license/            # License validation
│   ├── logger/             # Logging system
│   └── background.ts       # Main entry point
├── renderer/               # Next.js Frontend
│   ├── components/         # React components
│   ├── pages/              # Next.js pages
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── constants/          # Static data
│   └── styles/             # CSS styles
├── db/                     # Database layer
│   ├── model/              # Sequelize models
│   └── sequelize.ts        # Database connection
├── new-modules/            # New KU module (ไม่ได้ใช้)
└── resources/              # Static resources
```

### 6.2 การออกแบบที่ดี

- **Clear Separation**: แยก main process และ renderer process ชัดเจน
- **Feature-based Organization**: จัดกลุ่มตาม features (auth, ku16, settings)
- **Consistent Structure**: ทุก feature มี folder structure คล้ายกัน
- **Type Definitions**: มี interfaces folder สำหรับ type definitions

### 6.3 จุดที่ควรปรับปรุง

- **Mixed Language**: บางไฟล์ใช้ชื่อภาษาไทยผสมอังกฤษ
- **Dead Code**: มี new-modules ที่ไม่ได้ใช้งาน
- **Environment Config**: ขาดการจัดการ environment files เป็นระบบ

## 7. สถานะปัจจุบันของโปรเจค (Project Status)

### 7.1 สถานะ: **Production Ready**

โปรเจคอยู่ในสถานะพร้อมใช้งานจริง มีหลักฐานดังนี้:

- Version 1.0.0 (stable release)
- มี build scripts สำหรับ Windows และ Linux
- มี database schema ที่สมบูรณ์
- มี error handling และ logging ครอบคลุม

### 7.2 ความสมบูรณ์ของฟีเจอร์: **85-90%**

- ✅ **Core Features**: การจ่ายยา, authentication, slot management
- ✅ **Hardware Integration**: KU16 controller, indicator device
- ✅ **Database**: User management, logging, dispensing history
- ✅ **Admin Functions**: Deactivate, reactivate, force reset
- ⚠️ **License System**: มี activation key แต่อาจไม่สมบูรณ์
- ❌ **MQTT Integration**: มี library แต่ไม่ได้ implementation
- ❌ **Docker Deployment**: มีไฟล์แต่ไม่ได้ใช้

### 7.3 ปัญหา/ความเสี่ยงที่ต้องระวัง

#### ปัญหาปัจจุบัน:

- **ขาด Tests**: ไม่มี automated testing ทำให้เสี่ยงต่อ regression bugs
- **Single Point of Failure**: ถ้า hardware connection ขาด ระบบจะใช้งานไม่ได้
- **Error Messages**: บางข้อความเป็นภาษาไทยอาจทำให้ debug ยาก
- **Database Backup**: ไม่มีระบบ backup อัตโนมัติ

#### ความเสี่ยง:

- **Hardware Dependency**: ผูกติดกับ KU16 controller เฉพาะ
- **Electron Security**: ใช้ Electron version เก่า อาจมีช่องโหว่
- **Data Loss**: SQLite database อาจเสียหายได้
- **Scalability**: ไม่สามารถขยายเป็น multi-cabinet system ได้ง่าย

### 7.4 แนวทางการพัฒนาต่อ

#### ในระยะสั้น (1-3 เดือน):

1. **เพิ่ม Unit Tests** สำหรับ business logic ที่สำคัญ
2. **Upgrade Electron** เป็น version ใหม่เพื่อความปลอดภัย
3. **Improve Error Handling** และ user feedback
4. **Database Backup System** อัตโนมัติ
5. **Performance Monitoring** และ optimization

#### ในระยะกลาง (3-6 เดือน):

1. **MQTT Integration** สำหรับ real-time monitoring
2. **Web-based Admin Panel** สำหรับจัดการระยะไกล
3. **Multi-language Support** (English/Thai)
4. **Advanced Reporting** และ analytics
5. **Hardware Abstraction Layer** เพื่อรองรับ controller อื่น

#### ในระยะยาว (6-12 เดือน):

1. **Microservices Architecture** เพื่อ scalability
2. **Cloud Integration** สำหรับข้อมูล synchronization
3. **Mobile App** สำหรับ monitoring
4. **AI-powered Analytics** สำหรับพยากรณ์การใช้ยา
5. **Multi-cabinet Support** สำหรับสถานพยาบาลใหญ่

---

## สรุป

SMC Application เป็นโปรเจคที่มีคุณภาพดี **พร้อมใช้งานจริง** ในสถานพยาบาล แสดงให้เห็นถึงความเข้าใจเชิงลึกของ developer ในการ **integrate hardware กับ software** และการออกแบบ **user workflow ที่เหมาะสมกับงานทางการแพทย์**

จุดแข็งหลักคือ **architecture ที่เข้าใจง่าย**, **error handling ที่ครอบคลุม**, และ **hardware integration ที่มีประสิทธิภาพ** ทำให้เป็นโปรเจคที่ **maintainable** และสามารถ **ขยายฟีเจอร์ได้ในอนาคต**

Developer ใหม่ที่เข้ามาทำต่อสามารถ **onboard ได้ง่าย** เพราะโครงสร้างโค้ดชัดเจน และมี **pattern ที่สม่ำเสมอ** ทั่วทั้งโปรเจค ซึ่งจะช่วยให้การพัฒนาต่อยอดเป็นไปอย่างราบรื่น

---

_เอกสารนี้จัดทำขึ้นโดย AI Assistant_  
_วันที่: ${new Date().toLocaleDateString('th-TH')}_  
_เวอร์ชัน: 1.0_
