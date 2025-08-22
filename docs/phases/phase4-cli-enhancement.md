# Phase 4.6: SMC App Production Build & License Validation (CURRENT FOCUS)

**สถานะ:** 🔧 **ACTIVE - Production Build System Implementation**  
**เป้าหมาย:** SMC App production-ready build with license validation และ debugging

## 🏆 PROJECT STATUS OVERVIEW

### **✅ COMPLETED PHASES (Phase 4.1-4.5):**
- **CLI Tool**: smc-license-cli v1.0.0 - JSON input, CSV batch processing ✅
- **ESP32 Deployment Tool**: v0.1.0 - Cross-platform, no-expiry support ✅  
- **Complete Sales→Developer→Delivery Workflow** ✅

### **🔧 PHASE 4.6 CURRENT FOCUS:**
Production build system for SMC App with integrated license validation

---

## 🏗 CURRENT IMPLEMENTATION STATUS

### **✅ COMPLETED Components:**

#### **1. Build Preparation Script** - `scripts/build-prep.ts` ✅
```bash
npm run build-prep          # Database + organization setup
npm run build-prep:ds12      # DS12-specific configuration
npm run build:production:ds12 # Complete DS12 production build
```

**Key Functions:**
- ✅ **parseBuildConfiguration()** - อ่าน ORGANIZATION_NAME, DEVICE_TYPE จาก env
- ✅ **cleanDatabase()** - ลบ database เก่า + สร้างใหม่ใน resources/db/
- ✅ **setupOrganizationData()** - ใส่ default admin user + organization settings
- ✅ **prepareResourcesDirectory()** - สร้าง license placeholder + build-info.json
- ✅ **validateBuildReadiness()** - ตรวจสอบ database tables + resources structure

#### **2. Database Schema** - SQLite Tables ✅
```sql
-- Production database schema in resources/db/database.db
User (id, name, role, passkey)
Setting (organization, device_type, ku_port, ku_baudrate, available_slots, etc.)
Slot (slotId, hn, occupied, opening, isActive) 
Log (user, message, createdAt)
DispensingLog (timestamp, userId, slotId, hn, process, message)
```

#### **3. Resources Directory Structure** ✅
```
resources/
├── db/
│   └── database.db          # Production SQLite database
├── build-info.json          # Build metadata
└── license-placeholder.txt  # License installation guide
```

**Build Info Content:**
```json
{
  "buildDate": "2025-08-22T16:28:19.789Z",
  "buildVersion": "1.0.0", 
  "deviceType": "DS12",
  "platform": "darwin",
  "nodeVersion": "v20.19.3",
  "organizationSetup": true,
  "databaseInitialized": true
}
```

---

## 🔧 DEBUG FOCUS AREAS (Phase 4.6)

### **1. License Integration Testing**
```bash
# Generate license using CLI
cd cli/
smc-license generate -o "SMC Medical" -c "TEST001" -a "SMC_Cabinet" 
  --expiry "2025-12-31" --output ../resources/license.lic

# Test SMC App license loading
cd ..
npm run dev:ds12  # Should load license from resources/
```

**Expected Behavior:**
- SMC App โหลด license.lic จาก resources/ directory
- Validate license กับ organization data ในฐานข้อมูล
- แสดงสถานะ license activation ใน UI

### **2. Production Build Validation**
```bash
# Complete production workflow
npm run build-prep:ds12           # Setup database + organization
cp cli/license.lic resources/     # Copy generated license
npm run build:ds12                # Build SMC App
```

**Validation Checklist:**
- [ ] Database initialized with correct schema
- [ ] Organization data matches license
- [ ] Default admin user created (admin1/admin1)
- [ ] Device-specific slot count (DS12: 12 slots, DS16: 15 slots)
- [ ] License file properly loaded and validated

### **3. Database Schema Debug**
```sql
-- Check table structure
SELECT name FROM sqlite_master WHERE type='table';

-- Verify organization setup
SELECT * FROM Setting WHERE id = 1;

-- Check slot initialization 
SELECT COUNT(*) as slot_count FROM Slot;

-- Verify admin user
SELECT * FROM User WHERE role = 'admin';
```

