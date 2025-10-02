# Smart Medication Cart (SMC) - Agent Development Guide

**CRITICAL**: This is a **safety-critical medical device software** requiring strict compliance patterns for audit trails, error handling, and hardware communication protocols.

**IMPORTANT**: This file contains **SMC-specific rules only**. For global development standards that apply to all projects, see <mcfile name="user_rules.md" path="d:/dev/smc/smc-app/.trae/rules/user_rules.md"></mcfile>.

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

## SMC Development Environment

**Operating System**: Windows 11
**Node.js Version**: 18.x
**npm Version**: 9.x
**React Version**: 18.x
**Typescript Version**: 5.x
**Electron Version**: 25.x

## SMC-Specific Coding Requirements

- **Interfaces and Type Must be in the `/interfaces` folder only**
- **All React Component Must be in the `/src/app/components` folder only**
- **All React Hook Must be in the `/src/app/hooks` folder only**
- **Medical Device Compliance**: All code must follow medical device standards
- **Thai Language Support**: Preserve exact Thai language error messages for medical device certification

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

#### 🚨 CRITICAL SAFETY RULE - Git Operations

- **NEVER use `git add -f` (force add)** - This command bypasses .gitignore safety mechanisms and can commit sensitive medical device data, configuration files, or ignored directories that contain patient information or proprietary medical algorithms. All files must respect .gitignore rules for medical device compliance and data protection.

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

## Agent-Driven Development Workflows

### Critical Time Synchronization for Medical Device Development

**MANDATORY**: All development activities **MUST** use Thailand timezone (UTC+7) for medical device compliance and audit trail consistency.

- **File Naming**: All retrospective files, logs, and documentation must use Thailand date format
- **Timestamps**: All commit messages, PR descriptions, and issue updates must reference Thailand time
- **Audit Compliance**: Medical device audit trails require consistent timezone for regulatory compliance
- **Session Tracking**: Development sessions must be tracked in Thailand local time for compliance reporting

### Medical Device Logging Strategy

All development activities **MUST** use standardized logging prefixes for medical device compliance:

- **`INFO:`**: General information (production and development environments)
- **`ERROR:`**: Error messages requiring immediate attention (production and development)
- **`DEBUG:`**: Debug messages (development environments only, never in production)
- **`MEDICAL:`**: Medical device specific operations requiring audit trail
- **`HARDWARE:`**: Hardware communication and controller operations
- **`LICENSE:`**: ESP32 license system operations and validation

### SMC-Specific Iteration Notes Management

**CRITICAL**: For SMC medical device development, iteration notes **MUST** be managed as follows:

- **Reading Order**: **ALWAYS** read iteration notes **BEFORE** planning to understand recent medical device context
- **Ordering**: Display iteration notes in **descending order (newest first)**: 5, 4, 3, 2, 1 for easier reading
- **Medical Context**: Use iteration notes to understand recent medical device decisions and compliance requirements
- **Summary**: After final PR, create a summary of key medical device iteration notes for audit trail

### SMC Build and Linting Validation

**MANDATORY**: For medical device compliance, all code **MUST** pass validation before commit and PR:

- **Pre-Commit Validation**: 
  - Run `npm run build` to ensure compilation success
  - Run `npm run lint` to ensure code quality standards
  - Run `npm run type-check` for TypeScript validation
  - **NEVER** commit code that fails any validation step

- **Pre-PR Validation**:
  - All build and linting checks must pass
  - Medical device specific tests must pass
  - Hardware communication tests (if applicable) must pass

### SMC Framework Detection

**CRITICAL**: The agent **MUST** detect and remember the SMC framework context:

- **Detection Methods**: Check `package.json` for Electron, Next.js, React versions
- **SMC Context**: Remember this is an Electron + Next.js + React medical device application
- **Hardware Context**: Remember DS12/DS16 hardware controllers and ESP32 license system
- **Medical Device Context**: Always consider medical device compliance in all decisions

### Local Context Management for Medical Device Development

