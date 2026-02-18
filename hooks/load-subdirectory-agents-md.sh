#!/bin/bash
set -euo pipefail

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
CWD=$(echo "$INPUT" | jq -r '.cwd')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

FILE_DIR=$(dirname "$FILE_PATH")

LOADED_FILE="/tmp/agents-md-loaded-$SESSION_ID"
touch "$LOADED_FILE"

ADDITIONAL_CONTEXT=""

# Walk up from file's directory to project root
DIR="$FILE_DIR"
while true; do
  # Stop if we've gone above CWD
  case "$DIR" in
    "$CWD"|"$CWD"/*) ;;
    *) break ;;
  esac

  AGENTS_FILE=$(find "$DIR" -maxdepth 1 -iname "agents.md" 2>/dev/null | head -1)

  if [ -n "$AGENTS_FILE" ]; then
    if ! grep -qF "$AGENTS_FILE" "$LOADED_FILE" 2>/dev/null; then
      echo "$AGENTS_FILE" >> "$LOADED_FILE"
      CONTENT=$(cat "$AGENTS_FILE")
      ADDITIONAL_CONTEXT="$ADDITIONAL_CONTEXT
[agents.md from ${DIR#"$CWD"/}]
$CONTENT"
    fi
  fi

  # Stop when we reach CWD
  if [ "$DIR" = "$CWD" ]; then
    break
  fi

  DIR=$(dirname "$DIR")
done

if [ -z "$ADDITIONAL_CONTEXT" ]; then
  exit 0
fi

jq -n --arg context "$ADDITIONAL_CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: $context
  }
}'
