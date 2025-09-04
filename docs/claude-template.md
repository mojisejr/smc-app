---
## Project Overview

**Project Name**: MiMiVibes - AI-Powered Tarot Reading Platform

**Repository**: https://github.com/mojisejr/mimivibe-ai.git

**Description**: แพลตฟอร์มดูไพ่ทาโรต์ออนไลน์ที่ขับเคลื่อนด้วย AI ให้บริการการทำนายแบบส่วนตัวผ่าน "แม่หมอมีมี่" ผู้เชี่ยวชาญด้านไพ่ทาโรต์ AI ระบบใช้เทคโนโลยี Multi-LLM (OpenAI GPT-4 + Google Gemini) ร่วมกับ LangGraph workflow เพื่อสร้างการทำนายที่มีคุณภาพสูงและเป็นธรรมชาติ

**Project Goals**:

- สร้างประสบการณ์การทำนายไพ่ทาโรต์ที่เข้าถึงได้ง่าย น่าเชื่อถือ และมีคุณภาพสูงผ่านเทคโนโลยี AI
- รับประกันคุณภาพการทำนายด้วยระบบ Multi-LLM และ LangGraph workflow
- สร้างรายได้ที่ยั่งยืนผ่านระบบ credit และ gamification ครบครัน
- รักษาความปลอดภัยและความเชื่อถือของผู้ใช้ด้วยระบบรักษาความปลอดภัยระดับองค์กร

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

- **Framework**: Next.js 14 (App Router)
- **Frontend/Framework**: React 18 with TypeScript (Strict Mode)
- **API Layer**: Next.js API Routes (39+ endpoints)
- **Database**: PostgreSQL (Production) / SQLite (Development) with Prisma ORM
- **File Storage**: Vercel Static Assets
- **Styling**: Tailwind CSS with Framer Motion animations
- **Authentication**: Clerk Auth (Multi-provider support)
- **Data Validation**: Zod with custom validation schemas

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, Clerk Auth
- **Backend**: Node.js (Vercel Serverless), Prisma ORM, PostgreSQL, Stripe Payments
- **AI Integration**: OpenAI GPT-4-turbo, Google Gemini 2.0 Flash, LangGraph workflow engine
- **Database**: PostgreSQL via Vercel/Supabase with Prisma migrations
- **File Storage**: Vercel Edge Network CDN
- **Authentication**: Clerk with Google, Facebook, Email providers

### Backend API Routes

- **Reading System** (`/api/readings/`): Core tarot reading functionality

  - `ask.ts`: Generate new tarot readings with AI workflow
  - `save.ts`: Save completed readings to user history
  - `history.ts`: Retrieve user's reading history with pagination

- **User Management** (`/api/user/`): User profile and progression

  - `stats.ts`: User statistics, level, and experience tracking
  - `credits.ts`: Credit balance management (stars, coins, free points)
  - `level-check.ts`: Level progression and prestige system
  - `prestige.ts`: Prestige system for level 100+ users

- **Payment System** (`/api/payments/`): Stripe integration

  - `create-payment-intent.ts`: Stripe payment processing
  - `webhook.ts`: Stripe webhook for payment confirmations
  - `history.ts`: Payment transaction history

- **Gamification** (`/api/achievements/`, `/api/credits/`): Achievement and reward system

  - `progress.ts`: Track user achievement progress
  - `claim.ts`: Claim earned achievements
  - `spend.ts`: Process credit spending transactions

- **Admin System** (`/api/admin/`): Administrative functions
  - Campaign management, user analytics, system monitoring

### Frontend User Journeys

- **User Journey Flows**:
  - **Tarot Reading Flow**: Landing → Sign Up/Login → Ask Question → Card Selection → AI Generation → Reading Display → Save/Share
  - **Payment Flow**: Credit Check → Package Selection → Stripe Payment → Credit Addition → Confirmation
  - **Gamification Flow**: Complete Actions → Earn XP/Coins → Level Up → Unlock Achievements → Exchange Coins → Prestige System
  - **History Management**: Reading History → Search/Filter → Detail View → Delete/Favorite → Export Options

---

## 🤖 AI System Architecture

### LangGraph Workflow (4-Node State Machine)

1. **Question Filter Node**: คัดกรองความเหมาะสมของคำถาม, ตรวจสอบเนื้อหาและความชัดเจน
2. **Question Analysis Node**: วิเคราะห์อารมณ์ (mood), หัวข้อ (topic), และกรอบเวลา (period)
3. **Card Selection Node**: สุ่มไพ่จากสำรับ Rider-Waite (78 ใบ) รองรับ 3-5 ใบ
4. **Reading Generation Node**: สร้างการทำนายด้วยบุคลิก "แม่หมอมีมี่"

### Multi-LLM Provider System

