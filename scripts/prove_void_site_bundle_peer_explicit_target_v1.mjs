#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_SITE_BUNDLE_PEER_EXPLICIT_TARGET_V1";
const files = [
  "ops/security/void-public-site-bundle-auto-materialize-proof.sh",
  "ops/security/void-public-site-bundle-peer-readiness-proof.sh",
  "ops/security/void-site-bundle-peer-env-persistence-proof.sh",
];

for (const path of files) {
  const text = fs.readFileSync(path, "utf8");
  assert.equal(
    text.includes('ALIEN="${ALIEN:-zoso@100.122.79.39}"'),
    false,
    `${path}: retired SSH target must not be a default`,
  );
  assert.ok(text.includes(': "${ALIEN:?'), `${path}: explicit ALIEN target required`);
  assert.ok(text.includes(MARKER), `${path}: HOLD marker missing`);
  const guardAt = text.indexOf('case "$TARGET_GUARD"');
  const sshAt = text.indexOf('ssh "$ALIEN"');
  assert.ok(guardAt >= 0, `${path}: target guard missing`);
  if (sshAt >= 0) assert.ok(guardAt < sshAt, `${path}: guard must precede SSH`);
}

const auto = fs.readFileSync(files[0], "utf8");
assert.ok(
  auto.indexOf('case "$TARGET_GUARD"') < auto.indexOf('rm -rf "$dir"'),
  "auto-materialize target guard must precede local cache mutation source",
);
assert.equal(auto.includes('"peer": "Alienware via SSH/local HTTP"'), false);

const persist = fs.readFileSync(files[2], "utf8");
assert.equal(
  persist.includes('LOCAL_PEER="${LOCAL_PEER:-http://100.122.79.39:4100}"'),
  false,
);
assert.equal(
  persist.includes('REMOTE_PEER="${REMOTE_PEER:-http://100.93.2.116:4100}"'),
  false,
);
assert.ok(persist.includes(': "${LOCAL_PEER:?'));
assert.ok(persist.includes(': "${REMOTE_PEER:?'));
assert.ok(persist.includes('"$ALIEN" "$LOCAL_PEER" "$REMOTE_PEER"'));
assert.ok(
  persist.indexOf('case "$TARGET_GUARD"') < persist.indexOf("systemctl --user"),
  "persistence target guard must precede systemd mutation source",
);

const doc = fs.readFileSync(
  "docs/operators/void-site-bundle-peer-explicit-target-v1.md",
  "utf8",
);
assert.ok(doc.includes(MARKER));
assert.ok(doc.includes("Precision, Nimo, and Xiphos"));
assert.ok(doc.includes("does not execute"));

console.log(`${MARKER}_PROOF_GREEN`);
console.log("explicit_remote_ssh_required=true");
console.log("explicit_local_peer_required=true");
console.log("explicit_remote_peer_required=true");
console.log("retired_alienware_default=false");
console.log("retired_alienware_coordinates_rejected=true");
console.log("guard_before_mutation=true");
console.log("runtime_execution=false");
