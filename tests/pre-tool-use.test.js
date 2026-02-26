const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SCRIPT = path.join(__dirname, "..", "src", "pre-tool-use.js");
const SESSION_ID = `test-session-${process.pid}`;

function run(input) {
  return execFileSync("node", [SCRIPT], {
    input: JSON.stringify(input),
    encoding: "utf-8",
    timeout: 5000,
  });
}

function makeInput(tmpDir, filePath) {
  return {
    session_id: SESSION_ID,
    cwd: tmpDir,
    tool_name: "Read",
    tool_input: { file_path: filePath },
  };
}

describe("pre-tool-use", () => {
  let tmpDir;
  let loadedFile;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
    loadedFile = path.join(os.tmpdir(), `agents-md-loaded-${SESSION_ID}`);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    try { fs.unlinkSync(loadedFile); } catch {}
  });

  test("exits silently when no agents.md in path", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");
    const output = run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts")));
    expect(output).toBe("");
  });

  test("exits silently when file has no directory within cwd", () => {
    const output = run(makeInput(tmpDir, "/outside/project/file.ts"));
    expect(output).toBe("");
  });

  test("loads agents.md from file's directory", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "src instructions");
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");
    const output = JSON.parse(run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts"))));
    expect(output.hookSpecificOutput.additionalContext).toContain("src instructions");
  });

  test("loads agents.md from parent directory when reading nested file", () => {
    fs.mkdirSync(path.join(tmpDir, "src", "components"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "src instructions");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "Button.tsx"), "");
    const output = JSON.parse(
      run(makeInput(tmpDir, path.join(tmpDir, "src", "components", "Button.tsx")))
    );
    expect(output.hookSpecificOutput.additionalContext).toContain("src instructions");
  });

  test("loads agents.md from multiple levels", () => {
    fs.mkdirSync(path.join(tmpDir, "src", "components"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "src instructions");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "agents.md"), "components instructions");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "Button.tsx"), "");
    const output = JSON.parse(
      run(makeInput(tmpDir, path.join(tmpDir, "src", "components", "Button.tsx")))
    );
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("src instructions");
    expect(ctx).toContain("components instructions");
  });

  test("does not load same agents.md twice in the same session", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "src instructions");
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");

    // First call
    run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts")));

    // Second call — same directory
    const output = run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts")));
    expect(output).toBe("");
  });

  test("loads AGENTS.MD from subdirectory (uppercase)", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "AGENTS.MD"), "uppercase");
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");
    const output = JSON.parse(run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts"))));
    expect(output.hookSpecificOutput.additionalContext).toContain("uppercase");
  });

  test("output is valid JSON", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "content");
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");
    const output = run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts")));
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test("output has correct hookEventName", () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "content");
    fs.writeFileSync(path.join(tmpDir, "src", "file.ts"), "");
    const output = JSON.parse(run(makeInput(tmpDir, path.join(tmpDir, "src", "file.ts"))));
    expect(output.hookSpecificOutput.hookEventName).toBe("PreToolUse");
  });
});
