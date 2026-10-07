#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const script =
  "tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.sh";
const s = fs.readFileSync(script, "utf8");
const syntax = spawnSync("/usr/bin/bash", ["-n", script], {
  encoding: "utf8",
  timeout: 5_000,
});
assert.equal(syntax.status, 0, syntax.stderr);
const help = spawnSync("/usr/bin/bash", [script, "--help"], {
  encoding: "utf8",
  timeout: 5_000,
});
assert.equal(help.status, 0, help.stderr);
assert.match(help.stdout, /VOID_REPLAY_NIMO_COMPARE_ONLY_AUTHORIZATION_V1/u);

const selfTest = spawnSync("/usr/bin/bash", [script, "--self-test-cleanup"], {
  encoding: "utf8",
  timeout: 10_000,
});
assert.equal(selfTest.status, 0, selfTest.stderr);
assert.match(selfTest.stdout, /staged_key_swap_bound_to_root_snapshot=true/u);
assert.match(selfTest.stdout, /mismatched_recovery_backup_preserved=true/u);
assert.match(selfTest.stdout, /failed_restore_rename_backup_preserved=true/u);

for (const token of [
  "root_nimo_required",
  "getent passwd 997",
  "compare_handler_upgrade_required",
  "compare_wrapper_source_changed",
  "compare_public_snapshot_or_fingerprint_invalid",
  "void-replay-compare-only-v1",
  "authorized_keys_rollback_attempted=true",
  "third_key_atomically_installed=true",
  "prior_two_authorized_keys_preserved=true",
  "config_unchanged=true",
  "witness_unchanged=true",
  "handler_unchanged=true",
  "live_authenticated_compare_proven=false",
  "live_policy_enforcement_proven=false",
  "rollback_resistance_proven=false",
  "production_gate_ready=false",
  "restrict,command=",
  "voidwitness:984",
  "309b4de7c40c5b8a21bbc956cc445f6600a33215",
  "511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831",
  "ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6",
  "b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e",
  "SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI",
  "authorized_key_count_postchange",
  "old_keys_changed",
  "installer_not_root_trusted_path",
  "installer_trusted_metadata_changed",
  "compare_public_snapshot_or_fingerprint_invalid",
  "AUTHORIZED_KEYS_RECOVERY_BACKUP=",
  "snapshot_compare_public_key_v1",
  "attempt_authorized_keys_restore_v1",
]) {
  assert.equal(s.includes(token), true, token);
}

assert.match(
  s,
  /git hash-object "\$wrapper_source"[\s\S]*wrapper_source_changed/u,
  "wrapper source blob must be pinned",
);
assert.match(
  s,
  /snapshot_compare_public_key_v1[\s\S]*ssh-keygen -lf "\$compare_pub_snapshot"[\s\S]*read -r algorithm public comment < "\$compare_pub_snapshot"/u,
  "fingerprint and consumed key bytes must come from the same root-controlled snapshot",
);
assert.doesNotMatch(
  s,
  /ssh-keygen -lf "\$compare_pub"/u,
  "staged public-key pathname must not be independently fingerprinted then reopened",
);
assert.match(
  s,
  /\/usr\/bin\/node --check "\$wrapper_source"/u,
  "wrapper must be syntax checked before install",
);
assert.match(
  s,
  /mv -T -- "\$tmpwrapper" "\$wrapper"/u,
  "wrapper publication must be same-directory atomic",
);
assert.match(
  s,
  /head -n 2 "\$tmpauth"[\s\S]*old_two_sha/u,
  "two prior authorized-key entries must be retained unchanged",
);
assert.match(
  s,
  /mv -T -- "\$tmpauth" "\$auth"/u,
  "authorized-keys publication must be atomic",
);
assert.match(
  s,
  /if \[\[ "\$finished" != true && "\$committed" == true[\s\S]*attempt_authorized_keys_restore_v1/u,
  "post-commit failure must attempt verified rollback",
);
assert.match(
  s,
  /URGENT_AUTHORIZED_KEYS_MANUAL_RESTORE_REQUIRED=true[\s\S]*AUTHORIZED_KEYS_RECOVERY_BACKUP=%s/u,
  "manual recovery path must preserve and report the backup",
);
assert.match(
  s,
  /forced_command="\/usr\/bin\/env VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1 \/usr\/bin\/node \$wrapper"/u,
  "third key must invoke only the fixed compare-only wrapper",
);
assert.doesNotMatch(s, /(?:ssh|sshd)\s+-[A-Za-z]*R\b/u);
assert.doesNotMatch(s, /\brm\s+-rf\b/u);
assert.doesNotMatch(s, /\beval\s/u);

const operatorGuide =
  "docs/architecture/buy-void-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.md";
const guide = fs.readFileSync(operatorGuide, "utf8");
assert.match(
  guide,
  /installer_blob=1e8f7683f30a160d1df7992e624d613c93274998/u,
);
assert.match(
  guide,
  /trusted=\/root\/\.void-replay-compare-only-nimo-authorization-v1\.sh/u,
);
assert.match(
  guide,
  /sudo \/usr\/bin\/git hash-object "\$trusted"/u,
);
assert.match(
  guide,
  /sudo \/bin\/bash "\$trusted"/u,
);
assert.doesNotMatch(
  guide,
  /sudo \/bin\/bash \/home\/zoso\/\.local\/state\/void-replay-compare-only-nimo-auth-v1\/authorize\.sh/u,
  "operator handoff must never execute the user-writable staged installer as root",
);

console.log("VOID_REPLAY_NIMO_COMPARE_ONLY_AUTHORIZATION_SOURCE_PROOF_V1_GREEN");
console.log("source_only=true");
console.log("nimo_install_executed=false");
console.log("new_wrapper_content_pinned=true");
console.log("new_credential_fingerprint_pinned=true");
console.log("credential_consumed_from_root_snapshot=true");
console.log("privileged_installer_root_copy_blob_pinned=true");
console.log("manual_recovery_backup_preserved_on_restore_failure=true");
console.log("first_two_keys_preserved_by_contract=true");
console.log("forced_command_restricted_by_contract=true");
console.log("root_auth_atomic_publish=true");
console.log("fail_closed_before_any_live_replay_mutation=true");
console.log("live_authenticated_compare_proven=false");
console.log("live_policy_enforcement_proven=false");
console.log("rollback_resistance_proven=false");
console.log("production_gate_ready=false");
console.log("funds_moved=false");
