# SMC License CLI Tool

🔐 Production-ready CLI tool for generating SMC license keys with ESP32 MAC address binding for medical device applications.

## Features

- **Hardware Binding**: License keys bound to ESP32 MAC addresses for secure device authentication
- **Multiple License Types**: Support for production, internal, and development license types
- **WiFi Credentials Integration**: Encrypted WiFi SSID and password storage for automated ESP32 connection
- **AES-256-CBC Encryption**: Production-grade encryption with proper IV handling and pre-computed keys
- **Password Validation**: WiFi password strength checking with development bypass options
- **Medical Device Compliance**: Audit-ready logging and security patterns
- **Test Mode**: Development-friendly testing without ESP32 hardware requirements
- **Internal License Support**: Internal licenses with ESP32 validation bypass for development
- **Environment Management**: Built-in tools for application environment setup
- **Shared Key Management**: Automated shared secret key display and export
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **TypeScript**: Full type safety and modern JavaScript features
- **Performance Optimized**: Startup time ~100ms, Memory usage 0.05 MB

## License Types

The SMC License System supports three distinct license types:

### Production Licenses

- **Purpose**: Standard customer deployment
- **ESP32 Validation**: Full hardware validation required
- **Build Safety**: Strict safety checks enforced
- **Usage**: Customer-facing deployments
- **Command**: `--type production` (default)

### Internal Licenses

- **Purpose**: SMC internal testing and development
- **ESP32 Validation**: Bypassed for convenience
- **Build Safety**: Relaxed safety checks
- **Usage**: Internal SMC use only
- **Requirement**: Organization name must contain "SMC"
- **Command**: `--type internal`
- **Audit**: Automatically tracked in license registry

### Development Licenses

- **Purpose**: Development and testing environments
- **ESP32 Validation**: Bypassed for development ease
- **Build Safety**: Relaxed safety checks
- **Usage**: Development and testing only
- **Command**: `--type development`
- **Audit**: Automatically tracked in license registry

## Installation

### Development Installation

```bash
# Clone the repository
git clone <repository-url>
cd cli

# Install dependencies
npm install

# Build the project
npm run build
```

### Production Installation

```bash
# Build production-ready binary
npm run build:prod

# Create distributable package
npm run package

# Install globally (after package creation)
npm install -g smc-license-cli-1.0.0.tgz
```

## Quick Start

### 1. Test ESP32 Connection

```bash
# Test connection to ESP32 device
smc-license test-esp32 --ip 192.168.4.1
```

### 2. Generate License (Production Mode)

```bash
# Generate production license with ESP32 MAC address binding and WiFi credentials
smc-license generate \
  --org "SMC Medical Corp" \
  --customer "HOSP001" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" \
  --wifi-password "SecurePass123!" \
  --esp32-ip "192.168.4.1" \
  --type production
```

### 3. Generate License (Internal Mode)

```bash
# Generate internal license for SMC development (bypasses ESP32 validation)
smc-license generate \
  --org "SMC Internal" \
  --customer "INT001" \
  --app "SMC_Test" \
  --expiry "2025-06-30" \
  --wifi-ssid "SMC_INTERNAL" \
  --wifi-password "InternalPass123!" \
  --type internal \
  --test-mode
```

### 4. Generate License (Development Mode)

```bash
# Generate development license without ESP32 hardware
smc-license generate \
  --org "Test Organization" \
  --customer "DEV001" \
  --app "SMC_Dev" \
  --expiry "2025-06-30" \
  --wifi-ssid "DEV_WIFI" \
  --wifi-password "simple123" \
  --type development \
  --test-mode \
  --bypass-password-check
```

### 4. Validate License

```bash
# Validate existing license file
smc-license validate --file license.lic
```

### 5. View License Information

```bash
# Display detailed license information
smc-license info --file license.lic
```

### 6. Get Shared Secret Key

```bash
# Display shared secret key for application setup
smc-license show-key

# Export shared key to .env file
smc-license export-env --output .env
```

## Commands

### `generate` - Generate License File

