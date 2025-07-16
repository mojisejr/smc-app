# Error Debug Prompt

**ISSUE**: [Specific problem] in [files]
**CONTEXT**: Check against CLAUDE.md requirements + [SUPPLEMENT_FILE] patterns  
**ANALYZE**: Gap between current code and specifications
**FIX**: Align implementation with context requirements

---

## Error Analysis Framework

### Issue Classification

- **Protocol Error**: CU12 packet format or command issues
- **Database Error**: Schema or migration problems
- **UI Error**: Component or layout issues
- **Integration Error**: IPC or API communication problems
- **Performance Error**: Slow response or memory issues

### Context Validation

- **CLAUDE.md**: Check against master context requirements
- **Supplement File**: Verify against round-specific patterns
- **Token Budget**: Ensure context size ≤ 9,000 tokens
- **Implementation**: Confirm alignment with success criteria

### Debug Process

1. **Identify Error Type**: Classify the specific error category
2. **Check Context**: Verify against CLAUDE.md + supplement file
3. **Analyze Gap**: Find mismatch between code and specifications
4. **Apply Fix**: Implement solution following context patterns
5. **Validate**: Test fix against success criteria

---

## Common Error Patterns

### Protocol Implementation Errors

**Symptoms**: Packet format issues, command failures, checksum errors
**Context Check**: HARDWARE-MIGRATION.md packet format specifications
**Common Fixes**:

- Verify packet structure: `[STX][ADDR][LOCKNUM][CMD][ASK][DATALEN][ETX][SUM][DATA...]`
- Check checksum calculation
- Validate ASK value handling (0x10-0x14)
- Ensure timing requirements (>500ms delays)

### Database Migration Errors

**Symptoms**: Schema errors, data loss, migration failures
**Context Check**: API-INTEGRATION.md migration strategy
**Common Fixes**:

- Verify backup creation before migration
- Check slot count validation (16→12)
- Validate new field defaults (lockStatus, errorCode)
- Test rollback procedures

### UI Component Errors

**Symptoms**: Layout issues, status display problems, configuration failures
**Context Check**: UI-UPDATE.md component specifications
**Common Fixes**:

- Verify grid layout: `grid-cols-3` for 12 slots
- Check status color mapping
- Validate error message display
- Test responsive design

### Integration Errors

**Symptoms**: IPC handler failures, API compatibility issues
**Context Check**: API-INTEGRATION.md handler migration patterns
**Common Fixes**:

- Verify slot ID validation (1-12 range)
- Check ASK-based error handling
- Validate database updates after operations
- Test API response formats

---

## Error Resolution Template

### Step 1: Error Identification

```
Error Type: [Protocol/Database/UI/Integration/Performance]
Error Location: [Specific file and line]
Error Message: [Exact error message]
Context Files: [CLAUDE.md + supplement file]
```

### Step 2: Context Validation

```
CLAUDE.md Requirements: [Check against master context]
Supplement File Patterns: [Verify against round-specific patterns]
Token Budget: [Confirm ≤ 9,000 tokens]
Implementation Alignment: [Check against success criteria]
```

### Step 3: Gap Analysis

```
Current Implementation: [What's currently implemented]
Expected Implementation: [What should be implemented]
Gap Description: [Specific mismatch identified]
Root Cause: [Why the gap exists]
```

### Step 4: Fix Implementation

```
Fix Strategy: [How to resolve the gap]
Implementation Plan: [Step-by-step fix approach]
Testing Approach: [How to validate the fix]
Rollback Plan: [How to revert if needed]
```

### Step 5: Validation

```
Success Criteria Check: [Verify against round criteria]
Integration Test: [Test with other components]
Performance Test: [Check for performance impact]
Documentation Update: [Update relevant documentation]
```

---

## Quick Fix Reference

### Protocol Fixes

- **Packet Format**: Ensure 8+ byte structure with proper checksum
- **Command Validation**: Verify all commands (0x80-0x8F) supported
- **Timing**: Add >500ms delays for configuration commands
- **Error Handling**: Map ASK values to meaningful messages

### Database Fixes

- **Backup**: Always create backup before schema changes
- **Validation**: Verify slot count and data integrity
- **Migration**: Test migration on development first
- **Rollback**: Have rollback procedure ready

### UI Fixes

- **Layout**: Use `grid-cols-3` for 12-slot layout
- **Status**: Implement enhanced status colors and indicators
- **Error Display**: Show user-friendly error messages
- **Responsive**: Test on different screen sizes

### Integration Fixes

- **Slot Validation**: Update range to 1-12 slots
- **Error Codes**: Implement ASK-based error responses
- **API Compatibility**: Maintain existing response formats
- **Testing**: Test all error scenarios

---

**Execute**: Apply systematic error resolution approach  
**Validate**: Test fix against context requirements  
**Document**: Update relevant documentation
