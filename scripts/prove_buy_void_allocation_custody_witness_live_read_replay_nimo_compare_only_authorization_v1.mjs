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
const forcedLine = s.split("\n").find((line) => line.startsWith("forced_command="));
const thirdLine = s.split("\n").find((line) => line.startsWith("third="));
assert.ok(forcedLine, "forced command assignment required");
assert.ok(thirdLine, "third key assignment required");
assert.ok(
  forcedLine.includes("/usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C HOME=/var/lib/voidwitness"),
  "compare-only Node must start from an empty allowlisted environment",
);
assert.ok(
  forcedLine.includes("VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1"),
  "compare-only marker must be preserved",
);
assert.ok(
  forcedLine.includes(String.raw`SSH_ORIGINAL_COMMAND=\"\${SSH_ORIGINAL_COMMAND-}\"`),
  "the true SSH_ORIGINAL_COMMAND must be preserved as a quoted variable",
);
assert.ok(
  thirdLine.includes("forced_command//"),
  "OpenSSH authorized_keys quoting must escape the nested variable expansion",
);
assert.doesNotMatch(
  s,
  /forced_command="\/usr\/bin\/env VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1/u,
  "ambient environment must never reach the compare-only Node entry point",
);
assert.match(
  s,
  /committed=true\s+if ! mv -T -- "\$tmpauth" "\$auth"/u,
  "rollback obligation must be set before atomic authorized_keys publication",
);
for (const signal of ["HUP", "INT", "TERM"]) {
  assert.ok(s.includes("trap 'exit " + ({HUP:129, INT:130, TERM:143})[signal] + "' " + signal));
}
const forcedProof = spawnSync("/usr/bin/bash", [
  "-c",
  [
    "wrapper=/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs",
    "public=TESTPUBKEY",
    forcedLine,
    thirdLine,
    "printf '%s\\n' \"$third\"",
  ].join("\n"),
], {
  encoding: "utf8",
  timeout: 5000,
  env: {PATH:"/usr/bin:/bin"},
});
assert.equal(forcedProof.status, 0, forcedProof.stderr);
const authLine=forcedProof.stdout.trim();
const authMatch=authLine.match(/^restrict,command="((?:\\.|[^"])*)" ssh-ed25519 TESTPUBKEY void-replay-compare-only-v1$/u);
assert.ok(authMatch, "third authorized-key entry must contain a valid quoted forced command");
const parsedForced=authMatch[1].replaceAll('\\\"','"');
const inertForced=parsedForced.replace(
  " /usr/bin/node /usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs",
  " /usr/bin/env",
);
assert.notEqual(inertForced, parsedForced, "test must replace only the fixed Node entrypoint");
const originalCommand='ignored-token "quoted" ; $(echo injected)';
const isolated=spawnSync("/bin/sh",["-c",inertForced],{
  encoding:"utf8",timeout:5000,
  env:{
    PATH:"/usr/bin:/bin",
    SSH_ORIGINAL_COMMAND:originalCommand,
    NODE_OPTIONS:"--require /nonexistent/evil-node-options.js",
    NODE_PATH:"/nonexistent/injected",
    ATTACKER_OTHER_VAR:"present",
  },
});
assert.equal(isolated.status,0,isolated.stderr);
assert.ok(isolated.stdout.includes("SSH_ORIGINAL_COMMAND="+originalCommand+"\n"));
assert.doesNotMatch(isolated.stdout,/NODE_OPTIONS|NODE_PATH|ATTACKER_OTHER_VAR/u);
assert.ok(isolated.stdout.includes("VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1\n"));

assert.doesNotMatch(s, /(?:ssh|sshd)\s+-[A-Za-z]*R\b/u);
assert.doesNotMatch(s, /\brm\s+-rf\b/u);
assert.doesNotMatch(s, /\beval\s/u);

const operatorGuide =
  "docs/architecture/buy-void-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.md";
const guide = fs.readFileSync(operatorGuide, "utf8");
const blobResult = spawnSync("/usr/bin/git", ["hash-object", script], {
  encoding: "utf8",
  timeout: 5000,
});
assert.equal(blobResult.status, 0, blobResult.stderr);
const actualInstallerBlob = blobResult.stdout.trim();
assert.match(actualInstallerBlob, /^[0-9a-f]{40}$/u);
const installerGuidePinned = (content) =>
  content.includes("installer_blob=" + actualInstallerBlob) &&
  content.includes("expected_blob=" + actualInstallerBlob);
