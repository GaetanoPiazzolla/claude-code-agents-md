const fs = require("fs");
const {
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
} = require("./config");

async function main() {
  const input = await readStdin();
  const { cwd, session_id } = input;

  const loadedFile = getLoadedFilePath(session_id);
  if (!fs.existsSync(loadedFile)) {
    fs.writeFileSync(loadedFile, "", "utf-8");
  }

  const filenames = getFilenames(cwd);
  const matches = findMatchingFiles(cwd, filenames);

  if (matches.length === 0) {
    process.exit(0);
  }

  const parts = [];
  for (const match of matches) {
    fs.appendFileSync(loadedFile, match + "\n", "utf-8");
    parts.push(fs.readFileSync(match, "utf-8"));
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join("\n"),
    },
  };

  process.stdout.write(JSON.stringify(output));
}

main().catch(() => process.exit(1));
