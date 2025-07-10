# 🚀 AI-Assisted Development Workflow Template

## 📋 Overview

Complete workflow template for building applications with Claude Code using Context Engineering, Paired Sub-Agents, and Round-based Development.

## 🎯 Core Methodology: 6-Pillar Approach

### ✅ 1. Context Engineering

**Purpose**: Provide Claude with comprehensive, structured context  
**Tools**: CLAUDE.md, PROGRESS.md, specification files  
**Outcome**: Consistent, high-quality AI output

### ✅ 2. Paired Sub-Agents

**Purpose**: Manageable parallel development with reduced timeout risk  
**Pattern**: 2 related tasks per round, independent files  
**Outcome**: Efficient development, easy recovery

### ✅ 3. Round-based Development

**Purpose**: Incremental progress with clear milestones  
**Structure**: 4-8 rounds depending on project complexity  
**Outcome**: Trackable progress, manageable scope

### ✅ 4. Manual Testing

**Purpose**: Verify functionality after each round  
**Process**: npm run dev → feature testing → validation  
**Outcome**: Quality assurance, early issue detection

### ✅ 5. Git Workflow

**Purpose**: Version control with meaningful history  
**Pattern**: Round completion → test → commit → next round  
**Outcome**: Clean project history, easy rollback

### ✅ 6. Problem Solving

**Purpose**: Handle timeouts, conflicts, and errors systematically  
**Tools**: Recovery prompts, fallback strategies, documentation  
**Outcome**: Resilient development process

## 🏗️ Project Setup Template

### Step 1: Repository Initialization

```bash
# Create project directory
mkdir [project-name]
cd [project-name]
git init
git remote add origin https://github.com/[username]/[project-name].git

# Create context files
touch CLAUDE.md
touch PROGRESS.md
touch README.md
touch .gitignore
```

### Step 2: CLAUDE.md Template

```markdown
# [Project Name] - AI Development Context

## Project Overview

[Brief description of what you're building]

## Learning/Business Objectives

1. [Primary objective]
2. [Secondary objective]
3. [Technical learning goals]

## Tech Stack

- **Frontend**: [e.g., Next.js 14, React, Vue]
- **Backend**: [e.g., Node.js, API routes, Supabase]
- **Database**: [e.g., PostgreSQL, MongoDB, localStorage]
- **Authentication**: [e.g., Clerk, Auth0, custom]
- **Styling**: [e.g., Tailwind CSS, styled-components]
- **Deployment**: [e.g., Vercel, Netlify, AWS]

## Features Required

### Phase 1: Core Features (Must Have)

1. [Feature 1]: [Description]
2. [Feature 2]: [Description]
3. [Feature 3]: [Description]

### Phase 2: Enhanced Features (Nice to Have)

1. [Enhancement 1]: [Description]
2. [Enhancement 2]: [Description]

## Development Approach: Paired Sub-Agent Rounds

### Round Structure:
```

Round 1: Foundation (Setup + Config)
Round 2: Data Layer (Types + Storage/API)
Round 3: Core Components (Main functionality)
Round 4: Integration (Complete workflow)
[Additional rounds as needed]

````

### Round Execution Pattern:
```bash
claude → [round prompt] → manual test → git commit → next round
````

### Round Templates:

#### Round 1: Foundation Setup

**Paired Tasks:**

- Task A: [Framework] setup ([specific files])
- Task B: [Styling/Config] setup ([specific files])

**Dependencies:** None  
**Test Criteria:** [Specific success criteria]  
**Commit Message:** "feat: setup [framework] and [styling] foundation"

#### Round 2: Data Layer

**Paired Tasks:**

- Task A: [Data structures] ([specific files])
- Task B: [Storage/API layer] ([specific files])

**Dependencies:** Round 1 complete  
**Test Criteria:** [Specific success criteria]  
**Commit Message:** "feat: implement data layer and [storage solution]"

#### Round 3: Core Components

**Paired Tasks:**

- Task A: [Main component] ([specific files])
- Task B: [Supporting component] ([specific files])

**Dependencies:** Round 1, 2 complete  
**Test Criteria:** [Specific success criteria]  
**Commit Message:** "feat: create core components"

#### Round 4: Integration

**Paired Tasks:**

- Task A: [Integration component] ([specific files])
- Task B: [Main page/workflow] ([specific files])

**Dependencies:** Round 1, 2, 3 complete  
**Test Criteria:** [Complete workflow success criteria]  
**Commit Message:** "feat: complete integration and main workflow"

### Prompt Templates:

- **Round 1:** "อ่าน CLAUDE.md และทำ Round 1: Foundation Setup ตาม paired sub-agent pattern"
- **Round 2:** "อ่าน CLAUDE.md และทำ Round 2: Data Layer ตาม paired sub-agent pattern"
- **Round 3:** "อ่าน CLAUDE.md และทำ Round 3: Core Components ตาม paired sub-agent pattern"
- **Round 4:** "อ่าน CLAUDE.md และทำ Round 4: Integration ตาม paired sub-agent pattern"

### Recovery Strategy:

```
If timeout or issues occur:
1. Press Escape to interrupt
2. Ask: "สรุปความคืบหน้าของ 2 tasks ใน round นี้"
3. Switch to sequential: "ทำ task ที่ยังไม่เสร็จทีละอัน"
4. Continue with next round when current round complete
```

## Quality Standards

- **Code Quality**: [Language standards, e.g., TypeScript strict mode]
- **Testing**: Manual testing after each round
- **Responsive**: Mobile-first design approach
- **Performance**: [Specific performance criteria]
- **Accessibility**: [Accessibility requirements]

## Project Structure

```
[project-name]/
├── [framework-specific folders]
├── components/
├── lib/
├── [other directories as needed]
├── CLAUDE.md (this file)
├── PROGRESS.md (progress tracking)
├── README.md (documentation)
└── .gitignore
```

## Success Criteria

### Phase 1: Core Functionality ✅

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Phase 2: Enhanced Features ✅

- [ ] [Enhancement criterion 1]
- [ ] [Enhancement criterion 2]

### Phase 3: Deployment & Polish ✅

- [ ] [Deployment criterion]
- [ ] [Performance criterion]
- [ ] [Documentation complete]

## Development Tips

1. **Context Management**: Always reference CLAUDE.md in prompts
2. **Round Discipline**: Complete each round fully before moving to next
3. **Testing Protocol**: Manual test after every round completion
4. **Git Discipline**: One commit per completed round
5. **Progress Tracking**: Update PROGRESS.md after each round
6. **Error Handling**: Use recovery strategies for timeouts/issues

````

### Step 3: PROGRESS.md Template
```markdown
# [Project Name] Development Progress

