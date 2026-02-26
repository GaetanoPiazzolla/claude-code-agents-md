const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SCRIPT = path.join(__dirname, "..", "src", "session-start.js");

function run(input) {
  const result = execFileSync("node", [SCRIPT], {
    input: JSON.stringify(input),
    encoding: "utf-8",
    timeout: 5000,
  });
  return result;
}

describe("session-start", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    try { fs.unlinkSync(path.join(os.tmpdir(), "agents-md-loaded-test-session")); } catch {}
  });

  test("exits silently when no agents.md exists", () => {
    const output = run({ cwd: tmpDir, session_id: "test-session" });
    expect(output).toBe("");
  });

  test("returns valid JSON when agents.md exists", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "# instructions");
    const output = run({ cwd: tmpDir, session_id: "test-session" });
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test("output contains correct hookEventName", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "content");
    const output = JSON.parse(run({ cwd: tmpDir, session_id: "test-session" }));
    expect(output.hookSpecificOutput.hookEventName).toBe("SessionStart");
  });

  test("output contains file content in additionalContext", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "# My agent instructions");
    const output = JSON.parse(run({ cwd: tmpDir, session_id: "test-session" }));
    expect(output.hookSpecificOutput.additionalContext).toContain("My agent instructions");
  });

  test("reads AGENTS.MD (uppercase)", () => {
    fs.writeFileSync(path.join(tmpDir, "AGENTS.MD"), "uppercase content");
    const output = JSON.parse(run({ cwd: tmpDir, session_id: "test-session" }));
    expect(output.hookSpecificOutput.additionalContext).toContain("uppercase content");
  });

  test("reads AgEnTs.Md (mixed case)", () => {
    fs.writeFileSync(path.join(tmpDir, "AgEnTs.Md"), "mixed case content");
    const output = JSON.parse(run({ cwd: tmpDir, session_id: "test-session" }));
    expect(output.hookSpecificOutput.additionalContext).toContain("mixed case content");
  });

  test("preserves multiline content", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "line one\nline two\nline three");
    const output = JSON.parse(run({ cwd: tmpDir, session_id: "test-session" }));
    const ctx = output.hookSpecificOutput.additionalContext;
    expect(ctx).toContain("line one");
    expect(ctx).toContain("line three");
  });
});
