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

Markdown

# Prompt

```docker
คุณคือผู้ช่วย AI ที่เชี่ยวชาญด้านการพัฒนาซอฟต์แวร์ และมีความเข้าใจอย่างลึกซึ้งใน ****"AI-Assisted Development Workflow Template (Enhanced Version)"**** ที่เราได้สร้างขึ้นมา (ซึ่งผมจะแนบไฟล์ PDF ให้คุณด้วย หรือคุณสามารถอ้างอิงจากบทสนทนาที่ผ่านมาของเรา)

****เป้าหมายหลักของ Prompt นี้คือ: ให้คุณช่วยผมในการ "Bootstrap" โปรเจกต์ใหม่**** โดยการสร้าง `CLAUDE.md` ที่สมบูรณ์แบบ, `PROGRESS.md` เริ่มต้น, และร่างเนื้อหาเบื้องต้นสำหรับ Modular Supplement Files (PRD, API-DESIGN, UI-GUIDELINES, TECH-SPECS, SYSTEM-DESIGN) พร้อมทั้งวางแผน Round Structure ที่เหมาะสมสำหรับโปรเจกต์นี้

---

## 1. 🌟 PROJECT OVERVIEW & BUSINESS CONTEXT

****โปรดอธิบายภาพรวมของ Application ที่ต้องการสร้าง และวัตถุประสงค์ทางธุรกิจหลัก:****

[****ตัวอย่าง (จากของคุณ):**** ผมกำลังสร้างระบบบริหารจัดการฟาร์มที่มีสัตว์ (ควาย, ไก่, วัว, หมู, ม้า) โดยผู้ใช้จะสามารถจัดการข้อมูลสัตว์, กิจกรรม, และการแจ้งเตือนได้ ระบบนี้มีวัตถุประสงค์เพื่อช่วยเจ้าของฟาร์มขนาดเล็ก-กลางที่ดูแลฟาร์มคนเดียว ให้สามารถบริหารจัดการฟาร์มได้อย่างมีประสิทธิภาพและไม่ซับซ้อน]

---

## 2. 👥 USER ROLES & CORE USER FLOWS

****โปรดอธิบายบทบาทของผู้ใช้งานหลัก และลำดับการทำงาน (User Flow) ที่สำคัญที่สุดของระบบ (เน้น Flow ตั้งแต่เริ่มต้นจนจบบริการหลัก):****

[****ตัวอย่าง (จากของคุณ):***** ****User Onboarding & Authentication Flow:****    * เข้าหน้า Home Page (มีปุ่ม "เข้าสู่ระบบ")
    * ไปหน้า Login Page
    * ถ้ายังไม่เป็นสมาชิก: ไปหน้า Registration (กรอก ชื่อ, นามสกุล, เบอร์โทร, รหัสผ่าน, ยืนยันรหัสผ่าน)
    * ถ้า Login ด้วย Line ครั้งแรก: จะมีหน้าจอกรอกเบอร์โทรศัพท์ (ใช้เป็นตัวกรองผู้ใช้งานไม่ให้สมัครซ้ำ)
    * หลังสมัคร/Login สำเร็จ: Redirect ไปหน้า Profile
    * ****Backend****: จะสร้างฟาร์มให้อัตโนมัติ (แต่ยังไม่มีชื่อฟาร์ม/จังหวัด)
* ****Profile & Farm Management Flow:****    * เมื่อเข้าสู่ระบบ: เจอหน้า Profile (Header, Notification Bell, รูปโปรไฟล์, ชื่อฟาร์ม/จังหวัดที่แก้ไขได้)
    * มีปุ่ม Navigation: ไปหน้าข้อมูลสัตว์, เพิ่มข้อมูลสัตว์, ค้นหาข้อมูลสัตว์ด้วยเลขประจำตัว, ออกจากระบบ
* ****Animal & Reminder Management Flow (จากปุ่ม "ไปหน้าข้อมูลสัตว์"):****    * เจอหน้าจอหลักมี 2 Tabs: "Animal List" (สัตว์ในฟาร์ม) และ "Reminder" (รายการแจ้งเตือน)
    * ****Tab "Animal List"****: แสดง List ของการ์ดข้อมูลสัตว์ในฟาร์ม -> กดการ์ด -> เข้า Animal Detail Page (มี List กิจกรรม, Update Activity, ตั้ง Reminder Time ได้)
    * ****Tab "Reminder"****: แสดง List ของการ์ดกิจกรรมของสัตว์ทุกตัวที่มี Reminder (เรียงจากใกล้วันนัด) -> กดการ์ด -> เลื่อน/กำหนดว่าเสร็จแล้ว/ยกเลิกได้
* ****Notification Flow:****    * Push Notification สำหรับงานที่ต้องทำในวันนี้ (ตรวจสอบและ Push ทุกวัน 6 โมงเช้า)
    * โชว์ผ่าน Notification Bell ที่หน้า Profile และ Push Notification ใน Platform ต่างๆ (Web Push Notifications)]

---

## 3. 🖥️ UI/UX & DESIGN GUIDELINES

****โปรดอธิบายแนวทางการออกแบบ UI/UX และแนบเอกสารประกอบ (เช่น JSON UI จาก Figma) เพื่อให้ AI สามารถเข้าใจ Design Pattern ได้:****

[****ตัวอย่าง (จากของคุณ):***** ****Design Principle****: Mobile-first design, รองรับ Desktop ได้ด้วย
* ****Theme Color****: สีหลัก #f39c12 (orange)
* ****Component Patterns****: อ้างอิงจาก JSON File ที่แนบมา (AI-generated from Figma image) ซึ่งจะแสดง:
    * Homepage UI (ปุ่ม CTA)
    * Animal Card Pattern (สำหรับ Animal List และ Reminder List)
    * Tab Navigation Pattern (สำหรับ Animal List / Reminder)
    * Detail Page Layout (สำหรับ Animal Detail Page)
* ****แนบไฟล์****: [UI JSON File (เช่น `ui_guideline.json`)]
]

---

## 4. ⚙️ TECHNICAL & DATA REQUIREMENTS

****โปรดระบุข้อมูลทางเทคนิคที่สำคัญ และข้อกำหนดเกี่ยวกับ Data Model/โครงสร้างข้อมูล:****

[****ตัวอย่าง (จากของคุณ):***** ****User-Farm Relationship****: User 1 คนเป็นเจ้าของฟาร์มได้ 1 ฟาร์ม และเป็นสมาชิกฟาร์มได้อีก 1 ฟาร์ม (เน้น Owner ใน MVP)
* ****Animal Data Storage****: สัตว์แต่ละประเภท (ควาย, ไก่, วัว, หมู, ม้า) จะเก็บใน ****ตารางเดียวกัน***** ****Activity/Reminder Fields****:
    * `ชื่อกระบือ` (Animal Name/ID)
    * `รายการ` (Activity Name)
    * `หมายเหตุ` (Notes)
    * `วันนัด` (Reminder Date)
    * `สถานะ` (active, completed, cancelled)
* ****Notification Implementation****: ใช้ Web Push Notifications, การ Schedule Notification ตอน 6 โมงเช้าจะใช้ Cron Job
]

---

## 5. 🛠️ DEVELOPMENT & QUALITY CONSTRAINTS

****โปรดระบุข้อจำกัดหรือข้อกำหนดพิเศษเกี่ยวกับการพัฒนาและคุณภาพโค้ด:****

[****ตัวอย่าง (จากของคุณ):***** ****Developer Resource****: ผม Dev คนเดียวดูแลทั้งหมดคนเดียว
* ****Complexity Goal****: ระบบ Stack ไม่ซับซ้อน, ดูแลง่าย, สามารถดูแลคนเดียวได้
* ****Code Complexity****: ระดับความซับซ้อนของโค้ดที่เขียน ให้ใช้ Pattern การเขียนโค้ดแบบยากปานกลาง เพื่อให้เข้าใจได้ง่ายและรวดเร็ว
* ****Documentation****: ถ้ามีส่วนที่ยากหรือซับซ้อน AI ต้องสร้าง `docs` (Inline comments หรือ Separate `.md` files) ไว้ทุกครั้ง
* ****Feature Scope****: ต้องการ Implement Features ที่กำหนดมาตามนี้เท่านั้น ไม่มากไม่น้อยไปกว่านี้ ถ้าจะเพิ่มเติมจะทำทีหลัง
]

---

## 6. 💻 PREFERRED TECH STACK

****โปรดระบุ Tech Stack ที่คุณต้องการใช้ และถนัด พร้อมทั้งเปิดโอกาสให้ AI แนะนำเพิ่มเติม:****

[****ตัวอย่าง (จากของคุณ):***** ****Application Type****: Full-stack App แบบไม่แยก API (Monorepo)
* ****Frontend/Backend Framework****: `nextjs@14`
* ****Database/BaaS****: `supabase`
* ****UI Component Library****: `daisyui`
* ****Notification Library****: `sonnar` (สำหรับการแจ้งเตือน UI)
* ****Authentication****: `clerk` (สำหรับ Authentication และ Line Login Integration)
* ****Animation****: `framermotion`
* ****Icons****: `lucid icon`
* ****อื่นๆ****: คุณสามารถแนะนำเพิ่มเติมได้ตามความเหมาะสม
]

---

## 7. 📁 REFERENCED WORKFLOW & ATTACHMENTS

****โปรดยืนยันว่าคุณจะแนบไฟล์ Workflow Template และ UI Guideline (JSON) และย้ำว่าต้องการให้ AI สร้างไฟล์ตาม Workflow ที่เราคุยกันมา:****

[****ตัวอย่าง:**** ผมจะแนบไฟล์ ****"AI-Assisted Development Workflow Template (Enhanced Version).pdf"**** (หรือชื่อไฟล์ PDF ที่คุณใช้) และไฟล์ ****"ui*_guideline.json"** (หรือชื่อไฟล์ JSON ของคุณ) ไปพร้อมกับ Prompt นี้

ผมต้องการให้คุณใช้ Workflow Template ที่เราคุยกันมานี้ในการ Guide ผมไปเรื่อยๆ จนจบโปรเจกต์ Step-by-Step และผมจะถามคำถามคุณตลอดเวลาแบบแทรกหรือต่อท้ายสิ่งที่คุณแนะนำ]

---

**เมื่อคุณเติมข้อมูลในทุกส่วนของ Template นี้แล้ว ให้ Copy ทั้งหมดแล้วส่งมาให้ผมพร้อมกับไฟล์แนบได้เลยครับ**

---

### ประสิทธิภาพที่เพิ่มขึ้นของ Flow นี้:

1.  **AI เข้าใจตั้งแต่แรกเริ่ม**: ด้วยโครงสร้างที่ชัดเจนนี้ ผม (AI) จะได้รับบริบทที่ครบถ้วนและจัดระเบียบมาแล้วตั้งแต่ Prompt แรก ทำให้การวิเคราะห์และการสร้าง `CLAUDE.md` รวมถึง `Supplement Files` มีความแม่นยำสูงขึ้นมาก
2.  **ลดการ `Refine` และ `Tune`**: เมื่อ AI ได้รับข้อมูลที่ละเอียดตั้งแต่แรก โอกาสที่จะสร้าง `CLAUDE.md` ที่ต้องแก้ไขภายหลังจะลดลงอย่างมีนัยสำคัญ ทำให้คุณประหยัดเวลาในขั้นตอนที่ 3 และ 4 เดิม
3.  **สร้าง `Supplement Files` อัตโนมัติ (ในร่างเบื้องต้น)**: ด้วยการให้ข้อมูลแยกส่วนไว้ตั้งแต่แรก AI จะสามารถร่างเนื้อหาของ `API-DESIGN.md`, `UI-GUIDELINES.md`, `TECH-SPECS.md` และอื่นๆ ได้อย่างมีโครงสร้างมากขึ้น ซึ่งคุณสามารถนำไปปรับแต่ง/เติมรายละเอียดได้ง่ายขึ้น
4.  **`Round Planning` ที่แม่นยำขึ้น**: เมื่อ AI เข้าใจภาพรวม ฟีเจอร์ และข้อจำกัดทางเทคนิคทั้งหมดตั้งแต่ต้น การแบ่ง Round จะมีความสมเหตุสมผลและมีประสิทธิภาพสูงสุด
5.  **เตรียมพร้อมสำหรับ `Pre-generated Prompts`**: เมื่อ `CLAUDE.md` และ `Supplement Files` ถูกสร้างขึ้นอย่างดีแล้ว ขั้นตอนการ `Pre-generate prompts` สำหรับแต่ละ Round (ที่เราได้คุยกันไป) จะทำได้ง่ายและเร็วขึ้นมาก ทำให้ Workflow การพัฒนาจริงราบรื่นขึ้นไปอีก

---

การใช้ Template นี้จะทำให้การเริ่มต้นโปรเจกต์ใหม่ของคุณกับ AI เป็นไปอย่างมีระบบและมีประสิทธิภาพสูงสุดครับ คุณพร้อมที่จะลองใช้ Template นี้กับโปรเจกต์ Farm Management System ของคุณเลยไหมครับ?***
``
```
