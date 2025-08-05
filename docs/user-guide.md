# คู่มือการใช้งาน Smart Medication Cart V1.0
## User Guide for Smart Medication Cart System

---

## 📋 สารบัญ (Table of Contents)

1. [ข้อมูลเบื้องต้นและความปลอดภัย (Safety & Overview)](#safety-overview)
2. [การทำงานปกติ (Normal Operations)](#normal-operations)
3. [ขั้นตอนฉุกเฉิน (Emergency Procedures)](#emergency-procedures)
4. [การแก้ไขปัญหา (Troubleshooting)](#troubleshooting)
5. [ข้อมูลฮาร์ดแวร์ (Hardware Information)](#hardware-info)
6. [คำศัพท์เทคนิค (Technical Glossary)](#glossary)

---

## 🛡️ ข้อมูลเบื้องต้นและความปลอดภัย {#safety-overview}

### ⚠️ คำเตือนสำคัญ (Important Warnings)

**🚨 คำเตือนด้านความปลอดภัย:**
- ระบบนี้เป็นอุปกรณ์การแพทย์สำหรับจ่ายยา ต้องใช้ความระมัดระวังสูงสุด
- ผู้ใช้งานต้องผ่านการฝึกอบรม Basic System Operations
- การดำเนินการทุกครั้งจะถูกบันทึกใน Log พร้อมชื่อผู้ใช้งาน
- ห้ามใช้งานระบบหากไม่แน่ใจในขั้นตอน

**🔐 ความปลอดภัยการใช้งาน:**
- ตรวจสอบ Hardware Status ก่อนใช้งานทุกครั้ง
- ใช้ Passkey ที่ถูกต้องเท่านั้น
- อย่าแชร์ Passkey กับบุคคลอื่น
- รายงานปัญหาทันทีเมื่อเกิดขึ้น

### 🎯 วัตถุประสงค์ของระบบ (System Purpose)

Smart Medication Cart เป็นระบบจ่ายยาอัตโนมัติที่ออกแบบมาเพื่อ:
- **จัดเก็บยาอย่างปลอดภัย** ในช่องที่ล็อกได้
- **ควบคุมการเข้าถึง** ด้วยระบบ Authentication
- **ติดตามการจ่ายยา** ด้วยระบบ Logging ที่ครบถ้วน
- **ป้องกันข้อผิดพลาด** ด้วยระบบ Validation

### 👥 ผู้ใช้งานหลัก (Primary Users)

**พยาบาล (Nurses)** เป็นผู้ใช้งานหลักของระบบ พร้อมสิทธิ์:
- ✅ ปลดล็อกช่องยา (Unlock slots)
- ✅ จ่ายยา (Dispense medication)
- ✅ รีเซ็ตช่อง (Reset slots) 
- ✅ ดำเนินการฉุกเฉิน (Emergency procedures)
- ✅ ดู Log การใช้งาน (View usage logs)

---

## 🔄 การทำงานปกติ (Normal Operations) {#normal-operations}

### 📥 การใส่ยา (Medication Loading)

**ขั้นตอนการใส่ยาลงในช่อง:**

1. **เลือกช่องที่ว่าง**
   - มองหา Slot ที่แสดงสถานะ "🔴 ว่าง" (Red - Empty)
   - ตรวจสอบหมายเลข Slot ที่ต้องการใช้

2. **ปลดล็อกช่อง**
   ```
   📱 กดปุ่ม "ปลดล็อก" บน Slot Card
   🔐 กรอก Passkey ของคุณ
   📝 กรอก HN ของผู้ป่วย
   ✅ กดปุ่ม "Unlock"
   ```

3. **ใส่ยา**
   - รอจนช่องเปิดอัตโนมัติ
   - ใส่ยาลงในช่องอย่างระมัดระวัง
   - ตรวจสอบว่ายาถูกต้องตาม Label

4. **ปิดช่อง**
   - เลื่อนช่องเข้าที่ให้แน่น
   - รอจนสถานะเปลี่ยนเป็น "🟢 มียา" (Green - Occupied)

### 💊 การจ่ายยา (Medication Dispensing)

**ขั้นตอนการจ่ายยาออกจากช่อง:**

1. **เลือกช่องที่มียา**
   - มองหา Slot ที่แสดงสถานะ "🟢 มียา" (Green - Occupied)
   - ตรวจสอบ HN ที่แสดงบน Slot Card

2. **ยืนยันการจ่าย**
   ```
   📱 กดปุ่ม "จ่ายยา" บน Slot Card
   🔐 กรอก Passkey ของคุณ
   📋 ยืนยัน HN ของผู้ป่วย
   ✅ กดปุ่ม "Dispense"
   ```

3. **เปิดช่องและนำยาออก**
   - รอจนช่องเปิดอัตโนมัติ
   - นำยาออกจากช่องอย่างระมัดระวัง
   - ตรวจสอบความถูกต้องของยา

4. **ปิดช่องและเลือกการดำเนินการ**
   - เลื่อนช่องเข้าที่ให้แน่น
   - รอ Modal "Clear/Continue" ปรากฏ
   - เลือกการดำเนินการ:

   **🔄 Continue (ยังมียาเหลือ):**
   - กดปุ่ม "Continue" 
   - ช่องจะคงสถานะ "🟢 มียา"
   - สามารถจ่ายยาครั้งต่อไปได้

   **🗑️ Clear (ไม่มียาเหลือแล้ว):**
   - กดปุ่ม "Clear"
   - ช่องจะเปลี่ยนเป็นสถานะ "🔴 ว่าง"
   - พร้อมใช้ใส่ยาใหม่

---

## 🚨 ขั้นตอนฉุกเฉิน (Emergency Procedures) {#emergency-procedures}

### ⛔ เมื่อระบบค้างหรือไม่ตอบสนอง

**สถานการณ์:** ระบบค้างที่หน้า Loading หรือไม่ตอบสนอง

**🚨 วิธีแก้ไขฉุกเฉิน:**

1. **Deactivate Slot ทันที**
   ```
   📱 กดปุ่ม "Deactivate" บน Slot Card
   🔐 กรอก Passkey ของคุณ
   📝 กรอกเหตุผล (จำเป็นต้องกรอก)
   ✅ กดปุ่ม "Deactivate"
   ```

2. **ผลลัพธ์:**
   - Slot จะปิดระบบที่มีปัญหาอัตโนมัติ
   - สถานะจะเปลี่ยนเป็น "⚪ ปิดใช้งาน" (Disabled)
   - การกระทำจะถูกบันทึกใน Log

3. **การติดตาม:**
   - ตรวจสอบ Log เพื่อหาสาเหตุ
   - รายงานปัญหาต่อ Admin
   - รอการซ่อมแซมก่อนใช้งานต่อ

### 🔄 Force Reset (รีเซ็ตบังคับ)

**⚠️ คำเตือนสำคัญ:**
```
🚨 FORCE RESET จะทำให้ข้อมูลปัจจุบันหายไปทั้งหมด
🚫 ไม่สามารถกู้คืนข้อมูลได้
📊 ต้องตรวจสอบใน Log แทน
⚡ ใช้เฉพาะเมื่อจำเป็นเท่านั้น
```

**สถานการณ์ที่ควรใช้ Force Reset:**
- ต้องการ Reset คนไข้ก่อนยาจะหมด
- ข้อมูล Slot ผิดพลาดหรือ Corrupt
- ไม่สามารถดำเนินการปกติได้

**ขั้นตอน Force Reset:**

1. **เริ่มต้น Force Reset**
   ```
   📱 กดปุ่ม "Force Reset" ใน Admin Menu
   🔐 กรอก Passkey ของคุณ
   📝 กรอกเหตุผลที่จำเป็นต้อง Reset
   ⚠️ อ่านคำเตือนให้เข้าใจ
   ```

2. **ยืนยันการดำเนินการ**
   ```
   ❓ ระบบจะถาม: "คุณแน่ใจหรือไม่?"
   ⚠️ แสดงคำเตือน: "ข้อมูลจะหายไปทั้งหมด"
   ✅ กด "ยืนยัน" หากแน่ใจ
   ```

3. **ผลลัพธ์:**
   - ข้อมูล HN และสถานะใน Slot จะถูกลบ
   - Slot จะกลับเป็นสถานะ "🔴 ว่าง"
   - การกระทำจะถูกบันทึกใน Log พร้อมเหตุผล

### 🔧 การจัดการ Slot ที่ขัดข้อง

**เมื่อ Slot ไม่สามารถเปิดหรือปิดได้:**

1. **ตรวจสอบสถานะ**
   - ดูสถานะใน Connection Status Bar
   - เช็คว่า Hardware ยังต่ออยู่หรือไม่

2. **ลองการดำเนินการพื้นฐาน**
   - Reset Slot ด้วยวิธีปกติก่อน
   - หากไม่ได้ผล ให้ใช้ Deactivate

3. **หากปัญหาไม่หาย**
   - ใช้ Force Reset เป็นทางเลือกสุดท้าย
   - รายงานต่อผู้ดูแลระบบ

---

## 🔧 การแก้ไขปัญหา (Troubleshooting) {#troubleshooting}

### 1. 🔌 ปัญหาการเชื่อมต่อ Hardware

**อาการ:** แสดงข้อความ "ไม่สามารถเชื่อมต่อกับตู้เก็บยาได้"

**สาเหตุที่เป็นไปได้:**
- Serial Port connection หลุด
- Hardware ไม่ได้เปิดเครื่อง
- Port Configuration ผิด

**วิธีแก้ไข:**
```
1. ตรวจสอบสายเชื่อมต่อ USB/Serial
2. ตรวจสอบว่า Hardware เปิดเครื่องแล้ว
3. ตรวจสอบ Port Settings ใน Admin Panel
4. รีสตาร์ทโปรแกรม
5. หากยังไม่ได้ ติดต่อ Admin
```

### 2. 📡 ปัญหาการสื่อสาร Hardware

**อาการ:** Hardware เชื่อมต่อแล้วแต่ไม่ตอบสนองคำสั่ง

**สาเหตุที่เป็นไปได้:**
- Protocol communication error
- Hardware response timeout
- Circuit breaker activated

**วิธีแก้ไข:**
```
1. รอ 30 วินาที แล้วลองใหม่
2. ตรวจสอบ Hardware Status LED
3. ใช้ "Check Connection" ใน Admin Panel
4. Restart Hardware ถ้าจำเป็น
5. รายงาน Admin หากปัญหาไม่หาย
```

### 3. 🔐 ปัญหา Authentication

**อาการ:** แสดงข้อความ "ไม่พบผู้ใช้งาน" หรือ "รหัสผ่านไม่ถูกต้อง"

**สาเหตุที่เป็นไปได้:**
- Passkey ผิด
- User account ถูก disable
- Database connection error

**วิธีแก้ไข:**
```
1. ตรวจสอบ Passkey ให้ถูกต้อง
2. ลองล็อกอินใหม่
3. ติดต่อ Admin เพื่อเช็ค User Account
4. หากฉุกเฉิน ใช้ Admin Override
```

### 4. 💾 ปัญหา Database

**อาการ:** ข้อมูล Slot ไม่อัพเดท หรือแสดงผิด

**สาเหตุที่เป็นไปได้:**
- Database connection lost
- SQLite database corruption
- Sync issue between frontend/backend

**วิธีแก้ไข:**
```
1. รีเฟรชหน้าจอ (F5)
2. รีสตาร์ทโปรแกรม
3. ตรวจสอบ Database ใน Admin Panel
4. หากจำเป็น ใช้ Force Reset Slot
5. รายงาน Admin เพื่อ Database recovery
```

### 5. 🖥️ ปัญหา UI/Interface

**อาการ:** หน้าจอค้าง หรือ Modal ไม่ปิด

**สาเหตุที่เป็นไปได้:**
- Frontend JavaScript error
- Memory leak
- IPC communication error

**วิธีแก้ไข:**
```
1. รีเฟรชหน้าจอ (Ctrl+R)
2. ปิด Modal ด้วยปุ่ม X หรือ ESC
3. รีสตาร์ทโปรแกรม
4. เช็ค Memory usage ใน Task Manager
5. รายงาน Admin หากเกิดขึ้นบ่อย
```

### 6. ⚡ ปัญหา Performance

**อาการ:** ระบบช้า หรือ Response time นาน

**สาเหตุที่เป็นไปได้:**
- High CPU/Memory usage
- Too many logs in database
- Network connectivity issues

**วิธีแก้ไข:**
```
1. ปิดโปรแกรมอื่นที่ไม่จำเป็น
2. เช็ค System Resources
3. Clear old logs (Admin function)
4. รีสตาร์ทเครื่องคมพิวเตอร์
5. ติดต่อ Admin เพื่อ Performance tuning
```

### 7. 🔄 ปัญหา Circuit Breaker

**อาการ:** แสดงข้อความ "Circuit breaker activated"

**สาเหตุ:** ระบบป้องกันตัวเองเมื่อมี Error บ่อยเกินไป

**วิธีแก้ไข:**
```
1. รอ 2-5 นาที ให้ Circuit breaker reset
2. ตรวจสอบ Hardware connection
3. ลองคำสั่งง่ายๆ ก่อน (เช่น Check status)
4. หากยังไม่ได้ รีสตาร์ทระบบ
5. รายงาน Admin เพื่อวิเคราะห์ Root cause
```

### 8. 📊 ปัญหา Logging System

**อาการ:** Log ไม่แสดงหรือแสดงไม่ครบ

**สาเหตุที่เป็นไปได้:**
- Log database full
- Logging service error
- Permission issues

**วิธีแก้ไข:**
```
1. รีเฟรช Log page
2. เปลี่ยน Filter settings
3. ตรวจสอบ Date range
4. ติดต่อ Admin เพื่อ Log maintenance
5. Export logs หากจำเป็น
```

### 9. 🏥 ปัญหา Slot Mechanism

**อาการ:** Slot เปิดไม่ได้ หรือปิดไม่สนิท

**สาเหตุที่เป็นไปได้:**
- Mechanical jam
- Motor failure
- Sensor malfunction

**วิธีแก้ไข:**
```
⚠️ อย่าใช้แรงบังคับ เสี่ยงเสียหาย

1. ลอง Unlock command อีกครั้ง
2. ตรวจสอบว่าไม่มีสิ่งขวางใน Slot
3. ใช้ Deactivate Slot
4. รายงาน Maintenance team
5. ใช้ Slot อื่นทดแทน
```

### 10. 🔋 ปัญหา Power Supply

**อาการ:** Hardware เปิดปิดเอง หรือทำงานไม่เสถียร

**สาเหตุที่เป็นไปได้:**
- Power supply insufficient
- Voltage fluctuation
- UPS battery low

**วิธีแก้ไข:**
```
1. ตรวจสอบ Power cable connections
2. เช็ค UPS status และ Battery level
3. ใช้ Deactivate affected slots
4. ติดต่อ Electrical maintenance
5. ใช้ backup power หากมี
```

---

## 🔌 ข้อมูลฮาร์ดแวร์ (Hardware Information) {#hardware-info}

### 🏷️ ประเภท Hardware ที่รองรับ

Smart Medication Cart รองรับ Hardware 2 รุ่น:

#### **CU12 (แนะนำ - Current Deployment)**
```
🎯 จำนวนช่อง: 12 slots
🔌 การเชื่อมต่อ: RS-485 Protocol
📊 ความเร็ว: 9600 baud rate
🔧 คุณสมบัติ: Advanced features
   - Circuit breaker protection
   - Adaptive monitoring
   - Resource optimization
   - Real-time status tracking
```

#### **KU16 (Legacy Support)**
```
🎯 จำนวนช่อง: 15 slots
🔌 การเชื่อมต่อ: Binary Protocol
📊 ความเร็ว: 9600 baud rate
🔧 คุณสมบัติ: Basic functionality
   - Standard slot control
   - Basic error handling
   - Legacy compatibility
```

### 🔄 Hardware Auto-Detection

ระบบจะตรวจสอบ Hardware type อัตโนมัติ:

```
🔍 Detection Process:
1. อ่าน Settings configuration
2. ตรวจสอบ Port availability
3. ทดสอบ Communication protocol
4. แสดงผลบน Connection Status Bar

📊 แสดงข้อมูล:
- Hardware Type: CU12/KU16/UNKNOWN
- Connection Status: Connected/Disconnected
- Slot Count: 12/15 slots
- Port Information: COM port และ Baud rate
```

### 📡 Connection Status Bar

ที่มุมบนขวาของหน้าจอจะแสดง:

```
🟢 CU12 - 12 slots | COM3 | Connected
🟡 KU16 - 15 slots | COM5 | Connecting...
🔴 UNKNOWN | No Hardware | Disconnected
```

### ⚙️ Hardware-Specific Features

**CU12 เท่านั้น:**
- ✅ Circuit breaker protection
- ✅ Adaptive monitoring modes
- ✅ Resource optimization
- ✅ Advanced error recovery

**KU16 เท่านั้น:**
- ✅ 15-slot capacity
- ✅ Legacy compatibility
- ✅ Standard operations

**ทั้งสองรุ่น:**
- ✅ Basic slot control
- ✅ User authentication
- ✅ Logging system
- ✅ Emergency procedures

---

## 📚 คำศัพท์เทคนิค (Technical Glossary) {#glossary}

### A-C

**Authentication** - การยืนยันตัวตนด้วย Passkey เพื่อใช้งานระบบ

**Circuit Breaker** - ระบบป้องกันที่หยุดการทำงานเมื่อเกิด Error บ่อยเกินไป

**CU12** - Hardware รุ่นใหม่ที่มี 12 ช่อง ใช้ RS-485 Protocol

### D-H

**Deactivate** - การปิดใช้งาน Slot เมื่อมีปัญหา เพื่อป้องกันการใช้งานผิด

**Dispensing** - กระบวนการจ่ายยาออกจาก Slot

**Force Reset** - การรีเซ็ตบังคับที่จะลบข้อมูลใน Slot ทั้งหมด

**Hardware Type** - ประเภทของเครื่องจ่ายยา (CU12 หรือ KU16)

**HN (Hospital Number)** - หมายเลขผู้ป่วยที่ใช้ในการระบุตัวตน

### I-P

**IPC (Inter-Process Communication)** - การสื่อสารระหว่าง Frontend และ Backend

**KU16** - Hardware รุ่นเก่าที่มี 15 ช่อง ใช้ Binary Protocol

**Loading** - กระบวนการใส่ยาเข้าไปใน Slot

**Log** - บันทึกการใช้งานระบบทุกครั้ง พร้อมข้อมูลผู้ใช้และเวลา

**Passkey** - รหัสผ่านส่วนตัวของผู้ใช้แต่ละคน ใช้ในการ Authentication

### R-Z

**Reset** - การเคลียร์ข้อมูลใน Slot เพื่อให้กลับสู่สถานะว่าง

**RS-485** - Protocol การสื่อสารที่ใช้ใน CU12 Hardware

**Serial Port** - พอร์ตที่ใช้เชื่อมต่อกับ Hardware (เช่น COM3, COM5)

**Slot** - ช่องแต่ละช่องในตู้เก็บยา ที่สามารถล็อกและปลดล็อกได้

**Timeout** - การหมดเวลารอ เมื่อ Hardware ไม่ตอบสนองภายในเวลาที่กำหนด

**Unlock** - การปลดล็อก Slot เพื่อเปิดช่องให้สามารถใส่หรือนำยาออกได้

---

## 📞 การติดต่อและการสนับสนุน (Contact & Support)

### 🆘 เมื่อต้องการความช่วยเหลือ

**การรายงานปัญหา:**
1. บันทึกข้อความ Error ที่แสดง
2. จดเวลาที่เกิดปัญหา
3. ระบุ Slot number ที่มีปัญหา
4. รายงานต่อ Admin หรือ IT Support

**ข้อมูลที่ต้องเตรียม:**
- Hardware Type (CU12/KU16)
- Connection Status
- Error Message (ถ้ามี)
- ขั้นตอนที่ทำก่อนเกิดปัญหา

### 📋 การบำรุงรักษาประจำ

**รายวัน:**
- ตรวจสอบ Connection Status
- ทดสอบ Slot 1-2 ช่อง
- เช็คระดับ UPS Battery

**รายสัปดาห์:**
- ทำความสะอาด Hardware
- ตรวจสอบ Log records
- ทดสอบ Emergency procedures

**รายเดือน:**
- Database maintenance
- Performance optimization
- System backup

---

**📝 หมายเหตุ:** คู่มือนี้อัปเดตล่าสุดเมื่อ 2025-08-05 สำหรับ Smart Medication Cart V1.0  
**🔄 เวอร์ชัน:** 1.0 - ฉบับที่ 1  
**👥 เป้าหมาย:** พยาบาลและผู้ใช้งานระบบ  
**📚 สถานะ:** Complete User Guide พร้อมใช้งาน