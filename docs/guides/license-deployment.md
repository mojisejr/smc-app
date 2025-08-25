# SMC License Deployment Guide - HKDF v2.0 Production System

## Overview

Complete deployment workflow for SMC App with HKDF v2.0 license system. This guide covers the entire process from customer order to delivered application, with emphasis on Windows deployment.

**HKDF v2.0 Benefits:**
- ✅ Enhanced Security: MAC address completely hidden  
- ✅ Self-Contained: No shared key management required
- ✅ License Regeneration: Same input produces same license
- ✅ Payment Control: Update expiry dates without app rebuild

## 🎯 Complete Production Workflow (0 → exe)

### Prerequisites

**Development Environment:**
```bash
# Required software
Node.js v18+ (https://nodejs.org/)
Git (https://git-scm.com/)

# Verify installation
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
git --version   # Any recent version
```

**Hardware Requirements:**
- ESP32 development board (customer deployment)
- USB cable for ESP32 programming
- Windows computer for final deployment (recommended)

### Step 1: Sales Team - ESP32 Deployment

**Location:** `esp32-deployment-tool/`

```bash
# 1. Setup ESP32 deployment tool
cd esp32-deployment-tool/
npm install
npm run dev
# → Opens http://localhost:3000
```

**2. Deploy ESP32 Device:**
- Connect ESP32 to computer via USB
- Fill customer form:
  ```
  Organization: "SMC Medical Center Bangkok"
  Customer ID: "BGK001" 
  Application: "SMC_Cabinet"
  Expiry Date: "2025-12-31" (or check "No Expiry")
  WiFi SSID: "SMC_ESP32_BGK001"
  WiFi Password: "SecurePass123!"
  ```
- Click "Deploy Configuration" → Firmware flashes to ESP32
- Click "Export CSV" → Generates `esp32-deployments-2025-08-25.csv`

**3. Delivery to Development Team:**
- Send CSV file to development team
- Ship ESP32 device to customer site

### Step 2: Development Team - License Generation  

**Location:** `cli/`

```bash
# 1. Setup CLI tool
cd cli/
npm install
npm run build

# 2. Individual license generation
smc-license generate \
  --org "SMC Medical Center Bangkok" \
  --customer "BGK001" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --wifi-ssid "SMC_ESP32_BGK001" \
  --wifi-password "SecurePass123!" \
  --output "BGK001-license.lic"

# 3. OR Batch processing (recommended for multiple customers)
smc-license batch \
  --input ../esp32-deployment-tool/exports/esp32-deployments-2025-08-25.csv \
  --update-csv

# 4. Verify license created
smc-license validate --file BGK001-license.lic
smc-license info --file BGK001-license.lic
```

**Output Files:**
- `BGK001-license.lic` - Customer license file
- Updated CSV with license_status="completed"

### Step 3: SMC App Build Process

**Location:** Project root

```bash
# 1. Prepare build environment  
npm run build-prep --license=./cli/BGK001-license.lic

# What this does:
# - Resets database with clean schema
# - Extracts organization/customer data from license  
# - Updates database with license information
# - Removes license file from build (security)

# 2. Build Windows application
npm run build:ds12

# 3. Verify build output
ls dist/
# Should contain: SMC Setup 1.0.0.exe
```

**Build Output (Windows):**
```
dist/
├── SMC Setup 1.0.0.exe     # Windows installer  
├── win-unpacked/           # Portable application
│   ├── SMC.exe
│   ├── resources/
│   │   ├── app.asar        # Application code
│   │   └── db/database.db  # Pre-configured database
└── ...
```

### Step 4: Packaging for Delivery

```bash
# 1. Create delivery package
mkdir delivery-BGK001
cp dist/"SMC Setup 1.0.0.exe" delivery-BGK001/
cp cli/BGK001-license.lic delivery-BGK001/

# 2. Create instruction file
cat > delivery-BGK001/INSTALLATION.txt << 'EOF'
SMC Application Installation - Customer BGK001

STEP 1: Install Application
- Run "SMC Setup 1.0.0.exe" as Administrator
- Follow installation wizard
- Application will install to C:\Program Files\SMC\

STEP 2: License Activation  
- Copy "BGK001-license.lic" to application folder:
  C:\Program Files\SMC\resources\BGK001-license.lic
- Start SMC application
- License will activate automatically

STEP 3: ESP32 Connection
- Connect ESP32 device to customer network
- ESP32 should be accessible at network IP
- SMC app will automatically validate hardware binding

Support: [your-support-email]
EOF

# 3. Create ZIP package
zip -r SMC-BGK001-Production.zip delivery-BGK001/
```