## 🎯 Project Overview
- **Goal**: [Project description]
- **Approach**: Paired sub-agent rounds
- **Started**: [Date]

## 📊 Round Status

### ⏳ Round 1: Foundation Setup
**Status**: 📋 Planned
**Tasks**: [Task A] + [Task B]
**Files**: [Expected files]
**Test Criteria**: [Success criteria]
**Dependencies**: None

### ⏳ Round 2: Data Layer
**Status**: 📋 Planned
**Tasks**: [Task A] + [Task B]
**Dependencies**: Round 1 complete

### ⏳ Round 3: Core Components
**Status**: 📋 Planned
**Tasks**: [Task A] + [Task B]
**Dependencies**: Round 1, 2 complete

### ⏳ Round 4: Integration
**Status**: 📋 Planned
**Tasks**: [Task A] + [Task B]
**Dependencies**: Round 1, 2, 3 complete

## 📝 Development Log
*Latest entries first*

### [Date] - Project Initialized
- Created repository and context files
- Ready to begin Round 1

## 🚨 Issues & Solutions
*Track problems for future reference*

## 🔄 Recovery Information
- **Last successful commit**: -
- **Current branch**: [branch-name]
- **Next action**: Round 1 execution
````

## 🔄 Execution Workflow

### Development Session Pattern:

```bash
# 1. Start development session
cd [project-name]
claude

# 2. Execute round
> "อ่าน CLAUDE.md และทำ Round [X]: [Round Name] ตาม paired sub-agent pattern"

# 3. Manual testing
npm run dev  # or appropriate test command
# Test the round's functionality

# 4. Update progress
# Edit PROGRESS.md with round completion status

# 5. Git workflow
git add .
git commit -m "feat: [round description]"

# 6. Continue to next round or end session
```

### Between Projects Session:

```bash
# New chat/session
# Copy this template
# Customize CLAUDE.md for new project
# Initialize new repository
# Begin Round 1
```

## 🛠️ Configuration Templates

### Tailwind CSS + DaisyUI (tested):

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
    base: true,
    styled: true,
    utils: true,
  },
};
```

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Next.js 14 Package.json (tested):

```json
{
  "name": "[project-name]",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.0.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3.3.0",
    "daisyui": "^4.0.0",
    "eslint": "^8",
    "eslint-config-next": "14.0.0"
  }
}
```

## 🎯 Scaling Guidelines

### Simple Projects (4 rounds):

- Todo apps, simple CRUD
- Basic portfolios
- Learning projects

### Medium Projects (6-8 rounds):

- Blog systems with auth
- E-commerce basics
- Dashboard applications

### Complex Projects (10+ rounds):

- Full-stack applications
- Multi-user systems
- Integration-heavy projects

## 🚨 Common Issues & Solutions

### Issue 1: Timeout During Round

**Solution**:

```
1. Press Escape
2. "สรุปความคืบหน้าของ 2 tasks ใน round นี้"
3. "ทำ task ที่ยังไม่เสร็จทีละอัน"
```

### Issue 2: Configuration Problems

**Solution**:

```
1. Use tested configuration templates
2. Verify with npm run build before proceeding
3. Update CLAUDE.md with working configs
```

### Issue 3: Context Loss

**Solution**:

```
1. /clear in Claude Code
2. "อ่าน CLAUDE.md และ PROGRESS.md"
3. "ทำต่อจาก Round [X] ที่ค้างไว้"
```

## 🏆 Success Metrics

### Workflow Mastery Indicators:

- ✅ Can create effective CLAUDE.md context
- ✅ Successfully coordinate paired sub-agents
- ✅ Complete rounds without major issues
- ✅ Recover from timeouts/problems quickly
- ✅ Maintain clean git history
- ✅ Deliver working applications

### Ready for Advanced Projects When:

- ✅ Completed 2+ projects with this workflow
- ✅ Can troubleshoot configuration issues
- ✅ Comfortable with recovery procedures
- ✅ Can adapt template to different tech stacks
- ✅ Git workflow is second nature

## 📚 Template Usage Instructions

### For New Project:

1. Copy this entire template
2. Customize CLAUDE.md for your specific project
3. Initialize repository with template files
4. Begin Round 1 with first prompt
5. Follow round-based development pattern

### For New Chat Session:

1. Paste relevant sections of CLAUDE.md
2. Reference PROGRESS.md for current status
3. Continue from last completed round
4. Maintain same workflow patterns

---

**This template encapsulates everything learned from successful Todo App development and is ready for scaling to any project complexity level.**