The agent **MUST** maintain local context management for medical device compliance and audit tracking:

1. **Local Context File** (`=fcs`): Updates `current-focus.md` with iteration-based medical device development focus
2. **Task Issue** (`=plan`): Specific medical device implementation plan with safety considerations in GitHub

**Medical Device Safety Protocol**: This pattern ensures medical device development maintains proper documentation and audit trails required for medical device compliance through local file management and GitHub task tracking.

### SMC Solo Developer Workflow

**CRITICAL**: For SMC medical device development as a solo developer:

- **Simple Structure**: Maintain clean folder structure without over-engineering for medical device compliance
- **Real Data Only**: **NEVER** use mock data unless explicitly requested - always work with real medical device data structures
- **Efficient Communication**: Minimize unnecessary confirmation steps for standard medical device operations
- **Ask for Confirmation**: **ONLY** for:
  - Major medical device architecture changes
  - Critical security decisions affecting patient safety
  - Hardware communication protocol changes
  - ESP32 license system modifications
  - Database schema changes affecting audit trails

### Agent-Driven Shortcut Commands for Medical Device Development

- **`=update-kb`**: **CRITICAL MEDICAL DEVICE KNOWLEDGE BASE UPDATE** - Updates project knowledge base with medical device compliance analysis:

  - **Medical Compliance Analysis**: Reviews all changes for medical device regulatory compliance
  - **Hardware Integration Review**: Analyzes DS12/DS16 hardware controller modifications
  - **License System Validation**: Validates ESP32 license system integrity and security
  - **Audit Trail Synchronization**: Ensures all medical device operations are properly logged
  - **Safety Pattern Documentation**: Documents new medical device safety patterns and procedures
  - **Regulatory Compliance Check**: Verifies adherence to medical device development standards

- **`=fcs > [message]`**: **MEDICAL DEVICE CONTEXT MANAGEMENT** - Updates local `current-focus.md` file with iteration-based medical device compliance focus:

  - **Medical Device Context**: Updates development focus with medical device safety considerations
  - **Compliance Tracking**: Ensures all development activities align with medical device standards
  - **Safety Documentation**: Documents current medical device development priorities in local context file
  - **Iteration-Based Management**: Uses newest-first ordering for easy access to recent medical device context

- **`=plan > [question/problem]`**: **MEDICAL DEVICE IMPLEMENTATION PLANNING** - Creates or updates GitHub Task Issue with detailed medical device implementation plan:

  - **Safety-First Planning**: Prioritizes medical device safety in all implementation plans
  - **Hardware Integration Planning**: Plans DS12/DS16 hardware controller modifications
  - **License System Planning**: Plans ESP32 license system modifications with security considerations
  - **Audit Trail Planning**: Plans audit logging and compliance reporting requirements
  - **Medical Device Validation**: Plans testing and validation procedures for medical device compliance

- **`=impl`**: **MEDICAL DEVICE IMPLEMENTATION EXECUTION** - Executes planned medical device implementation with safety protocols:

  - **Safety-First Implementation**: Implements medical device features with safety as top priority
  - **Hardware Safety Validation**: Validates all hardware controller modifications for safety
  - **License System Security**: Implements ESP32 license system modifications with security validation
  - **Audit Trail Implementation**: Implements comprehensive audit logging for medical device compliance
  - **Medical Device Testing**: Executes thorough testing procedures for medical device validation

### 🌿 Enhanced Implementation Strategy

**ENHANCED AUTOMATION**: All development workflows now include full automation to ensure consistent adherence to medical device guidelines.

#### Medical Device Branch Management

- **ALWAYS** create feature branches: `feature/[issue-number]-[description]`
- **NEVER** work directly on main branch
- **Workflow**: Analysis → Branch → Implementation → Build → Commit → PR → Updates

#### TodoWrite Integration Patterns

**High-Impact Usage**: Complex refactoring (3+ files), multi-phase implementations, large system changes
**Best Practices**: 5-8 specific todos, exactly ONE in_progress, complete immediately after finishing

