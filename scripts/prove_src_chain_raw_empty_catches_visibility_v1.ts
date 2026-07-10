import fs from "node:fs";

const targets = [
  "src/chain/auto_repair.js",
  "src/chain/seg_store.js",
  "src/chain/txindex.js",
];

const rawEmpty = /(?<![.\w$])catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;

for (const target of targets) {
  const src = fs.readFileSync(target, "utf8");
  const hits = [...src.matchAll(rawEmpty)];
  if (hits.length !== 0) {
    const first = hits[0];
    const line = src.slice(0, first.index).split("\n").length;
    throw new Error(`raw empty catch still present at ${target}:${line}`);
  }
}

const checks: [string, string, string][] = [
  ["src/chain/auto_repair.js", "VOID_CHAIN_AUTO_REPAIR_SCAN_PARSE_VISIBLE", "__void_chain_auto_repair_scan_parse_seen"],
  ["src/chain/auto_repair.js", "VOID_CHAIN_AUTO_REPAIR_CLOSE_VISIBLE", "__void_chain_auto_repair_close_seen"],
  ["src/chain/auto_repair.js", "VOID_CHAIN_AUTO_REPAIR_INDEX_CLOSE_VISIBLE", "__void_chain_auto_repair_index_close_seen"],
  ["src/chain/seg_store.js", "VOID_CHAIN_SEG_STORE_INDEX_PARSE_VISIBLE", "__void_chain_seg_store_index_parse_seen"],
  ["src/chain/seg_store.js", "VOID_CHAIN_SEG_STORE_CLOSE_VISIBLE", "__void_chain_seg_store_close_seen"],
  ["src/chain/txindex.js", "VOID_CHAIN_TXINDEX_LIST_SHARDS_VISIBLE", "__void_chain_txindex_list_shards_seen"],
  ["src/chain/txindex.js", "VOID_CHAIN_TXINDEX_LOOKUP_SHARD_VISIBLE", "__void_chain_txindex_lookup_shard_seen"],
];

for (const [target, marker, guard] of checks) {
  const src = fs.readFileSync(target, "utf8");
  if (!src.includes(marker)) throw new Error(`missing marker ${marker} in ${target}`);
  if (!src.includes(guard)) throw new Error(`missing once-only guard ${guard} in ${target}`);
}

const txindex = fs.readFileSync("src/chain/txindex.js", "utf8");
if (!txindex.includes('code==="ENOENT"')) {
  throw new Error("missing ENOENT suppression for txindex best-effort misses");
}

console.log("VOID_SRC_CHAIN_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  src_chain_raw_empty_catches_closed: 7,
  raw_empty_catches_in_targets: 0,
  txindex_enoent_suppressed: true,
  markers: checks.map(([, marker]) => marker),
}));