Create a new license file with ESP32 MAC address binding.

```bash
smc-license generate [options]
```

**Required Options:**

- `-o, --org <organization>` - Organization name (e.g., "SMC Medical Corp")
- `-c, --customer <customerId>` - Customer ID (e.g., "CUST001")
- `-a, --app <applicationId>` - Application ID (e.g., "SMC_Cabinet")
- `-e, --expiry <date>` - Expiry date in YYYY-MM-DD format (e.g., "2025-12-31")
- `--wifi-ssid <ssid>` - WiFi SSID for ESP32 connection (REQUIRED)
- `--wifi-password <password>` - WiFi password for ESP32 connection (REQUIRED)

**Optional Options:**

- `--esp32-ip <ip>` - ESP32 device IP address (default: 192.168.4.1)
- `--output <filename>` - Output license filename (default: license.lic)
- `--test-mode` - Generate test license without ESP32 connection (uses mock MAC)
- `--bypass-password-check` - Bypass WiFi password strength validation (development only)

**Examples:**

```bash
# Production license generation
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" --wifi-password "SecurePass123!"

# Test mode for development
smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" \
  --wifi-ssid "TEST_WIFI" --wifi-password "simple123" --test-mode --bypass-password-check

# Custom ESP32 IP address
smc-license generate -o "Hospital ABC" -c "ABC001" -a "SMC_Pro" -e "2026-01-15" \
  --wifi-ssid "HOSPITAL_ESP32" --wifi-password "HospitalSecure2024" --esp32-ip "192.168.1.100"
```

### `validate` - Validate License File

Validate existing license file format, integrity, and expiry status.

```bash
smc-license validate --file <filename>
```

**Options:**

- `-f, --file <filename>` - Path to license file (.lic format)

**Examples:**

```bash
smc-license validate -f license.lic
smc-license validate -f /path/to/customer-license.lic
```

### `info` - Display License Information

Show detailed information about license file contents.

```bash
smc-license info --file <filename>
```

**Options:**

- `-f, --file <filename>` - Path to license file (.lic format)

**Examples:**

```bash
smc-license info -f license.lic
smc-license info --file "Hospital ABC License.lic"
```

### `test-esp32` - Test ESP32 Connection

Test ESP32 device connection and retrieve MAC address.

```bash
smc-license test-esp32 [options]
```

**Options:**

- `--ip <ip>` - ESP32 device IP address (default: 192.168.4.1)

**Examples:**

```bash
smc-license test-esp32
smc-license test-esp32 --ip 192.168.1.100
```

### `show-key` - Display Shared Secret Key

Display the shared secret key needed for application .env configuration.

```bash
smc-license show-key
```

**Usage:**

- Shows the shared secret key that must be added to your application's `.env` file
- Copy the displayed key exactly as shown
- Required for license decryption in the application

**Examples:**

```bash
smc-license show-key
```

### `export-env` - Export Environment Configuration

Export shared secret key to .env file format.

```bash
smc-license export-env [options]
```

**Options:**

- `--output <filename>` - Output .env filename (default: .env)
- `--append` - Append to existing .env file instead of overwriting
- `--stdout` - Print to stdout instead of writing to file

**Examples:**

```bash
# Create new .env file
smc-license export-env

# Append to existing .env file
smc-license export-env --append

# Export to custom file
smc-license export-env --output .env.production

# Display without writing to file
smc-license export-env --stdout
```

## ESP32 Setup

### Requirements

Your ESP32 device must:

1. **Be connected to WiFi** with a known IP address
2. **Run HTTP server** on port 80
3. **Implement /mac endpoint** that returns MAC address

### ESP32 Firmware Requirements

The ESP32 must respond to `GET /mac` with JSON containing MAC address:

```json
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "status": "success",
  "timestamp": 1640995200,
  "firmware_version": "1.0.0"
}
```

**Minimum Response:**

