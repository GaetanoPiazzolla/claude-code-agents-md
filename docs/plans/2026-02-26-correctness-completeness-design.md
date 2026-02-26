# Design: agents-md Correctness & Completeness

**Date:** 2026-02-26
**Status:** Approved

## Problem

Two correctness issues exist in the current codebase:

1. **Version mismatch** — `plugin.json` declares version `0.0.1` while `package.json` is at `0.0.2`.

2. **Glob coverage gap** — `PreToolUse` only matches `Read|Edit|Write`. When Claude uses `Glob` to explore a subdirectory, `pre-tool-use.js` receives a `tool_input` with a `path` field (not `file_path`), so the early-exit guard fires and agents.md files in that subtree are never loaded until Claude actually reads a file there.

## Goal

Make the plugin work correctly across all file-access tools Claude uses, without changing any behavior for the already-covered `Read|Edit|Write` case.

## Solution

### Approach: `getTargetDir()` helper (Approach B)

Add a single `getTargetDir(toolName, toolInput, cwd)` function to `config.js` that maps each supported tool to the correct starting directory for the upward walk:

| Tool | Input field used | Resolution |
|------|-----------------|------------|
| `Read`, `Edit`, `Write` | `tool_input.file_path` | `path.dirname(file_path)` |
| `Glob` | `tool_input.path` | `path` (already a directory), or `cwd` if absent |

`pre-tool-use.js` calls `getTargetDir` and receives either a directory string or `null` (skip). The rest of the walk logic is unchanged.

### Why not Approach A (inline patch)?

Inline branching in `pre-tool-use.js` mixes extraction logic with walk logic, making it harder to test `getTargetDir` in isolation.

### Why not Approach C (schema-driven map)?

YAGNI — two tools do not justify a generic map. The helper can be extended trivially when a third tool is needed.

## Change Set

| File | Change |
|------|--------|
| `plugin.json` | `"version": "0.0.1"` → `"0.0.2"` |
| `hooks/hooks.json` | PreToolUse matcher: `"Read\|Edit\|Write"` → `"Read\|Edit\|Write\|Glob"` |
| `src/config.js` | Add `getTargetDir(toolName, toolInput, cwd)`, export it |
| `src/pre-tool-use.js` | Replace inline `filePath` extraction with `getTargetDir()` call |
| `tests/config.test.js` | Add 4 unit tests for `getTargetDir` |
| `tests/pre-tool-use.test.js` | Add integration test for Glob tool input |

## Out of Scope

- Tree view hierarchy restructuring
- Bash hook
- UserPromptSubmit hook
- CI pipeline changes