assert.equal(
  installerGuidePinned(guide),
  true,
  "both operator and Nimo installer pins must match the current reviewed source bytes",
);
assert.equal(
  installerGuidePinned(guide.replace(
    "installer_blob=" + actualInstallerBlob,
    "installer_blob=" + "0".repeat(40),
  )),
  false,
  "stale operator installer pin must be rejected",
);
assert.equal(
  installerGuidePinned(guide.replace(
    "expected_blob=" + actualInstallerBlob,
    "expected_blob=" + "0".repeat(40),
  )),
  false,
  "stale root-copy installer pin must be rejected",
);
assert.match(
  guide,
  /trusted=\/root\/\.void-replay-compare-only-nimo-authorization-v1\.sh/u,
);
assert.match(
  guide,
  /sudo \/usr\/bin\/git hash-object "\$trusted"/u,
);
const trustedRootShell =
  'sudo /usr/bin/env -i HOME=/root PATH=/usr/sbin:/usr/bin:/sbin:/bin LANG=C LC_ALL=C /bin/bash --noprofile --norc "$trusted"';
assert.equal(
  guide.includes(trustedRootShell),
  true,
  "trusted root installer must start Bash from the fixed empty environment",
);
assert.equal(
  guide.includes('sudo /bin/bash "$trusted"'),
  false,
  "trusted root installer must not inherit the caller environment",
);
assert.doesNotMatch(
  guide,
  /sudo \/bin\/bash \/home\/zoso\/\.local\/state\/void-replay-compare-only-nimo-auth-v1\/authorize\.sh/u,
  "operator handoff must never execute the user-writable staged installer as root",
);
const bashEnvRoot = fs.mkdtempSync(
  "/tmp/void-nimo-compare-auth-root-bash-env-proof-",
);
try {
  const bashEnv = bashEnvRoot + "/ambient-bash-env.sh";
  const sentinel = bashEnvRoot + "/ambient-executed";
  const trustedProbe = bashEnvRoot + "/trusted-probe.sh";
  fs.writeFileSync(
    bashEnv,
    'printf "ambient\\n" > ' + JSON.stringify(sentinel) + "\n",
    { mode: 0o600 },
  );
  fs.writeFileSync(
    trustedProbe,
    'set -eu\nprintf "trusted-body\\n"\n',
    { mode: 0o500 },
  );

  const inherited = spawnSync(
    "/bin/bash",
    ["--noprofile", "--norc", trustedProbe],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BASH_ENV: bashEnv,
        ENV: bashEnv,
        CDPATH: bashEnvRoot,
      },
    },
  );
  assert.equal(inherited.status, 0, inherited.stderr);
  assert.equal(
    fs.existsSync(sentinel),
    true,
    "proof adversary must execute through inherited BASH_ENV",
  );
  fs.rmSync(sentinel, { force: true });

  const isolatedRootShell = spawnSync(
    "/usr/bin/env",
    [
      "-i",
      "HOME=/root",
      "PATH=/usr/sbin:/usr/bin:/sbin:/bin",
      "LANG=C",
      "LC_ALL=C",
      "/bin/bash",
      "--noprofile",
      "--norc",
      trustedProbe,
    ],
    {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        BASH_ENV: bashEnv,
        ENV: bashEnv,
        CDPATH: bashEnvRoot,
      },
    },
  );
  assert.equal(isolatedRootShell.status, 0, isolatedRootShell.stderr);
  assert.equal(isolatedRootShell.stdout, "trusted-body\n");
  assert.equal(
    fs.existsSync(sentinel),
    false,
    "env-isolated trusted root Bash must not source caller BASH_ENV",
  );
} finally {
  fs.rmSync(bashEnvRoot, { recursive: true, force: true });
}

const documentedForcedCommand =
  'restrict,command="/usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C HOME=/var/lib/voidwitness VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1 SSH_ORIGINAL_COMMAND=\\\"\${SSH_ORIGINAL_COMMAND-}\\\" /usr/bin/node /usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs" ssh-ed25519 <new-custody-compare-public-key> void-replay-compare-only-v1';
assert.equal(
  guide.includes(documentedForcedCommand),
  true,
  "operator guide must publish the exact environment-clearing forced-command shape",
);
assert.equal(
  guide.includes(
    'restrict,command="/usr/bin/env VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1 ',
  ),
  false,
  "operator guide must not retain the inherited-environment forced-command example",
);

console.log("VOID_REPLAY_NIMO_COMPARE_ONLY_AUTHORIZATION_SOURCE_PROOF_V1_GREEN");
console.log("source_only=true");
console.log("nimo_install_executed=false");
console.log("new_wrapper_content_pinned=true");
console.log("new_credential_fingerprint_pinned=true");
console.log("credential_consumed_from_root_snapshot=true");
console.log("privileged_installer_root_copy_blob_pinned=true");
console.log("privileged_bash_environment_isolated=true");
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
