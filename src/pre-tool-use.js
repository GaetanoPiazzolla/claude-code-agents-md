const fs = require("fs");
const path = require("path");
const {
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
  getTargetDir,
} = require("./config");

async function main() {
  const input = await readStdin();
  const { session_id, cwd } = input;
  const dir = getTargetDir(
    input.tool_name,
    input.tool_input || {},
    cwd
  );

  if (!dir) {
    process.exit(0);
  }

  const loadedFile = getLoadedFilePath(session_id);
  if (!fs.existsSync(loadedFile)) {
    fs.writeFileSync(loadedFile, "", "utf-8");
  }

  const alreadyLoaded = new Set(
    fs
      .readFileSync(loadedFile, "utf-8")
      .split("\n")
      .filter((l) => l.length > 0)
  );

  const filenames = getFilenames(cwd);
  const contextParts = [];

  let walkDir = dir;
  while (true) {
    const relative = path.relative(cwd, walkDir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      break;
    }

    const matches = findMatchingFiles(walkDir, filenames);
    for (const match of matches) {
      if (!alreadyLoaded.has(match)) {
        alreadyLoaded.add(match);
        fs.appendFileSync(loadedFile, match + "\n", "utf-8");
        const content = fs.readFileSync(match, "utf-8");
        const label = relative || ".";
        contextParts.push(`[agents.md from ${label}]\n${content}`);
      }
    }

    if (walkDir === cwd) break;
    walkDir = path.dirname(walkDir);
  }

  if (contextParts.length === 0) {
    process.exit(0);
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: contextParts.join("\n"),
    },
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch(() => process.exit(1));
