🔐 HKDF v2.0 Key Derivation Process

ไม่มี "shared key" แล้ว!

HKDF v2.0 ไม่ใช้ shared key แบบเดิม แต่สร้าง key แบบ dynamic จาก sensitive data:

// HKDF Key Generation (from CLI)
const ikm_parts = [
applicationId, // จาก kdf_context.info
 customerId, // จาก kdf_context.info
wifiSsid, // ต้องได้จาก ESP32 connection
macAddress, // ต้องได้จาก ESP32 /mac API
 expiryDate // จาก kdf_context.info
];

const ikm = Buffer.from(ikm*parts.join('*'), 'utf8');
const derivedKey = hkdf(ikm, salt, info, 32); // สร้าง AES-256 key

🔗 Hardware Binding Process

1. License Generation (CLI)

# CLI สร้าง license พร้อม ESP32 MAC

smc-license generate --wifi-ssid "ESP32_WiFi" --wifi-password "pass123"

# → ESP32 ต้อง connect ตอน generate เพื่อเอา MAC address

# → License จะ "bind" กับ MAC address นั้น

2. SMC App Decryption Process

// SMC App ต้องการ 3 ข้อมูลนี้เพื่อ decrypt:
const requiredData = {
// จาก License file (public):
kdf_context.info, // "SMC_LICENSE_KDF_v1.0|APP|CUSTOMER|2025-12-31|1.0.0"
kdf_context.salt, // Base64 deterministic salt

    // จาก ESP32 hardware (runtime):
    esp32MacAddress,   // ESP32 /mac API → "F4:65:0B:58:66:A4"
    esp32WifiSsid,     // ESP32 WiFi network name

};

// ถ้า MAC address ไม่ตรงกัน → decryption ล้มเหลว
if (esp32Mac !== licenseMac) {
throw new Error("Hardware binding validation failed");
}

📋 Integration Points

During dev-reset/build-prep:

// ❌ ไม่มี key sharing ใน build time แล้ว
// ✅ แค่ copy license.lic file เฉยๆ

// build-prep process:

1. Copy license.lic to resources/
2. ไม่มีการ share key หรือ embed อะไรใน app
3. SMC App จะ derive key เองตอน runtime

During SMC App Runtime:

// SMC App activation process:

1. อ่าน license.lic → ได้ kdf_context (public data)
2. Connect ESP32 WiFi → ได้ wifiSsid
3. Call ESP32 /mac API → ได้ macAddress
4. ใช้ทั้ง 4 ข้อมูลสร้าง HKDF key → decrypt license
5. ตรวจสอบ MAC address ใน license กับ ESP32 MAC ว่าตรงกัน

🎯 Security Benefits

Enhanced Hardware Binding:

- ✅ ไม่มี shared secret ที่สามารถ reverse engineer ได้
- ✅ ต้องมี ESP32 จริง ถึงจะ decrypt ได้
- ✅ MAC address hidden ใน license file
- ✅ Self-contained - ไม่ต้อง key management

Attack Vector Prevention:

// ❌ Attacker ไม่สามารถ:
// 1. Decrypt license โดยไม่มี ESP32 ตัวจริง
// 2. เอา MAC address จาก license file (เพราะ encrypted)
// 3. ใช้ license กับ ESP32 อื่น (MAC address ไม่ตรง)
// 4. Reverse engineer shared key (เพราะไม่มี)

สรุป: SMC App ไม่ได้ "รับ key" มาจากไหน แต่สร้าง key เองจาก ESP32 hardware binding ตอน
runtime!
