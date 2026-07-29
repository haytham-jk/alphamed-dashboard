import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const obsoleteFiles = [
  "milestone-5-service-addition.js",
];

for (const relativePath of obsoleteFiles) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] Not found: ${relativePath}`);
    continue;
  }
  fs.rmSync(filePath);
  console.log(`[OK] Removed obsolete helper: ${relativePath}`);
}

console.log("[OK] Milestone 5 service functions remain in src/services/bioplexInventory.js.");
