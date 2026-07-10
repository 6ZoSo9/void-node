import fs from "node:fs";

const target = "src/node_core.js";
const src = fs.readFileSync(target, "utf8");

const rawEmpty = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
const hits = [...src.matchAll(rawEmpty)];
if (hits.length !== 0) {
  const first = hits[0];
  const line = src.slice(0, first.index).split("\n").length;
  throw new Error(`raw empty catch still present at ${target}:${line}`);
}

const checks: [string, string][] = [
  ["VOID_NODE_CORE_MEMPOOL_PUSH_VISIBLE", "__void_node_core_mempool_push_seen"],
  ["VOID_NODE_CORE_SEND_RAW_VISIBLE", "__void_node_core_send_raw_seen"],
  ["VOID_NODE_CORE_MEMPOOL_CLEAR_VISIBLE", "__void_node_core_mempool_clear_seen"],
  ["VOID_NODE_CORE_TAKE_TX_BATCH_VISIBLE", "__void_node_core_take_tx_batch_seen"],
  ["VOID_NODE_CORE_SEAL_TXINDEX_PUT_VISIBLE", "__void_node_core_seal_txindex_put_seen"],
  ["VOID_NODE_CORE_PULL_TXINDEX_PUT_VISIBLE", "__void_node_core_pull_txindex_put_seen"],
  ["VOID_NODE_CORE_PULL_FILL_TXINDEX_PUT_VISIBLE", "__void_node_core_pull_fill_txindex_put_seen"],
  ["VOID_NODE_CORE_OVERRIDE_IMPORT_HOOK_VISIBLE", "__void_node_core_override_import_hook_seen"],
  ["VOID_NODE_CORE_OVERRIDE_FILL_HOOK_VISIBLE", "__void_node_core_override_fill_hook_seen"],
];

for (const [marker, guard] of checks) {
  if (!src.includes(marker)) throw new Error(`missing marker ${marker}`);
  if (!src.includes(guard)) throw new Error(`missing once-only guard ${guard}`);
}

if (!src.includes("VOID_FOLLOWER_TAILNET_HEAD_BOUNDED_IMPORT_V1_JS_OVERRIDE")) {
  throw new Error("active follower override marker missing");
}

console.log("VOID_NODE_CORE_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  node_core_raw_empty_catches_closed: 9,
  raw_empty_catches_in_target: 0,
  active_follower_override_preserved: true,
  markers: checks.map(([marker]) => marker),
}));
