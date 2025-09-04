---
## Project Overview

**Project Name**: Smart Medication Cart (SMC)

**Repository**: https://github.com/mojisejr/smc-app

**Description**: แอปพลิเคชัน Electron สำหรับจัดการระบบจ่ายยาอัตโนมัติ ที่ออกแบบมาเพื่อใช้ในสถานพยาบาล โดยรองรับการเชื่อมต่อกับฮาร์ดแวร์ DS12 และ DS16 พร้อมระบบ license ที่ผูกกับ ESP32 hardware binding เพื่อความปลอดภัยระดับการแพทย์

**Project Goals**:

- สร้างระบบจ่ายยาอัตโนมัติที่ปลอดภัยและเชื่อถือได้สำหรับสถานพยาบาล
- รองรับการทำงานกับฮาร์ดแวร์หลายรุ่น (DS12, DS16) ผ่านระบบ BuildTimeController
- ระบบ license ที่มีความปลอดภัยสูงด้วย ESP32 hardware binding และ AES-256-CBC encryption
- รักษามาตรฐานการแพทย์ด้วยระบบ audit trail และ error handling ที่เข้มงวด

**Medical Device Context**: This is **safety-critical medical device software** requiring strict compliance patterns for audit trails, error handling, and hardware communication protocols.

---

## 🌏 Timezone & Date Configuration

### Thailand Timezone Settings

**Primary Timezone**: Asia/Bangkok (UTC+7)
**Date Format**: Christian Era (ค.ศ.) - YYYY-MM-DD
**Time Format**: 24-hour format (HH:MM)
**Locale**: th-TH with Christian Era calendar

### Development Guidelines

#### Date/Time Handling

```javascript
// Use this utility for consistent timezone handling
const getThailandDateTime = () => {
  return new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    calendar: "gregory", // Christian Era
  });
};

// For file naming (retrospectives, logs)
const getThailandDateForFilename = () => {
  const now = new Date();
  return now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Bangkok",
  }); // Returns YYYY-MM-DD format
};
```

#### File Naming Conventions

- **Retrospective Files**: `session-YYYY-MM-DD-[description].md`
- **Log Files**: `YYYY-MM-DD-[type].log`
- **Backup Files**: `backup-YYYY-MM-DD-HHMM.sql`

#### Important Notes

- **ALL timestamps** in documentation, logs, and file names must use Thailand timezone
- **Year format** must always be Christian Era (ค.ศ.) not Buddhist Era (พ.ศ.)
- **Development sessions** should reference Thailand local time
- **Retrospective files** must use correct Thailand date in filename

---

## Architecture Overview

### Core Structure

- **Framework**: Electron.js with Next.js 12 (Renderer Process)
- **Frontend**: React 18 with TypeScript, Tailwind CSS, DaisyUI
- **Main Process**: Node.js with TypeScript (Hardware communication, IPC, Database)
- **Database**: SQLite with Sequelize ORM (Medical-grade audit trails)
- **Hardware Communication**: Serial/RS485 protocols for DS12/DS16 devices
- **License System**: ESP32-based hardware binding with AES-256-CBC encryption
- **Build System**: Electron Builder with cross-platform support

### Tech Stack

- **Desktop Framework**: Electron.js 21+ with Nextron integration
- **Frontend**: Next.js 12, React 18, TypeScript, Tailwind CSS, DaisyUI, Framer Motion
- **Backend**: Node.js (Electron Main Process), Sequelize ORM, SQLite3
- **Hardware Integration**: SerialPort library, RS485 communication protocols
- **License System**: ESP32 WiFi integration, AES-256-CBC encryption, MAC address binding
- **Database**: SQLite with medical-grade audit logging and compliance patterns
- **Build Tools**: Electron Builder, TypeScript compiler, Cross-env for environment management

### Main Process Components

