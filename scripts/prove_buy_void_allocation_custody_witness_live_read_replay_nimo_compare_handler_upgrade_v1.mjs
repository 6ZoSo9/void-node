#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const file =
  "tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh";
const script = fs.readFileSync(file, "utf8");

assert.ok(script.startsWith("#!/usr/bin/env bash\n"));
for (const token of [
  "set -Eeuo pipefail",
  "umask 077",
  "VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V1",
  "65f8de9b659c151caf4d73a93d31da3d523a77cf5a7b6ced26c42b12b7d2d3f",
  "511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831",
  "ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6",
  "b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e",
  "stat -c '%u:%g:%a:%h:%F'",
  "authorized_key_count_changed",
  "pending_append_intent",
  "staged_handler_sha_mismatch",
  'tmp="$(mktemp "$parent/.handler.compare-v1.new.XXXXXXXX.mjs")"',
  '/usr/bin/node --check "$tmp"',
  'mv -T -- "$tmp" "$target"',
  "handler_atomically_replaced=true",
  "handler_already_current=true",
  "handler_post_metadata_mismatch",
  "config_post_mutation",
  "witness_post_mutation",
  "ssh_authorization_post_mutation",
  "authorized_keys_mutation=false",
  "witness_mutation=false",
  "compare_only_key_installed=false",
  "production_gate_ready=false",
]) {
  assert.ok(script.includes(token), "missing guard: " + token);
}

assert.doesNotMatch(script, /\b(?:scp|rsync|curl|wget|git\s+push|ssh\s+-)\b/u);
assert.doesNotMatch(script, /\b(?:systemctl|chmod\s+-R|chown\s+-R|eval|exec\s+-c)\b/u);
assert.doesNotMatch(script, /\b(?:truncate|shred|rm\s+-rf)\b/u);
assert.doesNotMatch(script, /node\s+--check\s+"\$parent\/\.handler\.compare-v1\.new\.\$\$"/u);

const syntax=spawnSync("bash",["-n",file],{encoding:"utf8",timeout:5000});
assert.equal(syntax.status,0,syntax.stderr);
const help=spawnSync("bash",[file,"--help"],{encoding:"utf8",timeout:5000});
assert.equal(help.status,0,help.stderr);
assert.match(help.stdout,/Nimo-only handler replacement/u);
assert.equal(help.stderr,"");

console.log("VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V1_SOURCE_GREEN");
console.log("source_only_test=true");
console.log("temporary_mjs_suffix_required=true");
console.log("node_check_before_atomic_rename=true");
console.log("old_or_exact_new_handler_sha_required=true");
console.log("config_witness_authorization_postchecks_required=true");
console.log("live_nimo_installed=false");
console.log("production_gate_ready=false");
console.log("funds_moved=false");
