# SMC Development Workflow Guide - HKDF v2.0

## Overview

Complete development setup guide for SMC App with HKDF v2.0 license system. This guide covers everything from initial setup to daily development workflow, including database reset and license testing.

## 🚀 Quick Start (0 → dev-reset → npm run dev)

### Complete Setup from Scratch

**Prerequisites:**
```bash
# Required software
Node.js v18+ (https://nodejs.org/)
Git (https://git-scm.com/)

# Verify installation
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
git --version   # Any recent version
```

**Step 1: Clone and Setup Project**
```bash
# Clone repository
git clone [repository-url]
cd smc-app

# Install dependencies
npm install

# Verify setup
npm run --help | grep -E "(dev|build|test)"
```

**Step 2: Generate Development License**
```bash
# Navigate to CLI
cd cli/

# Install CLI dependencies  
npm install
npm run build

# Generate test license (no ESP32 required)
smc-license generate --test-mode \
  --org "SMC Medical Test Center" \
  --customer "TEST_DEV_001" \
  --app "SMC_Cabinet_Dev" \
  --expiry "2025-12-31" \
  --wifi-ssid "SMC_Test_WiFi" \
  --wifi-password "TestPass123!" \
  --output "dev-license.lic" \
  --bypass-password-check

# Verify license created
smc-license validate --file dev-license.lic
smc-license info --file dev-license.lic

# Return to project root
cd ../
```

**Step 3: Development Database Reset**
```bash
# Reset database with license data
npm run dev-reset -- --license=./cli/dev-license.lic

# What this does:
# ✅ Resets SQLite database with clean schema
# ✅ Extracts organization/customer data from license
# ✅ Populates database with license information  
# ✅ Creates test data for development
# ✅ KEEPS license file for testing (unlike build-prep)
```

**Step 4: Start Development Server**
```bash
# Start development server for DS12 (12-slot cabinet)
npm run dev:ds12

# OR for DS16 (16-slot cabinet) - if supported
npm run dev:ds16

# Application opens at http://localhost:8000
# License should activate automatically
```

**Success Indicators:**
- ✅ Application starts without errors
- ✅ License status shows "ACTIVATED" in System Settings  
- ✅ Organization name appears as "SMC Medical Test Center"
- ✅ Customer ID shows "TEST_DEV_001"
- ✅ Database contains test slot data
- ✅ All medication cabinet functions accessible

## 🛠 Daily Development Workflow

### Quick Development Reset

**When you need to reset database:**
```bash
# Quick reset with existing license
npm run dev-reset -- --license=./cli/dev-license.lic

# Start development  
npm run dev:ds12
```

**When you need new test data:**
```bash
# Generate new test license (different customer)
cd cli/
smc-license generate --test-mode \
  --org "Test Hospital $(date +%H%M)" \
  --customer "TEST_$(date +%H%M)" \
  --app "TestApp" \
  --expiry "2025-12-31" \
  --wifi-ssid "TestWiFi_$(date +%H%M)" \
  --wifi-password "TestPass123!" \
  --output "test-$(date +%H%M).lic" \
  --bypass-password-check

cd ../
npm run dev-reset -- --license=./cli/test-$(date +%H%M).lic
npm run dev:ds12
```

### Development License Testing

**Test License Generation:**
```bash
cd cli/

# Basic test license
smc-license generate --test-mode \
  --org "Test Organization" \
  --customer "TEST001" \
  --app "TestApp" \
  --expiry "2025-12-31" \
  --wifi-ssid "TestWiFi" \
  --wifi-password "testpass123" \
  --output "basic-test.lic" \
  --bypass-password-check

# Permanent license (no expiry)
smc-license generate --test-mode --no-expiry \
  --org "Permanent Test" \
  --customer "PERM001" \
  --app "PermApp" \
  --wifi-ssid "PermWiFi" \
  --wifi-password "permpass123" \
  --output "permanent-test.lic" \
  --bypass-password-check

# Short expiry license (for testing renewal)
smc-license generate --test-mode \
  --org "Short Test" \
  --customer "SHORT001" \
  --app "ShortApp" \
  --expiry "2025-09-01" \
  --wifi-ssid "ShortWiFi" \
  --wifi-password "shortpass123" \
  --output "short-test.lic" \
  --bypass-password-check
```

**Test License Commands:**
```bash
# Validate licenses
smc-license validate --file basic-test.lic
smc-license validate --file permanent-test.lic
smc-license validate --file short-test.lic

# Show license information
smc-license info --file basic-test.lic
smc-license info --file permanent-test.lic

# Test expiry update
smc-license update-expiry --file short-test.lic --new-expiry "2026-01-01"
smc-license info --file short-test.lic  # Verify update

# Test registry functions
smc-license registry init
smc-license registry add --file basic-test.lic
smc-license registry add --file permanent-test.lic
smc-license registry stats
smc-license registry export --format csv --output dev-registry.csv
```

