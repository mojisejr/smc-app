# Current Focus

ใน folder `/d:/dev/smc/smc-app/main/license/` และ `/d:/dev/smc/smc-app/scripts/` มี error เกิดขึ้นหลายจุดจากการแก้ไขครั้งก่อนหน้าครับ และพอ run npm run build แล้วจะขึ้น error ตามนี้ครับ Terminal#1-139

**ต้องการแก้ไข error ให้สามารถ build ผ่านได้ ครับ เพื่อจะได้ลอง test debug log กันได้ครับ**

## Error Details

จากการ run `npm run build:internal:ds12` พบ TypeScript errors ใน `scripts/build-prep.ts`:

- Property 'info' does not exist on type '(data: RuntimeLogData) => Promise<void>'
- Property 'error' does not exist on type '(data: RuntimeLogData) => Promise<void>'

ปัญหาเกิดจากการใช้ `runtimeLogger.info()` และ `runtimeLogger.error()` ที่ไม่ตรงกับ interface ที่คาดหวัง

## Priority

แก้ไข build errors เพื่อให้สามารถ build และ test debug logging ได้
เชคจุดอื่นให้ครบทั้งหมด ว่ามีปัญหาคล้ายๆ กันอีกหรือไม่

---

_Updated: 2025-01-27_