```json
{
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

### Network Configuration

**Default ESP32 AP Mode:**

- SSID: `ESP32_AP`
- Password: `password123`
- IP Address: `192.168.4.1`

**Custom Network Configuration:**

- Configure your ESP32 to connect to your WiFi network
- Use `--esp32-ip` option to specify the assigned IP address

## Complete Workflow: License Generation to Application Deployment

This section provides a step-by-step guide from license generation to application deployment and activation.

### Stage 1: License Generation (CLI Side)

#### Step 1: Test ESP32 Connection

```bash
# Ensure ESP32 is accessible
smc-license test-esp32 --ip 192.168.4.1

# Expected output:
✅ ESP32 Connection Test Results:
   Device IP: 192.168.4.1
   Status: Connected
   MAC Address: AA:BB:CC:DD:EE:FF
   Response Time: 45ms
```

#### Step 2: Generate License File

**For Production:**

```bash
# Generate production license with real ESP32 binding and WiFi credentials
smc-license generate \
  --org "SMC Medical Corp" \
  --customer "HOSP001" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --wifi-ssid "SMC_ESP32_001" \
  --wifi-password "SecurePass123!" \
  --esp32-ip "192.168.4.1"

# CLI will automatically display shared key after generation
```

**For Development/Testing:**

```bash
# Generate test license without ESP32 hardware
smc-license generate \
  --org "Test Hospital" \
  --customer "TEST001" \
  --app "SMC_Test" \
  --expiry "2025-06-30" \
  --wifi-ssid "TEST_WIFI" \
  --wifi-password "simple123" \
  --test-mode \
  --bypass-password-check
```

#### Step 3: Note the Shared Key

After generation, CLI displays:

```
🔑 Application Setup Information:
=====================================
Add this to your application .env file:
SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS

📝 Quick Commands:
echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" >> .env
```

**Or retrieve later:**

```bash
# Display shared key anytime
smc-license show-key

# Export to .env file
smc-license export-env --output .env
```

#### Step 4: Validate Generated License

```bash
# Verify license integrity and information
smc-license validate -f license.lic
smc-license info -f license.lic
```

### Stage 2: Application Deployment Setup

#### Step 5: Prepare Application Environment

```bash
# Navigate to your SMC application directory
cd /path/to/smc-application

# Create .env file with shared key
smc-license export-env --output .env

# Or manually copy the key:
echo "SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS" > .env
```

#### Step 6: Deploy License File

```bash
# Copy license file to application directory
cp license.lic /path/to/smc-application/

# Verify file is in place
ls -la license.lic
```

### Stage 3: Application Integration & Activation

#### Step 7: Application Environment Setup

```bash
# Your application .env should contain:
SHARED_SECRET_KEY=SMC_LICENSE_ENCRYPTION_KEY_2024_SECURE_MEDICAL_DEVICE_BINDING_32CHARS
LICENSE_FILE_PATH=license.lic
ESP32_DEFAULT_IP=192.168.4.1
```

#### Step 8: Application Startup Behavior

**First Run (Not Activated):**

1. Application starts and checks license activation status
2. Finds `license.lic` file but database flag is not set
3. Automatically redirects to `/activate-key` page
4. Shows 8-step activation process with real-time progress

**Activation Process (Automatic):**

```
Step 1: กำลังโหลดไฟล์ license     [10%]
Step 2: ตรวจสอบไฟล์ license       [20%]
Step 3: ตรวจสอบวันหมดอายุ         [30%]
Step 4: ตรวจสอบข้อมูลองค์กร       [40%]
Step 5: เชื่อมต่อ WiFi ESP32      [50%] ← อ่าน WiFi จาก license โดยอัตโนมัติ
Step 6: ดึง MAC Address          [70%]
Step 7: ตรวจสอบ MAC Address      [80%]
Step 8: บันทึกการ activation     [90%]
✅ เสร็จสิ้น                     [100%]
```

**Subsequent Runs (Activated):**

1. Application starts and checks license activation status
2. Database flag indicates activation is complete
3. Automatically loads main application interface (`/home`)

#### Step 9: Troubleshooting Activation Issues

**License File Issues:**

```bash
# Check file exists and is readable
ls -la license.lic

