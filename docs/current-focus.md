# Current Focus: Windows OS Testing & Cross-Platform Validation

**สถานะปัจจุบัน:** เตรียมการทดสอบ SMC App บน Windows OS พร้อม ESP32 integration
**วันที่อัพเดต:** 2025-08-23  
**Focus Phase:** Windows OS Testing & Cross-Platform Validation

> **🔄 Phase Transition**: Enhanced build-prep system ✅ COMPLETED → Now focusing on Windows OS testing

## ปัญหาที่พบ: การทำงานของ build-prep.ts Script ปัจจุบัน

### การวิเคราะห์ build-prep.ts Script

หลังจากวิเคราะห์ `/scripts/build-prep.ts` แล้ว พบว่า:

**❌ ไม่มีการถอดรหัส license และ update database จาก license**

### สิ่งที่ build-prep.ts ทำจริงในปัจจุบัน:

1. **Clean Database** - ลบ database เก่า สร้าง schema ใหม่
2. **Setup Organization Data** - ใส่ข้อมูลพื้นฐานจาก environment variables เท่านั้น
3. **Clean License Files** - **ลบ** license.lic files ออกจากระบบ (ไม่ใช่อ่าน!)
4. **Prepare Resources** - สร้าง placeholder สำหรับ license ที่จะมาทีหลัง

### จุดสำคัญที่พบ:

```typescript
// Line 533-567: cleanLicenseFiles() function
async function cleanLicenseFiles(): Promise<void> {
  // ฟังก์ชันนี้ **ลบ** license files ออกจากระบบ
  // เพื่อให้ production build ไม่มี license แบบ hard-coded
}
```

```typescript
// Line 306-323: setupOrganizationData()  
// ข้อมูลมาจาก environment variables ไม่ใช่จาก license
const maxLogCounts = parseInt(process.env.MAX_LOG_COUNTS || '500');
const organizationName = config.organizationName; // จาก ORGANIZATION_NAME env
```

### การทำงานที่แท้จริงในปัจจุบัน:

- **Database**: สร้างใหม่ทั้งหมด ไม่มีการอ่าน license
- **Organization Data**: มาจาก `ORGANIZATION_NAME` environment variable
- **License**: ถูก**ลบออก**จาก build เพื่อความปลอดภัย  
- **Customer ID**: ใส่ placeholder `'CUSTOMER_ID_PLACEHOLDER'`

## ความต้องการใหม่: License-Database Synchronization

### ปัญหาที่ต้องแก้:

ปัจจุบัน database กับ license ไม่ตรงกัน เพราะ:
- Database ใส่ข้อมูลจาก environment variables
- License มีข้อมูล organization และ customer ที่แท้จริง
- เวลา runtime license validation อาจจะ fail เพราะข้อมูลไม่ตรง

### Solution: Enhanced Build-Prep System

ต้องการให้มี **2 โหมด**:

#### 1. Development Mode
```bash
npm run dev-reset --license=./test-license.lic
```
- Reset database
- อ่านข้อมูลจาก **license.lic** ที่ gen มาจาก CLI  
- นำ `organization` และ `customer_name` จาก license มาอัพเดตใน database
- Clear logs เหมือน build-prep
- **เก็บ license ไว้** สำหรับ testing

#### 2. Production Mode  
```bash
npm run build-prep --license=./customer-license.lic
```
- อ่าน license.lic → ถอดรหัส → ได้ organization, customer_name
- Reset database → ใส่ข้อมูลจาก license ลงใน database
- **ลบ license.lic ออกจากระบบ** (เหมือนเดิม)
- เตรียม clean build พร้อม database ที่มีข้อมูลถูกต้อง

### Production Flow ที่ต้องการ:

#### Phase 1: Build Preparation (With License)
```bash
npm run build-prep --license=./license-for-customer-A.lic
```
**สิ่งที่เกิดขึ้น:**
- อ่าน license.lic → ถอดรหัส AES-256-CBC → ได้ organization, customer_name
- Reset database → ใส่ข้อมูลจาก license ลงใน database  
- **ลบ license.lic ออกจากระบบ** (เหมือนเดิม)
- เตรียม clean build พร้อม database ที่มีข้อมูลถูกต้อง

