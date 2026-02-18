#!/bin/bash
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
CWD=$(echo "$INPUT" | jq -r '.cwd')

LOADED_FILE="/tmp/agents-md-loaded-$SESSION_ID"
touch "$LOADED_FILE"

AGENTS_FILE=$(find "$CWD" -maxdepth 1 -iname "agents.md" 2>/dev/null | head -1)

if [ -z "$AGENTS_FILE" ]; then
  exit 0
fi

echo "$AGENTS_FILE" >> "$LOADED_FILE"
CONTENT=$(cat "$AGENTS_FILE")

jq -n --arg content "$CONTENT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $content
  }
}'
