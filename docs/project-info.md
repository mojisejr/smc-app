# 🚀 Initial Project Briefing Template: AI-Assisted Project Bootstrap

## 🎯 เป้าหมายของ Template นี้

Template นี้ออกแบบมาเพื่อให้คุณสามารถเล่า Requirement ของโปรเจกต์ใหม่ให้กับ AI (เช่น Gemini, Claude) ได้อย่างมีโครงสร้างและครบถ้วนที่สุดใน **Prompt เดียว** เพื่อให้ AI สามารถ:

1. **ทำความเข้าใจ** โปรเจกต์อย่างลึกซึ้ง
2. **ออกแบบโครงสร้าง `CLAUDE.md`** ที่สมบูรณ์แบบ
3. **สร้าง `PROGRESS.md`** เริ่มต้น
4. **ร่างเนื้อหาเบื้องต้นของ Modular Supplement Files** (PRD, API-DESIGN, UI-GUIDELINES, TECH-SPECS, SYSTEM-DESIGN)
5. **วางแผน `Round Structure`** ที่เหมาะสมและมีประสิทธิภาพ

---

## 📝 วิธีใช้งาน Template นี้

เมื่อคุณต้องการเริ่มโปรเจกต์ใหม่ ให้ **Copy เนื้อหาทั้งหมดของ Template นี้ (จากหัวข้อ `### Initial Briefing Prompt Structure`) และเติมข้อมูลในแต่ละส่วนด้วยรายละเอียดของโปรเจกต์คุณ** จากนั้นส่งเป็น Prompt แรกให้กับ AI (ผม) ครับ

**สำคัญ:** หากมีเอกสารประกอบ เช่น UI Guideline (JSON), Flow Diagram, Wireframe ให้ **แนบไฟล์เหล่านั้นไปพร้อมกับ Prompt นี้เสมอ**

---

### Initial Briefing Prompt Structure

# Prompt