### 🌿 Automated Workflow Implementation

**ENHANCED AUTOMATION**: All development workflows now include full automation to ensure consistent adherence to project guidelines.

#### Enhanced Command Behavior

The following commands now include **FULL WORKFLOW AUTOMATION**:

##### `=impl` Command Enhancement (Iterative Focus)

**Automated Execution Flow:**

```
1. Read current-focus.md and GitHub Task Issue → Extract requirements and scope
2. **Auto-Branch Creation** → feature/[issue-number]-[sanitized-description] (if needed)
3. **Context Retrieval** → READ notes/iteration_[branch_name].md for To-Do list
4. **Medical Device Validation** → Verify hardware safety and compliance requirements
5. **Implementation** → Execute with medical device safety protocols
6. **Build & Linting Validation** → **MANDATORY** SMC-specific checks:
   - `npm run build` (Electron + Next.js build)
   - `npm run lint` (ESLint + TypeScript)
   - `npm run type-check` (TypeScript validation)
   - Medical device hardware tests (if applicable)
   - ESP32 license system validation (if applicable)
7. **Iteration Note Update** → Append Iteration X details and new Remaining Tasks
8. **Auto-Commit & Push** → Commit updated code and Note file on current branch
9. User Notification → Provide commit hash for review and continuation
```

##### TodoWrite Integration Enhancement

**Performance Impact from Retrospectives**: 56% faster implementations when TodoWrite is integrated

**Enhanced Implementation Flow with TodoWrite (Inside Impl Agent):**

```
1. Parse GitHub Task Issue → Extract requirements and scope
2. Initialize TodoWrite → Create 5-8 specific, actionable todos (If starting Iteration 1)
3. Implementation Phase → Execute with real-time todo tracking
   ├─ Mark exactly ONE todo as 'in_progress' at a time
   ├─ Complete todos immediately after finishing each step
   ├─ Update progress visibility for stakeholders
   └─ Ensure accountability for all implementation steps
4. **Iteration Note Update** → Record TodoWrite completion status and Remaining Tasks
5. Auto-Commit & Push → Descriptive commits with proper formatting
6. User Notification → Provide commit hash
```

**TodoWrite Performance Benefits:**

- **Visibility**: Real-time progress tracking for stakeholders
- **Accountability**: Prevents skipping critical implementation steps
- **Focus**: Reduces context switching during complex implementations
- **Efficiency**: Proven 15-minute implementations vs 34-minute baseline
- **Documentation**: Creates audit trail of implementation progress

**High-Impact TodoWrite Usage Patterns:**

```markdown
✅ Complex multi-component refactoring (3+ files)
✅ Full-stack implementations (API + Frontend)
✅ Multi-phase system changes (Database + Application)
✅ Pattern replication following proven approaches
✅ Large refactoring with dependency management

❌ Single file edits or trivial changes
❌ Simple documentation updates
❌ Quick bug fixes without multiple steps
```

##### Branch Naming Convention

- **Format**: `feature/[issue-number]-[sanitized-description]`
- **Source**: All feature branches **MUST** be created from `staging` branch
- **Flow**: `feature/[issue] → staging → main`
- **Example**: `feature/27-deployment-production-implementation`
- **Auto-sanitization**: Removes special characters, converts to kebab-case

##### Commit Message Standards

- **Format**: `[type]: [description] (#[issue-number])`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Example**: `feat: implement user authentication system (#25)`

##### Pull Request Automation (PR Agent Role)

**Staging PRs** (Feature → Staging):

- **Title**: `[STAGING] [Feature Title] (#[issue-number])`
- **Description**: Implementation details, testing notes, **Summary of Iteration Note (AI Diary)**
- **Context File**: References `staging-context.md` for deployment details
- **Issue Linking**: `Relates to #[issue-number]` (keeps issue open for production)

**Production PRs** (Staging → Main):

