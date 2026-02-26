const fs = require("fs");
const path = require("path");
const { getFilenames } = require("./config");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "__pycache__",
  ".venv",
  "venv",
  "dist",
  "build",
]);

function walk(dir, filenames, results = [], rel = ".") {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const entryRel = rel === "." ? entry.name : path.join(rel, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(path.join(dir, entry.name), filenames, results, entryRel);
      }
    } else {
      for (const target of filenames) {
        if (entry.name.toLowerCase() === target.toLowerCase()) {
          results.push(entryRel);
        }
      }
    }
  }

  return results;
}

function buildTree(paths) {
  if (paths.length === 0) {
    return "No agent instruction files found.";
  }

  const lines = ["."];
  for (let i = 0; i < paths.length; i++) {
    const isLast = i === paths.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    lines.push(prefix + paths[i]);
  }
  return lines.join("\n");
}

function main() {
  const cwd = process.cwd();
  const filenames = getFilenames(cwd);
  const found = walk(cwd, filenames);
  console.log(buildTree(found));
}

main();