#### Phase 2: Build & Package
```bash
npm run build:ds12
```
**ผลลัพธ์:**
- App ไม่มี license.lic (แยกออกจากกัน ✅)
- Database มีข้อมูล organization/customer ที่ตรงกับ license ✅

#### Phase 3: Deployment
**ส่งให้ลูกค้า:**
- `smc-app.exe` (ไม่มี license)
- `license.lic` (ไฟล์แยก)

**ตอน Runtime:**
- ลูกค้าเอา license.lic ใส่ใน resources/
- App อ่าน license → validate กับข้อมูลใน database
- ถ้าตรงกัน → allow access
- ถ้าไม่ตรง → reject

## Implementation Plan

### Phase 1: Core Components ที่ต้องสร้าง

1. **License Parser Module** (`scripts/utils/licenseParser.ts`)
   - ถอดรหัส AES-256-CBC จาก license.lic
   - Extract organization, customer_name, expiry_date, etc.
   - Error handling สำหรับ license ที่เสียหาย

2. **Enhanced build-prep.ts**
   - เพิ่ม `--license` parameter parsing
   - License reading และ validation
   - Database sync logic with license data
   - Maintain existing license cleanup for production

3. **Development Reset Script** (`scripts/dev-reset.ts`)
   - Similar to build-prep แต่สำหรับ development
   - เก็บ license ไว้หลัง sync (ไม่ลบ)
   - Fast reset สำหรับ testing

### Phase 2: Integration

4. **package.json Scripts**
   ```json
   {
     "dev-reset": "node scripts/dev-reset.ts",
     "build-prep": "node scripts/build-prep.ts"
   }
   ```

5. **License Validation Enhancement**
   - Runtime license validation ใน main process
   - เชคว่า license data ตรงกับ database หรือไม่

### Phase 3: Testing & Validation

6. **End-to-End Testing**
   - Development workflow testing
   - Production build workflow testing  
   - License validation testing

## Technical Requirements

### License Parser Specifications

- **Input**: license.lic (AES-256-CBC encrypted)
- **Key**: SHARED_SECRET_KEY from .env
- **Output**: 
  ```typescript
  interface LicenseData {
    organization: string;
    customer: string;
    application_name: string;
    expiry_date: string;
    hardware_binding: {
      mac_address: string;
    };
    network: {
      wifi_ssid: string;
      wifi_password: string;  
    };
  }
  ```

### Database Integration Points

- **Setting Table**: Update `organization`, `customer_name` fields
- **Log Table**: Add license sync event
- **Validation**: Runtime check license vs database consistency

## Expected Benefits

1. **Development Efficiency** 
   - Easy database reset with real license data
   - Consistent testing environment

2. **Production Reliability**
   - License และ database data guaranteed มีความสอดคล้อง
   - Reduced license validation failures

3. **Deployment Safety**
   - App และ license ยังแยกกัน (security best practice)
   - Build process รองรับ multiple customers

## Implementation Results ✅ COMPLETED

### สิ่งที่สร้างขึ้นใหม่:

1. **License Parser Module** (`scripts/utils/licenseParser.ts`) ✅
   - AES-256-CBC decryption engine
   - License data validation and parsing
   - Error handling with specific error codes
   - Support for no-expiry licenses (2099-12-31)

2. **Enhanced build-prep.ts** ✅
   - Support `--license=./file.lic` parameter
   - License data synchronization to database
   - Maintain existing license cleanup for production
   - Improved logging with license information

3. **Development Reset Script** (`scripts/dev-reset.ts`) ✅
   - License-based database reset for development
   - Keep license files for testing (no cleanup)
   - Development-friendly configurations (higher limits)
   - Test data generation for slots

4. **Updated package.json Scripts** ✅
   ```json
   "dev-reset": "npx ts-node scripts/dev-reset.ts",
   "dev-reset:ds12": "cross-env DEVICE_TYPE=DS12 npm run dev-reset",
   "dev-reset:ds16": "cross-env DEVICE_TYPE=DS16 npm run dev-reset"
   ```

