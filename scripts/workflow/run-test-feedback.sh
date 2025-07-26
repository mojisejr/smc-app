#!/bin/bash

# Description: Runs tests and generates a debug prompt if any test fails.
# Usage: npm run wf:test

set -e

DEBUG_FILE="docs/prompts/DEBUG_PROMPT.md"
echo "🧪 V4 Workflow: Running automated tests..."

# Run the test command, allowing it to fail without exiting the script
TEST_OUTPUT=$(npm test 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "❌ Tests Failed! Generating self-correction debug prompt..."
    
    # Create the debug prompt file
    cat > "$DEBUG_FILE" << EOL
# 🚨 DEBUG REQUIRED: Automated Test Failed

**Analysis Request:**
The automated testing failed. The recently created code has defects. Please analyze the Error Log below thoroughly, compare current code with requirements in \`docs/context/CLAUDE.md\` and related supplement files, then proceed to fix the code correctly.

**Error Log:**
\`\`\`
$TEST_OUTPUT
\`\`\`

**Action:**

1. **Analyze**: Identify the cause of the problem from the Error Log
2. **Identify**: Point to files and code sections that need to be fixed
3. **Implement**: Fix the code so that all tests pass

**Context Files to Reference:**
- \`docs/context/CLAUDE.md\` - Master context and requirements
- \`docs/PRD.md\` - Complete project specifications
- \`docs/CU12.md\` - Hardware protocol reference
- Relevant supplement file based on current round

**Expected Outcome:**
All tests should pass after implementing the fixes.
EOL

    echo "✅ V4 Workflow: Debug prompt created at '${DEBUG_FILE}'."
    echo "👉 Please copy the content of this file and send it to the AI to fix the code."
    exit 1
else
    echo "✅✅✅ V4 Workflow: All tests passed successfully!"
    
    # Remove debug file if it exists (tests are passing)
    if [ -f "$DEBUG_FILE" ]; then
        rm "$DEBUG_FILE"
        echo "🧹 Cleaned up debug prompt (tests are now passing)"
    fi
    
    exit 0
fi