- **Hardware Controllers** (`main/ku-controllers/`): BuildTimeController singleton for DS12/DS16 management

  - `DS12Controller`: 12-slot medication dispensing hardware
  - `DS16Controller`: 16-slot medication dispensing hardware (formerly CU16)
  - `BuildTimeController`: Factory pattern for device-specific controller instantiation

- **Authentication System** (`main/auth/`): Per-operation passkey validation and user management

  - User authentication and authorization
  - Medical-grade access control
  - Audit trail integration

- **License Management** (`main/license/`): ESP32-based hardware binding system

  - `esp32-client.ts`: WiFi communication with ESP32 devices
  - `wifi-manager.ts`: Cross-platform WiFi management
  - `validator.ts`: License validation and hardware binding
  - `file-manager.ts`: Encrypted license file management

- **Database Operations** (`main/setting/`, `main/user/`): Medical-compliant data management
  - Slot configuration and state management
  - User management and access control
  - Audit logging and compliance reporting

### Renderer Process (Frontend)

- **User Interface Flows**:
  - **Medication Dispensing Flow**: Authentication → Slot Selection → Hardware Communication → Audit Logging
  - **License Activation Flow**: ESP32 Discovery → MAC Validation → License Installation → System Activation
  - **Management Flow**: User Management → Slot Configuration → System Settings → Audit Reports
  - **Hardware Monitoring**: Real-time slot status → Environmental monitoring → Error handling

### Key Production Patterns

- All hardware operations **must be logged** via the audit trail system
- Preserve exact Thai language error messages as they are part of the medical device standard
- Maintain **per-operation passkey validation** in `main/auth/`
- Use existing database operation patterns (`Slot.update()`, `logDispensing()`)
- **Build-time device configuration** using environment variables (`DEVICE_TYPE=DS12` or `DEVICE_TYPE=DS16`)
- **Medical-grade error handling** with comprehensive logging and recovery procedures

---

## 🚨 Critical Safety Rules

### Medical Device Compliance

#### 🔒 Code Safety Rules

- **NEVER merge PRs yourself** - All code changes require peer review for medical device compliance
- **NEVER delete critical files** without explicit approval:
  - Database schema files (`db/models/`, `db/migrations/`)
  - Hardware controller files (`main/ku-controllers/`)
  - License system files (`main/license/`)
  - Audit logging components (`main/audit/`)
  - Configuration files (`electron-builder.yml`, `package.json`)

#### 🔐 Sensitive Data Handling

- **NEVER commit** license keys, ESP32 credentials, or hardware serial numbers
- **NEVER log** sensitive patient data or medication details in plain text
- **ALWAYS encrypt** license files and hardware binding data
- **ALWAYS validate** hardware communication before dispensing operations

#### 📋 Medical Device Scope Adherence

- **STAY WITHIN SCOPE**: This is a medication dispensing system, not a general-purpose application
- **MAINTAIN AUDIT TRAILS**: Every hardware operation must be logged with timestamp, user, and result
- **PRESERVE ERROR MESSAGES**: Thai language error messages are part of medical device certification
- **VALIDATE HARDWARE STATE**: Always check slot status before dispensing operations

#### 🛡️ Hardware Safety System

- **NEVER bypass** hardware safety checks or slot validation
- **NEVER allow** dispensing without proper authentication
- **ALWAYS verify** ESP32 license binding before system activation
- **ALWAYS log** hardware communication errors for compliance auditing

#### 🔧 Development Safety

- **TEST HARDWARE OPERATIONS** in safe mode before production deployment
- **BACKUP DATABASE** before schema changes or major updates
- **VALIDATE LICENSE SYSTEM** after any ESP32-related changes
- **MONITOR AUDIT LOGS** for any unusual hardware communication patterns

---

## Core Development Commands

This section lists common commands for this project.

- **Development**: `npm run dev`, `npm run dev:ds12`, `npm run dev:ds16`
- **Testing**: `npm test`, `npm run test:ds12`, `npm run test:integration`, `npm run test:hardware`
- **Build**: `npm run build`, `npm run build:ds12`, `npm run build:win63`
- **Configuration**: `npm run config:ds12`, `npm run config:validate`

