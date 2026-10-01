#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const MARKER = "VOID_CROSSBOX_BOOTSTRAP_EXPLICIT_TARGET_V1";
const files = [
  "ops/mainnet0/mutual-tailnet-peer-env-proof.sh",
  "ops/mainnet0/tailnet-http-public-base-proof.sh",
  "ops/post-bootstrap-crossbox-proof.sh",
  "ops/tailscale-ssh-auth-preflight-proof.sh",
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
  for (const retired of [
    "100.122.79.39",
    "zoso-alienware-aurora-r7.taila47fd.ts.net",
    "alienware",
  ]) {
    assert.ok(text.toLowerCase().includes(retired), `${path}: retired guard missing ${retired}`);
  }
  const guardAt = text.indexOf('case "$TARGET_GUARD"');
  const sshAt = text.indexOf('ssh "$ALIEN"');
  assert.ok(guardAt >= 0, `${path}: target guard missing`);
  if (sshAt >= 0) {
    assert.ok(guardAt < sshAt, `${path}: target guard must precede SSH`);
  }
}

const mutual = fs.readFileSync(files[0], "utf8");
const firstMutation = mutual.indexOf("systemctl --user");
assert.ok(firstMutation > 0);
assert.ok(
  mutual.indexOf('case "$TARGET_GUARD"') < firstMutation,
  "mutual peer target guard must precede systemd mutation",
);
assert.ok(mutual.includes("mutation=idempotent_systemd_user_dropin_update"));

const post = fs.readFileSync(files[2], "utf8");
assert.equal(
  post.includes('PREC_TS="${PREC_TS:-100.93.2.116}"'),
  false,
  "post-bootstrap proof must not default Precision Tailnet address",
);
assert.ok(
  post.includes(': "${PREC_TS:?set PREC_TS to the explicit current Precision Tailnet address}"'),
);

const tailnet = fs.readFileSync(files[1], "utf8");
const ssh = fs.readFileSync(files[3], "utf8");
assert.ok(tailnet.includes('echo "mutation=false"'));
assert.ok(ssh.includes('echo "mutation=false"'));
assert.equal(tailnet.includes("Alienware can reach Precision"), false);
assert.equal(ssh.includes("Alienware SSH auth usable"), false);

const doc = fs.readFileSync(
  "docs/operators/void-crossbox-bootstrap-explicit-target-v1.md",
  "utf8",
);
assert.ok(doc.includes(MARKER));
assert.ok(doc.includes("Precision, Nimo, and Xiphos"));
assert.ok(doc.includes("does not execute"));

console.log(`${MARKER}_PROOF_GREEN`);
console.log("explicit_remote_target_required=true");
console.log("retired_alienware_default=false");
console.log("retired_alienware_target_rejected=true");
console.log("post_bootstrap_precision_target_explicit=true");
console.log("runtime_execution=false");
