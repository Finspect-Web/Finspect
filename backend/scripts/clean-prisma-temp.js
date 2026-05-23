/**
 * Clean up leftover `.tmp` and `.bak` files from the Prisma client directory.
 *
 * On Windows, `prisma generate` writes the query engine binary to a `.tmp`
 * file then tries to rename it in-place. If the process is interrupted
 * (Ctrl+C, crash, etc.), the `.tmp` file is left behind and blocks future
 * `prisma generate` runs with an EPERM error.
 *
 * Run this before `prisma generate` to ensure a clean state.
 */

const fs = require("fs");
const path = require("path");

const CLIENT_DIR = path.resolve(__dirname, "..", "node_modules", ".prisma", "client");

if (!fs.existsSync(CLIENT_DIR)) {
  console.log("Prisma client directory not found — nothing to clean.");
  process.exit(0);
}

const entries = fs.readdirSync(CLIENT_DIR, { withFileTypes: true });
let removed = 0;

for (const entry of entries) {
  if (entry.isFile() && (entry.name.endsWith(".tmp") || entry.name.endsWith(".bak")) && entry.name.includes("query_engine")) {
    const filePath = path.join(CLIENT_DIR, entry.name);
    try {
      fs.unlinkSync(filePath);
      console.log(`  Removed: ${entry.name}`);
      removed++;
    } catch (err) {
      console.error(`  Failed to remove ${entry.name}: ${err.message}`);
    }
  }
}

if (removed > 0) {
  console.log(`\nCleaned ${removed} leftover file(s).`);
} else {
  console.log("No leftover temp files found.");
}
