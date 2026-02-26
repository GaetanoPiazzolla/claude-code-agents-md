const fs = require("fs");
const path = require("path");

const DEFAULT_FILENAMES = ["agents.md"];
const CONFIG_FILENAME = ".agents-md.json";

function getFilenames(cwd) {
  const configPath = path.join(cwd, CONFIG_FILENAME);
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (Array.isArray(config.filenames) && config.filenames.length > 0) {
      return config.filenames;
    }
  } catch {
    // no config file or invalid JSON — use defaults
  }
  return DEFAULT_FILENAMES;
}

function getLoadedFilePath(sessionId) {
  const os = require("os");
  return path.join(os.tmpdir(), `agents-md-loaded-${sessionId}`);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    process.stdin.on("error", reject);
  });
}

function findMatchingFiles(dir, filenames) {
  let entries;
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const matches = [];
  for (const entry of entries) {
    for (const target of filenames) {
      if (entry.toLowerCase() === target.toLowerCase()) {
        matches.push(path.join(dir, entry));
      }
    }
  }
  return matches;
}

module.exports = {
  DEFAULT_FILENAMES,
  CONFIG_FILENAME,
  getFilenames,
  getLoadedFilePath,
  readStdin,
  findMatchingFiles,
};
