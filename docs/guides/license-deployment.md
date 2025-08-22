# SMC License Deployment Guide

## Overview

คู่มือการ deploy license system สำหรับ SMC App โดยใช้ CLI-generated license files และ ESP32 hardware binding

## 🚀 Complete Deployment Workflow

### Phase 1: Sales Team (ESP32 Deployment Tool)
```bash
cd esp32-deployment-tool/
npm run dev
```

1. **กรอกข้อมูลลูกค้า**:
   - Organization: "SMC Medical Center"
   - Customer ID: "HOSP001" 
   - Application: "SMC_Cabinet"
   - Expiry Date: "2025-12-31" (หรือใช้ checkbox "No Expiry")
   - WiFi SSID: "SMC_ESP32_HOSP001"
   - WiFi Password: "SecurePass123!"

2. **Deploy ESP32 และ Export**:
   - Connect ESP32 device
   - Deploy firmware + configuration
   - Export CSV: `esp32-deployments-2025-08-22.csv`

### Phase 2: Developer (CLI License Generation)
```bash
# Individual license generation
cd cli/
smc-license generate -o "SMC Medical Center" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" --wifi-ssid "SMC_ESP32_HOSP001" --wifi-password "SecurePass123!"

# Batch processing (from ESP32 CSV)
smc-license batch --input ../esp32-deployment-tool/exports/esp32-deployments-2025-08-22.csv --update-csv

# No expiry licenses
smc-license batch --input permanent-licenses.csv --no-expiry --update-csv
```

### Phase 3: Build Process (SMC App)
```bash
cd ../

# Prepare production build
npm run build-prep:ds12

# Copy license file
cp cli/output-licenses/HOSP001-license.lic resources/license.lic

# Build production app
npm run build:production:ds12
```

### Phase 4: Delivery Team
```bash
# Package for delivery
# Windows: dist/SMC Setup 1.0.0.exe + license.lic
# macOS: dist/SMC-1.0.0.dmg (license embedded)
# Linux: dist/SMC-1.0.0.AppImage + license.lic
```

## 🔒 License Security Features

### Hardware Binding
- **MAC Address**: License bound to specific ESP32 device
- **Encryption**: AES-256-CBC encryption ด้วย shared secret key
- **Expiry Date**: Configurable expiry date หรือ permanent license
- **Organization Data**: ข้อมูลองค์กรและลูกค้าที่เฉพาะเจาะจง

### Production Environment
- **License File Location**: `resources/license.lic` (automatic detection)
- **Database Integration**: License activation status ใน SQLite
- **ESP32 Validation**: Real-time MAC address verification
- **Network Retry**: Manual network management UI

## 🛠 License Management Commands

### License Generation
```bash
# Standard license
smc-license generate -o "Hospital" -c "H001" -a "SMC_Pro" -e "2025-12-31" --wifi-ssid "WIFI" --wifi-password "Pass123"

# Test mode (no ESP32 required)
smc-license generate --test-mode --bypass-password-check -o "Test" -c "TEST" -a "Test" -e "2025-12-31" --wifi-ssid "TEST" --wifi-password "test123"

# Permanent license (no expiry)
smc-license batch --input licenses.csv --no-expiry
```

### License Validation
```bash
# Check license file
smc-license validate -f license.lic

# Show license details
smc-license info -f license.lic

# Test ESP32 connection
smc-license test-esp32 --ip 192.168.4.1
```

### Shared Secret Key Management
```bash
# Show encryption key
smc-license show-key

# Export to .env file
smc-license export-env --output .env
```

## 📋 Production Deployment Checklist

### Pre-Deployment
- [ ] ✅ ESP32 device deployed with firmware
- [ ] ✅ Customer network configuration complete
- [ ] ✅ License file generated with correct MAC address
- [ ] ✅ SMC App built with production configuration
- [ ] ✅ License file copied to `resources/license.lic`

### Deployment
- [ ] ✅ SMC App installed on customer computer
- [ ] ✅ License file in correct location
- [ ] ✅ ESP32 device connected to customer network
- [ ] ✅ License activation successful (no database errors)

