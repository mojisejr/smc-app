# SMC License CLI Tool

🔐 Production-ready CLI tool for generating SMC license keys with ESP32 MAC address binding for medical device applications.

## Features

- **Hardware Binding**: License keys bound to ESP32 MAC addresses for secure device authentication
- **AES-256-CBC Encryption**: Production-grade encryption with proper IV handling
- **Medical Device Compliance**: Audit-ready logging and security patterns
- **Test Mode**: Development-friendly testing without ESP32 hardware requirements
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **TypeScript**: Full type safety and modern JavaScript features

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
# Generate license with ESP32 MAC address binding
smc-license generate \
  --org "SMC Medical Corp" \
  --customer "HOSP001" \
  --app "SMC_Cabinet" \
  --expiry "2025-12-31" \
  --esp32-ip "192.168.4.1"
```

### 3. Generate License (Test Mode)

```bash
# Generate test license without ESP32 hardware
smc-license generate \
  --org "Test Organization" \
  --customer "TEST001" \
  --app "SMC_Test" \
  --expiry "2025-06-30" \
  --test-mode
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

**Optional Options:**
- `--esp32-ip <ip>` - ESP32 device IP address (default: 192.168.4.1)
- `--wifi-ssid <ssid>` - WiFi SSID for ESP32 connection (optional)
- `--wifi-password <password>` - WiFi password for ESP32 connection (optional)
- `--output <filename>` - Output license filename (default: license.lic)
- `--test-mode` - Generate test license without ESP32 connection (uses mock MAC)

**Examples:**
```bash
# Production license generation
smc-license generate -o "SMC Medical" -c "HOSP001" -a "SMC_Cabinet" -e "2025-12-31"

# Test mode for development
smc-license generate -o "Test Org" -c "TEST001" -a "SMC_Test" -e "2025-06-30" --test-mode

# Custom ESP32 IP address
smc-license generate -o "Hospital ABC" -c "ABC001" -a "SMC_Pro" -e "2026-01-15" --esp32-ip "192.168.1.100"
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
  "version": "1.0.0",
  "checksum": "sha256-hash"
}
```

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
npm run dev -- generate -o "Test" -c "DEV001" -a "Test_App" -e "2025-12-31" --test-mode
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
- **Key Management**: Shared secret key for encryption/decryption
- **Hardware Binding**: MAC address binding prevents license transfer
- **Integrity Checking**: SHA-256 checksum validation
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
**Last Updated:** 2024-01-15  
**Compatibility:** Node.js 16+ required