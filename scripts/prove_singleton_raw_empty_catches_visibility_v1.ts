import fs from "node:fs";

const targets = [
  "src/hooks/txroot_setter.js",
  "tools/datanet-field-object-mirror-v1.mjs",
  "src/dev/dev_safe_bundle.js",
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

const txroot = fs.readFileSync("src/hooks/txroot_setter.js", "utf8");
if (!txroot.includes("VOID_TXROOT_SETTER_HEARTBEAT_VISIBLE")) {
  throw new Error("missing txroot setter heartbeat visibility marker");
}
if (!txroot.includes("__void_txroot_setter_heartbeat_error_seen")) {
  throw new Error("missing txroot setter once-only guard");
}

const mirror = fs.readFileSync("tools/datanet-field-object-mirror-v1.mjs", "utf8");
if (!mirror.includes("VOID_DATANET_FIELD_OBJECT_MIRROR_RECEIPT_SCAN_SKIP_VISIBLE")) {
  throw new Error("missing datanet mirror receipt scan visibility marker");
}
if (!mirror.includes("receiptScanSkipErrors++")) {
  throw new Error("missing datanet mirror skip error counter");
}

const dev = fs.readFileSync("src/dev/dev_safe_bundle.js", "utf8");
if (!dev.includes("VOID_DEV_SAFE_BUNDLE_APPEND_OBSERVE_VISIBLE")) {
  throw new Error("missing dev safe bundle append observe visibility marker");
}
if (!dev.includes("__void_dev_safe_bundle_append_observe_error_seen")) {
  throw new Error("missing dev safe bundle once-only guard");
}

console.log("VOID_SINGLETON_RAW_EMPTY_CATCHES_VISIBILITY_V1_GREEN", JSON.stringify({
  targets,
  singleton_raw_empty_catches_closed: 3,
  raw_empty_catches_in_targets: 0,
  markers: [
    "VOID_TXROOT_SETTER_HEARTBEAT_VISIBLE",
    "VOID_DATANET_FIELD_OBJECT_MIRROR_RECEIPT_SCAN_SKIP_VISIBLE",
    "VOID_DEV_SAFE_BUNDLE_APPEND_OBSERVE_VISIBLE",
  ],
}));