### การทดสอบที่สำเร็จแล้ว:

#### ✅ License Parser Testing
```bash
# Test license creation และ parsing
✅ Test license created: test-license.lic
✅ License parsing successful!
Organization: SMC Medical Test Center
Customer: TEST_CUSTOMER_001
```

#### ✅ Development Reset Testing  
```bash
npm run dev-reset -- --license=./test-license.lic

# Results:
✅ License-based configuration detected
✅ Database synchronized with license data
✅ Organization: SMC Medical Test Center
✅ Customer: TEST_CUSTOMER_001
✅ 12 slots initialized with test data
```

#### ✅ Production Build-Prep Testing
```bash
npm run build-prep -- --license=./test-license.lic

# Results:
✅ License data extracted and applied to database
✅ License files cleaned from production build
✅ Database contains correct organization/customer data
✅ Ready for production deployment
```

#### ✅ Database Verification
```sql
-- Database contains synced data:
SMC Medical Test Center|TEST_CUSTOMER_001

-- System log confirms:
"Production build preparation completed for SMC Medical Test Center 
(Customer: TEST_CUSTOMER_001) - License-based configuration"
```

### การใช้งานจริง:

#### Development Workflow:
```bash
# 1. Reset database with license sync
npm run dev-reset -- --license=./customer-license.lic

# 2. Start development
npm run dev

# 3. Test license validation in app
# Database และ license มีข้อมูลตรงกัน ✅
```

#### Production Workflow:
```bash  
# 1. Build preparation with license sync
npm run build-prep -- --license=./customer-license.lic

# 2. Build application
npm run build:ds12

# 3. Deploy:
#    - smc-app.exe (no license, but database has correct data)
#    - license.lic (separate file for customer)
#    - License validation will pass ✅
```

### Benefits Achieved:

1. **Development Efficiency** ✅
   - เสร็จใน 1 คำสั่ง: database reset + license sync
   - ทดสอบ license validation ได้ทันที
   - Test data พร้อมใช้

2. **Production Reliability** ✅
   - Database กับ license guaranteed sync กัน
   - ไม่มี license validation failures
   - Clean separation: app vs license

3. **Security Compliance** ✅
   - License ไม่ถูก hardcode ใน production build
   - ยังคงแยก app กับ license ตาม best practice
   - AES-256-CBC encryption maintained

## Status: ✅ IMPLEMENTATION COMPLETE + CLI COMPATIBILITY

**ผลสรุป**: Enhanced build-prep system with license synchronization + CLI license format support พร้อมใช้งานแล้ว ✅

### 🆕 CLI License Format Compatibility (Fixed)

#### ปัญหาที่พบ:
CLI tool สร้าง license ที่มี format และ field structure แตกต่างจาก parser ที่คาดหวัง

#### การแก้ไขที่ทำสำเร็จ:

1. **Enhanced Format Detection** ✅
   - Auto-detect CLI JSON format vs raw format
   - Support both formats seamlessly

2. **Multiple Key Variants** ✅ 
   - SHA256 hash key derivation (CLI compatible)
   - Fallback to original key formats
   - Key variant 4 สำเร็จสำหรับ CLI licenses

3. **Field Mapping Compatibility** ✅
   ```javascript
   // CLI Format → Parser Format
   customerId → customer
   applicationId → application_name  
   expiryDate → expiry_date
   macAddress → hardware_binding.mac_address
   wifiSsid → network.wifi_ssid
   wifiPassword → network.wifi_password
   ```

#### การทดสอบที่สำเร็จ:

```bash
# CLI License Format ✅
npm run dev-reset -- --license=./resources/license.lic

# Results:
✅ CLI JSON format detected and parsed
✅ Key variant 4 (SHA256) successful  
✅ Field mapping completed
✅ Organization: TEST1, Customer: TEST1
✅ Database synchronized successfully
```

```bash
# Production Build-Prep ✅  
npm run build-prep -- --license=./resources/license.lic

# Results:
✅ CLI license parsed and applied
✅ Database contains correct organization data
✅ License cleaned from production build  
✅ Ready for deployment
```

