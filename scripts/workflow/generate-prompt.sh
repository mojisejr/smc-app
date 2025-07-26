#!/bin/bash

# Description: Auto-generates draft prompt files for all rounds defined in CLAUDE.md
# Usage: npm run wf:prompt -- all

set -e # Exit immediately if a command exits with a non-zero status.

PROMPTS_DIR="docs/prompts"
CONTEXT_FILE="docs/context/CLAUDE.md"

echo "🤖 V4 Workflow: Starting Prompt Scaffolding..."

if [ ! -f "$CONTEXT_FILE" ]; then
    echo "❌ Error: Master context file not found at '$CONTEXT_FILE'"
    exit 1
fi

# Simple parser to find round definitions in CLAUDE.md
# Looks for lines like "### Round X: Round Name"

ROUND_LINES=$(grep -E "^### Round [0-9]+:" "$CONTEXT_FILE")

if [ -z "$ROUND_LINES" ]; then
    echo "⚠️ Warning: No round definitions found in '$CONTEXT_FILE'. Cannot generate prompts."
    exit 0
fi

echo "Found round definitions. Cleaning old drafts..."
rm -f ${PROMPTS_DIR}/round-*.md
mkdir -p $PROMPTS_DIR

echo "$ROUND_LINES" | while IFS= read -r line; do
    # Extract Round Number and Name
    ROUND_NUM=$(echo "$line" | sed -n 's/### Round \([0-9]*\):.*/\1/p')
    ROUND_NAME=$(echo "$line" | sed -n 's/### Round [0-9]*: \(.*\)/\1/p')
    
    # Get context line (next line after round definition)
    CONTEXT_LINE=$(grep -A 1 "### Round ${ROUND_NUM}:" "$CONTEXT_FILE" | tail -n 1)
    SUPPLEMENT_FILE=$(echo "$CONTEXT_LINE" | sed -n 's/.*Context.*`CLAUDE.md` + `\(.*\)`.*/\1/p')
    
    PROMPT_FILE="${PROMPTS_DIR}/round-${ROUND_NUM}.md"
    
    echo "📝 Creating draft for Round ${ROUND_NUM}: ${ROUND_NAME}"
    
    # Create the draft prompt file
    cat > "$PROMPT_FILE" << EOL
# Round ${ROUND_NUM}: ${ROUND_NAME} [AUTO-GENERATED DRAFT]

**CONTEXT**: Please read the following context files thoroughly:

1. \`docs/context/CLAUDE.md\` (Master Context)
2. \`docs/context/supplements/${SUPPLEMENT_FILE}\` (Round-Specific Context)

**ROUND OBJECTIVE**:
[Please review and expand the objective for this round clearly]

**PAIRED TASKS**:

- **Task A**: [Describe Task A to be completed]
- **Task B**: [Describe Task B to be completed]

**SUCCESS CRITERIA**:

- [ ] [Success criterion 1 that can be tested]
- [ ] [Success criterion 2 that can be tested]  
- [ ] All code must follow standards in \`docs/context/supplements/${SUPPLEMENT_FILE}\`

**ACTION**:
Please proceed with the Paired Tasks as defined and report progress when each Task is completed.

**REFERENCE FILES**:
- Current PRD: \`docs/PRD.md\`
- CU12 Hardware Spec: \`docs/CU12.md\`
- Page Documentation: \`docs/pages/\`

EOL
done

echo "✅ V4 Workflow: Prompt Scaffolding complete. Drafts are in '${PROMPTS_DIR}'."