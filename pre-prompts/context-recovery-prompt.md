# Context Recovery Prompt

**CONTEXT RECOVERY**: Round [X] - Read CLAUDE.md + [SUPPLEMENT_FILE].md

**STATUS**: Working on Round [X]: [Name], Task [A/B]: [Description] incomplete

**ANALYZE**: Current codebase state for [specific files/functions]
**CONTINUE**: Implement remaining parts of Task [A/B]
**FOLLOW**: CLAUDE.md conventions + [SUPPLEMENT_FILE] patterns

---

## Quick Reference

### Round Context Mapping

- **Round 1**: CLAUDE.md + HARDWARE-MIGRATION.md (~9,000 tokens)
- **Round 2**: CLAUDE.md + API-INTEGRATION.md (~8,500 tokens)
- **Round 3**: CLAUDE.md + UI-UPDATE.md (~9,000 tokens)

### Current Round Status

**Round**: [X]  
**Focus**: [Round Objective]  
**Task**: [A/B] - [Task Description]  
**Files**: [Specific file paths]  
**Progress**: [Current progress status]

### Critical Requirements

- **Token Budget**: ≤ 9,000 tokens per round
- **Context Files**: Always include CLAUDE.md + 1 supplement file
- **Implementation**: Follow paired sub-agent pattern
- **Quality**: Maintain error handling, TypeScript, documentation

### Recovery Steps

1. **Read Context**: Load CLAUDE.md + appropriate supplement file
2. **Analyze State**: Check current implementation progress
3. **Continue Task**: Resume implementation from last completed point
4. **Validate**: Ensure implementation meets success criteria
5. **Test**: Verify functionality before proceeding

---

**Execute**: Resume current task with full context awareness  
**Validate**: Check against round success criteria  
**Continue**: Maintain workflow momentum