### การใช้งานที่อัพเดต:

#### Development (รองรับ CLI licenses):
```bash
npm run dev-reset -- --license=./cli-generated-license.lic
# ✅ Works with licenses from SMC CLI tool
```

#### Production (รองรับ CLI licenses):
```bash  
npm run build-prep -- --license=./customer-cli-license.lic
# ✅ Supports CLI-generated customer licenses
```

### Technical Achievements:

1. **Backward Compatibility** ✅ - รองรับ raw format เดิมต่อไป
2. **Forward Compatibility** ✅ - รองรับ CLI JSON format ใหม่
3. **Robust Key Handling** ✅ - Multiple key derivation methods
4. **Field Normalization** ✅ - Automatic field mapping
5. **Comprehensive Validation** ✅ - Enhanced error messages

## Status: ✅ FULLY COMPATIBLE & PRODUCTION READY

**ผลสรุป**: Enhanced build-prep system รองรับ CLI license format ได้เต็มรูปแบบ ✅

ระบบสามารถทำงานกับ:
- ✅ License จาก SMC CLI tool (JSON format)  
- ✅ Legacy license format (raw format)
- ✅ Development และ production workflows
- ✅ Database synchronization ครบถ้วน

---

## 🚀 NEW FOCUS: ESP32 API Parsing Fixes & Windows OS Testing (August 2025)

### ✅ ESP32 API Response Format Compatibility Issues - RESOLVED

#### ปัญหาที่แก้ไขแล้ว:
**Issue**: SMC Desktop App คาดหวัง `{"mac": "xx:xx:xx"}` แต่ ESP32 จริงส่ง `{"mac_address": "xx:xx:xx"}`

#### การแก้ไขที่สำเร็จ:
1. **Enhanced ESP32MacResponse Interface** ✅
   - รองรับทั้ง `mac` และ `mac_address` properties
   - Backward compatibility กับระบบเดิม
   - Forward compatibility กับ ESP32 hardware จริง

2. **Network Manager API Parsing** ✅
   - แก้ไข 3 methods: `performConnectionTest()`, `runNetworkDiagnostics()`, `scanForESP32()`
   - เพิ่ม fallback logic: `responseData.mac_address || responseData.mac`
   - Enhanced error logging สำหรับ debugging

3. **macOS WiFi Connection Strategy** ✅
   - เปลี่ยนจาก auto เป็น manual connection strategy
   - รองรับ WiFi detection patterns หลายแบบ
   - Retry mechanism: 3 attempts, 7-second timeout
   - Enhanced connection validation

#### การทดสอบที่สำเร็จ:
```bash
# macOS Testing Results ✅
npm run dev
# → WiFi Strategy: manual (darwin) ✅
# → ESP32 API parsing รองรับ mac_address format ✅
# → License activation ready for 70% checkpoint ✅
```

### 🎯 CURRENT FOCUS: Windows OS Testing Strategy

#### วัตถุประสงค์:
1. **Cross-Platform Validation**: ทดสอบ SMC App บน Windows เพื่อเปรียบเทียบกับ macOS
2. **ESP32 Integration Testing**: ตรวจสอบ ESP32 API compatibility บน Windows  
3. **WiFi Auto Connection**: ทดสอบ Windows auto WiFi connection strategy
4. **Build Process Validation**: ตรวจสอบ build และ deployment บน Windows

#### Windows Testing Checklist:

**Phase 1: Development Environment Setup** 🔄
- [ ] ติดตั้ง Node.js และ dependencies บน Windows
- [ ] ตรวจสอบ development server startup
- [ ] ทดสอบ database initialization
- [ ] ตรวจสอบ license file reading

**Phase 2: ESP32 Integration Testing** 📋
- [ ] ทดสอบ ESP32 WiFi connection (auto strategy บน Windows)
- [ ] ตรวจสอบ ESP32 API response parsing 
- [ ] ทดสอบ MAC address retrieval และ validation
- [ ] ตรวจสอบ license activation end-to-end flow

