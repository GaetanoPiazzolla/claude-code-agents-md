const fs = require("fs");
const path = require("path");
const os = require("os");
const { getFilenames, getLoadedFilePath, findMatchingFiles, DEFAULT_FILENAMES } = require("../src/config");

describe("getFilenames", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns default filenames when no config exists", () => {
    expect(getFilenames(tmpDir)).toEqual(DEFAULT_FILENAMES);
  });

  test("returns custom filenames from .agents-md.json", () => {
    const config = { filenames: ["agents.md", "COPILOT-INSTRUCTIONS.md"] };
    fs.writeFileSync(path.join(tmpDir, ".agents-md.json"), JSON.stringify(config));
    expect(getFilenames(tmpDir)).toEqual(["agents.md", "COPILOT-INSTRUCTIONS.md"]);
  });

  test("returns default when config has empty filenames array", () => {
    fs.writeFileSync(path.join(tmpDir, ".agents-md.json"), JSON.stringify({ filenames: [] }));
    expect(getFilenames(tmpDir)).toEqual(DEFAULT_FILENAMES);
  });

  test("returns default when config is invalid JSON", () => {
    fs.writeFileSync(path.join(tmpDir, ".agents-md.json"), "not json");
    expect(getFilenames(tmpDir)).toEqual(DEFAULT_FILENAMES);
  });
});

describe("getLoadedFilePath", () => {
  test("returns path in temp dir with session id", () => {
    const result = getLoadedFilePath("abc-123");
    expect(result).toContain("agents-md-loaded-abc-123");
    expect(path.dirname(result)).toBe(os.tmpdir());
  });
});

describe("findMatchingFiles", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-md-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns empty array when no matches", () => {
    expect(findMatchingFiles(tmpDir, ["agents.md"])).toEqual([]);
  });

  test("finds case-insensitive match", () => {
    fs.writeFileSync(path.join(tmpDir, "AGENTS.MD"), "content");
    const results = findMatchingFiles(tmpDir, ["agents.md"]);
    expect(results).toHaveLength(1);
    expect(results[0]).toContain("AGENTS.MD");
  });

  test("finds multiple configured filenames", () => {
    fs.writeFileSync(path.join(tmpDir, "agents.md"), "a");
    fs.writeFileSync(path.join(tmpDir, "copilot.md"), "b");
    const results = findMatchingFiles(tmpDir, ["agents.md", "copilot.md"]);
    expect(results).toHaveLength(2);
  });

  test("returns empty for nonexistent directory", () => {
    expect(findMatchingFiles("/nonexistent/path", ["agents.md"])).toEqual([]);
  });
});
