const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const SCRIPT = path.join(__dirname, "..", "src", "tree.js");

function run(cwd) {
  return execFileSync("node", [SCRIPT], {
    cwd,
    encoding: "utf-8",
    timeout: 5000,
  });
}

describe("tree", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("prints message when no files found", () => {
    const output = run(tmpDir);
    expect(output.trim()).toBe("No agent instruction files found.");
  });

  test("shows root agents.md", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "content");
    const output = run(tmpDir);
    expect(output).toContain("agents.md");
    expect(output).toContain(".");
  });

  test("shows nested agents.md files", () => {
    fs.mkdirSync(path.join(tmpDir, "src", "components"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "root");
    fs.writeFileSync(path.join(tmpDir, "src", "agents.md"), "src");
    fs.writeFileSync(path.join(tmpDir, "src", "components", "AGENTS.MD"), "components");
    const output = run(tmpDir);
    expect(output).toContain("agents.md");
    expect(output).toContain(path.join("src", "agents.md"));
    expect(output).toContain(path.join("src", "components", "AGENTS.MD"));
  });

  test("skips node_modules and .git", () => {
    fs.mkdirSync(path.join(tmpDir, "node_modules"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "node_modules", "agents.md"), "skip");
    fs.writeFileSync(path.join(tmpDir, ".git", "agents.md"), "skip");
    const output = run(tmpDir);
    expect(output.trim()).toBe("No agent instruction files found.");
  });

  test("uses tree formatting with connectors", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "content");
    const output = run(tmpDir);
    expect(output).toContain("└── ");
  });
});