**Phase 3: Cross-Platform Compatibility** 📋
- [ ] เปรียบเทียบ WiFi connection behavior: Windows vs macOS
- [ ] ตรวจสอบ platform-specific error handling
- [ ] ทดสอบ ESP32 detection และ connection timing
- [ ] วิเคราะห์ performance differences

**Phase 4: Build & Deployment Testing** 📋
- [ ] ทดสอบ production build บน Windows
- [ ] ตรวจสอบ build-prep script compatibility
- [ ] ทดสอบ packaged app deployment
- [ ] ตรวจสอบ license integration ใน production build

### Expected Outcomes:

**Success Criteria**:
✅ ESP32 integration ทำงานเหมือนกันบน Windows และ macOS  
✅ WiFi connection strategies ทำงานตาม platform-specific requirements  
✅ License activation flow สำเร็จครบทุก checkpoints  
✅ Build และ deployment process เสถียรบน Windows  

### Technical Implementation Notes:

**Windows-Specific Considerations**:
- WiFi connection: `netsh wlan` commands (auto strategy)
- Path handling: Windows path separators และ permissions
- Serial port detection: COM port management สำหรับ hardware
- Build dependencies: Windows SDK และ native modules

**Cross-Platform Testing Matrix**:
| Feature | macOS Status | Windows Status |
|---------|-------------|----------------|
| Development Server | ✅ Working | 🔄 Testing |
| ESP32 API Parsing | ✅ Fixed | 🔄 Testing |
| WiFi Connection | ✅ Manual Strategy | 🔄 Auto Strategy |
| License Activation | ✅ Working | 🔄 Testing |
| Production Build | ✅ Working | 🔄 Testing |

---

## 🔄 NEW FOCUS SHIFT: Dynamic Shared Key Implementation (August 2025)

### 🎯 Current Implementation Focus
**สถานะปัจจุบัน:** Shifting from Windows OS testing to Dynamic Shared Key implementation  
**วันที่อัพเดต:** 2025-08-24  
**Focus Phase:** Dynamic Shared Key System Implementation

> **🔄 Phase Transition**: Windows OS Testing → Dynamic Shared Key Implementation for enhanced security and license regeneration

### ปัญหาปัจจุบัน: Fixed Shared Key Limitations

#### สถานะ Shared Key ปัจจุบัน:
```typescript
// cli/modules/encryption.ts (Current)
const SHARED_SECRET_KEY = 'SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS';
```

**ข้อจำกัดที่พบ:**
- **Security Risk**: 1 master key ถอดรหัสได้ทุก license
- **No Regeneration**: ไม่สามารถ generate license เดียวกันซ้ำได้
- **Key Management**: ต้องจัดการ SHARED_SECRET_KEY ใน .env
- **Deployment Complexity**: ต้องส่งทั้ง license.lic และ shared key

### Dynamic Shared Key Solution

#### แนวคิดใหม่:
```typescript
// Dynamic key pattern
const dynamicKey = `${applicationName}_${customerId}_${wifiSsid}_${macAddress}`;
const hashedKey = crypto.createHash('sha256').update(dynamicKey).digest('hex').slice(0, 32);
```

**ข้อดีของ Dynamic Key:**
1. **Per-License Security**: แต่ละ license มี unique encryption key
2. **License Regeneration**: ข้อมูลเดียวกัน → key เดียวกัน → license เดียวกัน  
3. **Expiry Update Capability**: เปลี่ยนได้เฉพาะ expiry date
4. **Self-Contained**: ไม่ต้องจัดการ shared key แยก
5. **Zero Key Management**: ไม่มี master key ที่ต้องป้องกัน

#### ความเป็นไปได้ของ Key Collision:
- **MAC Address**: ESP32 มี globally unique MAC (collision เกือบ 0%)
- **Application + Customer**: ควบคุมด้วย naming policy
- **WiFi SSID**: ควบคุมด้วย convention

## 📋 Implementation Plan

### Phase 1: CLI Encryption Module Update 🔄
**File: `cli/modules/encryption.ts`**
- [ ] ลบ `SHARED_SECRET_KEY` constant
- [ ] เพิ่ม `generateDynamicKey(licenseData)` function
- [ ] อัพเดท `encryptLicenseData()` ใช้ dynamic key
- [ ] อัพเดท `decryptLicenseData()` ใช้ dynamic key generation
- [ ] Checksum ยังคงใช้ expiry date (เพื่อให้เปลี่ยนได้)

