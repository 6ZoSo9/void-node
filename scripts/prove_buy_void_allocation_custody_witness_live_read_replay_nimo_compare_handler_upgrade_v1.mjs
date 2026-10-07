#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const file =
  "tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh";
const script = fs.readFileSync(file, "utf8");

const operatorGuide =
  "docs/architecture/buy-void-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.md";
const guide = fs.readFileSync(operatorGuide, "utf8");
const stagingHeading = "## Operator staging after this PR merges";
const headingAt = guide.indexOf(stagingHeading);
assert.ok(headingAt >= 0, "operator staging section required");
const fenceOpen = "```bash\n";
const fenceAt = guide.indexOf(fenceOpen, headingAt);
assert.ok(fenceAt >= headingAt, "operator staging shell block required");
const blockAt = fenceAt + fenceOpen.length;
const closeAt = guide.indexOf("\n```", blockAt);
assert.ok(closeAt > blockAt, "operator staging shell must close");
const operatorShell = guide.slice(blockAt, closeAt);
for (const required of [
  "03c99e0a8c1df6671e5d92f9535ebfa9682f74d2",
  "8417af2410d1cad31ac5976f0aa49df06b3586f7ddb19613df8dd39d43b06d4f",
  'sudo /usr/bin/install -o 0 -g 0 -m 0500 -- "$src" "$trusted"',
  "sudo /usr/bin/sha256sum --status -c -",
  'sudo /usr/bin/env -i PATH=/usr/bin:/bin HOME=/root LANG=C LC_ALL=C /bin/bash --noprofile --norc "$trusted"',
  "0:0:700:directory",
  "0:0:500:1:regular file",
]) {
  assert.equal(operatorShell.includes(required), true, "missing operator trust check: " + required);
}
assert.equal(
  operatorShell.includes('sudo /bin/bash "$HOME/.local/state/void-replay-compare-handler-upgrade-v1/upgrade.sh"'),
  false,
  "never execute user-writable staging source as root",
);
assert.doesNotMatch(
  operatorShell,
  /^\s*sudo\s+\/bin\/bash\s+"\$trusted"/mu,
  "unisolated privileged Bash must never be an operator launch step",
);
const handoffSyntax = spawnSync("bash", ["-n"], {
  input: operatorShell, encoding: "utf8", timeout: 5000,
});
assert.equal(handoffSyntax.status, 0, handoffSyntax.stderr);

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
  "handler_changed_during_preflight",
  "config_changed_during_preflight",
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

// Inert nonprivileged regression: BASH_ENV is read before a trusted
// noninteractive Bash script, even with --noprofile --norc. Verify
// the operator's reviewed env -i argument sequence blocks that hook.
function proveRootBashStartupEnvIsolationV1() {
  const fixtureDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-nimo-bash-startup-"),
  );
  try {
    const startup = path.join(fixtureDir, "startup.sh");
    const trusted = path.join(fixtureDir, "trusted.sh");
    fs.writeFileSync(startup, "echo BASH_ENV_PRE_BODY=1" + String.fromCharCode(10), {mode:0o600});
    fs.writeFileSync(trusted, "echo TRUSTED_BODY=1" + String.fromCharCode(10), {mode:0o600});
    const injected = {...process.env, BASH_ENV: startup};
    const original = spawnSync(
      "/bin/bash", ["--noprofile", "--norc", trusted],
      {env:injected, encoding:"utf8", timeout:5000},
    );
    assert.equal(original.status, 0, original.stderr);
    assert.match(original.stdout, /BASH_ENV_PRE_BODY=1/u);

    const protectedRun = spawnSync(
      "/usr/bin/env",
      [
        "-i", "PATH=/usr/bin:/bin", "HOME=/root", "LANG=C", "LC_ALL=C",
        "/bin/bash", "--noprofile", "--norc", trusted,
      ],
      {env:injected, encoding:"utf8", timeout:5000},
    );
    assert.equal(protectedRun.status, 0, protectedRun.stderr);
    assert.equal(protectedRun.stdout, "TRUSTED_BODY=1" + String.fromCharCode(10));
  } finally {
    fs.rmSync(fixtureDir, {recursive:true, force:true});
  }
}
proveRootBashStartupEnvIsolationV1();

console.log("VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V1_SOURCE_GREEN");
console.log("privileged_bash_startup_environment_cleared=true");
console.log("source_only_test=true");
console.log("privileged_script_root_copied_and_digest_verified=true");
console.log("temporary_mjs_suffix_required=true");
console.log("node_check_before_atomic_rename=true");
console.log("old_or_exact_new_handler_sha_required=true");
console.log("config_witness_authorization_postchecks_required=true");
console.log("live_nimo_installed=false");
console.log("production_gate_ready=false");
console.log("funds_moved=false");
