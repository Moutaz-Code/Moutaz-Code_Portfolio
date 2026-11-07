/**
 * Performance import-discipline check.
 * Ensures heavy/specialised modules are only imported where allowed.
 * Run: node scripts/check-perf-rules.mjs
 */

import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

const SRC = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

// ── Rules ───────────────────────────────────────────────
// Each rule: { pattern, allowed[] (relative to repo root) }
const RULES = [
  {
    // three.js is large; keep it behind the dynamically imported modules in src/ui/three/.
    label: "three",
    pattern: /from\s+["']three["']|import\(\s*["']three["']\s*\)/,
    allowed: ["src/ui/three/"],
  },
];

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".astro") continue;
      yield* walk(full);
    } else if (/\.(ts|astro|mjs|js|tsx|jsx)$/.test(entry.name)) {
      yield full;
    }
  }
}

let violations = 0;

for await (const filePath of walk(SRC)) {
  const rel = relative(join(SRC, ".."), filePath).replace(/\\/g, "/");

  const rl = createInterface({ input: createReadStream(filePath) });
  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;
      const isAllowed = rule.allowed.some(
        (a) => rel === a || rel.startsWith(a),
      );
      if (!isAllowed) {
        console.error(
          `VIOLATION: ${rel}:${lineNum} — imports ${rule.label} (only allowed in ${rule.allowed.join(", ")})`,
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} perf-rule violation(s) found.`);
  process.exit(1);
} else {
  console.log(
    "No perf-rule violations. Heavy modules are only imported in allowed locations.",
  );
}