### **4. License Validation Debug**
**Common Issues:**
- License file not found in resources/
- SHARED_SECRET_KEY mismatch between CLI and SMC App
- Organization name mismatch
- MAC address validation failures

**Debug Commands:**
```bash
# Validate license file
smc-license validate -f resources/license.lic

# Check license info
smc-license info -f resources/license.lic

# Test license system
npm run validate:license-system
```

---

## 🧪 TESTING SCENARIOS (Phase 4.6)

### **Scenario 1: Clean Production Build**
```bash
# 1. Clean start
rm -rf resources/
rm -f database.db

# 2. Run build preparation  
ORGANIZATION_NAME="Bangkok Hospital" npm run build-prep:ds12

# 3. Generate license for organization
cd cli/
smc-license generate -o "Bangkok Hospital" -c "BGK001" 
  --output ../resources/license.lic

# 4. Build and test
cd ..
npm run build:ds12
```

### **Scenario 2: License Mismatch Testing**
```bash
# Generate license with different organization
smc-license generate -o "Different Hospital" -c "DIFF001" 
  --output resources/license-wrong.lic

# Test SMC App behavior with mismatched license
```

### **Scenario 3: Database Recovery Testing**
```bash
# Corrupt database intentionally
echo "corrupted" > resources/db/database.db

# Test build-prep recovery
npm run build-prep:ds12
```

---

## 🐛 TROUBLESHOOTING GUIDE

### **License Loading Issues:**
- ✅ Check license file exists: `resources/license.lic`
- ✅ Verify SHARED_SECRET_KEY consistency between CLI and App
- ✅ Confirm organization name matches between license and database
- ✅ Test license decryption manually

### **Database Issues:**
- ✅ Check database file: `resources/db/database.db`
- ✅ Verify table schema matches expected structure
- ✅ Confirm default data insertion (admin user, organization)
- ✅ Test database permissions and file access

### **Build Process Issues:**
- ✅ Verify Node.js version compatibility (v16+)
- ✅ Check npm dependencies installation
- ✅ Validate environment variables (DEVICE_TYPE, ORGANIZATION_NAME)
- ✅ Test TypeScript compilation

---

## 📋 PHASE 4.6 SUCCESS CRITERIA

### **Production Build System:**
- [ ] **Build Commands**: npm run build:production:ds12 ทำงานสมบูรณ์
- [ ] **Database Setup**: สร้าง database + organization data อัตโนมัติ
- [ ] **License Integration**: โหลด license.lic จาก resources/ ได้
- [ ] **Error Handling**: แสดง error messages ที่เป็นประโยชน์เมื่อ license หาไม่เจอ

### **License Validation System:**
- [ ] **File Loading**: อ่าน license.lic จาก resources/ directory
- [ ] **Decryption**: ถอดรหัส license ด้วย SHARED_SECRET_KEY
- [ ] **Validation**: ตรวจสอบ organization, expiry date, MAC address
- [ ] **UI Feedback**: แสดงสถานะ license activation ใน SMC App

### **Debug & Monitoring:**
- [ ] **Build Logs**: แสดง detailed logs ระหว่าง build process
- [ ] **Validation Tools**: npm scripts สำหรับตรวจสอบ license system
- [ ] **Recovery**: กู้คืนได้เมื่อ database หรือ license เสียหาย

---

## 🎯 NEXT STEPS

1. **Complete License Integration** - เชื่อมต่อ SMC App กับ CLI-generated licenses
2. **End-to-End Testing** - ทดสอบ complete workflow จาก build ถึง deployment
3. **Production Packaging** - เตรียม final .exe + resources สำหรับ deployment
4. **Documentation Update** - สร้าง production deployment guide

---

**Current Files:**
- ✅ `/scripts/build-prep.ts` - Production build script
- ✅ `/resources/build-info.json` - Build metadata
- ✅ `/resources/db/database.db` - Production database
- 🔧 License validation integration (IN PROGRESS)