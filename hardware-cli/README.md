# SMC Hardware CLI Tool

เครื่องมือบรรทัดคำสั่งสำหรับควบคุมฮาร์ดแวร์ DS12/DS16 ในระบบจ่ายยาอัตโนมัติ

## คุณสมบัติ

- 🔍 **ตรวจหาพอร์ตอัตโนมัติ** - ค้นหาและระบุพอร์ตที่เชื่อมต่อกับ DS12/DS16
- 📊 **ตรวจสอบสถานะช่องยา** - ใช้คำสั่ง raw 0x80 เพื่อดูสถานะช่องทั้งหมด
- 🔓 **ปลดล็อกช่องยา** - ใช้คำสั่ง raw 0x81 เพื่อปลดล็อกช่องเฉพาะ
- 🛡️ **ความปลอดภัยทางการแพทย์** - มีระบบเตือนและ audit logging
- 🌐 **รองรับภาษาไทย** - ข้อความและการแสดงผลเป็นภาษาไทย

## การติดตั้ง

```bash
cd hardware-cli
npm install
npm run build
```

## การใช้งาน

### 1. ดูพอร์ตที่มี

```bash
# ดูพอร์ตที่เหมาะสมสำหรับ DS12/DS16
npm start list-ports

# ดูพอร์ตทั้งหมด
npm start list-ports --all

# ดูข้อมูลละเอียด
npm start list-ports --all --verbose
```

### 2. ตรวจสอบสถานะช่องยา

```bash
# ตรวจสอบสถานะ (หาพอร์ตอัตโนมัติ)
npm start check-state

# ระบุพอร์ตเอง
npm start check-state --port COM3

# แสดงข้อมูลละเอียด
npm start check-state --verbose
```

### 3. ปลดล็อกช่องยา

```bash
# ปลดล็อกช่องที่ 5
npm start unlock 5

# ระบุพอร์ตเอง
npm start unlock 12 --port COM3

# ข้ามคำเตือนความปลอดภัย
npm start unlock 8 --force
```

## ตัวเลือกทั่วไป

- `-v, --verbose` - แสดงข้อมูลละเอียด
- `-t, --timeout <ms>` - กำหนด timeout (ค่าเริ่มต้น: 3000ms)
- `-p, --port <path>` - ระบุพอร์ตเอง
- `-f, --force` - ข้ามคำเตือน (สำหรับ unlock)

## โครงสร้างโปรเจค

```
hardware-cli/
├── src/
│   ├── commands/          # คำสั่ง CLI
│   │   ├── list-ports.ts
│   │   ├── check-state.ts
│   │   └── unlock.ts
│   ├── protocol/          # โปรโตคอล DS12/DS16
│   │   ├── constants.ts
│   │   ├── packet-builder.ts
│   │   └── parser.ts
│   ├── serial/            # การสื่อสารอนุกรม
│   │   ├── connection.ts
│   │   └── port-detector.ts
│   ├── cli.ts            # จุดเริ่มต้น CLI
│   └── index.ts          # exports หลัก
├── bin/                  # ไฟล์ที่ compile แล้ว
├── package.json
├── tsconfig.json
└── README.md
```

## โปรโตคอล DS12/DS16

### คำสั่งที่รองรับ

- **0x80** - ตรวจสอบสถานะช่องยา (Status Request)
- **0x81** - ปลดล็อกช่องยา (Unlock Slot)
- **0x8F** - ตรวจสอบเวอร์ชัน (Get Version)

### การตั้งค่าอนุกรม

- **Baud Rate**: 19200
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None (8N1)

### โครงสร้างแพ็กเก็ต

```
[STX][CMD][ASK][DATALEN][DATA...][CHECKSUM][ETX]
```

## ความปลอดภัยทางการแพทย์

⚠️ **คำเตือนสำคัญ**: เครื่องมือนี้ควบคุมอุปกรณ์ทางการแพทย์

- ตรวจสอบการอนุญาตก่อนใช้งาน
- มีระบบ audit logging อัตโนมัติ
- ข้อความเตือนเป็นภาษาไทยตามมาตรฐานการแพทย์

## การพัฒนา

```bash
# พัฒนาแบบ watch mode
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## ตัวอย่างผลลัพธ์

### ตรวจสอบสถานะ
```
✅ ตรวจสอบสถานะสำเร็จ

สถานะช่องยา (12 ช่อง):
ช่องที่เปิด: 3, 7, 11
ช่องที่ปิด: 1, 2, 4, 5, 6, 8, 9, 10, 12
```

### ปลดล็อกช่องยา
```
✅ ปลดล็อกช่องที่ 5 สำเร็จ
🔓 ช่องยาถูกปลดล็อกแล้ว

MEDICAL: Slot 5 unlocked at 2/10/2025 22:23:55
```

## การแก้ไขปัญหา

### ไม่พบพอร์ต
- ตรวจสอบการเชื่อมต่อ USB
- ใช้ `list-ports --all` เพื่อดูพอร์ตทั้งหมด
- ตรวจสอบ driver ของ USB-to-Serial adapter

### ไม่สามารถเชื่อมต่อ
- ตรวจสอบว่าไม่มีโปรแกรมอื่นใช้พอร์ต
- ลองเปลี่ยน timeout: `--timeout 5000`
- ตรวจสอบการตั้งค่าฮาร์ดแวร์

### ข้อมูลเสียหาย
- ตรวจสอบสายสัญญาณ
- ลองใหม่อีกครั้ง
- ตรวจสอบ interference ทางไฟฟ้า

## License

Medical Device Software - SMC Project