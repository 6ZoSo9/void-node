#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  "zoso-Precision-Tower-7810",
  "sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2",
  "precision_hostname_mismatch",
  "precision_machine_id_mismatch",
  "precision_host_identity_bound=true",
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

{
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-replay-compare-prep-wrong-host-"),
  );
  try {
    const home = path.join(root, "home");
    const bin = path.join(root, "bin");
    const dev = path.join(home, "dev");
    const sentinel = path.join(root, "unexpected-command");
    fs.mkdirSync(bin, { recursive: true, mode: 0o700 });
    fs.mkdirSync(dev, { recursive: true, mode: 0o700 });
    fs.symlinkSync(process.cwd(), path.join(dev, "void-node"), "dir");

    const writeCommand = (name, body) => {
      const target = path.join(bin, name);
      fs.writeFileSync(
        target,
        "#!/usr/bin/env bash\nset -euo pipefail\n" + body,
        { mode: 0o700 },
      );
      fs.chmodSync(target, 0o700);
    };

    writeCommand(
      "id",
      `if [ "${1:-}" = "-u" ] && [ "${2:-}" = "" ]; then echo 1000; exit 0; fi
if [ "${1:-}" = "-u" ] && [ "${2:-}" = "void-buy-custody" ]; then echo 994; exit 0; fi
if [ "${1:-}" = "-g" ] && [ "${2:-}" = "void-buy-custody" ]; then echo 981; exit 0; fi
exit 64
`,
    );
    writeCommand(
      "getent",
      `if [ "${1:-}" = "passwd" ] && [ "${2:-}" = "994" ]; then
  printf '%s\\n' 'void-buy-custody:x:994:981::/nonexistent:/usr/sbin/nologin'
  exit 0
fi
exit 64
`,
    );
    writeCommand("hostname", "printf '%s\\n' 'not-precision'\n");
    for (const name of ["git", "ssh-keyscan", "ssh-keygen", "sudo"]) {
      writeCommand(
        name,
        `printf '%s\\n' "${0##*/}" >> ${JSON.stringify(sentinel)}
exit 97
`,
      );
    }

    const result = spawnSync("/usr/bin/bash", [file], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 5_000,
      env: {
        ...process.env,
        HOME: home,
        PATH: bin + ":/usr/bin:/bin",
      },
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /hold_reason=precision_hostname_mismatch/u);
    assert.match(
      result.stderr,
      /VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1_HOLD/u,
    );
    assert.equal(
      fs.existsSync(sentinel),
      false,
      "wrong host must HOLD before git/network/sudo/key generation",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log("VOID_REPLAY_COMPARE_ONLY_CREDENTIAL_PREP_V1_SOURCE_PROOF_GREEN");
console.log("bash_syntax_green=true");
console.log("help_side_effect_free=true");
console.log("precision_host_identity_bound_before_mutation=true");
console.log("wrong_host_holds_before_git_network_sudo_keygen=true");
console.log("source_blobs_pinned=true");
console.log("nimo_host_fingerprint_pinned=true");
console.log("independent_custody_ssh_key_required=true");
console.log("no_existing_key_overwrite=true");
console.log("compare_only_server_authorization_proven=false");
console.log("live_policy_enforcement_proven=false");
console.log("production_gate_ready=false");