- **Title**: `[PRODUCTION] [Feature Title] (#[issue-number])`
- **Description**: Production deployment summary, staging validation results
- **Context File**: Includes staging validation and production readiness checklist
- **Issue Linking**: `Closes #[issue-number]` (closes issue after production deployment)

#### Workflow Safety Measures

**Enhanced Branch Protection**:

- **Main Branch**: Requires 2+ approvals, status checks, up-to-date branches
- **Staging Branch**: Requires 1+ approval, automated testing, conflict resolution
- **Feature Branches**: Standard protection, automated conflict detection

**Staging Sync Protocol**:

- **Pre-Implementation**: Always sync staging with main before creating feature branches
- **Pre-Staging**: Ensure feature branch is up-to-date with staging before PR
- **Pre-Production**: Validate staging branch is ready for main merge

**Conflict Prevention**:

- **Staging-First Rule**: All features go through staging before production
- **Sync Validation**: Automated checks for branch synchronization
- **Emergency Protocol**: Immediate conflict resolution for critical deployments

**CRITICAL RULES**:

- **NEVER** work directly on main/staging branches
- **ALWAYS** create feature branches from staging
- **ALWAYS** deploy to staging before production
- **ALWAYS** validate staging deployment before main PR

### Implementation Guidelines for Automated Workflow

#### Pre-Implementation Checks

- ✅ Verify current-focus.md and GitHub Task Issue exist and are properly formatted
- ✅ Ensure no conflicting branches exist
- ✅ Confirm GitHub CLI is authenticated and functional
- ✅ Validate repository permissions for branch creation and PR management

#### Error Handling and Fallbacks

- **Branch Creation Failure**: Falls back to manual branch creation with user guidance
- **Push Failure**: Provides manual push commands and troubleshooting steps
- **PR Creation Failure**: Provides manual PR creation commands with pre-filled templates (for PR Agent)
- **Issue Update Failure**: Logs error and provides manual update instructions

#### Quality Assurance

**Staging PR Requirements**:

- **Reviewers**: Minimum 1 reviewer approval required
- **Automated Checks**: Build validation, type checking, linting
- **Context File**: Must reference `staging-context.md` with deployment details
- **Testing**: Feature testing in staging environment
- **Documentation**: Implementation details and staging deployment notes

**Production PR Requirements**:

- **Reviewers**: Minimum 2 reviewer approvals required
- **Automated Checks**: Full test suite, security scans, performance validation
- **Context File**: Staging validation results and production readiness checklist
- **Testing**: Comprehensive staging validation and production deployment testing
- **Documentation**: Production deployment summary and rollback procedures

**General Quality Standards**:

- **Security Review**: All PRs undergo security validation for sensitive changes
- **Rollback Readiness**: Clear instructions for reverting changes if needed
- **Audit Trail**: Complete documentation of changes and approval process

#### Monitoring and Feedback

- **Progress Tracking**: Real-time updates during implementation phases
- **Success Metrics**: PR creation success rate and review completion time
- **User Feedback**: Continuous improvement based on workflow effectiveness
- **Audit Trail**: Complete history of automated actions for debugging

---

## 🛡️ Security Implementation Methodology

_Based on comprehensive security audit sessions documented in retrospectives_

### Systematic Security Audit Approach

**8-Phase Security Audit Process** (31-minute comprehensive audits):

1.  **Infrastructure Analysis** (2-3 min): Environment variables, database schema, authentication
2.  **Core Endpoint Analysis** (5-8 min): Input validation, rate limiting, error handling, authorization
3.  **Data Integrity Analysis** (3-5 min): Transaction security, data flow assessment, logging
4.  **Compliance Assessment** (3-5 min): PCI DSS, GDPR, industry standards
5.  **Vulnerability Testing** (5-8 min): Injection prevention, authentication bypass, authorization
6.  **Security Implementation** (8-12 min): Rate limiting, input validation, error hardening
7.  **Build Validation** (2-3 min): TypeScript compilation, dependency validation
8.  **Documentation & Reporting** (3-5 min): Security audit report, compliance metrics

### Enterprise-Grade Security Measures