- **Primary Provider**: OpenAI GPT-4-turbo (default)
- **Fallback Provider**: Google Gemini 2.0 Flash
- **Provider Abstraction**: LLMProvider interface with automatic fallback
- **Token Limits**: 4096 tokens for complex readings
- **Prompt Management**: Encrypted prompt system with version control

### Prompt Templates

- **Question Filter**: คัดกรองคำถามที่เหมาะสมสำหรับการทำนาย
- **Question Analysis**: วิเคราะห์บริบทและอารมณ์ของคำถาม
- **Reading Agent**: บุคลิก "แม่หมอมีมี่" สำหรับการทำนายที่อบอุ่นและเป็นกันเอง

---

## 💳 Payment & Credit System

### Credit Types

- **Stars (⭐)**: เครดิตหลักที่ซื้อด้วยเงินจริง (1 star = 1 reading)
- **Free Points (🎁)**: เครดิตฟรีจากกิจกรรมและ achievements
- **Coins (🪙)**: สกุลเงินเกมสำหรับแลกเปลี่ยน (15 coins = 1 free point)

### Stripe Integration

- **Currency**: Thai Baht (THB)
- **Packages**: Starter (99 THB/10 credits), Popular (199 THB/25 credits), Premium (399 THB/60 credits)
- **Webhook**: Real-time payment status updates
- **Security**: PCI DSS compliant with secure payment processing

---

## 🎮 Gamification System

### Level & Experience System

- **Level Progression**: level \* 100 EXP required per level
- **Max Level**: 100 (Prestige system available)
- **EXP Sources**: Readings (+10), Reviews (+5), Achievements (variable)
- **Prestige**: Reset to level 1 with permanent bonuses at level 100

### Achievement System (20 Achievements)

- **Reading Milestones**: FIRST_READING, READING_MASTER, ULTIMATE_MASTER
- **Engagement**: REVIEWER, SOCIAL_BUTTERFLY, REFERRAL_MASTER
- **Progression**: LEVEL_ACHIEVER, PRESTIGE_PIONEER
- **Special**: EARLY_BIRD, WEEKEND_WARRIOR, NIGHT_OWL

### Exchange System

- **Uniswap-style Interface**: Modern crypto-inspired design
- **Exchange Rate**: 15 coins = 1 free point
- **Transaction History**: Complete exchange tracking

---

## ⚠️ CRITICAL SAFETY RULES

### NEVER MERGE PRS YOURSELF

**DO NOT** use any commands to merge Pull Requests, such as `gh pr merge`. Your role is to create a well-documented PR and provide the link to the user.

**ONLY** provide the PR link to the user and **WAIT** for explicit user instruction to merge. The user will review and merge when ready.

### DO NOT DELETE CRITICAL FILES

You are **FORBIDDEN** from deleting or moving critical files and directories in the project. This includes, but is not limited to: `.env`, `.git/`, `node_modules/`, `package.json`, `prisma/schema.prisma`, and the main project root files. If a file or directory needs to be removed, you must explicitly ask for user permission and provide a clear explanation.

### HANDLE SENSITIVE DATA WITH CARE

You must **NEVER** include sensitive information such as API keys, passwords, or user data in any commit messages, Pull Request descriptions, or public logs. Always use environment variables for sensitive data. If you detect sensitive data, you must alert the user and **REFUSE** to proceed until the information is properly handled.

**Critical Environment Variables**:

- `DATABASE_URL`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
- `PROMPT_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`

### STICK TO THE SCOPE

You are instructed to focus **ONLY** on the task described in the assigned Issue. Do not perform any refactoring, code cleanup, or new feature development unless it is explicitly part of the plan. If you encounter an opportunity to improve the code outside of the current scope, you must create a new task and discuss it with the user first.

### AI SYSTEM SAFETY

