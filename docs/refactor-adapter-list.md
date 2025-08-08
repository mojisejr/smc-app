# Phase 2: Adapter Hardware Type Refactoring

## Overview
This document tracks the Phase 2 refactoring of hardware type comparisons in adapter files. We need to update all references from the old hardware types (CU12/KU16) to the new ones (DS12/DS16) while keeping internal class names unchanged.

## Background
- Phase 1 completed: Updated background.ts hardware initialization
- Phase 2 goal: Fix hardware command routing in adapters
- Internal class names (CU12StateManager, KU16) remain unchanged - only type comparisons are updated

## Changes Required

### Hardware Type Mapping
- `hardwareInfo.type === "CU12"` → `hardwareInfo.type === "DS12"`
- `hardwareInfo.type === "KU16"` → `hardwareInfo.type === "DS16"`

### Adapter Files to Update

| File | Occurrences | Status |
|------|-------------|--------|
| main/adapters/adminAdapters.ts | 10 | ⏳ Pending |
| main/adapters/clearAdapter.ts | 4 | ⏳ Pending |
| main/adapters/dispenseAdapter.ts | 4 | ⏳ Pending |
| main/adapters/initAdapter.ts | 2 | ⏳ Pending |
| main/adapters/resetAdapter.ts | 6 | ⏳ Pending |
| main/adapters/slotsAdapter.ts | 4 | ⏳ Pending |
| main/adapters/statusAdapter.ts | 2 | ⏳ Pending |
| main/adapters/unlockAdapter.ts | 2 | ⏳ Pending |

**Total:** 34 hardware type comparisons to update

## Implementation Checklist

- [ ] Create this documentation file
- [ ] Fix adminAdapters.ts (10 changes)
- [ ] Fix clearAdapter.ts (4 changes)
- [ ] Fix dispenseAdapter.ts (4 changes)
- [ ] Fix initAdapter.ts (2 changes)
- [ ] Fix resetAdapter.ts (6 changes)
- [ ] Fix slotsAdapter.ts (4 changes)
- [ ] Fix statusAdapter.ts (2 changes)
- [ ] Fix unlockAdapter.ts (2 changes)
- [ ] Create git commit
- [ ] Run build validation

## Expected Impact
After Phase 2 completion:
- Hardware command routing should work properly with DS12/DS16
- Unlock, dispense, reset operations should function correctly
- All adapter conditional logic will use correct hardware types

## Notes
- Keep internal implementation details unchanged
- Only update type comparison strings
- Maintain existing conditional logic structure
- Test hardware operations after completion
EOF < /dev/null