#### Critical Security Implementations

- **Rate Limiting**: 15-minute windows, configurable limits per endpoint
- **Input Validation**: Comprehensive Zod schemas for all API endpoints
- **Secure Error Handling**: Generic error responses prevent information disclosure
- **Webhook Security**: Signature validation with timestamp-based replay protection

### Security Compliance Metrics

**Measurable Improvements from Security Audits**:

- **PCI DSS Compliance**: 65% → 85% improvement documented
- **Critical Vulnerabilities**: 5 critical issues → 0 critical issues
- **High-Priority Issues**: 8 high-priority → 2 high-priority resolved
- **Security Score**: Significant improvement in enterprise security standards

### Security Best Practices from Retrospectives

**Key Security Areas**:

- **Webhook Security**: Validate signatures, prevent replay attacks, never log secrets
- **Payment System**: Server-side validation, discount verification, transaction integrity
- **Error Handling**: Generic error responses, sanitized logging

---

## 🎨 UI/UX Design Integration Guidelines

_Based on style refactoring and accessibility improvement sessions_

### Visual Design Validation Requirements

**CRITICAL**: Visual design quality is equally important as functional implementation, especially for customer-facing features.

#### Pre-Implementation Design Checklist

```markdown
✅ Color contrast validation (WCAG 2.1 AA compliance)
✅ Accessibility standards verification
✅ Responsive design across device sizes
✅ Typography hierarchy consistency
✅ Animation performance optimization
✅ Reduced motion preference support
```

#### Design Quality Assurance Process

**3-Phase Approach**:

1.  **Design System Integration**: Follow component patterns, centralized utilities (60% duplication reduction)
2.  **Accessibility Implementation**: WCAG 2.1 AA compliance (4.5:1 contrast), keyboard navigation, screen reader support, reduced motion
3.  **Performance Optimization**: 60fps animations, bundle size monitoring, critical CSS, responsive images

### Centralized Styling Architecture

- **Utility-Based System**: Centralized styling utilities in `src/utils/campaignStyles.ts`
- **TypeScript Interfaces**: Proper typing for styling configurations
- **Accessibility Integration**: Built-in WCAG compliance and reduced motion support
- **60% Duplication Reduction**: Proven efficiency through centralized approach

### Marketing Component Requirements

**Campaign Elements**: High visual impact, enhanced contrast for promotional text, clear visual hierarchy, A/B testing ready

### Design Review Integration

**Visual Review Steps**: Browser preview, contrast analysis, multi-device testing, accessibility testing, motion testing

**Common Pitfalls to Avoid**: Poor color choices, inconsistent spacing, animation overuse, desktop-only thinking, accessibility afterthoughts

---

## ⚡ Efficiency Patterns & Performance Optimization

_Based on documented performance improvements from retrospective analysis_

### 🏃‍♂️ 15-Minute Implementation Strategy

**Results**: 15-minute implementations vs 34+ minute baseline

**Prerequisites**: Reference pattern, TodoWrite initialized, component structure analyzed, integration points identified

**Speed Optimization Techniques**:

1.  **Pattern Recognition**: 56% faster when following proven patterns from `/docs/retrospective/`
2.  **MultiEdit**: Batch multiple edits instead of sequential single edits
3.  **Systematic Analysis**: 2-3 minute analysis of target areas and integration points
4.  **Build Validation**: `npm run build` after major changes, `npx tsc --noEmit` for type checking

#### Efficiency Factor Analysis

**High Efficiency Sessions** (15-20 minutes):

- ✅ TodoWrite usage for progress tracking
- ✅ Reference pattern available
- ✅ Clear component structure understanding
- ✅ Systematic 5-phase approach
- ✅ Proactive build validation

**Low Efficiency Sessions** (45+ minutes):

- ❌ No reference pattern
- ❌ Schema assumptions without verification
- ❌ Working directly on main branch
- ❌ Build testing only at end
- ❌ Complex dependency analysis needed

### 🎯 High-Impact Optimization Areas

