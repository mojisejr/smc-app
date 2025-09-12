# Current Focus Context

Updated: 2025-09-12 20:35:50 (Thailand Time, UTC+7)

หลังจากการทำ manual testing ด้วย `npm run dev` พบว่า:

1) หลังจากรัน `npm run dev-reset` แล้ว database reset เรียบร้อย โดย field `ku_port` ถูกตั้งค่าเป็น `auto` ตามค่าเริ่มต้น
2) คัดลอก `license.lic` มาใส่แล้วรัน `npm run dev` เพื่อทำ manual test
3) เข้าไปหน้า Admin → Port Setting → ตั้งพอร์ตเป็น `COM3` (เชื่อมต่อได้สำเร็จ)
4) ปิดโปรแกรมและเปิดใหม่อีกครั้ง หลังจากตั้งพอร์ตแล้ว
5) เมื่อกดที่ slot เพื่อ unlock พบว่ามีการ flush ไฟล์ `/D:/dev/smc/smc-app/docs/log.csv` อย่างรวดเร็ว คล้าย memory leak หรือ while loop ที่ไม่มี sleep time
6) ทดสอบกับ dispensing หรือปุ่ม "จ่ายยา" ก็มีอาการเดียวกัน

ข้อสังเกตเบื้องต้น: เป็นไปได้ว่ามีการ loop ของการส่ง/รับสถานะหรือการเขียน log ซ้ำโดยไม่มี debounce/throttle หรือการตรวจสอบ state change นำไปสู่การเขียน CSV ต่อเนื่องผิดปกติ (ต้องตรวจสอบที่ event logger และ flow ของ hardware command dispatch เมื่อเกิด unlock/dispense)