**Final Delivery Package:**
- `SMC Setup 1.0.0.exe` - Windows installer
- `BGK001-license.lic` - Customer license file  
- `INSTALLATION.txt` - Installation instructions

### Step 5: Customer Site Deployment

**Installation Process:**

1. **Install SMC Application:**
   ```cmd
   # Run as Administrator on customer Windows machine
   SMC Setup 1.0.0.exe
   ```

2. **Deploy License File:**
   ```cmd
   # Copy license to application resources
   copy BGK001-license.lic "C:\Program Files\SMC\resources\license.lic"
   ```

3. **ESP32 Network Setup:**
   - Connect ESP32 to customer WiFi network
   - Verify ESP32 gets IP address (DHCP)
   - Test connectivity: `ping [ESP32-IP]`

4. **Application Startup:**
   - Launch SMC Application
   - Application automatically:
     - Loads license file
     - Validates MAC address against ESP32
     - Activates system if validation passes

## 🔒 HKDF v2.0 Security Features

### License File Structure
```json
{
  "version": "2.0.0",
  "encrypted_data": "base64_encrypted_license_content",
  "algorithm": "aes-256-cbc", 
  "created_at": "2025-08-25T10:30:00.000Z",
  "kdf_context": {
    "salt": "deterministic_salt_hash",
    "info": "SMC_LICENSE_KDF_v1.0|SMC_Cabinet|BGK001|2025-12-31|1.0.0",
    "algorithm": "hkdf-sha256"
  }
}
```

**Security Enhancements:**
- **MAC Address Hidden**: Never stored in plain text
- **Per-License Encryption**: Each license has unique encryption key
- **Hardware Binding**: Key derivation includes ESP32 MAC address
- **Self-Contained**: No separate shared key management

### License Validation Process

1. **Application Startup**: SMC app loads `license.lic`
2. **Key Derivation**: Uses HKDF to generate decryption key from:
   - Application ID + Customer ID + Expiry Date (from KDF context)
   - MAC address + WiFi SSID (from ESP32 runtime)
3. **Decryption**: Decrypt license content using derived key
4. **Validation**: Verify organization, customer, and expiry date
5. **Hardware Binding**: Confirm MAC address matches ESP32
6. **Activation**: Grant system access if all validations pass

## 🛠 License Management Commands

### Core CLI Commands

```bash
# Generate new license (requires ESP32 MAC address)
smc-license generate \
  --org "Organization Name" \
  --customer "CUSTOMER_ID" \
  --app "Application_Name" \
  --expiry "YYYY-MM-DD" \
  --wifi-ssid "WiFi_Name" \
  --wifi-password "WiFi_Password" \
  --output "customer-license.lic"

# Test mode (no ESP32 required - for development)  
smc-license generate --test-mode \
  --org "Test Hospital" --customer "TEST001" \
  --app "TestApp" --expiry "2025-12-31" \
  --wifi-ssid "TestWiFi" --wifi-password "testpass123" \
  --output "test-license.lic"

# Validate license file
smc-license validate --file license.lic

# Show license information (no decryption needed)
smc-license info --file license.lic

# Update license expiry date (payment control)
smc-license update-expiry --file license.lic --new-expiry "2026-12-31"

# Batch process multiple customers
smc-license batch --input customers.csv --update-csv
```

### Registry Management

```bash
# Initialize daily registry
smc-license registry init

# Add license to registry
smc-license registry add --file BGK001-license.lic

# Update license status 
smc-license registry update-expiry --customer BGK001 --new-expiry "2026-12-31"

# Export registry report
smc-license registry export --format csv --output daily-report.csv

# Show registry statistics
smc-license registry stats
```

### ESP32 Testing