# Validate license file
smc-license validate -f license.lic

# Check license information
smc-license info -f license.lic
```

**ESP32 Connection Issues:**

```bash
# Test ESP32 connectivity from application directory
smc-license test-esp32 --ip 192.168.4.1

# Check if ESP32 is on the same network
ping 192.168.4.1
```

**Environment Configuration Issues:**

```bash
# Verify .env file contents
cat .env

# Regenerate .env if needed
smc-license export-env --output .env

# Check shared key matches between CLI and app
smc-license show-key
```

### Stage 4: Production Deployment Checklist

#### Pre-Deployment Checklist:

- [ ] ESP32 device is configured and accessible
- [ ] License file generated with correct organization/customer details
- [ ] License expiry date is appropriate for deployment duration
- [ ] Shared secret key is properly configured in application environment
- [ ] Application deployment includes both `license.lic` and `.env` files
- [ ] Network connectivity between application and ESP32 is verified

#### Deployment Package Contents:

```
deployment-package/
├── smc-application/          # Main application files
├── license.lic              # Generated license file
├── .env                     # Environment configuration with shared key
├── README.md                # Deployment instructions
└── esp32-config/            # ESP32 configuration if needed
```

#### Post-Deployment Verification:

```bash
# 1. Verify license file
smc-license validate -f license.lic

# 2. Test ESP32 connection
smc-license test-esp32 --ip <esp32-ip>

# 3. Check application environment
cat .env | grep SHARED_SECRET_KEY

# 4. Run application and verify activation flow
# Application should auto-activate on first run
```

### Stage 5: Maintenance and Updates

#### License Renewal Process:

1. Generate new license with updated expiry date
2. Replace `license.lic` file in application directory
3. Restart application (will re-activate automatically)

#### Changing ESP32 Hardware:

1. Generate new license with new ESP32 MAC address
2. Replace `license.lic` file
3. Update ESP32 IP in `.env` if changed
4. Restart application for re-activation

#### Environment Updates:

```bash
# Update shared key (if CLI version changes)
smc-license show-key
smc-license export-env --output .env

