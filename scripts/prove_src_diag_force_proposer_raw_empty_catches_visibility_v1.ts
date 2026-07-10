import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const targets = [
  "src/diag/patch_force_listen_v1.cjs",
  "src/diag/patch_force_listen_v3.cjs",
  "src/diag/proposer_ms_nan_fix_v1.cjs",
  "src/diag/proposer_force_off_v1.cjs",
  "src/diag/patch_proposer_truthfix_v2.js",
  "src/diag/patch_proposer_truthfix_v1.js",
  "src/diag/patch_proposer_truthproxy_v1.cjs",
];

const expectedClosed = 30;
const markerPrefix = "VOID_SRC_DIAG_FORCE_PROPOSER_PACK2";
const rawEmpty = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

for (const target of targets) {
  const src = fs.readFileSync(target, "utf8");
  const hits = [...src.matchAll(rawEmpty)];
  if (hits.length !== 0) {
    const first = hits[0];
    const line = src.slice(0, first.index).split("\n").length;
    throw new Error(`raw empty catch still present at ${target}:${line}`);
  }
  if (!src.includes("__voidSrcDiagPack2Visible")) {
    throw new Error(`missing helper in ${target}`);
  }
}

const joinedTargets = targets.map((t) => fs.readFileSync(t, "utf8")).join("\n");
const markerCount = (joinedTargets.match(new RegExp(markerPrefix, "g")) ?? []).length;
if (markerCount !== expectedClosed) {
  throw new Error(`expected ${expectedClosed} ${markerPrefix} markers, got ${markerCount}`);
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

if (counts.scripts) throw new Error(`scripts bucket reopened: ${counts.scripts}`);
if (counts.ops) throw new Error(`ops bucket reopened: ${counts.ops}`);
if ((counts.src_diag || 0) !== 78) throw new Error(`expected src_diag bucket to drop to 78, got ${counts.src_diag || 0}`);
if (total !== 197) throw new Error(`expected refined tracked raw empty catches to drop to 197, got ${total}`);

console.log("VOID_SRC_DIAG_FORCE_PROPOSER_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  src_diag_pack2_raw_empty_catches_closed: expectedClosed,
  raw_empty_catches_in_pack2_targets: 0,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets: counts,
  markerPrefix,
  markerCount,
}));