```bash
# Test ESP32 connectivity
smc-license test-esp32 --ip 192.168.1.100

# Get ESP32 MAC address
curl http://192.168.1.100/mac

# Check ESP32 health  
curl http://192.168.1.100/health
```

## 📋 Production Deployment Checklist

### Pre-Deployment Validation
- [ ] ESP32 device deployed and connected to customer network
- [ ] ESP32 responding to HTTP requests (test /health and /mac endpoints)
- [ ] Customer license generated with correct MAC address
- [ ] License validated successfully: `smc-license validate --file license.lic`
- [ ] SMC App built with production configuration
- [ ] Database pre-configured with customer organization data

### Installation Checklist
- [ ] SMC Application installer runs without errors
- [ ] License file copied to correct location (`resources/license.lic`)
- [ ] Application starts successfully
- [ ] License activation completes (check "System Status" in app)
- [ ] ESP32 hardware binding validation passes
- [ ] All medication cabinet functions accessible

### Post-Installation Verification  
- [ ] License system shows "ACTIVATED" status
- [ ] ESP32 connection established (green status indicator)
- [ ] Hardware MAC address validation successful
- [ ] License expiry date displayed correctly
- [ ] Database contains customer organization information
- [ ] All dispensing functions work as expected

## 🔧 Troubleshooting

### License File Issues

**Problem:** License file not found
```bash
# Check file location
ls -la "C:\Program Files\SMC\resources\license.lic"

# Alternative: Set custom path via environment
set SMC_LICENSE_FILE_PATH=C:\path\to\license.lic

# Verify file permissions (Windows)
icacls "C:\Program Files\SMC\resources\license.lic"
```

**Problem:** License parsing failed / Invalid format
```bash
# Validate license structure
smc-license validate --file license.lic

# Check file integrity
smc-license info --file license.lic

# Common cause: File corruption during transfer
# Solution: Re-copy license file from original source
```

**Problem:** License expired
```bash
# Check license expiry
smc-license info --file license.lic

# Generate updated license (same MAC address, new expiry)
smc-license update-expiry --file license.lic --new-expiry "2026-12-31"

# Emergency: Generate temporary license
smc-license generate --test-mode --no-expiry [other-options]
```

### ESP32 Connection Issues

**Problem:** ESP32 not responding
```bash
# Scan network for ESP32 devices  
nmap -p 80 192.168.1.0/24

# Test specific IP addresses
ping 192.168.1.100
curl http://192.168.1.100/health

# Check ESP32 WiFi connection
# Verify ESP32 is connected to same network as SMC computer
```

**Problem:** MAC address mismatch  
```bash
# Get current ESP32 MAC address
curl http://[ESP32-IP]/mac
# Response: {"mac": "AA:BB:CC:DD:EE:FF"}

# Generate new license with correct MAC address
smc-license generate [options] # Use MAC from curl response

# Alternative: Replace ESP32 with same MAC address device
```

**Problem:** Network timeout / Connection refused
```bash
# Check Windows Firewall
# Add SMC Application to firewall exceptions

# Test network connectivity
ping [ESP32-IP]
telnet [ESP32-IP] 80

# ESP32 troubleshooting:
# 1. Power cycle ESP32 device
# 2. Check WiFi credentials in ESP32 configuration  
# 3. Verify router DHCP settings
# 4. Check for IP address conflicts
```

### Application Issues

**Problem:** System not activated
```bash
# Check license activation status in SMC App
# Look for "License Status: ACTIVATED" in System Settings

# Manual database check (if needed)
sqlite3 "C:\Program Files\SMC\resources\db\database.db" \
  "SELECT * FROM Settings WHERE key='license_status';"

# Re-run license activation
# Restart SMC Application - it will retry license validation
```

**Problem:** Database connection errors
```bash
# Verify database file exists
ls -la "C:\Program Files\SMC\resources\db\database.db"

# Check database schema
sqlite3 database.db ".schema"

# Reset database (if corrupted)
npm run build-prep --license=license.lic
```

**Problem:** Hardware communication failed
```bash
# Check DS12/DS16 device settings
# Verify correct device type in build configuration

# Test serial port connection (if applicable)
# Check USB/RS485 connections to medication cabinet

# Review application logs for hardware errors
# Check SMC App → Logs → System Events
```

