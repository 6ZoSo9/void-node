import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rawEmpty = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

const scriptTargets = [
  "scripts/audit_numbers.js",
  "scripts/compact_rewrite.js",
  "scripts/dev_proposer_merge.js",
  "scripts/import_file.js",
  "scripts/prove_import_head_advance_best_effort_silent_catch_visibility.ts",
  "scripts/prove_mempool_best_effort_silent_catch_visibility.ts",
  "scripts/prove_peer_head_probe_best_effort_silent_catch_visibility.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_closure.ts",
  "scripts/prove_peer_import_side_effect_write_error_visibility_preflight.ts",
  "scripts/prove_remaining_runtime_best_effort_silent_catch_visibility.ts",
  "scripts/prove_silent_catch_classification_registry.ts",
  "scripts/prove_silent_catch_zero_terminal_final_seal.ts",
  "scripts/repair_meta.js",
  "scripts/scan_bin.js",
];

const visibilityMarkers = [
  "VOID_SCRIPTS_AUDIT_NUMBERS_PARSE_VISIBLE",
  "VOID_SCRIPTS_COMPACT_REWRITE_PARSE_VISIBLE",
  "VOID_SCRIPTS_DEV_PROPOSER_MERGE_JSON_VISIBLE",
  "VOID_SCRIPTS_IMPORT_FILE_PARSE_VISIBLE",
  "VOID_SCRIPTS_REPAIR_META_PARSE_VISIBLE",
  "VOID_SCRIPTS_SCAN_BIN_PARSE_VISIBLE",
];

for (const target of scriptTargets) {
  const src = fs.readFileSync(target, "utf8");
  const hits = [...src.matchAll(rawEmpty)];
  if (hits.length !== 0) {
    const first = hits[0];
    const line = src.slice(0, first.index).split("\n").length;
    throw new Error(`raw empty catch still present at ${target}:${line}`);
  }
}

const joinedTargets = scriptTargets.map((t) => fs.readFileSync(t, "utf8")).join("\n");
for (const marker of visibilityMarkers) {
  if (!joinedTargets.includes(marker)) throw new Error(`missing marker ${marker}`);
}

const splitLiteralNeedles = [
  '"} catch " + "{}"',
  '"catch " + "{}"',
];

for (const needle of splitLiteralNeedles) {
  if (!joinedTargets.includes(needle)) throw new Error(`missing split literal expression ${needle}`);
}

const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((file) => exts.has(path.extname(file)));

function bucket(file: string): string {
  if (file === "src/index.ts") return "src_index_ts";
  if (file === "src/index.js") return "src_index_js";
  if (file === "src/node_core.ts" || file === "src/node_core.js") return "node_core";
  if (file.startsWith("src/diag/")) return "src_diag";
  if (file.startsWith("src/chain/")) return "src_chain";
  if (file.startsWith("src/hooks/")) return "src_hooks";
  if (file.startsWith("ops/")) return "ops";
  if (file.startsWith("scripts/")) return "scripts";
  if (file.startsWith("tools/")) return "tools";
  return "other";
}

const counts: Record<string, number> = {};
let total = 0;

for (const file of tracked) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  const count = [...src.matchAll(rawEmpty)].length;
  if (!count) continue;
  const b = bucket(file);
  counts[b] = (counts[b] || 0) + count;
  total += count;
}

if (counts.scripts) throw new Error(`scripts bucket still has raw empty catches: ${counts.scripts}`);
if (total !== 266) throw new Error(`expected refined tracked raw empty catches to drop to 266, got ${total}`);

console.log("VOID_SCRIPTS_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  scripts_raw_empty_catches_closed: 18,
  raw_empty_catches_in_scripts_targets: 0,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets: counts,
  visibilityMarkers,
}));