```
คุณคือผู้ช่วย AI ที่เชี่ยวชาญด้านการพัฒนาซอฟต์แวร์ และมีความเข้าใจอย่างลึกซึ้งใน ****"AI-Assisted Development Workflow Template (Enhanced Version)"**** ที่เราได้สร้างขึ้นมา (ซึ่งผมจะแนบไฟล์ PDF ให้คุณด้วย หรือคุณสามารถอ้างอิงจากบทสนทนาที่ผ่านมาของเรา)

****เป้าหมายหลักของ Prompt นี้คือ: ให้คุณช่วยผมในการ "Bootstrap" โปรเจกต์ใหม่**** โดยการสร้าง `CLAUDE.md` ที่สมบูรณ์แบบ, `PROGRESS.md` เริ่มต้น, และร่างเนื้อหาเบื้องต้นสำหรับ Modular Supplement Files (PRD, API-DESIGN, UI-GUIDELINES, TECH-SPECS, SYSTEM-DESIGN) พร้อมทั้งวางแผน Round Structure ที่เหมาะสมสำหรับโปรเจกต์นี้

---

## 1. 🌟 PROJECT OVERVIEW & BUSINESS CONTEXT

****โปรดอธิบายภาพรวมของ Application ที่ต้องการสร้าง และวัตถุประสงค์ทางธุรกิจหลัก:****

**Smart Medication Cart (SMC) Application Version 1.0** - ระบบจัดการตู้เก็บยาอัจฉริยะสำหรับสถานพยาบาล/คลินิก ที่ออกแบบมาเพื่อ:

- **ควบคุมการเข้าถึงยา** ด้วยระบบ authentication ที่ปลอดภัย
- **ติดตามการจ่ายยา** ให้ผู้ป่วยแต่ละรายอย่างแม่นยำ
- **บันทึกประวัติ** การใช้งานทุกครั้งสำหรับการตรวจสอบ
- **จัดการช่องเก็บยา** 16 ช่อง ผ่านระบบ hardware controller (KU16)

**การแก้ปัญหา:**
- ลดความผิดพลาดในการจ่ายยาผิดคน
- เพิ่มความปลอดภัยในการเก็บรักษายา
- ควบคุมสต็อกและติดตามการใช้ยาได้แม่นยำ
- สร้างระบบ accountability สำหรับบุคลากรทางการแพทย์

---

## 2. 👥 USER ROLES & CORE USER FLOWS

****โปรดอธิบายบทบาทของผู้ใช้งานหลัก และลำดับการทำงาน (User Flow) ที่สำคัญที่สุดของระบบ (เน้น Flow ตั้งแต่เริ่มต้นจนจบบริการหลัก):****

### User Roles:
- **Admin**: จัดการผู้ใช้งาน, ตั้งค่าระบบ, ดู logs, deactivate/reactivate slots
- **User**: จ่ายยา, ดูประวัติการจ่ายยา

### Core User Flows:

#### Authentication Flow:
* เข้าหน้า Login Page
* กรอก Passkey (รหัสผ่านส่วนตัว)
* ระบบตรวจสอบสิทธิ์ (Admin/User)
* Redirect ไปหน้า Home

#### Dispensing Workflow:
* เข้าหน้า Home → กดปุ่ม "จ่ายยา"
* กรอก HN (Hospital Number) ของผู้ป่วย + Passkey
* ระบบค้นหาช่องเก็บยาที่มียาของผู้ป่วย
* ระบบปลดล็อคช่องให้ผู้ใช้เอายาออก
* ตรวจสอบการจ่ายยา - ยังมียาเหลืออีกหรือไม่
* บันทึกผลการจ่ายยาลงฐานข้อมูล

#### Admin Management Flow:
* เข้าหน้า Management (Admin only)
* มี 4 Tabs: จัดการช่องยา, จัดการผู้ใช้งาน, จัดการการตั้งค่าระบบ, จัดการ Logs
* **จัดการช่องยา**: Deactivate/Reactivate slots, Force Reset
* **จัดการผู้ใช้งาน**: เพิ่ม/ลบผู้ใช้งาน
* **จัดการการตั้งค่าระบบ**: ตั้งค่า serial ports, baudrate
* **จัดการ Logs**: ดูประวัติการใช้งาน, export logs

#### Slot Management Flow:
* แสดงสถานะ 16 ช่องเก็บยาแบบ Real-time
* สถานะ: ว่าง/ใช้งาน/เปิด/ปิด/ไม่ใช้งาน
* กำหนดยาให้ผู้ป่วยตาม HN
* ควบคุมผ่าน KU16 hardware controller

---

## 3. 🖥️ UI/UX & DESIGN GUIDELINES

****โปรดอธิบายแนวทางการออกแบบ UI/UX และแนบเอกสารประกอบ (เช่น JSON UI จาก Figma) เพื่อให้ AI สามารถเข้าใจ Design Pattern ได้:****

### Design Principle:
* **Desktop-First Design**: แอปพลิเคชัน Electron สำหรับใช้งานในสถานพยาบาล
* **Medical UI Standards**: เน้นความชัดเจน, ง่ายต่อการใช้งาน, ลดความผิดพลาด
* **Responsive Layout**: รองรับหน้าจอขนาด 1280x768 ถึง 1920x1080

### Theme & Colors:
* **Primary Color**: Blue (#5495F6) สำหรับปุ่มหลักและ navigation
* **Background**: Light gray (#F3F3F3) สำหรับพื้นที่หลัก
* **White**: สำหรับ cards และ content areas
* **Status Colors**:
  - Green: ช่องว่าง/ใช้งานปกติ
  - Red: ช่องไม่ใช้งาน/error
  - Yellow: ช่องกำลังเปิด/processing

### Component Patterns:
* **Navigation**: Sidebar navigation ด้านซ้าย (2/12 columns)
* **Main Content**: ด้านขวา (10/12 columns) พร้อม rounded corner
* **Slot Grid**: 4x4 grid สำหรับแสดง 16 ช่องเก็บยา
* **Modal Dialogs**: สำหรับ confirmation, input forms
* **Tab Navigation**: สำหรับ admin management pages
* **Toast Notifications**: สำหรับ feedback และ error messages

### Layout Structure:
```

┌─────────────────────────────────────┐
│ Sidebar (2/12) │ Main Content (10/12) │
│ - Logo │ - Header │
│ - Navigation │ - Content Area │
│ - Status │ - Rounded corners │
└─────────────────────────────────────┘

