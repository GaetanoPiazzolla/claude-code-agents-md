#!/usr/bin/env bats

@test "plugin.json is valid JSON" {
  run jq . "$BATS_TEST_DIRNAME/../.claude-plugin/plugin.json"
  [ "$status" -eq 0 ]
}

@test "marketplace.json is valid JSON" {
  run jq . "$BATS_TEST_DIRNAME/../.claude-plugin/marketplace.json"
  [ "$status" -eq 0 ]
}

@test "hooks.json is valid JSON" {
  run jq . "$BATS_TEST_DIRNAME/../hooks/hooks.json"
  [ "$status" -eq 0 ]
}

@test "plugin.json has required name field" {
  run jq -e '.name' "$BATS_TEST_DIRNAME/../.claude-plugin/plugin.json"
  [ "$status" -eq 0 ]
}

@test "plugin.json has required version field" {
  run jq -e '.version' "$BATS_TEST_DIRNAME/../.claude-plugin/plugin.json"
  [ "$status" -eq 0 ]
}