## 🚀 Advanced Deployment Scenarios

### Multiple Customer Deployment

**Batch License Generation:**
```bash
# Prepare customer CSV file
cat > customers.csv << 'EOF'
organization,customer_id,application_name,expiry_date,wifi_ssid,wifi_password
"Hospital A","HOSP001","SMC_Cabinet","2025-12-31","SMC_ESP32_HOSP001","Pass123!"
"Clinic B","CLIN002","SMC_Cabinet","2025-12-31","SMC_ESP32_CLIN002","Secure456!"
"Medical Center C","MED003","SMC_Cabinet","2026-06-30","SMC_ESP32_MED003","Strong789!"
EOF

# Generate all licenses
smc-license batch --input customers.csv --update-csv

# Result: Creates HOSP001-license.lic, CLIN002-license.lic, MED003-license.lic
```

**Multiple Build Process:**
```bash
# Build for each customer
for license in *.lic; do
  customer=$(echo $license | cut -d'-' -f1)
  echo "Building for customer: $customer"
  
  npm run build-prep --license=$license
  npm run build:ds12
  
  # Package for delivery
  mkdir delivery-$customer
  cp dist/"SMC Setup 1.0.0.exe" delivery-$customer/
  cp $license delivery-$customer/
  zip -r SMC-$customer-Production.zip delivery-$customer/
done
```

### License Renewal Process

**Standard Renewal (extend expiry):**
```bash
# Update existing license with new expiry date
smc-license update-expiry \
  --file BGK001-license.lic \
  --new-expiry "2026-12-31"

# Verify update
smc-license info --file BGK001-license.lic

# Deploy to customer (replace existing license file)
# Customer application will automatically reload new license
```

**Emergency Renewal (expired license):**
```bash
# Generate temporary permanent license
smc-license generate --no-expiry \
  --org "SMC Medical Center Bangkok" \
  --customer "BGK001" \
  --app "SMC_Cabinet" \
  --wifi-ssid "SMC_ESP32_BGK001" \
  --wifi-password "SecurePass123!" \
  --output "BGK001-emergency.lic"

# Deploy immediately to customer
# Follow up with properly dated license later
```

### Custom Application Builds

**Customer-Specific Configuration:**
```bash
# Create custom environment for customer
cat > .env.bgk001 << 'EOF'
SMC_DEVICE_TYPE=DS12
SMC_CUSTOMER_ID=BGK001
SMC_HOSPITAL_NAME="SMC Medical Center Bangkok"
SMC_SUPPORT_EMAIL="support@smc-medical.com"
SMC_TIMEZONE="Asia/Bangkok"
EOF

# Build with custom configuration
cp .env.bgk001 .env
npm run build-prep --license=BGK001-license.lic
npm run build:ds12
```

## 📞 Support & Maintenance

### Production Monitoring

**License Status Monitoring:**
```bash
# Check license system health
smc-license registry stats

# Generate monthly reports
smc-license registry export --format csv \
  --start-date "2025-08-01" \
  --end-date "2025-08-31" \
  --output "august-2025-report.csv"
```

**Customer Support:**
```bash
# Diagnose customer license issues
smc-license validate --file customer-license.lic --verbose

# Check ESP32 connectivity from remote
curl http://[customer-esp32-ip]/health

# Generate diagnostic report
smc-license generate-report --customer BGK001
```

### Backup & Recovery

**License Backup:**
```bash
# Backup all customer licenses
mkdir license-backup-$(date +%Y%m%d)
cp *.lic license-backup-$(date +%Y%m%d)/
tar -czf license-backup-$(date +%Y%m%d).tar.gz license-backup-$(date +%Y%m%d)/
```

**Database Recovery:**
```bash
# If customer database corrupted, rebuild from license
npm run build-prep --license=customer-license.lic

# This recreates database with correct customer data
```

---

**Production Status:** HKDF v2.0 System Ready ✅  
**Last Updated:** August 2025  
**Compatible With:** SMC Application v2.0.0+  
**License System:** HKDF v2.0 (Enhanced Security)