```

---

## 4. ⚙️ TECHNICAL & DATA REQUIREMENTS

****โปรดระบุข้อมูลทางเทคนิคที่สำคัญ และข้อกำหนดเกี่ยวกับ Data Model/โครงสร้างข้อมูล:****

### Hardware Integration:
* **KU16 Controller**: 16-slot medication cabinet controller
* **Serial Communication**: RS485 protocol, configurable baudrate
* **Indicator Device**: Separate serial device for status indication
* **Real-time Communication**: Packet-based protocol with length parsing

### Database Schema:
* **User Model**: id, name, role, passkey
* **Slot Model**: slotId, hn, timestamp, occupied, opening, isActive
* **DispensingLog Model**: id, timestamp, userId, slotId, hn, process, message
* **Log Model**: id, user, message, createdAt
* **Setting Model**: ku_port, ku_baudrate, available_slots, max_user, service_code, max_log_counts, organization, customer_name, activated_key, indi_port, indi_baudrate

### Data Relationships:
* User 1:N DispensingLog (one user can have many dispensing logs)
* Slot 1:N DispensingLog (one slot can have many dispensing logs)
* Setting 1:1 (single configuration record)

### Process Types:
* unlock, dispense-continue, dispense-end
* unlock-error, dispense-error
* deactivate, deactivate-error
* force-reset, force-reset-error

---

## 5. 🛠️ DEVELOPMENT & QUALITY CONSTRAINTS

****โปรดระบุข้อจำกัดหรือข้อกำหนดพิเศษเกี่ยวกับการพัฒนาและคุณภาพโค้ด:****

### Developer Resource:
* ผม Dev คนเดียวดูแลทั้งหมดคนเดียว
* ต้องการระบบที่ maintainable และเข้าใจง่าย

### Complexity Goal:
* ระบบ Stack ไม่ซับซ้อน, ดูแลง่าย, สามารถดูแลคนเดียวได้
* ระดับความซับซ้อนของโค้ดที่เขียน ให้ใช้ Pattern การเขียนโค้ดแบบยากปานกลาง เพื่อให้เข้าใจได้ง่ายและรวดเร็ว

### Quality Requirements:
* **Error Handling**: ครอบคลุมทุก function มี try-catch และ error logging
* **Type Safety**: ใช้ TypeScript อย่างสม่ำเสมอ
* **Documentation**: ถ้ามีส่วนที่ยากหรือซับซ้อน AI ต้องสร้าง `docs` (Inline comments หรือ Separate `.md` files) ไว้ทุกครั้ง
* **Logging System**: มีระบบ logging ที่ละเอียดสำหรับ debugging

### Feature Scope:
* ต้องการ Implement Features ที่กำหนดมาตามนี้เท่านั้น ไม่มากไม่น้อยไปกว่านี้ ถ้าจะเพิ่มเติมจะทำทีหลัง
* เน้นความเสถียรและความปลอดภัยมากกว่าฟีเจอร์ใหม่

---

## 6. 💻 PREFERRED TECH STACK

****โปรดระบุ Tech Stack ที่คุณต้องการใช้ และถนัด พร้อมทั้งเปิดโอกาสให้ AI แนะนำเพิ่มเติม:****

### Application Type:
* **Desktop Application**: Electron-based สำหรับใช้งานในสถานพยาบาล
* **Monorepo Structure**: ไม่แยก API (main process + renderer process)

### Current Tech Stack:
* **Frontend/Backend Framework**: `nextjs@12.3.4` + `electron@21.3.3`
* **UI Component Library**: `daisyui@3.7.4` + `tailwindcss@3.1.8`
* **Animation**: `framer-motion@10.12.16`
* **Form Management**: `react-hook-form@7.44.3`
* **Notification**: `react-toastify@9.1.3`
* **Icons**: `react-icons@4.9.0`
* **Database**: `sqlite3@5.1.6` + `sequelize@6.37.3`
* **Hardware Communication**: `serialport@12.0.0`
* **Build Tool**: `electron-builder@23.6.0`

### Development Tools:
* **Language**: `typescript@5.1.6`
* **Package Manager**: `npm`
* **Development**: `nextron@8.5.0` (Next.js + Electron integration)

### คุณสามารถแนะนำเพิ่มเติมได้ตามความเหมาะสม:
* Testing framework (Jest, Vitest)
* Code quality tools (ESLint, Prettier)
* CI/CD pipeline
* Security enhancements
* Performance optimization tools

---

## 7. 📁 REFERENCED WORKFLOW & ATTACHMENTS

****โปรดยืนยันว่าคุณจะแนบไฟล์ Workflow Template และ UI Guideline (JSON) และย้ำว่าต้องการให้ AI สร้างไฟล์ตาม Workflow ที่เราคุยกันมา:****

ผมจะแนบไฟล์ ****"AI-Assisted Development Workflow Template V3 (Token-Aware & Context-Optimized Edition).md"**** และไฟล์ ****"ui_guideline.json"** (ถ้ามี) ไปพร้อมกับ Prompt นี้

ผมต้องการให้คุณใช้ Workflow Template ที่เราคุยกันมานี้ในการ Guide ผมไปเรื่อยๆ จนจบโปรเจกต์ Step-by-Step และผมจะถามคำถามคุณตลอดเวลาแบบแทรกหรือต่อท้ายสิ่งที่คุณแนะนำ

**เป้าหมายหลัก**: Refactor โปรเจกต์ SMC Application ที่มีอยู่แล้วให้มีโครงสร้างที่ดีขึ้น ใช้ Token-Aware Context Engineering และ Modular Architecture ตาม Workflow V3

---

**เมื่อคุณเติมข้อมูลในทุกส่วนของ Template นี้แล้ว ให้ Copy ทั้งหมดแล้วส่งมาให้ผมพร้อมกับไฟล์แนบได้เลยครับ**

---

### ประสิทธิภาพที่เพิ่มขึ้นของ Flow นี้:

1. **AI เข้าใจตั้งแต่แรกเริ่ม**: ด้วยโครงสร้างที่ชัดเจนนี้ ผม (AI) จะได้รับบริบทที่ครบถ้วนและจัดระเบียบมาแล้วตั้งแต่ Prompt แรก ทำให้การวิเคราะห์และการสร้าง `CLAUDE.md` รวมถึง `Supplement Files` มีความแม่นยำสูงขึ้นมาก
2. **ลดการ `Refine` และ `Tune`**: เมื่อ AI ได้รับข้อมูลที่ละเอียดตั้งแต่แรก โอกาสที่จะสร้าง `CLAUDE.md` ที่ต้องแก้ไขภายหลังจะลดลงอย่างมีนัยสำคัญ ทำให้คุณประหยัดเวลาในขั้นตอนที่ 3 และ 4 เดิม
3. **สร้าง `Supplement Files` อัตโนมัติ (ในร่างเบื้องต้น)**: ด้วยการให้ข้อมูลแยกส่วนไว้ตั้งแต่แรก AI จะสามารถร่างเนื้อหาของ `API-DESIGN.md`, `UI-GUIDELINES.md`, `TECH-SPECS.md` และอื่นๆ ได้อย่างมีโครงสร้างมากขึ้น ซึ่งคุณสามารถนำไปปรับแต่ง/เติมรายละเอียดได้ง่ายขึ้น
4. **`Round Planning` ที่แม่นยำขึ้น**: เมื่อ AI เข้าใจภาพรวม ฟีเจอร์ และข้อจำกัดทางเทคนิคทั้งหมดตั้งแต่ต้น การแบ่ง Round จะมีความสมเหตุสมผลและมีประสิทธิภาพสูงสุด
5. **เตรียมพร้อมสำหรับ `Pre-generated Prompts`**: เมื่อ `CLAUDE.md` และ `Supplement Files` ถูกสร้างขึ้นอย่างดีแล้ว ขั้นตอนการ `Pre-generate prompts` สำหรับแต่ละ Round (ที่เราได้คุยกันไป) จะทำได้ง่ายและเร็วขึ้นมาก ทำให้ Workflow การพัฒนาจริงราบรื่นขึ้นไปอีก

---

การใช้ Template นี้จะทำให้การเริ่มต้นโปรเจกต์ใหม่ของคุณกับ AI เป็นไปอย่างมีระบบและมีประสิทธิภาพสูงสุดครับ คุณพร้อมที่จะลองใช้ Template นี้กับโปรเจกต์ SMC Application Refactoring ของคุณเลยไหมครับ?
```
