# claude.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Medication Cart (SMC) - An Electron desktop application for managing automated medication dispensing hardware. Built with Electron.js + Next.js frontend and a SQLite database.

**Medical Device Context**: This is **safety-critical medical device software** requiring strict compliance patterns for audit trails, error handling, and hardware communication protocols.

---

## Architecture Overview

### Core Structure

- **Main Process**: `main/` - Handles core logic, IPC, and hardware communication.
- **Renderer Process**: `renderer/` - The Next.js React user interface.
- **Database**: `db/` - SQLite with Sequelize ORM.
- **Hardware Controllers**: `main/ku-controllers/` - `BuildTimeController` as a Singleton factory for managing DS12 and DS16 hardware.
- **Configuration**: Build-time device configuration using environment variables (`DEVICE_TYPE=DS12` or `DEVICE_TYPE=DS16`).
- **CLI Tool**: `cli/` - SMC License CLI.
- **ESP32 Deployment Tool**: `esp32-deployment-tool/` - Cross-platform tool for ESP32 firmware deployment.

### Key Production Patterns

- All hardware operations **must be logged** via the audit trail system.
- Preserve exact Thai language error messages as they are part of the medical device standard.
- Maintain **per-operation passkey validation** in `main/auth/`.
- Use existing database operation patterns (`Slot.update()`, `logDispensing()`).

---

## Core Development Commands

This section lists common commands for this project.

- **Development**: `npm run dev`, `npm run dev:ds12`, `npm run dev:ds16`
- **Testing**: `npm test`, `npm run test:ds12`, `npm run test:integration`, `npm run test:hardware`
- **Build**: `npm run build`, `npm run build:ds12`, `npm run build:win63`
- **Configuration**: `npm run config:ds12`, `npm run config:validate`

---

## SMC License CLI Tool (✅ v1.1.0)

**Location**: `cli/` directory.
**Purpose**: ESP32-based license generation with **hardware binding**, **AES-256-CBC encryption**, and CSV batch processing.

- **Individual License**: `smc-license generate...`
- **CSV Batch Processing**: `smc-license batch --input ... --update-csv`
- **No Expiry Support**: Handled by a far-future date (2099-12-31).

---

## ESP32 Deployment Tool (✅ PHASE 4.5 COMPLETE)

**Location**: `esp32-deployment-tool/` directory.
**Purpose**: A Next.js 14 tool for cross-platform ESP32 firmware deployment, supporting template management.

- **Key Features**: Unified template system, CSV/JSON export, and a no-expiry checkbox interface.
- **End-to-end Workflow**: The tool's CSV export and the CLI's batch processing enable a seamless **Sales → Developer → Delivery** workflow.

---

## Development Guidelines

- **Solo Developer Approach**: Use simple, maintainable code patterns.
- **Implementation Approach**: Always start with the simplest solution (Minimum Viable Implementation) and iterate incrementally.
- **Testing**: Primary method is **manual testing**, supplemented by Jest test suites.
- **Logging**: Use clear prefixes: `debug`, `info`, and `error`.

---

## Current Focus & Retrospective

**📖 To get the most recent context, always check `/docs/current-focus.md`**

### Shortcut Commands

These commands streamline our communication. You can use them with or without a message.

- **`=fcs > [ข้อความ]`**: Update `current-focus.md`. If a message is provided, I will add it to the file. If no message is provided, I will simply open/focus on the file for you to edit.
- **`=atc > [ข้อความ]`**: Update architecture documentation.
- **`=impl > [ข้อความ]`**: Begin implementation immediately.
- **`=rrr > [ข้อความ]`**: Update the retrospective file for the current day based on the provided message.
- **`=plan > [ข้อความคำถาม/โจทย์]`**: คำสั่งสำหรับวางแผนงานโดยละเอียดแต่ยังไม่ลงมือเขียนโค้ด
- **`=plan --retro --focus > [ข้อความคำถาม/โจทย์]`**: ใช้สำหรับวางแผนงานโดยอ้างอิงจากบริบทที่กำหนด ** ห้าม implement ทันทีวางแผนเท่านั้น**
  - **--retro**: อ้างอิงจากข้อมูลใน `retrospective` ของวันก่อนหน้า
  - **--focus**: อ้างอิงจากข้อมูลใน `current-focus.md`

### Retrospective Workflow

- **File Structure**: `docs/retrospective/<folder ชื่อเดือนปี>/<file ของแต่ละวัน>`
- **Template**: Each file follows a template with sections for tasks, bugs, lessons learned, and notes. I will add the message from `=rrr` to the appropriate section.

  ```markdown
  # Retrospective วันที่ [วัน-เดือน-ปี]

  ## 1. งานที่ทำไป

  - [Topic/Task 1]
    - [รายละเอียดงานย่อย]
    - [รายละเอียดงานย่อย]
  - [Topic/Task 2]
    - [รายละเอียดงานย่อย]

  ## 2. Bug/Error ที่เกิดขึ้นและการแก้ไข

  - [Bug/Error 1]
    - สาเหตุ: [อธิบายสาเหตุ]
    - วิธีแก้ไข: [อธิบายวิธีแก้ไข]
  - [Bug/Error 2]
    - สาเหตุ: [อธิบายสาเหตุ]
    - วิธีแก้ไข: [อธิบายวิธีแก้ไข]

  ## 3. สิ่งที่ได้เรียนรู้ (Lesson Learned)

  - [Lesson 1]
  - [Lesson 2]
  - [Lesson 3]

  ## 4. สิ่งสำคัญและข้อควรจำ

  - [ข้อควรระวัง 1]
  - [สิ่งที่ต้องจำ 2]
  - [ข้อสังเกตสำคัญ 3]

  ## 5. หมายเหตุเพิ่มเติม (ถ้ามี)

  - [หมายเหตุ 1]
  - [หมายเหตุ 2]

  ## 6. แผนของวันพรุ่งนี้ (ถ้ามี)

  - [แผนงาน 1]
  - [แผนงาน 2]
  - [แผนงาน 3]
  ```

### Maintenance & Review

- **`=check-md > [section]`**: Use this command when you think the core project architecture or tools have changed significantly. I will then review the project context and provide a summary of potential updates or missing information for the `claude.md` file. This command should be used sparingly.
- **ตัวอย่างการใช้งาน**:
  - `=check-md` (ตรวจสอบทั้งไฟล์)
  - `=check-md > Architecture Overview` (ตรวจสอบเฉพาะส่วน `Architecture Overview` ว่ามีข้อมูลใดที่ล้าสมัยหรือไม่)
  - `=check-md > Core Code Patterns` (ตรวจสอบเฉพาะส่วน `Core Code Patterns` ว่ามีรูปแบบโค้ดใหม่ๆ ที่ควรเพิ่มหรือไม่)

---

## Core Code Patterns

### When Working with Hardware Controllers

- **Always** use `BuildTimeController.getCurrentController()` to ensure a single instance and compliance.
- Use controller methods that match the legacy KU16 API for compatibility.

### When Working with Design System Components

- Import components from the centralized `DesignSystem` directory.
- Use consistent patterns like `<DialogBase>`, `<DialogHeader>`, and `<DialogButton>`.

### When Working with Responsive Grid

- Use the utility functions `getDisplaySlotConfig()` and `getResponsiveGridConfig()` to adapt the UI to the device type (DS12 or DS16).

### When Working with CSV Batch Processing

- Use `processBatchLicenses()` from `@/modules/batch-license-generator`.

### When Working with No Expiry Licenses

- Implement the `noExpiry` checkbox in the UI.
- The CLI automatically handles the `2099-12-31` date.