## 🧪 Development Testing Patterns

### Database Reset Patterns

**Clean Development Reset:**
```bash
# Complete reset - removes all data
npm run dev-reset -- --license=./cli/dev-license.lic

# Verify reset was successful
sqlite3 resources/db/database.db "SELECT * FROM Settings LIMIT 5;"
sqlite3 resources/db/database.db "SELECT COUNT(*) FROM Slots;"
```

**Preserve Logs Reset (if needed):**
```bash
# Reset but keep system logs for debugging
npm run dev-reset -- --license=./cli/dev-license.lic --preserve-logs

# Check logs preserved
sqlite3 resources/db/database.db "SELECT COUNT(*) FROM Logs;"
```

### License Validation Testing

**Test Different License Scenarios:**
```bash
# Test valid license
npm run dev-reset -- --license=./cli/dev-license.lic
npm run dev:ds12
# Expected: Application starts, license activates

# Test expired license
cd cli/
smc-license generate --test-mode \
  --org "Expired Test" --customer "EXP001" --app "ExpApp" \
  --expiry "2020-01-01" \
  --wifi-ssid "ExpWiFi" --wifi-password "exppass123" \
  --output "expired-test.lic" --bypass-password-check

cd ../
npm run dev-reset -- --license=./cli/expired-test.lic
npm run dev:ds12
# Expected: License validation fails, system not activated

# Test corrupted license (manual corruption for testing)
cd cli/
cp dev-license.lic corrupted-test.lic
echo "corrupted" >> corrupted-test.lic

cd ../
npm run dev-reset -- --license=./cli/corrupted-test.lic  
# Expected: License parsing fails with clear error message
```

### ESP32 Mock Testing

**Development without ESP32 Hardware:**
```bash
# Development mode uses mock MAC address (AA:BB:CC:DD:EE:FF)
# All test licenses generated with --test-mode use this MAC

# Start development
npm run dev:ds12

# Check ESP32 integration features
# - License activation should work with mock MAC
# - ESP32 connection status may show "Development Mode"
# - Hardware binding validation uses mock data
```

**Mock ESP32 Server (if needed):**
```bash
# Simple mock server for ESP32 endpoints
cat > mock-esp32-server.js << 'EOF'
const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/mac') {
    res.writeHead(200);
    res.end(JSON.stringify({ mac: 'AA:BB:CC:DD:EE:FF' }));
  } else if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', device: 'mock-esp32' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(3001, () => {
  console.log('Mock ESP32 server running on http://localhost:3001');
  console.log('Test: curl http://localhost:3001/mac');
  console.log('Test: curl http://localhost:3001/health');
});
EOF

# Run mock server
node mock-esp32-server.js
```

## 📁 Development File Structure

### License Files Organization
```
cli/
├── dev-license.lic              # Main development license
├── test-*.lic                   # Various test scenarios
├── expired-test.lic            # For testing expiry handling
├── permanent-test.lic          # For testing no-expiry licenses
└── registry/
    ├── license-registry-*.csv  # Daily registry files
    └── dev-registry.csv        # Development registry export

resources/
├── db/
│   ├── database.db             # Development database
│   └── *.db.dev-backup.*       # Automatic backups
└── license.lic                 # Current license (symlink or copy)
```

### Development Environment Files
```
.env                            # Active environment (copied from .env.ds12/.env.ds16)
.env.ds12                       # DS12 development configuration
.env.ds16                       # DS16 development configuration (if supported)
.env.development                # Development-specific settings
```

## 🔧 Development Configurations

### Environment Variables for Development

**Create .env.development:**
```bash
cat > .env.development << 'EOF'
# Development Configuration
NODE_ENV=development
SMC_DEVELOPMENT_MODE=true

# Database
SMC_DB_PATH=resources/db/database.db
SMC_DB_BACKUP_ENABLED=true

# License System  
SMC_LICENSE_FILE_PATH=resources/license.lic
SMC_LICENSE_VALIDATION_STRICT=false
SMC_BYPASS_ESP32_VALIDATION=true

# Logging
SMC_LOG_LEVEL=debug
SMC_ENABLE_SQL_LOGGING=true

# Hardware (Development)
SMC_MOCK_HARDWARE_ENABLED=true
SMC_MOCK_ESP32_MAC=AA:BB:CC:DD:EE:FF
SMC_HARDWARE_SIMULATION=true

# UI Development
SMC_HOT_RELOAD=true
SMC_SHOW_DEBUG_INFO=true
EOF
```

### Package.json Development Scripts

