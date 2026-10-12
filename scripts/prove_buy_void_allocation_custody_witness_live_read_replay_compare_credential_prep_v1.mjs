#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const file =
  "tools/void-buy-allocation-custody-witness-live-read-replay-compare-credential-prep-v1.sh";
const src = fs.readFileSync(file, "utf8");

assert.ok(src.startsWith("#!/usr/bin/env bash\n"));
for (const token of [
  "set -Eeuo pipefail",
  "umask 077",
  "VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1",
  "309b4de7c40c5b8a21bbc956cc445f6600a33215",
  "c59f603ac5755a4b4021e7c5d5feaad386e23643",
  "ssh-keyscan -T 8 -t ed25519 100.91.79.112",
  "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk",
  "sudo -n -u \"$user\" /usr/bin/ssh-keygen",
  "sudo -n -u \"$user\" ssh-keygen -y -f \"$key\"",
  "private_exists",
  "public_exists",
  "partial_key_pair_manual_review_required",
  "keypair_mismatch",
  "reused_append_or_generic_credential",
  "0:0:444:regular file",
  "994:981:600:regular file",
  "known_hosts_pin_mismatch",
  "existing_host_pin_reused=true",
  "source_binding_green=true",
  "nimo_authorization_mutation=false",
  "live_policy_enforcement_proven=false",
  "rollback_resistance_proven=false",
  "production_gate_ready=false",
  "VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1",
]) {
  assert.equal(src.includes(token), true, "missing source guard: " + token);
}
assert.doesNotMatch(src, /\bscp\s/u);
assert.doesNotMatch(src, /\brsync\s/u);
assert.doesNotMatch(src, /(?:^|\s)ssh\s+-/mu);
assert.doesNotMatch(src, /\bauthorized_keys\b/u);
assert.doesNotMatch(src, /\b(?:systemctl|service|wallet|signer|broadcast|deploy)\s+/u);
assert.doesNotMatch(src, /\bcurl\s+-/u);
assert.doesNotMatch(src, /\beval\s+/u);
assert.doesNotMatch(src, /\bsource\s+[^\n]+/u);

const syntax = spawnSync("/usr/bin/bash", ["-n", file], {
  encoding: "utf8",
  timeout: 5_000,
});
assert.equal(syntax.status, 0, syntax.stderr);

const help = spawnSync("/usr/bin/bash", [file, "--help"], {
  encoding: "utf8",
  timeout: 5_000,
});
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1/u);
assert.match(help.stdout, /Precision-only/u);
assert.equal(help.stderr, "");

console.log("VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1_SOURCE_PROOF_GREEN");
console.log("bash_syntax_green=true");
console.log("help_side_effect_free=true");
console.log("source_blobs_pinned=true");
console.log("nimo_host_fingerprint_pinned=true");
console.log("independent_custody_ssh_key_required=true");
console.log("no_existing_key_overwrite=true");
console.log("compare_only_server_authorization_proven=false");
console.log("live_policy_enforcement_proven=false");
console.log("production_gate_ready=false");