# Restart application to pick up changes
```

## License File Format

SMC license files (`.lic`) use the following encrypted JSON structure:

```json
{
  "version": "1.0.0",
  "encrypted_data": "base64-encoded-aes-encrypted-data",
  "algorithm": "aes-256-cbc",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Encrypted Content:**

```json
{
  "organization": "SMC Medical Corp",
  "customerId": "HOSP001",
  "applicationId": "SMC_Cabinet",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "expiryDate": "2025-12-31",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "wifiSsid": "SMC_ESP32_001",
  "wifiPassword": "SecurePass123!",
  "version": "1.0.0",
  "checksum": "sha256-hash"
}
```

## Build Integration

The CLI integrates with the main application build system to support different license types:

### Build Preparation Commands

```bash
# Navigate to main application directory
cd ..

# Internal build preparation
npm run build-prep:internal:ds12
npm run build-prep:internal:ds16

# Development build preparation
npm run build-prep:development:ds12
npm run build-prep:development:ds16

# Production build preparation (default)
npm run build-prep:ds12
npm run build-prep:ds16
```

### Full Build Commands

```bash
# Internal application builds
npm run build:internal:ds12
npm run build:internal:ds16

# Development application builds
npm run build:development:ds12
npm run build:development:ds16

# Production application builds (default)
npm run build:ds12
npm run build:ds16
```

### Build Features by License Type

| Feature             | Production  | Internal         | Development      |
| ------------------- | ----------- | ---------------- | ---------------- |
| ESP32 Validation    | ✅ Required | ❌ Bypassed      | ❌ Bypassed      |
| Build Safety Checks | ✅ Strict   | ⚠️ Relaxed       | ⚠️ Relaxed       |
| Customer Deployment | ✅ Ready    | ❌ Internal Only | ❌ Dev/Test Only |
| Audit Logging       | ✅ Standard | ✅ Enhanced      | ✅ Enhanced      |
| Hardware Binding    | ✅ Required | ⚠️ Optional      | ⚠️ Optional      |

## Development

### Build Commands

```bash
# Development build
npm run build

# Production build (optimized)
npm run build:prod

# Clean build directory
npm run clean

# Validate build
npm run validate:build
```

### Testing Commands

```bash
# Run all tests
npm run test:all

# Run individual phase tests
npm run test        # Phase 1
npm run test:phase2 # Phase 2
npm run test:phase3 # Phase 3
npm run test:phase4 # Phase 4
```

### Development Mode

```bash
# Run in development mode with ts-node
npm run dev -- generate --help
npm run dev -- generate -o "Test" -c "DEV001" -a "Test_App" -e "2025-12-31" \
  --wifi-ssid "DEV_WIFI" --wifi-password "dev123" --test-mode --bypass-password-check
```

## Troubleshooting

### ESP32 Connection Issues

**Problem:** Connection refused or timeout

```bash
❌ ESP32 test failed: ESP32 connection failed: timeout of 10000ms exceeded
```

**Solutions:**

1. Check ESP32 is powered on and WiFi connected
2. Verify IP address with `ping <ip-address>`
3. Ensure ESP32 firmware implements `/mac` endpoint
4. Check firewall settings
5. Use `--test-mode` for development without ESP32

### License Generation Errors

**Problem:** WiFi password validation error

```bash
❌ License generation failed
Error: WiFi password does not meet security requirements
```

**Solutions:**

1. Use stronger passwords (8+ characters, mixed case, numbers, symbols)
2. Add `--bypass-password-check` for development/testing
3. Avoid common passwords like "password", "123456", etc.
4. Example strong password: "SMC_Secure123!"

**Problem:** Date format error

```bash
❌ Error: Invalid expiry date format. Use YYYY-MM-DD
```

**Solution:** Use correct date format: `--expiry "2025-12-31"`

**Problem:** File permission error

```bash
❌ Error: EACCES: permission denied
```

**Solutions:**

1. Check write permissions on output directory
2. Run with elevated privileges if necessary
3. Specify different output path: `--output /tmp/license.lic`

### Validation Errors

**Problem:** License file corrupted

```bash
❌ License validation FAILED: Invalid license file: JSON parse error
```

**Solutions:**

1. Ensure license file is not corrupted
2. Regenerate license file
3. Check file encoding is UTF-8

### Network Configuration

**Problem:** ESP32 not accessible

```bash
❌ Connection refused - ESP32 may be offline
```

**Solutions:**

1. Verify ESP32 WiFi connection status
2. Check IP address assignment
3. Test network connectivity: `ping 192.168.4.1`
4. Restart ESP32 device

## Security Considerations

- **Encryption**: Uses AES-256-CBC with proper IV handling
- **WiFi Security**: WiFi credentials encrypted and stored securely in license files
- **Password Validation**: Enforces strong WiFi passwords with development bypass option
- **Key Management**: Shared secret key for encryption/decryption
- **Hardware Binding**: MAC address binding prevents license transfer
- **Integrity Checking**: SHA-256 checksum validation includes WiFi credentials
- **Audit Trail**: All operations are logged for medical device compliance

## License

PRIVATE - SMC Development Team

## Support

For technical support and issues:

- Check troubleshooting guide above
- Review ESP32 setup requirements
- Validate network configuration
- Test with `--test-mode` for debugging

---

**Version:** 1.0.0  
**Last Updated:** 2025-08-19  
**Status:** Production Ready ✅  
**Compatibility:** Node.js 16+ required

## Quick Reference Commands

```bash
# Generate license (test mode)
smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-12-31" \
  --wifi-ssid "TEST_WIFI" --wifi-password "simple123" --test-mode --bypass-password-check

# Get shared key for .env
smc-license show-key

# Export .env file
smc-license export-env --output .env

# Validate license
smc-license validate -f license.lic

# Test ESP32 connection
smc-license test-esp32 --ip 192.168.4.1
```