**Verify these scripts exist:**
```json
{
  "scripts": {
    "dev:ds12": "cross-env DEVICE_TYPE=DS12 nextron dev",
    "dev:ds16": "cross-env DEVICE_TYPE=DS16 nextron dev", 
    "dev-reset": "node scripts/dev-reset.ts",
    "dev-reset:ds12": "cross-env DEVICE_TYPE=DS12 npm run dev-reset",
    "dev-reset:ds16": "cross-env DEVICE_TYPE=DS16 npm run dev-reset",
    "test:dev": "cross-env NODE_ENV=test npm run dev-reset && npm test"
  }
}
```

## 🧪 Testing & Debugging

### Development Testing Commands

```bash
# Test application build process
npm run test

# Test hardware controllers (if available)  
npm run test:ds12
npm run test:hardware

# Test license system
npm run test:license-validation

# Test database operations
npm run test:database

# Integration tests with development database
npm run test:integration
```

### Debug Mode Setup

**Enable Debug Logging:**
```bash
# Add to .env or set temporarily
export SMC_LOG_LEVEL=debug
export SMC_ENABLE_SQL_LOGGING=true
export SMC_SHOW_VERBOSE_ERRORS=true

npm run dev:ds12
```

**Database Inspection:**
```bash
# Inspect development database
sqlite3 resources/db/database.db

# Common queries for development
.tables                         # Show all tables
SELECT * FROM Settings LIMIT 10;
SELECT * FROM Slots LIMIT 5;
SELECT * FROM Logs ORDER BY timestamp DESC LIMIT 10;
SELECT * FROM DispensingLogs ORDER BY timestamp DESC LIMIT 5;

# Check license activation status
SELECT * FROM Settings WHERE organization IS NOT NULL;
SELECT activated_key FROM Settings LIMIT 1;
```

### Development Troubleshooting

**Common Development Issues:**

**Issue:** dev-reset fails with "License file not found"
```bash
# Solution: Check license file path
ls -la ./cli/dev-license.lic

# Alternative: Use absolute path
npm run dev-reset -- --license=/full/path/to/dev-license.lic
```

**Issue:** License validation fails in development
```bash
# Solution: Regenerate development license
cd cli/
rm dev-license.lic
smc-license generate --test-mode \
  --org "Fresh Dev Test" --customer "FRESH001" --app "FreshApp" \
  --expiry "2025-12-31" --wifi-ssid "FreshWiFi" --wifi-password "fresh123" \
  --output "dev-license.lic" --bypass-password-check

cd ../
npm run dev-reset -- --license=./cli/dev-license.lic
```

**Issue:** Database corruption during development
```bash
# Solution: Clean reset
rm resources/db/database.db*
npm run dev-reset -- --license=./cli/dev-license.lic

# Check database integrity
sqlite3 resources/db/database.db "PRAGMA integrity_check;"
```

**Issue:** Application won't start after reset
```bash
# Solution: Check dependencies and clear cache
npm run clean  # If script exists
rm -rf node_modules/.cache
npm install
npm run dev-reset -- --license=./cli/dev-license.lic
npm run dev:ds12
```

## 🔄 Development Workflow Examples

### Feature Development Workflow

**Starting New Feature:**
```bash
# 1. Reset to clean state
npm run dev-reset -- --license=./cli/dev-license.lic

# 2. Create feature branch (if using git)
git checkout -b feature/new-dispensing-ui

# 3. Start development
npm run dev:ds12

# 4. Make changes, test, repeat
# 5. Commit when ready
```

**Testing Feature with Different License Scenarios:**
```bash
# Test with different organizations
cd cli/
smc-license generate --test-mode \
  --org "Feature Test Hospital" \
  --customer "FEAT001" \
  --app "FeatureApp" \
  --expiry "2025-12-31" \
  --wifi-ssid "FeatureWiFi" \
  --wifi-password "feature123" \
  --output "feature-test.lic" \
  --bypass-password-check

cd ../
npm run dev-reset -- --license=./cli/feature-test.lic
npm run dev:ds12

# Test feature functionality with new organization context
```

### Bug Reproduction Workflow

**Reproducing Customer Issue:**
```bash
# 1. Generate license matching customer scenario
cd cli/
smc-license generate --test-mode \
  --org "Customer Hospital Name" \
  --customer "CUSTOMER_ID" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --wifi-ssid "Customer_WiFi" \
  --wifi-password "customer_pass" \
  --output "customer-repro.lic" \
  --bypass-password-check

# 2. Reset with customer-like data
cd ../
npm run dev-reset -- --license=./cli/customer-repro.lic

# 3. Reproduce issue
npm run dev:ds12

# 4. Debug and fix
# 5. Test fix with original development license
npm run dev-reset -- --license=./cli/dev-license.lic
```

---

**Development Status:** HKDF v2.0 Ready ✅  
**Last Updated:** August 2025  
**Compatible With:** SMC Application v2.0.0+  
**Development Environment:** Node.js v18+, HKDF License System