# Internal License Deployment Guide

## Overview

The SMC License System now supports three license types:
- **Production**: Standard customer licenses with full ESP32 validation
- **Internal**: SMC internal testing licenses with ESP32 bypass
- **Development**: Development/testing licenses with ESP32 bypass

## License Types

### Production Licenses
- Full ESP32 hardware validation required
- Strict build safety checks
- Customer deployment ready
- Standard activation flow

### Internal Licenses
- ESP32 validation bypassed
- Relaxed build safety checks
- SMC internal use only
- Organization must contain "SMC" in the name
- Audit logging for internal usage tracking

### Development Licenses
- ESP32 validation bypassed
- Relaxed build safety checks
- Development and testing purposes
- No organization name restrictions
- Audit logging for development tracking

## Generating Internal Licenses

### CLI Commands

#### Internal License Generation
```bash
# Navigate to CLI directory
cd cli

# Generate internal license
node dist/index.js generate \
  -o "SMC Internal" \
  -c "INT001" \
  -a "SMC_Test" \
  -e "2026-06-30" \
  --type internal \
  --test-mode \
  --output "internal-license.lic"
```

#### Development License Generation
```bash
# Generate development license
node dist/index.js generate \
  -o "Dev Corp" \
  -c "DEV001" \
  -a "SMC_Dev" \
  -e "2026-03-31" \
  --type development \
  --test-mode \
  --output "dev-license.lic"
```

### Required Parameters
- `-o, --org`: Organization name (must contain "SMC" for internal licenses)
- `-c, --customer`: Customer ID
- `-a, --app`: Application ID
- `-e, --expiry`: Expiry date (YYYY-MM-DD format)
- `--type`: License type (internal, development, or production)
- `--test-mode`: Generate with mock MAC address for testing
- `--output`: Output filename

## Building Internal Applications

### Build Preparation Commands

#### Internal Builds
```bash
# DS12 internal build preparation
npm run build-prep:internal:ds12

# DS16 internal build preparation (when implemented)
npm run build-prep:internal:ds16
```

#### Development Builds
```bash
# DS12 development build preparation
npm run build-prep:development:ds12

# DS16 development build preparation (when implemented)
npm run build-prep:development:ds16
```

### Full Build Commands

#### Internal Application Builds
```bash
# Build internal DS12 application
npm run build:internal:ds12

# Build internal DS16 application (when implemented)
npm run build:internal:ds16
```

#### Development Application Builds
```bash
# Build development DS12 application
npm run build:development:ds12

# Build development DS16 application (when implemented)
npm run build:development:ds16
```

## Build Configuration

### Environment Variables

The build system automatically sets these environment variables:

#### Internal Builds
- `DEVICE_TYPE`: ds12 or ds16
- `BUILD_TYPE`: internal
- `SMC_LICENSE_BYPASS_MODE`: true (automatically set)
- `SMC_DEV_REAL_HARDWARE`: true (acceptable for internal builds)

#### Development Builds
- `DEVICE_TYPE`: ds12 or ds16
- `BUILD_TYPE`: development
- `SMC_LICENSE_BYPASS_MODE`: true (automatically set)
- `SMC_DEV_REAL_HARDWARE`: true (acceptable for development builds)

### Build Safety Checks

#### Internal/Development Build Safety
- Relaxed safety validation
- `SMC_LICENSE_BYPASS_MODE=true` is acceptable
- `SMC_DEV_REAL_HARDWARE=true` is acceptable
- ESP32 validation bypassed during runtime

#### Production Build Safety
- Strict safety validation
- `SMC_LICENSE_BYPASS_MODE=true` triggers warnings
- `SMC_DEV_REAL_HARDWARE=true` triggers warnings
- Full ESP32 validation required

## Deployment Process

### Internal Deployment Steps

1. **Generate Internal License**
   ```bash
   cd cli
   node dist/index.js generate -o "SMC Internal" -c "INT001" -a "SMC_Test" -e "2026-06-30" --type internal --test-mode
   ```

2. **Prepare Internal Build**
   ```bash
   cd ..
   npm run build-prep:internal:ds12
   ```

3. **Build Internal Application**
   ```bash
   npm run build:internal:ds12
   ```

4. **Deploy Application**
   - Copy built application from `dist/` directory
   - Include generated license file
   - No ESP32 hardware validation required

### Development Deployment Steps

1. **Generate Development License**
   ```bash
   cd cli
   node dist/index.js generate -o "Dev Corp" -c "DEV001" -a "SMC_Dev" -e "2026-03-31" --type development --test-mode
   ```

2. **Prepare Development Build**
   ```bash
   cd ..
   npm run build-prep:development:ds12
   ```

3. **Build Development Application**
   ```bash
   npm run build:development:ds12
   ```

4. **Deploy for Testing**
   - Copy built application from `dist/` directory
   - Include generated license file
   - Suitable for development and testing environments

## Audit and Tracking

### License Registry

All internal and development licenses are automatically tracked in the license registry:

- Registry files: `cli/registry/license-registry-YYYY-MM-DD.csv`
- Audit logs include timestamp, license type, organization, and customer ID
- Automatic tracking for compliance and usage monitoring

### Build Information

Build information is stored in `resources/build-info.json`:

```json
{
  "buildTimestamp": "2025-09-03T08:46:23.154Z",
  "nodeVersion": "v20.15.0",
  "deviceType": "ds12",
  "licenseType": "internal",
  "isInternalBuild": true,
  "buildMode": "internal",
  "esp32ValidationBypass": true
}
```

## Security Considerations

### Internal License Security
- Internal licenses bypass ESP32 validation for testing convenience
- Should only be used within SMC organization
- Not suitable for customer deployment
- Audit trails maintained for compliance

### Development License Security
- Development licenses bypass ESP32 validation for development ease
- Suitable for development and testing environments
- Not suitable for production deployment
- Audit trails maintained for tracking

### Production License Security
- Full ESP32 hardware validation required
- Strict build safety checks enforced
- Customer deployment ready
- Complete security validation

## Troubleshooting

### Common Issues

#### License Generation Fails
- Ensure organization name contains "SMC" for internal licenses
- Check expiry date format (YYYY-MM-DD)
- Verify expiry date is in the future
- Ensure CLI is built: `npm run build`

#### Build Preparation Fails
- Check environment variables are set correctly
- Verify license file exists if required
- Ensure database is accessible
- Check Node.js version compatibility

#### ESP32 Validation Issues
- Internal/development builds should bypass ESP32 validation
- Check `isInternalBuild` flag in build-info.json
- Verify license type is correctly detected
- Review audit logs for validation bypass confirmation

### Support

For internal license system support:
1. Check audit logs in `cli/registry/`
2. Review build information in `resources/build-info.json`
3. Verify license type detection in application logs
4. Contact SMC development team for assistance