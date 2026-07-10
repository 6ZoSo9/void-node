import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const targets = [
  "ops/headtrio-fetch-tap.cjs",
  "ops/headtrio-http-tap.cjs",
  "ops/void-compat-routes.cjs",
  "ops/void-force-http-listen-4100-v1.cjs",
  "ops/void-force-http-listen-4100-v2.cjs",
  "ops/void-force-http-listen-4100-v3.cjs",
  "ops/void-kill-finalize-loop.cjs",
  "ops/void-workcredits-devnet-http.cjs",
  "ops/wc-relayer-v1.cjs",
];

const rawEmpty = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

const markers = [
  "VOID_OPS_HEADTRIO_FETCH_TAP_LOAD_LOG_VISIBLE",
  "VOID_OPS_HEADTRIO_FETCH_TAP_CONSOLE_VISIBLE",
  "VOID_OPS_HEADTRIO_FETCH_TAP_RUNTIME_VISIBLE",
  "VOID_OPS_HEADTRIO_HTTP_TAP_RUNTIME_VISIBLE",
  "VOID_OPS_COMPAT_ROUTES_DESTROY_OVERFLOW_VISIBLE",
  "VOID_OPS_COMPAT_ROUTES_TIMEOUT_DESTROY_VISIBLE",
  "VOID_OPS_COMPAT_ROUTES_ATTACH_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V1_SOCKET_DESTROY_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V1_BOUND_LOG_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V1_ERROR_LOG_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V1_GAVE_UP_LOG_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V2_LOG_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V2_CODE_LISTEN_EVENTS_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V2_FORCED_EVENTS_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V2_TIMER_UNREF_VISIBLE",
  "VOID_OPS_FORCE_HTTP_LISTEN_V3_SOCKET_DESTROY_VISIBLE",
  "VOID_OPS_KILL_FINALIZE_LOOP_LOG_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_SEND_ERROR_END_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_RECENT_PROOF_PARSE_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_BASE_DIR_CHECK_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_LEDGER_LINE_PARSE_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_REDEEMED_LINE_PARSE_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_WALLET_STORAGE_SET_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_WALLET_STORAGE_CLEAR_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_WALLET_RERENDER_VISIBLE",
  "VOID_OPS_WC_DEVNET_HTTP_WALLET_EVENTS_VISIBLE",
  "VOID_OPS_WC_RELAYER_VOID_TOKEN_VISIBLE",
];

for (const target of targets) {
  const src = fs.readFileSync(target, "utf8");
  const hits = [...src.matchAll(rawEmpty)];
  if (hits.length !== 0) {
    const first = hits[0];
    const line = src.slice(0, first.index).split("\n").length;
    throw new Error(`raw empty catch still present at ${target}:${line}`);
  }
}

const joinedTargets = targets.map((t) => fs.readFileSync(t, "utf8")).join("\n");
for (const marker of markers) {
  if (!joinedTargets.includes(marker)) throw new Error(`missing marker ${marker}`);
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

if (counts.ops) throw new Error(`ops bucket still has raw empty catches: ${counts.ops}`);
if (total !== 284) throw new Error(`expected refined tracked raw empty catches to drop to 284, got ${total}`);

console.log("VOID_OPS_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  ops_raw_empty_catches_closed: 27,
  raw_empty_catches_in_ops_targets: 0,
  repo_wide_refined_tracked_raw_empty_catches: total,
  buckets: counts,
  markers,
}));