---

## SMC License CLI Tool (✅ v1.1.0)

**Location**: `cli/` directory.
**Purpose**: ESP32-based license generation with **hardware binding**, **AES-256-CBC encryption**, and CSV batch processing.

- **Individual License**: `smc-license generate...`
- **CSV Batch Processing**: `smc-license batch --input ... --update-csv`
- **No Expiry Support**: Handled by a far-future date (2099-12-31).

---

## ESP32 Deployment Tool (✅ PHASE 4.5 COMPLETE)

**Location**: `esp32-deployment-tool/` directory.
**Purpose**: A Next.js 14 tool for cross-platform ESP32 firmware deployment, supporting template management.

- **Key Features**: Unified template system, CSV/JSON export, and a no-expiry checkbox interface.
- **End-to-end Workflow**: The tool's CSV export and the CLI's batch processing enable a seamless **Sales → Developer → Delivery** workflow.

---

## Development Guidelines

- **Solo Developer Approach**: Use simple, maintainable code patterns.
- **Implementation Approach**: Always start with the simplest solution (Minimum Viable Implementation) and iterate incrementally.
- **Testing**: Primary method is **manual testing**, supplemented by Jest test suites.
- **Logging**: Use clear prefixes: `debug`, `info`, and `error`.

---

## 🚀 Development Workflows

### The Two-Issue Pattern

This project uses a Two-Issue Pattern to separate work context from actionable plans, integrating local workflows with GitHub Issues for clarity and traceability.

- **Context Issues (`=fcs`):** Used to record the current state and context of a session on GitHub.

- **Task Issues (`=plan`):** Used to create a detailed and comprehensive plan of action on GitHub. The agent will use information from the latest Context Issue as a reference.

---

### Shortcut Commands

These commands are standard across all projects and streamline our communication with **AUTOMATED WORKFLOW INTEGRATION**.

- **`=fcs > [message]`**: Updates the `current-focus.md` file on the local machine and creates a **GitHub Context Issue** with the specified `[message]` as the title. **WARNING**: This command will only work if there are no open GitHub issues. If there are, the agent will alert you to clear the backlog before you can save a new context. To bypass this check, use the command `=fcs -f > [message]`.

- **`=plan > [question/problem]`**: Creates a **GitHub Task Issue** with a detailed and comprehensive plan of action. The agent will use all the information from the `current-focus.md` file and previous conversations to create this Issue. If an open Task Issue already exists, the agent will **update** that Issue with the latest information instead of creating a new one.

- **`=impl > [message]`**: **ENHANCED WITH AUTOMATED WORKFLOW** - Instructs the agent to execute the plan contained in the latest **GitHub Task Issue** with full automation:

  1. **Auto-Branch Creation**: Creates feature branch with proper naming (`feature/[issue-number]-[description]`)
  2. **Implementation**: Executes the planned work
  3. **Auto-Commit & Push**: Commits changes with descriptive messages and pushes to remote
  4. **Auto-PR Creation**: Creates Pull Request with proper description and issue references
  5. **Issue Updates**: Updates the plan issue with PR link and completion status
  6. **User Notification**: Provides PR link for review and approval

- **`=rrr > [message]`**: Creates a daily Retrospective file in the `docs/retrospective/` folder and creates a GitHub Issue containing a summary of the work, an AI Diary, and Honest Feedback, allowing you and the team to review the session accurately.

### 🔄 Plan Issue Management Guidelines

**CRITICAL**: For large, multi-phase projects, the agent must **UPDATE** existing plan issues instead of creating new ones.

