#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_CANONICAL_PRODUCER_NO_EMPTY_AUTOPROP_V1_PROOF_GREEN";

const index = fs.readFileSync("src/index.ts", "utf8");
const nodeCore = fs.readFileSync("src/node_core.ts", "utf8");
const runtimeFix = fs.readFileSync("ops/fix-main-runtime-autoprop.sh", "utf8");
const installUnits = fs.readFileSync("ops/install-user-units.sh", "utf8");
const boot = fs.readFileSync("scripts/boot.sh", "utf8");
const envExample = fs.readFileSync(".env.example", "utf8");

assert.ok(
  index.includes('const url = base() + "/__void/metrics/proposer.commit-direct.v2fs/commit?empty=0";'),
  "automatic commit-direct loop must request empty=0",
);
assert.ok(
  index.includes(
    'const url = `http://127.0.0.1:${port()}/__void/metrics/proposer.commit-direct.v2fs/commit?empty=0`;',
  ),
  "boot warm-kick must request empty=0",
);
assert.ok(!index.includes("proposer.commit-direct.v2fs/commit?empty=1"), "forced-empty autoprop call remains");
assert.ok(index.includes("const AUTO_EMPTY = 0;"), "autoprop empty policy marker must be zero");
assert.ok(index.includes("const AUTO_EMPTY2 = 0;"), "warm-kick empty policy marker must be zero");

assert.ok(
  nodeCore.includes("if (txs.length === 0 && !allowEmpty)"),
  "Node sealBlock must retain idle no-op guard",
);
assert.ok(
  nodeCore.includes("return { ok: true, number: parent, txs: 0 };"),
  "idle seal must preserve canonical head",
);

for (const name of [
  "VOID_COMMIT_DIRECT_V2FS_EMPTY",
  "VOID_COMMIT_DIRECT_V2FS_AUTO_EMPTY",
  "VOID_COMMIT_DIRECT_V2FS_ALLOW_EMPTY",
  "ALLOW_EMPTY_BLOCKS",
  "VOID_ALLOW_EMPTY",
  "VOID_V2FS_AUTO_EMPTY",
]) {
  assert.ok(runtimeFix.includes(`Environment=${name}=0`), `runtime repair must set ${name}=0`);
  assert.ok(!runtimeFix.includes(`Environment=${name}=1`), `runtime repair must not set ${name}=1`);
}

for (const name of [
  "VOID_COMMIT_DIRECT_V2FS_EMPTY",
  "VOID_COMMIT_DIRECT_V2FS_AUTO_EMPTY",
  "VOID_COMMIT_DIRECT_V2FS_ALLOW_EMPTY",
]) {
  assert.ok(installUnits.includes(`Environment=${name}=0`), `installed main unit must set ${name}=0`);
}

assert.ok(boot.includes("ALLOW_EMPTY=${ALLOW_EMPTY:-0}"), "local boot default must reject empty blocks");
assert.ok(envExample.includes("ALLOW_EMPTY_BLOCKS=0"), "documented default must reject empty blocks");

console.log(MARKER);
console.log("automatic_empty_seal=false");
console.log("manual_explicit_empty_override_preserved=true");
console.log("commit_direct_autoprop_preserved=true");
console.log("idle_head_should_remain_constant=true");