**DO NOT** modify AI prompts or LangGraph workflow without explicit permission. The prompt system uses AES-256-GCM encryption and version control. Any changes to AI behavior must be thoroughly tested using the prompt test runner (`npm run prompt:test`).

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
- **Never create new issues**: For ongoing multi-phase work, always update the existing plan issue (#20 for current system refactor)
- **Retrospective issues**: Only create retrospective issues for session summaries, not for plan updates

### 🌿 Automated Workflow Implementation

**ENHANCED AUTOMATION**: All development workflows now include full automation to ensure consistent adherence to project guidelines.

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
- **Example**: `feature/27-deployment-production-implementation`
- **Auto-sanitization**: Removes special characters, converts to kebab-case

##### Commit Message Standards

- **Format**: `[type]: [description] (#[issue-number])`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Example**: `feat: implement user authentication system (#25)`

##### Pull Request Automation

- **Title**: Auto-generated from issue title with proper formatting
- **Description**: Includes implementation summary, changes made, and testing notes
- **Issue Linking**: Automatic `Closes #[issue-number]` for proper tracking
- **Labels**: Auto-applied based on implementation type and scope

#### Workflow Safety Measures

- **Branch Protection**: Prevents direct commits to main/master
- **PR Validation**: Ensures all changes go through review process
- **Issue Tracking**: Maintains complete audit trail of work
- **Status Updates**: Real-time progress tracking and notifications

**CRITICAL**: **NEVER** work directly on main/master branch. **ALWAYS** create PRs for review.

### Implementation Guidelines for Automated Workflow

#### Pre-Implementation Checks

- ✅ Verify GitHub Task Issue exists and is properly formatted
- ✅ Ensure no conflicting branches exist
- ✅ Confirm GitHub CLI is authenticated and functional
- ✅ Validate repository permissions for branch creation and PR management

#### Error Handling and Fallbacks

- **Branch Creation Failure**: Falls back to manual branch creation with user guidance
- **Push Failure**: Provides manual push commands and troubleshooting steps
- **PR Creation Failure**: Falls back to manual PR creation with pre-filled templates
- **Issue Update Failure**: Logs error and provides manual update instructions

#### Quality Assurance

- **Code Review**: All PRs require manual review and approval
- **Testing**: Automated tests run on PR creation (if configured)
- **Documentation**: Auto-generated PR descriptions include implementation details
- **Rollback**: Clear instructions for reverting changes if needed

#### Monitoring and Feedback

- **Progress Tracking**: Real-time updates during implementation phases
- **Success Metrics**: PR creation success rate and review completion time
- **User Feedback**: Continuous improvement based on workflow effectiveness
- **Audit Trail**: Complete history of automated actions for debugging

---

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

### Session Retrospective

**Session Date**: [Date in YYYY-MM-DD format, Thailand timezone]
**Start Time**: [HH:MM Thailand time]
**End Time**: [HH:MM Thailand time]
**Duration**: ~X minutes
**Primary Focus**: [Main Focus]
**Current Issue**: #XXX
**Last PR**: #XXX

### Session Summary

[Overall summary of the work done today]

### Timeline

- HH:MM - Start, review issue #XXX (Thailand time)
- HH:MM - [Event] (Thailand time)
- HH:MM - [Event] (Thailand time)
- HH:MM - Work completed (Thailand time)

### Timezone Guidelines for Retrospectives

- **File Naming**: Use `session-YYYY-MM-DD-[description].md` format with Thailand date
- **All Times**: Must be in Thailand timezone (Asia/Bangkok, UTC+7)
- **Date Format**: Christian Era (ค.ศ.) in YYYY-MM-DD format
- **Example**: `session-2025-01-25-thailand-timezone-implementation.md`

### 📝 AI Diary (REQUIRED - DO NOT SKIP)

**⚠️ MANDATORY**: The agent must write this section in the first person.
[Record initial understanding, how the approach changed, confusing or clarifying points, decisions made, and their reasoning.]

### 💭 Honest Feedback (REQUIRED - DO NOT SKIP)

**⚠️ MANDATORY**: The agent must honestly evaluate its performance in this section.
[Assess the session's overall efficiency, tools and their limitations, clarity of communication, and suggestions for improvement.]

### What Went Well

- The successes that occurred

### What Could Improve

- Areas that could be made better

### Blockers & Resolutions

- **Blocker**: Description of the obstacle
  **Resolution**: The solution implemented

### Lessons Learned

- **Pattern**: [Pattern discovered] - [Reason why it's important]
- **Mistake**: [Mistake made] - [How to avoid it]
- **Discovery**: [New finding] - [How to apply it]

---

## 🔧 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check for type errors or syntax issues
npm run build 2>&1 | grep -A 5 "error"

# Clear cache and reinstall dependencies
rm -rf node_modules .next .cache
npm install

# Reset Prisma client
npx prisma generate
```

#### Database Issues

```bash
# Reset database connection
npx prisma db push --force-reset

# Check database connection
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

#### AI System Issues

```bash
# Test AI providers
npm run prompt:test

# Check API keys
echo $OPENAI_API_KEY | head -c 10
echo $GOOGLE_GENERATIVE_AI_API_KEY | head -c 10

# Verify prompt encryption
npm run prompt:list
```

#### Port Conflicts

```bash
# Find the process using port 3000
lsof -i :3000

# Kill the process
kill -9 [PID]

# Use alternative port
npm run dev -- -p 3001
```

#### Payment System Issues

```bash
# Test Stripe webhook
stripe listen --forward-to localhost:3000/api/payments/webhook

# Verify Stripe keys
echo $STRIPE_SECRET_KEY | head -c 10
echo $STRIPE_WEBHOOK_SECRET | head -c 10
```

### Performance Monitoring

- **Core Web Vitals**: Monitor LCP (<2.5s), FID (<100ms), CLS (<0.1)
- **API Response Times**: Target <500ms average
- **Database Queries**: Monitor slow queries via Prisma logs
- **AI Response Times**: Track LLM provider performance
- **Error Rates**: Monitor via Vercel analytics and custom logging