- **When completing phases**: Update the plan issue to reflect completed phases and mark them as ✅ COMPLETED
- **Progress tracking**: Update the issue description with current status, next steps, and any blockers
- **Phase completion**: When a phase is finished, update the plan issue immediately before moving to the next phase
- **Never create new issues**: For ongoing multi-phase work, always update the existing plan issue
- **Retrospective issues**: Only create retrospective issues for session summaries, not for plan updates

### 🌿 Automated Workflow Implementation

**ENHANCED AUTOMATION**: All development workflows now include full automation to ensure consistent adherence to medical device compliance and project guidelines.

#### Enhanced Command Behavior

The following commands now include **FULL WORKFLOW AUTOMATION**:

##### `=impl` Command Enhancement

**Automated Execution Flow:**

```
1. Parse GitHub Task Issue → Extract requirements and scope
2. Auto-Branch Creation → feature/[issue-number]-[sanitized-description]
3. Implementation Phase → Execute planned work with progress tracking
4. Auto-Commit & Push → Descriptive commits with proper formatting
5. Auto-PR Creation → Comprehensive PR with issue linking
6. Issue Updates → Update plan issue with PR link and completion status
7. User Notification → Provide PR URL for review and approval
```

##### Branch Naming Convention

- **Format**: `feature/[issue-number]-[sanitized-description]`
- **Example**: `feature/27-ds12-hardware-integration`
- **Auto-sanitization**: Removes special characters, converts to kebab-case
- **Medical Device Scope**: Includes device type prefixes (`ds12`, `ds16`, `esp32`, `license`)

##### Commit Message Standards

- **Format**: `[type][scope]: [description] (#[issue-number])`
- **Types**: `feat`, `fix`, `hardware`, `license`, `medical`, `audit`, `docs`, `test`
- **Scopes**: `ds12`, `ds16`, `esp32`, `license`, `audit`, `auth`, `ui`, `db`
- **Example**: `feat(ds12): implement slot validation system (#25)`

##### Pull Request Automation

- **Title**: Auto-generated from issue title with proper formatting
- **Description**: Includes implementation summary, medical device compliance checklist, and testing notes
- **Issue Linking**: Automatic `Closes #[issue-number]` for proper tracking
- **Labels**: Auto-applied based on implementation type and medical device scope

#### Workflow Safety Measures

- **Medical Device Validation**: All automated workflows include medical device compliance checks
- **Hardware Safety**: Automated testing of hardware communication before deployment
- **License Verification**: ESP32 license system validation in all workflows
- **Audit Trail Integrity**: Verification that audit logging remains intact
- **Rollback Procedures**: Automated rollback capabilities for critical system components

**CRITICAL**: **NEVER** work directly on main/master branch. **ALWAYS** create PRs for review.

### Implementation Guidelines for Automated Workflow

#### Pre-Implementation Checks

- ✅ Verify GitHub Task Issue exists and is properly formatted
- ✅ Ensure no conflicting branches exist
- ✅ Confirm GitHub CLI is authenticated and functional
- ✅ Validate repository permissions for branch creation and PR management
- ✅ Check medical device compliance requirements
- ✅ Verify hardware safety protocols

#### Error Handling and Fallbacks

- **Branch Creation Failure**: Falls back to manual branch creation with user guidance
- **Push Failure**: Provides manual push commands and troubleshooting steps
- **PR Creation Failure**: Falls back to manual PR creation with pre-filled templates
- **Issue Update Failure**: Logs error and provides manual update instructions
- **Medical Compliance Check Failure**: Halts workflow until compliance is verified

#### Quality Assurance

- **Code Review**: All PRs require manual review and approval
- **Medical Device Testing**: Automated tests run on PR creation for hardware communication
- **License System Validation**: ESP32 license system integrity checks
- **Documentation**: Auto-generated PR descriptions include medical device implementation details
- **Rollback**: Clear instructions for reverting changes if needed

#### Monitoring and Feedback

- **Progress Tracking**: Real-time updates during implementation phases
- **Success Metrics**: PR creation success rate and review completion time
- **User Feedback**: Continuous improvement based on workflow effectiveness
- **Audit Trail**: Complete history of automated actions for medical device compliance

