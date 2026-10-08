#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const file =
  "tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v2.sh";
const script = fs.readFileSync(file, "utf8");
const authSource = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.sh",
  "utf8",
);

assert.equal(script.startsWith("#!/usr/bin/env bash\n"), true);
for (const token of [
  "set -Eeuo pipefail",
  "umask 077",
  "VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V2",
  "/root/.void-replay-nimo-compare-handler-upgrade-v2.sh",
  "trusted_root_script_path_required",
  "trusted_root_script_metadata_changed",
  "0:0:500:1:regular file",
  "65f8de9b659c151caf4d73a93d31da3d523a77cf5a7b6ced26c42b12b7d2d3f",
  "511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831",
  "ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6",
  "b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e",
  "authorized_key_count_changed",
  '[[ "$auth_count" == "2" || "$auth_count" == "3" ]]',
  'if [[ "$auth_count" == "3" ]]; then',
  "compare_wrapper_missing_or_symlink",
  "compare_wrapper_metadata_changed",
  "compare_wrapper_source_changed",
  "compare_wrapper_syntax_invalid",
  "309b4de7c40c5b8a21bbc956cc445f6600a33215",
  "SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI",
  "compare_public_fingerprint_changed",
  "third_authorized_key_not_exact_compare_only",
  "existing_third_compare_only_authorization_verified=true",
  "authorized_keys_original_two_entries=true",
  "pending_append_intent",
  "staged_handler_sha_mismatch",
  "authorized_keys_changed_during_preflight",
  'tmp="$(mktemp "$parent/.handler.compare-v1.new.XXXXXXXX.mjs")"',
  '/usr/bin/node --check "$tmp"',
  'mv -T -- "$tmp" "$target"',
  "handler_atomically_replaced=true",
  "handler_already_current=true",
  "handler_post_metadata_mismatch",
  "config_post_mutation",
  "witness_post_mutation",
  "ssh_authorization_post_mutation",
  'echo "compare_only_key_installed=$compare_only_key_installed"',
  "authorized_keys_mutation=false",
  "witness_mutation=false",
  "production_gate_ready=false",
]) {
  assert.ok(script.includes(token), "missing guard: " + token);
}

// Both entry variants must inherit the exact compare-only authorized key
// formatting from the previously reviewed independent authorization source.
const force = authSource.match(/^forced_command=".*"$/mu)?.[0];
const third = authSource.match(/^third=".*"$/mu)?.[0];
assert.ok(force, "reviewed forced command missing");
assert.ok(third, "reviewed restricted key line missing");
assert.equal(script.includes(force), true);
assert.equal(
  script.includes(third.replace(/^third=/u, "expected_third=")),
  true,
  "third entry must bind the entire authorized_keys line, not merely a fingerprint",
);

const indexOf = (token) => {
  const at = script.indexOf(token);
  assert.ok(at >= 0, token);
  return at;
};
const authBefore = indexOf('auth_before="$(sha256sum "$auth"');
const verifyThree = indexOf('third_authorized_key_not_exact_compare_only');
const changeHandler = indexOf('mv -T -- "$tmp" "$target"');
const postAuth = indexOf("ssh_authorization_post_mutation");
assert.ok(verifyThree < authBefore && authBefore < changeHandler);
assert.ok(changeHandler < postAuth);

assert.doesNotMatch(script, /(?:scp|rsync|curl|wget|git\s+push|ssh\s+-)/u);
assert.doesNotMatch(script, /\b(?:systemctl|eval|chmod\s+-R|chown\s+-R|rm\s+-rf)\b/u);
assert.doesNotMatch(script, /mv[^\n]*"\$auth"/u);
assert.doesNotMatch(script, /(?:cat|printf)[^\n]*>\s*"\$auth"/u);

const syntax = spawnSync("/bin/bash", ["-n", file], {
  encoding: "utf8", timeout: 5000,
});
assert.equal(syntax.status, 0, syntax.stderr);
const help = spawnSync("/bin/bash", [file, "--help"], {
  encoding: "utf8", timeout: 5000,
});
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /Nimo-only handler replacement/u);
assert.equal(help.stderr, "");

console.log("VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V2_SOURCE_GREEN");
console.log("source_only_test=true");
console.log("trusted_root_path_and_metadata_required=true");
console.log("exact_two_or_verified_three_keys_admitted=true");
console.log("three_key_exact_restricted_command_and_fingerprint_required=true");
console.log("reviewed_compare_wrapper_required_for_three_keys=true");
console.log("existing_keys_never_mutated=true");
console.log("mismatched_extra_key_rejected_before_handler_mutation=true");
console.log("exact_old_or_new_handler_sha_required=true");
console.log("node_check_and_atomic_handler_replacement_required=true");
console.log("live_nimo_installed=false");
console.log("production_gate_ready=false");
console.log("funds_moved=false");