#### 1\. TodoWrite Integration ROI

- **Setup Time**: 2-3 minutes
- **Visibility Benefit**: Real-time progress tracking
- **Accountability**: Prevents skipping critical steps
- **Stakeholder Communication**: Clear progress indicators
- **Proven Results**: 56% faster implementations documented

#### 2\. Reference Pattern Utilization

- **Pattern Documentation**: Create detailed retrospectives
- **Pattern Library**: Maintain `/docs/retrospective/` as reference
- **Systematic Replication**: Follow proven approaches exactly
- **Context Adaptation**: Modify only necessary elements

#### 3\. Tool Optimization

- **Efficient Pattern**: Read (targeted) → MultiEdit (batch) → Build (validation)
- **Avoid**: Multiple single Edits → Multiple Reads → Late build testing

#### 4\. Workflow Adherence

- **Branch Management**: Always create feature branches
- **Incremental Testing**: Build validation at each phase
- **Documentation Standards**: Comprehensive PR descriptions
- **Context Tracking**: Real-time local context file updates

### 🔄 Continuous Improvement Framework

**Session Performance Tracking**: Track implementation time, document efficiency factors, identify workflow violations, measure pattern success rates

**Pattern Development Lifecycle**: Novel Implementation → Pattern Recognition → Pattern Refinement → Pattern Maturation (sub-20-minute implementations)

## 🛠️ Development Commands

### Core Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### AI Prompt Management

```bash
# List all prompts
npm run prompt:list

# Update prompt
npm run prompt:update

# Test prompts
npm run prompt:test

# Analyze prompt performance
npm run prompt:analyze
```

---

## 📈 Retrospective Workflow

When you use the `=rrr` command, the agent will create a file and an Issue with the following sections and details:

### Retrospective Structure

**Required Sections**:

- **Session Details**: Date (YYYY-MM-DD Thailand timezone), Duration, Focus, Issue/PR references
- **Session Summary**: Overall work accomplished
- **Timeline**: Key events with Thailand timestamps (Asia/Bangkok, UTC+7)
- **📝 AI Diary** (MANDATORY): First-person reflection on approach and decisions
- **💭 Honest Feedback** (MANDATORY): Performance assessment and improvement suggestions
- **What Went Well**: Successes achieved
- **What Could Improve**: Areas for enhancement
- **Blockers & Resolutions**: Obstacles and solutions
- **Lessons Learned**: Patterns, mistakes, and discoveries

**File Naming**: `session-YYYY-MM-DD-[description].md` with Thailand date

---

## 📚 Best Practices from Retrospectives

_Lessons from 10+ development sessions in `/docs/retrospective/`_

### 🎯 TodoWrite Integration Best Practices

**Results**: **15-minute implementations** vs 34+ minute sessions

**When to Use**: Complex multi-step tasks (3+ phases), multi-component refactoring, full-stack implementations, large refactoring projects, security audits, campaign development, database migrations

**Workflow Pattern**:

1.  Break into 5-12 manageable todos
2.  Mark exactly ONE todo in_progress → completed
3.  Provides real-time visibility and accountability
4.  Enables accurate time estimation

**Proven Benefits**: 56% faster implementation, reduces context switching, prevents missing steps, ensures comprehensive testing

#### Advanced TodoWrite Patterns

- **Security Implementations**: 8-phase systematic approach (31-minute completion)

  - Phases 1-2: Infrastructure & Core Endpoint Analysis
  - Phases 3-4: Data Integrity & Compliance Assessment
  - Phases 5-6: Vulnerability Testing & Security Implementation
  - Phases 7-8: Build Validation & Documentation

- **UI/UX Refactoring**: 4-phase centralized styling development

  - WCAG compliance audit → Centralized utilities → Component integration → Performance optimization

### 🔄 Pattern Replication Strategy

#### Reference Implementation Approach