### Retrospective Workflow

This project uses a structured retrospective approach to track progress, learnings, and maintain project continuity.

#### File Structure

- **Location**: `/docs/retrospective/YYYY-MM-DD.md`
- **Naming**: Use ISO date format (YYYY-MM-DD)
- **Daily Files**: One file per working day

#### Timezone and Date Guidelines

- **Timezone**: Thailand (UTC+7)
- **Date Format**: Christian Era (CE) - YYYY-MM-DD
- **Working Days**: Monday to Friday (unless specified otherwise)
- **File Creation**: Create new file for each working session

```markdown
# Development Session Retrospective - [Date]

## 📋 Session Summary

- **Duration**: [Start Time] - [End Time] (Thailand Time)
- **Focus Area**: [Main area of work]
- **Participants**: [Team members involved]
- **Medical Device Context**: [Compliance considerations]

## ⏰ Timeline (Thailand Timezone: UTC+7)

- **[HH:MM]** - [Activity description]
- **[HH:MM]** - [Activity description]
- **[HH:MM]** - [Activity description]

## 🎯 What Was Accomplished

- [Specific achievements]
- [Features implemented]
- [Bugs fixed]
- [Medical device compliance updates]
- [Hardware integration progress]

## 🤖 AI Development Diary

### Technical Decisions Made

- [Architecture choices with medical device rationale]
- [Hardware controller modifications]
- [License system updates]
- [Database schema changes]

### Code Patterns Applied

- [Medical device compliance patterns]
- [Hardware communication patterns]
- [Audit logging implementations]
- [Error handling approaches]

## 💭 Honest Feedback & Reflection

### What Went Really Well

- [Successful implementations]
- [Effective problem-solving approaches]
- [Good medical device compliance practices]
- [Smooth hardware integration]

### What Could Be Improved

- [Areas for enhancement]
- [Process improvements needed]
- [Medical compliance gaps]
- [Hardware communication issues]

## 🚧 Blockers & Resolutions

### Issues Encountered

- **Issue**: [Description]
  - **Impact**: [Medical device/hardware impact]
  - **Resolution**: [How it was solved]
  - **Prevention**: [How to avoid in future]

### Outstanding Blockers

- [Unresolved issues]
- [Medical compliance concerns]
- [Hardware integration challenges]

## 📚 Lessons Learned

### Technical Insights

- [New understanding about medical device development]
- [Hardware communication learnings]
- [License system insights]
- [Database optimization discoveries]

### Process Improvements

- [Workflow enhancements]
- [Medical compliance process improvements]
- [Testing strategy refinements]

## 🎯 Next Session Focus

### Immediate Priorities

- [Critical medical device tasks]
- [Hardware integration needs]
- [License system requirements]
- [Compliance updates]

### Technical Debt

- [Code refactoring needs]
- [Medical compliance updates]
- [Hardware controller improvements]
- [Documentation updates]

## 📊 Session Metrics

- **Files Modified**: [Number and types]
- **Medical Compliance**: [Compliance status]
- **Hardware Tests**: [Test results]
- **License System**: [Validation status]
- **Code Quality**: [Assessment]

---

_Generated on [Date] at [Time] Thailand Time (UTC+7)_
```

#### Original Thai Template (Alternative)

