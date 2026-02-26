const fs = require("fs");
const path = require("path");
const {
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
} = require("./config");

async function main() {
  const input = await readStdin();
  const { session_id, cwd } = input;
  const filePath = (input.tool_input && input.tool_input.file_path) || "";

  if (!filePath) {
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

  let dir = path.dirname(filePath);
  while (true) {
    const relative = path.relative(cwd, dir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      break;
    }

    const matches = findMatchingFiles(dir, filenames);
    for (const match of matches) {
      if (!alreadyLoaded.has(match)) {
        alreadyLoaded.add(match);
        fs.appendFileSync(loadedFile, match + "\n", "utf-8");
        const content = fs.readFileSync(match, "utf-8");
        const label = relative || ".";
        contextParts.push(`[agents.md from ${label}]\n${content}`);
      }
    }

    if (dir === cwd) break;
    dir = path.dirname(dir);
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
