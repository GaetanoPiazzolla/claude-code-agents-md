const fs = require("fs");
const { getLoadedFilePath, readStdin } = require("./config");

async function main() {
  const input = await readStdin();
  const { session_id } = input;
  const loadedFile = getLoadedFilePath(session_id);
  try {
    fs.unlinkSync(loadedFile);
  } catch {
    // file may not exist
  }
}

main().catch(() => process.exit(0));