```markdown
# Retrospective วันที่ [วัน-เดือน-ปี]

## 1. งานที่ทำไป

- [Topic/Task 1]
  - [รายละเอียดงานย่อย]
  - [รายละเอียดงานย่อย]
- [Topic/Task 2]
  - [รายละเอียดงานย่อย]

## 2. Bug/Error ที่เกิดขึ้นและการแก้ไข

- [Bug/Error 1]
  - สาเหตุ: [อธิบายสาเหตุ]
  - วิธีแก้ไข: [อธิบายวิธีแก้ไข]
- [Bug/Error 2]
  - สาเหตุ: [อธิบายสาเหตุ]
  - วิธีแก้ไข: [อธิบายวิธีแก้ไข]

## 3. สิ่งที่ได้เรียนรู้ (Lesson Learned)

- [Lesson 1]
- [Lesson 2]
- [Lesson 3]

## 4. สิ่งสำคัญและข้อควรจำ

- [ข้อควรระวัง 1]
- [สิ่งที่ต้องจำ 2]
- [ข้อสังเกตสำคัญ 3]

## 5. หมายเหตุเพิ่มเติม (ถ้ามี)

- [หมายเหตุ 1]
- [หมายเหตุ 2]

## 6. แผนของวันพรุ่งนี้ (ถ้ามี)

- [แผนงาน 1]
- [แผนงาน 2]
- [แผนงาน 3]
```

#### Timezone Guidelines for Retrospectives

- **ALL timestamps** must use Thailand timezone (UTC+7)
- **File naming** must use Thailand date: `session-YYYY-MM-DD-[description].md`
- **Timeline entries** should reference Thailand local time
- **Session duration** should be calculated in Thailand timezone

#### Medical Device Retrospective Focus

- **Compliance Tracking**: Document all medical device compliance considerations
- **Hardware Safety**: Record hardware communication tests and validations
- **License System**: Track ESP32 license system integrity and updates
- **Audit Trail**: Verify audit logging functionality and compliance
- **Error Handling**: Document Thai language error message preservation
- **Risk Assessment**: Evaluate medical device risks and mitigation strategies

### Maintenance & Review

- **`=check-md > [section]`**: Use this command when you think the core project architecture or tools have changed significantly. I will then review the project context and provide a summary of potential updates or missing information for the `claude.md` file. This command should be used sparingly.
- **ตัวอย่างการใช้งาน**:
  - `=check-md` (ตรวจสอบทั้งไฟล์)
  - `=check-md > Architecture Overview` (ตรวจสอบเฉพาะส่วน `Architecture Overview` ว่ามีข้อมูลใดที่ล้าสมัยหรือไม่)
  - `=check-md > Core Code Patterns` (ตรวจสอบเฉพาะส่วน `Core Code Patterns` ว่ามีรูปแบบโค้ดใหม่ๆ ที่ควรเพิ่มหรือไม่)

---

## 🔧 Troubleshooting

### Medical Device System Issues

#### Hardware Communication Failures

**Symptoms**: DS12/DS16 devices not responding, serial communication errors

**Diagnosis Steps**:

```bash
# Check serial port availability
npm run dev:check-ports

# Test hardware connection
npm run test:hardware

# Verify device configuration
echo $DEVICE_TYPE  # Should be DS12 or DS16
```

**Common Solutions**:

- Verify RS485 cable connections
- Check device power supply (24V DC)
- Validate `DEVICE_TYPE` environment variable
- Restart hardware controllers: `BuildTimeController.getInstance().restart()`
- Check audit logs for hardware communication patterns

#### License System Issues

**Symptoms**: ESP32 license validation failures, hardware binding errors

**Diagnosis Steps**:

```bash
# Check ESP32 connectivity
npm run license:check-esp32

# Validate license file integrity
npm run license:validate

# Test WiFi connectivity
npm run license:test-wifi
```

**Common Solutions**:

- Verify ESP32 device is powered and connected to WiFi
- Check license file encryption integrity
- Validate MAC address binding
- Re-deploy ESP32 firmware if necessary
- Check license expiration and renewal status

#### Database Issues

**Symptoms**: SQLite corruption, audit trail inconsistencies, migration failures

**Diagnosis Steps**:

```bash
# Check database integrity
npm run db:check-integrity

# Verify audit trail consistency
npm run audit:verify

# Test database connections
npm run db:test-connection
```

**Common Solutions**:

