# Pre-Generated Prompts - KU16 to CU12 Migration

## 📁 Folder Overview

This folder contains pre-generated prompts for the **Token-Aware Context Engineering** workflow, designed to streamline the KU16 to CU12 migration process using Workflow V3 principles.

## 🎯 Prompt Structure

### Round-Specific Prompts

- **`round1-cu12-protocol-implementation.md`** - CU12 Protocol Implementation
- **`round2-database-api-refactoring.md`** - Database & API Refactoring
- **`round3-ui-integration-testing.md`** - UI Updates & Integration Testing

### Utility Prompts

- **`context-recovery-prompt.md`** - Context recovery when AI loses context
- **`error-debug-prompt.md`** - Systematic error debugging and resolution

## 🚀 Usage Instructions

### For Each Round

1. **Load Context**: Read `CLAUDE.md` + appropriate supplement file
2. **Use Prompt**: Copy the corresponding round prompt
3. **Execute**: Follow paired sub-agent pattern
4. **Validate**: Test against success criteria
5. **Commit**: Include context metadata

### Context Mapping

```typescript
const roundContextMap = {
  Round1: {
    context: ["CLAUDE.md", "HARDWARE-MIGRATION.md"],
    tokenBudget: 9000,
    focus: "CU12 Protocol Implementation & Core Migration",
  },
  Round2: {
    context: ["CLAUDE.md", "API-INTEGRATION.md"],
    tokenBudget: 8500,
    focus: "Database Schema Updates & API Refactoring",
  },
  Round3: {
    context: ["CLAUDE.md", "UI-UPDATE.md"],
    tokenBudget: 9000,
    focus: "UI Updates & Integration Testing",
  },
};
```

## 📋 Prompt Features

### Token-Aware Design

- **Optimized Context**: ≤ 9,000 tokens per round
- **Modular Architecture**: Master + supplement file strategy
- **Efficiency**: 68% context reduction vs monolithic approach

### Paired Sub-Agent Pattern

- **Task A**: Foundation/Setup aspects (~40% context focus)
- **Task B**: Implementation/Integration aspects (~60% context focus)
- **Independent Files**: Separate file sets for each task
- **Parallel Development**: Manageable parallel implementation

### Success Criteria Integration

- **Measurable Goals**: Specific, testable criteria for each round
- **Context Alignment**: Criteria derived from supplement files
- **Validation Protocol**: Clear testing and validation steps

## 🔧 Implementation Guidelines

### Round 1: Protocol Implementation

**Focus**: CU12 protocol layer and core communication

- **Task A**: Packet builder/parser, command constants
- **Task B**: CU12 class, serial communication, event handlers
- **Critical**: Timing requirements, ASK validation, error handling

### Round 2: Database & API

**Focus**: Schema migration and IPC handler refactoring

- **Task A**: Database schema updates, migration scripts
- **Task B**: IPC handler migration, new configuration handlers
- **Critical**: Data preservation, API compatibility, rollback strategy

### Round 3: UI & Testing

**Focus**: UI updates and comprehensive testing

- **Task A**: Grid layout migration, component enhancements
- **Task B**: Integration testing, performance validation
- **Critical**: User experience, error scenarios, E2E testing

## 🚨 Error Handling

### Context Recovery

Use `context-recovery-prompt.md` when:

- AI loses context during implementation
- Need to resume interrupted work
- Context window exceeded

### Error Debugging

Use `error-debug-prompt.md` when:

- Implementation doesn't match specifications
- Protocol errors occur
- Database migration issues
- UI component problems
- Integration failures

## 📊 Quality Assurance

### Token Validation

- **Pre-Round**: Verify context size ≤ 9,000 tokens
- **During Round**: Monitor context efficiency
- **Post-Round**: Document actual token usage

### Success Metrics

- **Technical**: Protocol compatibility, data integrity, performance
- **Business**: System reliability, user experience, compliance
- **Process**: Context efficiency, implementation quality

## 🔄 Workflow Integration

### Development Session Pattern

```bash
# 1. Context preparation
cd [project-name]
# Load CLAUDE.md + supplement file

# 2. Round execution
# Use pre-generated prompt for current round

# 3. Implementation
# Follow paired sub-agent pattern

# 4. Validation
npm run dev
# Test against success criteria

# 5. Commit
git commit -m "feat(round-X): [description]
Context: CLAUDE.md + [SUPPLEMENT_FILE].md
Tokens: ~[actual count]
Tasks: [TaskA] + [TaskB]"
```

### Context Optimization

- **Efficiency Monitoring**: Track context utilization
- **Quality Validation**: Ensure output quality maintained
- **Process Improvement**: Optimize based on actual usage

## 📝 Documentation

### Context Files

- **CLAUDE.md**: Master context (~6,500 tokens)
- **HARDWARE-MIGRATION.md**: Protocol specifications (~2,500 tokens)
- **API-INTEGRATION.md**: Database & API requirements (~2,500 tokens)
- **UI-UPDATE.md**: UI & testing specifications (~2,500 tokens)

### Progress Tracking

- **PROGRESS.md**: Round progress and token metrics
- **.context-map**: Round-to-file mapping configuration

## 🎯 Success Indicators

### Context Efficiency

- ✅ **Token Utilization**: 90%+ of context directly referenced
- ✅ **Context Relevance**: ≤5% irrelevant information per round
- ✅ **Response Quality**: Consistent high-quality output
- ✅ **Development Velocity**: Faster round completion

### Implementation Quality

- ✅ **Protocol Compatibility**: 100% CU12 command support
- ✅ **Data Integrity**: Zero data loss during migration
- ✅ **Error Handling**: Enhanced ASK-based error responses
- ✅ **User Experience**: Maintained or improved UI responsiveness

---

**Workflow Version**: 3.0 (Token-Aware & Context-Optimized)  
**Key Innovation**: Pre-generated prompts with modular context architecture  
**Efficiency Gain**: 68% context reduction + maintained output quality  
**Best For**: Systematic AI-assisted development with predictable results
