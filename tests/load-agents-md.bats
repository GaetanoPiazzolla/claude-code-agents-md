#!/usr/bin/env bats

SCRIPT="$BATS_TEST_DIRNAME/../hooks/load-agents-md.sh"

setup() {
  TEST_DIR=$(mktemp -d)
  INPUT_FILE=$(mktemp)
  printf '{"cwd": "%s", "hook_event_name": "SessionStart", "source": "startup"}' "$TEST_DIR" > "$INPUT_FILE"
}

teardown() {
  rm -rf "$TEST_DIR"
  rm -f "$INPUT_FILE"
}

# --- no file ---

@test "exits 0 silently when no agents.md exists" {
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

# --- file found ---

@test "returns valid JSON when agents.md exists" {
  echo "# instructions" > "$TEST_DIR/agents.md"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  echo "$output" | jq . > /dev/null
}

@test "output contains correct hookEventName" {
  echo "content" > "$TEST_DIR/agents.md"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.hookEventName')
  [ "$result" = "SessionStart" ]
}

@test "output contains file content in additionalContext" {
  echo "# My agent instructions" > "$TEST_DIR/agents.md"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "My agent instructions"
}

# --- case insensitivity ---

@test "reads AGENTS.MD (uppercase)" {
  echo "uppercase content" > "$TEST_DIR/AGENTS.MD"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "uppercase content"
}

@test "reads AgEnTs.Md (mixed case)" {
  echo "mixed case content" > "$TEST_DIR/AgEnTs.Md"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "mixed case content"
}

# --- content integrity ---

@test "preserves multiline content" {
  printf "line one\nline two\nline three" > "$TEST_DIR/agents.md"
  run bash "$SCRIPT" < "$INPUT_FILE"
  [ "$status" -eq 0 ]
  result=$(echo "$output" | jq -r '.hookSpecificOutput.additionalContext')
  echo "$result" | grep -q "line one"
  echo "$result" | grep -q "line three"
}