- Backup current database: `npm run db:backup`
- Run database repair: `npm run db:repair`
- Re-run migrations: `npm run db:migrate`
- Restore from backup if corruption is severe
- Verify audit logging is functioning correctly

#### Authentication System Issues

**Symptoms**: Passkey validation failures, user authentication errors

**Diagnosis Steps**:

```bash
# Test authentication system
npm run auth:test

# Check user database integrity
npm run auth:check-users

# Verify passkey encryption
npm run auth:verify-passkeys
```

**Common Solutions**:

- Reset user passkeys through admin interface
- Verify authentication database tables
- Check audit trail for authentication attempts
- Validate medical device access control patterns

### Build & Development Issues

#### Electron Build Failures

**Symptoms**: Build process fails, packaging errors, missing dependencies

**Diagnosis Steps**:

```bash
# Clean build cache
npm run clean

# Rebuild native modules
npm run rebuild

# Check for missing dependencies
npm audit
```

**Common Solutions**:

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Rebuild native dependencies: `npm run electron:rebuild`
- Check electron-builder configuration in `electron-builder.yml`
- Verify all required certificates for code signing

#### Development Server Issues

**Symptoms**: Hot reload not working, renderer process crashes, IPC communication failures

**Diagnosis Steps**:

```bash
# Check development server status
npm run dev:status

# Test IPC communication
npm run test:ipc

# Verify renderer process
npm run dev:renderer-only
```

**Common Solutions**:

- Restart development server: `npm run dev`
- Clear Next.js cache: `rm -rf .next`
- Check for port conflicts (default: 3000, 3001)
- Verify IPC channel configurations

### Performance Issues

#### Slow Hardware Response

**Symptoms**: Delayed dispensing operations, timeout errors

**Solutions**:

- Check serial communication baud rate settings
- Optimize hardware controller polling intervals
- Verify RS485 network topology and termination
- Monitor system resource usage during operations

#### Database Performance

**Symptoms**: Slow queries, audit trail delays

**Solutions**:

- Analyze query performance: `npm run db:analyze`
- Optimize database indexes for audit tables
- Archive old audit records: `npm run audit:archive`
- Monitor SQLite WAL mode performance

#### Memory Usage

**Symptoms**: High memory consumption, application crashes

**Solutions**:

- Monitor Electron process memory usage
- Check for memory leaks in hardware controllers
- Optimize renderer process component lifecycle
- Review audit logging buffer sizes

### Emergency Procedures

#### System Recovery

1. **Stop all hardware operations** immediately
2. **Backup current database** and audit logs
3. **Document the incident** with timestamps and error messages
4. **Contact medical device support** for critical issues
5. **Follow medical device incident reporting** procedures

#### Data Recovery

1. **Locate latest backup**: Check `backups/` directory
2. **Verify backup integrity**: `npm run backup:verify`
3. **Restore database**: `npm run db:restore [backup-file]`
4. **Validate audit trail**: Ensure all medical operations are logged
5. **Test hardware communication** after restoration

---

## Core Code Patterns

### When Working with Hardware Controllers

- **Always** use `BuildTimeController.getCurrentController()` to ensure a single instance and compliance.
- Use controller methods that match the legacy KU16 API for compatibility.

### When Working with Design System Components

- Import components from the centralized `DesignSystem` directory.
- Use consistent patterns like `<DialogBase>`, `<DialogHeader>`, and `<DialogButton>`.

### When Working with Responsive Grid

- Use the utility functions `getDisplaySlotConfig()` and `getResponsiveGridConfig()` to adapt the UI to the device type (DS12 or DS16).

### When Working with CSV Batch Processing

- Use `processBatchLicenses()` from `@/modules/batch-license-generator`.

### When Working with No Expiry Licenses

- Implement the `noExpiry` checkbox in the UI.
- The CLI automatically handles the `2099-12-31` date.