1.  **Document Successful Patterns**: Create detailed retrospectives for reusable approaches
2.  **Systematic Replication**: Use previous session files as implementation guides
3.  **Adapt, Don't Recreate**: Modify proven patterns for new contexts
4.  **Measure Efficiency**: Track implementation time improvements

#### Proven Pattern Examples

- **UI Consolidation**: Reward card → chip integration (achieved 56% speed improvement)
- **Component Refactoring**: Systematic removal and integration approaches
- **API Updates**: Phase-by-phase endpoint migration strategies

### ⚡ Build Validation Checkpoints

#### Critical Validation Points

- **Schema Changes**: `npm run build && npx tsc --noEmit`
- **API Modifications**: `npm run build 2>&1 | grep -A 5 "error"`
- **Large Refactoring**: `npx prisma generate && npm run build`

#### Proactive Testing Strategy

- **Incremental Builds**: Test builds after each major change, not just at the end
- **TypeScript Validation**: Run `npx tsc --noEmit` for pure type checking
- **Dependency Verification**: Check imports and exports after file restructuring
- **Database Sync**: Verify `npx prisma generate` after schema changes

### 🗄️ Schema Investigation Protocol

#### Before Implementation Checklist

1.  **Verify Database Schema**: Always check actual Prisma schema definitions
2.  **Trace Data Structures**: Follow interface definitions through the codebase
3.  **Validate Field Names**: Don't assume field naming conventions
4.  **Check Relationships**: Understand model relationships before querying

#### Common Schema Pitfalls

- **Assumption Errors**: Making assumptions about field names/structures
- **Interface Misalignment**: Frontend interfaces not matching database schema
- **Relationship Complexity**: Not understanding foreign key relationships
- **Type Mismatches**: TypeScript interfaces not reflecting actual data structures

### 🔧 Multi-Phase Implementation Approach

#### Systematic Phase Breakdown

- **Phase 1**: Analysis & Preparation (10-15%)
- **Phase 2**: Core Implementation (40-50%)
- **Phase 3**: Integration & Testing (25-30%)
- **Phase 4**: Documentation & Cleanup (10-15%)

#### Phase Management Best Practices

- **Clear Phase Objectives**: Define specific deliverables for each phase
- **Dependency Mapping**: Identify cross-phase dependencies upfront
- **Progress Checkpoints**: Validate phase completion before proceeding
- **Context Tracking**: Update local context file after each phase completion

### 🛡️ Database Best Practices

#### PostgreSQL Sequence Management

- **Check Sequence**: `SELECT last_value FROM "TableName_id_seq";`
- **Reset Sequence**: `SELECT setval('"TableName_id_seq"', COALESCE(MAX(id), 0) + 1) FROM "TableName";`
- **Common Issue**: Auto-increment sequences become desynchronized after manual insertions

#### Debugging Strategy

1.  **Temporary Scripts**: Create debugging scripts instead of modifying main code
2.  **Isolation Testing**: Test specific database operations in isolation
3.  **Sequence Verification**: Check auto-increment sequences after data manipulation
4.  **Transaction Safety**: Use transactions for multi-step database operations

### 📝 Documentation Standards

#### PR Description Requirements

- **Implementation Summary**: Clear overview of changes made
- **Technical Details**: Specific technical implementation notes
- **Before/After Analysis**: Impact assessment and improvement metrics
- **Testing Validation**: Build success and functionality verification
- **Iteration Note Summary**: Key decisions and hurdles from the AI Diary

#### Retrospective Documentation

- **AI Diary**: First-person reflection on approach and decision-making
- **Honest Feedback**: Critical assessment of session efficiency and quality
- **Pattern Recognition**: Identification of reusable patterns and approaches
- **Lessons Learned**: Specific insights for future implementation improvement

---

#### Security Implementation Issues

_From comprehensive security audit retrospectives_

**Rate Limiting Configuration Missing:**

- Check patterns in `src/middleware/rate-limiter.ts`
- API config: `{ windowMs: 15 * 60 * 1000, max: 100 }`
- Admin config: `{ windowMs: 15 * 60 * 1000, max: 20 }`
