# Current Focus

ถ้าคุณอ่านจาก `/d:/dev/smc/smc-app/docs/retrospective/` ที่ผ่านๆ มาคุณจะพบว่ามีการแก้ไข เรื่อง internal license มาหลายครั้งแต่ไม่สำเร็จสักครั้ง หลังจากที่แก้แล้ว พบว่า พอ build จริงมันจะติดค้างอยู่ที่ 30% โดยที่ไม่สามารถรู้ได้เลยว่าเกิดอะไรขึ้น เพราะไม่สามารถดู log ที่เกิดขึ้นในระบบได้ ผมจึงมีแนวคิดว่า จะให้คุณสร้าง log messsage เพื่อที่่จะ detect ได้ว่า ใน build app เกิดอะไรขึ้นบ้าง รวมถึงการลองทดสอบใน unpacked folder ด้วย โดยผมอยากจะให้ 
 - log เข้าไปใน table `/d:/dev/smc/smc-app/db/model/logs.model.ts` ครับ 
 - กำหนด type ให้สอดคล้อง คุณจะได้  debug ได้ง่ายในขั้นตอนต่อไป 
 - ผมจะทำการ export log ออกมาจาก database เองไม่ต้องทำ function อะไรเพิ่ม **IMPORTANT! ทำแค่ส่วน logs เข้า database เท่านั้น** 
 - พยายามรักษา scope ของงานไม่ต้อง เพิ่มเติมอะไรเข้ามาก่อนครับ 
 **เป้าหมายของ task นี้คือ ช่วยให้คุณสามารรถเข้าใจได้ว่า ระบบเกิดอะไรขุึ้นตอน runtime จริงๆ**

---

**Updated**: 2025-09-04 (Thailand Time)
**Status**: Context Saved
**Type**: Context Issue