```javascript
// License validation pattern for perpetual licenses
const validatePerpetualLicense = async (licenseData) => {
  // Skip expiry date validation for perpetual licenses
  if (licenseData.type === "perpetual") {
    return validateHardwareBinding(licenseData);
  }

  // Standard validation for time-limited licenses
  return validateStandardLicense(licenseData);
};
```

---

## 📊 Performance Monitoring

### Medical Device Performance Metrics

#### Hardware Communication Monitoring

```javascript
// Monitor hardware response times
const monitorHardwarePerformance = () => {
  const metrics = {
    responseTime: [], // Track DS12/DS16 response times
    errorRate: 0, // Track communication failures
    throughput: 0, // Operations per minute
    uptime: 0, // Hardware availability percentage
  };

  // Log metrics for medical device compliance
  auditLogger.logPerformanceMetrics(metrics);
};
```

#### License System Performance

```javascript
// Monitor ESP32 license validation performance
const monitorLicensePerformance = () => {
  const licenseMetrics = {
    validationTime: [], // ESP32 response times
    wifiConnectivity: 0, // WiFi connection stability
    encryptionTime: [], // AES-256-CBC performance
    bindingSuccess: 0, // Hardware binding success rate
  };

  // Track for compliance and system reliability
  auditLogger.logLicenseMetrics(licenseMetrics);
};
```

#### Database Performance Monitoring

```javascript
// Monitor SQLite performance for medical compliance
const monitorDatabasePerformance = () => {
  const dbMetrics = {
    queryTime: [], // Query execution times
    auditLogSize: 0, // Audit trail growth rate
    backupTime: [], // Backup operation duration
    integrityChecks: 0, // Database integrity validation
  };

  // Essential for medical device audit requirements
  auditLogger.logDatabaseMetrics(dbMetrics);
};
```

### System Health Monitoring

#### Real-time Health Checks

- **Hardware Status**: Continuous monitoring of DS12/DS16 device connectivity
- **License Validation**: Regular ESP32 license system health checks
- **Database Integrity**: Automated audit trail consistency verification
- **Memory Usage**: Electron process memory monitoring and leak detection
- **Network Connectivity**: WiFi stability for license system communication

#### Performance Thresholds

- **Hardware Response**: < 500ms for dispensing operations
- **License Validation**: < 2 seconds for ESP32 communication
- **Database Queries**: < 100ms for standard operations
- **Audit Logging**: < 50ms for compliance record creation
- **System Startup**: < 30 seconds for full system initialization

#### Alerting & Notifications

```javascript
// Medical device performance alerting
const performanceAlerting = {
  hardwareTimeout: () => {
    // Critical: Hardware not responding
    auditLogger.logCriticalAlert("Hardware communication timeout");
    notifyMedicalStaff("CRITICAL: Dispensing system offline");
  },

  licenseFailure: () => {
    // Critical: License system failure
    auditLogger.logCriticalAlert("License validation failure");
    disableSystemOperations();
  },

  auditTrailIssue: () => {
    // Critical: Audit logging failure
    auditLogger.logCriticalAlert("Audit trail integrity compromised");
    requireImmediateAttention();
  },
};
```

### Compliance Reporting

#### Automated Performance Reports

- **Daily Performance Summary**: Hardware, license, and database metrics
- **Weekly Compliance Report**: Audit trail integrity and system reliability
- **Monthly System Health**: Comprehensive performance analysis
- **Incident Reports**: Automated generation for medical device compliance

#### Performance Data Retention

- **Real-time Metrics**: 24 hours of detailed performance data
- **Daily Summaries**: 1 year of daily performance reports
- **Incident Logs**: Permanent retention for medical device compliance
- **Audit Trails**: Permanent retention as required by medical regulations

---

_Last Updated: [Current Date] - Thailand Time (UTC+7)_
_Medical Device Compliance Version: SMC-2024.1_
_Hardware Support: DS12/DS16 Dispensing Systems_
_License System: ESP32-based Hardware Binding_
