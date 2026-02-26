# Correctness & Completeness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two correctness issues — a version mismatch in plugin.json and a Glob coverage gap in PreToolUse that prevents agents.md files from loading when Claude uses Glob to explore directories.

**Architecture:** Add a `getTargetDir(toolName, toolInput, cwd)` helper to `src/config.js` that maps each supported tool name to the correct starting directory for the upward agents.md walk. `pre-tool-use.js` calls this function instead of doing inline extraction. `hooks.json` gains `Glob` in its PreToolUse matcher.

**Tech Stack:** Node.js (no dependencies), Jest 29 for tests.

---

### Task 1: Fix version mismatch

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Make the fix**

In `.claude-plugin/plugin.json`, change:
```json
"version": "0.0.1"
```
to:
```json
"version": "0.0.2"
```

**Step 2: Verify**

```bash
node -e "const p = require('./.claude-plugin/plugin.json'); console.assert(p.version === '0.0.2', 'wrong version')"
```
Expected: no output (assertion passes).

**Step 3: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "fix: sync plugin.json version to 0.0.2"
```

---

### Task 2: Write failing tests for `getTargetDir`

**Files:**
- Modify: `tests/config.test.js`

**Step 1: Add the failing tests**

Append to `tests/config.test.js` (after the existing `findMatchingFiles` describe block):

```js
describe("getTargetDir", () => {
  const cwd = "/project";

  test("Read: returns dirname of file_path", () => {
    const result = getTargetDir("Read", { file_path: "/project/src/file.ts" }, cwd);
    expect(result).toBe("/project/src");
  });

  test("Edit: returns dirname of file_path", () => {
    const result = getTargetDir("Edit", { file_path: "/project/src/index.js" }, cwd);
    expect(result).toBe("/project/src");
  });

  test("Write: returns dirname of file_path", () => {
    const result = getTargetDir("Write", { file_path: "/project/out/new.js" }, cwd);
    expect(result).toBe("/project/out");
  });

  test("Read: returns null when file_path is absent", () => {
    const result = getTargetDir("Read", {}, cwd);
    expect(result).toBeNull();
  });

  test("Glob: returns path field when present", () => {
    const result = getTargetDir("Glob", { pattern: "**/*.ts", path: "/project/src" }, cwd);
    expect(result).toBe("/project/src");
  });

  test("Glob: returns cwd when path field is absent", () => {
    const result = getTargetDir("Glob", { pattern: "**/*.ts" }, cwd);
    expect(result).toBe(cwd);
  });
});
```

Also add `getTargetDir` to the require at the top of the file:
```js
const { getFilenames, getLoadedFilePath, findMatchingFiles, DEFAULT_FILENAMES, getTargetDir } = require("../src/config");
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern=config 2>&1 | tail -20
```
Expected: 6 failures mentioning `getTargetDir is not a function`.

---

### Task 3: Implement `getTargetDir` in config.js

**Files:**
- Modify: `src/config.js`

**Step 1: Add the function**

In `src/config.js`, add after the `findMatchingFiles` function and before `module.exports`:

```js
function getTargetDir(toolName, toolInput, cwd) {
  if (toolName === "Glob") {
    return toolInput.path || cwd;
  }
  const filePath = toolInput.file_path || "";
  return filePath ? path.dirname(filePath) : null;
}
```

**Step 2: Export it**

Update `module.exports` in `src/config.js`:
```js
module.exports = {
  DEFAULT_FILENAMES,
  CONFIG_FILENAME,
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
  getTargetDir,
};
```

**Step 3: Run tests to verify they pass**

```bash
npm test -- --testPathPattern=config 2>&1 | tail -20
```
Expected: all tests in `config.test.js` pass.

**Step 4: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat: add getTargetDir helper to config, with tests"
```

---

### Task 4: Write failing integration test for Glob in pre-tool-use

**Files:**
- Modify: `tests/pre-tool-use.test.js`

**Step 1: Add the failing test**

In `tests/pre-tool-use.test.js`, add a `makeGlobInput` helper next to `makeInput`:

```js
function makeGlobInput(tmpDir, globPath) {
  return {
    session_id: SESSION_ID,
    cwd: tmpDir,
    tool_name: "Glob",
    tool_input: { pattern: "**/*.ts", path: globPath },
  };
}
```

Then add a new test inside the `describe("pre-tool-use", ...)` block:

```js
test("loads agents.md when Glob is used on a subdirectory", () => {
  fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "glob triggered");
  const output = JSON.parse(run(makeGlobInput(tmpDir, path.join(tmpDir, "src"))));
  expect(output.hookSpecificOutput.additionalContext).toContain("glob triggered");
});

test("loads root agents.md when Glob has no path field", () => {
  fs.writeFileSync(path.join(tmpDir, "agents.md"), "root triggered");
  const output = JSON.parse(
    run({ session_id: SESSION_ID, cwd: tmpDir, tool_name: "Glob", tool_input: { pattern: "**/*.ts" } })
  );
  expect(output.hookSpecificOutput.additionalContext).toContain("root triggered");
});
```

**Step 2: Run to verify they fail**

```bash
npm test -- --testPathPattern=pre-tool-use 2>&1 | tail -20
```
Expected: 2 new failures — the scripts exit with empty output because Glob isn't handled yet.

---

### Task 5: Update pre-tool-use.js to use `getTargetDir`

**Files:**
- Modify: `src/pre-tool-use.js`

**Step 1: Import `getTargetDir`**

In `src/pre-tool-use.js`, update the require:
```js
const {
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
  getTargetDir,
} = require("./config");
```

**Step 2: Replace inline file path extraction**

Find this block (lines 12–17):
```js
const filePath = (input.tool_input && input.tool_input.file_path) || "";

if (!filePath) {
  process.exit(0);
}
```

Replace with:
```js
const dir = getTargetDir(
  input.tool_name,
  input.tool_input || {},
  cwd
);

if (!dir) {
  process.exit(0);
}
```

**Step 3: Fix the walk start**

Find this line (currently uses `filePath`):
```js
let dir = path.dirname(filePath);
```

Replace with:
```js
let walkDir = dir;
```

Then update all subsequent uses of `dir` inside the `while (true)` loop to `walkDir`:
- `const relative = path.relative(cwd, dir);` → `const relative = path.relative(cwd, walkDir);`
- `const matches = findMatchingFiles(dir, filenames);` → `const matches = findMatchingFiles(walkDir, filenames);`
- `if (dir === cwd) break;` → `if (walkDir === cwd) break;`
- `dir = path.dirname(dir);` → `walkDir = path.dirname(walkDir);`

**Step 4: Run all tests to verify**

```bash
npm test 2>&1 | tail -20
```
Expected: all 32 tests pass (30 original + 2 new Glob integration tests).

**Step 5: Commit**

```bash
git add src/pre-tool-use.js tests/pre-tool-use.test.js
git commit -m "feat: use getTargetDir in pre-tool-use, adds Glob support"
```

---

### Task 6: Update hooks.json to add Glob matcher

**Files:**
- Modify: `hooks/hooks.json`

**Step 1: Add Glob to the matcher**

In `hooks/hooks.json`, change:
```json
"matcher": "Read|Edit|Write"
```
to:
```json
"matcher": "Read|Edit|Write|Glob"
```

**Step 2: Run full test suite one final time**

```bash
npm test
```
Expected:
```
Test Suites: 4 passed, 4 total
Tests:       32 passed, 32 total
```

**Step 3: Commit**

```bash
git add hooks/hooks.json
git commit -m "fix: add Glob to PreToolUse hook matcher"
```