### Phase 2: CLI License Generator Update 📋
**File: `cli/modules/license-generator.ts`**
- [ ] อัพเดท `generateLicenseFile()` ใช้ dynamic key
- [ ] อัพเดท `generateSampleLicenseFile()` ใช้ dynamic key
- [ ] ลบการแสดง SHARED_SECRET_KEY ใน console output
- [ ] อัพเดท documentation และ usage messages

### Phase 3: CLI Batch Processing Update 📋
**File: `cli/modules/batch-license-generator.ts`**
- [ ] อัพเดท batch processing ใช้ dynamic key
- [ ] ทดสอบ license regeneration capability
- [ ] ตรวจสอบ CSV batch processing compatibility

### Phase 4: SMC App Integration Update 📋
**File: `scripts/utils/licenseParser.ts`**
- [ ] อัพเดท license parsing ใช้ dynamic key generation
- [ ] ลบ SHARED_SECRET_KEY dependencies
- [ ] ทดสอบ license validation end-to-end

### Phase 5: Testing & Validation 📋
- [ ] ทดสอบ license regeneration (ข้อมูลเดียวกัน → license เดียวกัน)
- [ ] ทดสอบ expiry date update capability
- [ ] ทดสอบ security (per-license encryption)
- [ ] ทดสอบ deployment workflow ใหม่

## 💥 Breaking Changes Summary

### 1. License Format Breaking Change
- **เดิม**: Fixed shared key encryption
- **ใหม่**: Dynamic key จาก license data
- **ผลกระทบ**: ลิขสิทธิ์เก่าใช้ไม่ได้ (ต้อง generate ใหม่)

### 2. Environment Variables Simplification  
- **เดิม**: ต้องมี `SHARED_SECRET_KEY` ใน .env
- **ใหม่**: ไม่ต้องมี environment variable
- **ผลกระทบ**: Deployment เรียบง่ายขึ้น

### 3. Self-Contained License System
- **เดิม**: license.lic + shared key management
- **ใหม่**: license.lic เพียงอย่างเดียว
- **ผลกระทบ**: ลดขั้นตอน deployment

## 🎯 Expected Benefits

### Security Enhancements:
✅ **Per-License Encryption**: แต่ละ license มี unique key  
✅ **No Master Key Risk**: ไม่มี single point of failure  
✅ **Hardware Binding**: ผูกกับ ESP32 MAC address  

### Operational Benefits:  
✅ **License Regeneration**: แก้ไข expiry date ได้  
✅ **Simpler Deployment**: แค่ copy license.lic  
✅ **Zero Key Management**: ไม่ต้องจัดการ master key  

### Development Benefits:
✅ **Deterministic Generation**: input เดียวกัน = output เดียวกัน  
✅ **Enhanced Testing**: regenerate test licenses ได้  
✅ **Reduced Complexity**: ไม่ต้องจัดการ .env files  

## 📊 Implementation Progress

| Phase | Component | Status |
|-------|-----------|--------|
| Phase 1 | CLI Encryption Module | 🔄 In Progress |
| Phase 2 | CLI License Generator | 📋 Pending |
| Phase 3 | CLI Batch Processing | 📋 Pending |
| Phase 4 | SMC App Integration | 📋 Pending |
| Phase 5 | Testing & Validation | 📋 Pending |

### Recovery Strategy:
**Simple & Clean Approach**: ถ้ามีปัญหา → generate license ใหม่ → compile SMC app ใหม่ → deploy
- ไม่ทำ fallback/recovery mechanisms (เพิ่ม complexity ไม่จำเป็น)
- License generator เป็นคนของเราเอง (ควบคุมได้ 100%)
- ESP32 MAC address เป็น hardware unique identifier

---

**หมายเหตุ**: Enhanced build-prep system ✅ COMPLETED, ESP32 API fixes ✅ COMPLETED → **NEW FOCUS**: Dynamic Shared Key Implementation 🔄