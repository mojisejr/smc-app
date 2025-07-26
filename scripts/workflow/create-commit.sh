#!/bin/bash

# Description: Creates a standardized git commit for a completed round.
# Usage: npm run wf:commit -- "feat(round-X): your commit message"

set -e

COMMIT_MSG=$1

if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Error: Commit message is required."
    echo "Usage: npm run wf:commit -- \"feat(round-X): your commit message\""
    exit 1
fi

BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)
echo "📦 V4 Workflow: Committing changes on branch '${BRANCH_NAME}'..."

# Add all changes to staging
git add .

# Create the commit with enhanced message format
ENHANCED_MSG="${COMMIT_MSG}

🔄 CU12 Refactor Project
Context: CLAUDE.md + supplement files  
Workflow: V3/V4 Hybrid with token optimization"

git commit -m "$ENHANCED_MSG"

echo "✅ V4 Workflow: Commit successful."
echo "🚀 Ready to push and start the next round!"

# Show brief status
echo ""
echo "📊 Current status:"
git log --oneline -1
echo "Branch: $BRANCH_NAME"
echo "Files changed: $(git diff --name-only HEAD~1 | wc -l)"