### Post-Deployment Validation
- [ ] ✅ License system shows "OK" status
- [ ] ✅ ESP32 connection successful
- [ ] ✅ MAC address validation passes
- [ ] ✅ License expiry date correct
- [ ] ✅ All SMC App functions working

## 🔧 Troubleshooting

### License File Issues
**Problem**: License file not found
```bash
# Solution 1: Check file location
ls -la resources/license.lic

# Solution 2: Set custom path
export SMC_LICENSE_FILE_PATH=/path/to/license.lic

# Solution 3: Copy to correct location
cp license.lic resources/license.lic
```

**Problem**: License parsing failed
```bash
# Check license file format
smc-license validate -f license.lic

# Verify encryption key
smc-license show-key
```

### ESP32 Connection Issues
**Problem**: MAC address mismatch
```bash
# Test ESP32 connection
smc-license test-esp32 --ip 192.168.4.1

# Generate new license with correct MAC
smc-license generate [options] # Use MAC from test output
```

**Problem**: Network timeout
```bash
# Scan for ESP32 devices
smc-license test-esp32 --ip 192.168.1.100
smc-license test-esp32 --ip 10.0.0.1

# Use network retry dialog in SMC App
```

### Database Issues
**Problem**: System not activated
```bash
# Re-run build preparation
npm run build-prep:ds12

# Check database structure
sqlite3 resources/db/database.db ".schema"

# Manual activation (if needed)
sqlite3 resources/db/database.db "UPDATE Settings SET activated_key='CLI_LICENSE_ACTIVATED' WHERE id=1;"
```

## 🌐 Network Configuration

### WiFi Settings
- **SSID Format**: `SMC_ESP32_{CUSTOMER_ID}_{DEVICE_ID}`
- **Password Requirements**: 8+ characters, mixed case, numbers, symbols
- **ESP32 IP**: Usually 192.168.4.1 (AP mode) หรือ DHCP assigned

### Network Diagnostics
```bash
# Test network connectivity
ping 192.168.4.1

# Test HTTP endpoints
curl http://192.168.4.1/health
curl http://192.168.4.1/mac

# Scan for devices
nmap -sn 192.168.1.0/24
```

## 🔄 License Renewal Process

### Standard Renewal
1. **Generate New License**: ใช้ same MAC address, new expiry date
2. **Update License File**: Replace existing `license.lic`
3. **Restart SMC App**: License จะ reload อัตโนมัติ

### Emergency Renewal (Expired License)
```bash
# Generate emergency license
smc-license generate --no-expiry -o "Customer" -c "ID" -a "App" --wifi-ssid "SSID" --wifi-password "Pass"

# Deploy immediately
cp license.lic resources/license.lic
# Restart SMC App
```

## 📊 Monitoring & Maintenance

### License Status Monitoring
```bash
# Check license system
npm run validate:license-system

# Production validation
npx ts-node -e "import('./main/license/validator').then(m => m.validateLicenseForProduction().then(r => console.log('Status:', r)))"
```

### Logs & Audit Trail
- **License Validation**: ดูใน SMC App logs
- **ESP32 Connection**: ดูใน network diagnostics
- **Database Activity**: ดูใน `Logs` table

### Backup & Recovery
```bash
# Backup license and database
cp resources/license.lic license-backup.lic
cp resources/db/database.db database-backup.db

# Recovery
cp license-backup.lic resources/license.lic
npm run build-prep:ds12
```

## 📞 Support Contacts

### Technical Issues
1. **License Generation**: Check CLI documentation (`cli/README.md`)
2. **ESP32 Hardware**: Check ESP32 deployment guide
3. **SMC App Issues**: Check system architecture docs
4. **Build Problems**: Check production build guide

### Emergency Support
- **License Expired**: Use `--no-expiry` flag for temporary fix
- **Hardware Failure**: Generate new license with replacement MAC
- **Network Issues**: Use network retry dialog in SMC App
- **Database Corruption**: Re-run `npm run build-prep:ds12`