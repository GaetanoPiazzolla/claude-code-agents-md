#!/usr/bin/env bats

SCRIPT="$BATS_TEST_DIRNAME/../hooks/load-subdirectory-agents-md.sh"

setup() {
  TEST_DIR=$(mktemp -d)
  SESSION_ID="test-session-$$"
  LOADED_FILE="/tmp/agents-md-loaded-$SESSION_ID"

  make_input() {
    local file_path="$1"
    printf '{"session_id": "%s", "cwd": "%s", "tool_name": "Read", "tool_input": {"file_path": "%s"}}' \
      "$SESSION_ID" "$TEST_DIR" "$file_path"
  }
}

teardown() {
  rm -rf "$TEST_DIR"
  rm -f "$LOADED_FILE"
}

# --- no agents.md ---

@test "exits 0 silently when no agents.md in path" {
  mkdir -p "$TEST_DIR/src"
  touch "$TEST_DIR/src/file.ts"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "exits 0 when file has no directory path within CWD" {
  run bash "$SCRIPT" <<< "$(make_input "/outside/project/file.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# --- agents.md in subdirectory ---

@test "loads agents.md from file's directory" {
  mkdir -p "$TEST_DIR/src"
  echo "src instructions" > "$TEST_DIR/src/agents.md"
  touch "$TEST_DIR/src/file.ts"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "src instructions"
}

@test "loads agents.md from parent directory when reading nested file" {
  mkdir -p "$TEST_DIR/src/components"
  echo "src instructions" > "$TEST_DIR/src/agents.md"
  touch "$TEST_DIR/src/components/Button.tsx"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/components/Button.tsx")"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "src instructions"
}

@test "loads agents.md from multiple levels" {
  mkdir -p "$TEST_DIR/src/components"
  echo "src instructions" > "$TEST_DIR/src/agents.md"
  echo "components instructions" > "$TEST_DIR/src/components/agents.md"
  touch "$TEST_DIR/src/components/Button.tsx"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/components/Button.tsx")"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "src instructions"
  echo "$result" | grep -q "components instructions"
}

# --- deduplication ---

@test "does not load same agents.md twice in the same session" {
  mkdir -p "$TEST_DIR/src"
  echo "src instructions" > "$TEST_DIR/src/agents.md"
  touch "$TEST_DIR/src/file.ts"

  # First call
  bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")" > /dev/null

  # Second call — same directory
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# --- case insensitivity ---

@test "loads AGENTS.MD from subdirectory (uppercase)" {
  mkdir -p "$TEST_DIR/src"
  echo "uppercase" > "$TEST_DIR/src/AGENTS.MD"
  touch "$TEST_DIR/src/file.ts"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "uppercase"
}

# --- output format ---

@test "output is valid JSON" {
  mkdir -p "$TEST_DIR/src"
  echo "content" > "$TEST_DIR/src/agents.md"
  touch "$TEST_DIR/src/file.ts"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  echo "$output" | jq . > /dev/null
}

@test "output has correct hookEventName" {
  mkdir -p "$TEST_DIR/src"
  echo "content" > "$TEST_DIR/src/agents.md"
  touch "$TEST_DIR/src/file.ts"
  run bash "$SCRIPT" <<< "$(make_input "$TEST_DIR/src/file.ts")"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.hookEventName')
  [ "$result" = "PreToolUse" ]
}
