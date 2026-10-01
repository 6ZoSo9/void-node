#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKER = "VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1";
const ROOT = childProcess.execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const MUTATING = "ops/mainnet0/mutual-tailnet-peer-env-proof.sh";
const READ_ONLY = [
  "ops/mainnet0/tailnet-http-public-base-proof.sh",
  "ops/post-bootstrap-crossbox-proof.sh",
  "ops/tailscale-ssh-auth-preflight-proof.sh",
];
const ALL = [MUTATING, ...READ_ONLY];

function source(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

for (const file of ALL) {
  const checked = childProcess.spawnSync("/usr/bin/bash", ["-n", file], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(checked.status, 0, `${file}: bash -n failed: ${checked.stderr}`);
  const text = source(file);
  assert.ok(text.includes(MARKER), `${file}: marker missing`);
  assert.ok(text.includes("valid_ssh_target"), `${file}: SSH grammar missing`);
  assert.equal(
    text.includes('ALIEN="${ALIEN:-zoso@100.122.79.39}"'),
    false,
    `${file}: retired SSH default returned`,
  );
  const validationAt = text.indexOf('valid_ssh_target "$ALIEN"');
  const directSshAt = text.indexOf('ssh "$ALIEN"');
  assert.ok(validationAt >= 0, `${file}: SSH validation call missing`);
  if (directSshAt >= 0) {
    assert.ok(
      validationAt < directSshAt,
      `${file}: SSH validation must precede direct SSH`,
    );
  }
}

const mutating = source(MUTATING);
for (const required of [
  'CONFIRM_MUTUAL_TAILNET_PEER_ENV',
  'applyVoidMutualTailnetPeerEnvV1',
  'valid_port "$HTTP_PORT"',
  'valid_ipv4 "$PRECISION_TS"',
  'valid_ipv4 "$ALIEN_TS"',
  'git -C "$ROOT" status --porcelain=v1 --untracked-files=all',
  'git -C "$ROOT" rev-parse HEAD',
  'git status --porcelain=v1 --untracked-files=all',
  'git rev-parse HEAD',
  'remote repository HEAD mismatch',
  'remote resolved to local host',
  'prove_source_parity',
]) {
  assert.ok(mutating.includes(required), `mutating proof missing ${required}`);
}
const confirmationAt = mutating.indexOf(
  '[ "$CONFIRM_MUTUAL_TAILNET_PEER_ENV" = "applyVoidMutualTailnetPeerEnvV1" ]',
);
const parityCallAt = mutating.lastIndexOf("\nprove_source_parity\n");
const outMkdirAt = mutating.indexOf('mkdir -p "$OUT"');
const dropinMkdirAt = mutating.indexOf('mkdir -p "$DROPIN_DIR"');
const firstSystemdAt = mutating.indexOf("systemctl --user");
assert.ok(confirmationAt >= 0);
assert.ok(parityCallAt > confirmationAt);
assert.ok(outMkdirAt > parityCallAt);
assert.ok(dropinMkdirAt > parityCallAt);
assert.ok(firstSystemdAt > parityCallAt);

const tailnet = source("ops/mainnet0/tailnet-http-public-base-proof.sh");
for (const required of [
  'valid_port "$HTTP_PORT"',
  'valid_ipv4 "$TS_IP"',
  'PUBLIC_LOCAL_NODE_BASE must exactly match the reviewed Tailnet HTTP base',
]) {
  assert.ok(tailnet.includes(required), `tailnet proof missing ${required}`);
}
assert.ok(
  tailnet.indexOf('valid_ssh_target "$ALIEN"') <
    tailnet.indexOf('mkdir -p "$OUT"'),
);
assert.ok(
  tailnet.indexOf('valid_ipv4 "$TS_IP"') <
    tailnet.indexOf('mkdir -p "$OUT"'),
);

const post = source("ops/post-bootstrap-crossbox-proof.sh");
assert.ok(post.includes('valid_ipv4 "$PREC_TS"'));
assert.ok(
  post.indexOf('valid_ssh_target "$ALIEN"') < post.indexOf('ssh "$ALIEN"'),
);
assert.ok(
  post.indexOf('valid_ipv4 "$PREC_TS"') < post.indexOf('ssh "$ALIEN"'),
);

const sshPreflight = source("ops/tailscale-ssh-auth-preflight-proof.sh");
const sshPreflightValidationAt =
  sshPreflight.indexOf('valid_ssh_target "$ALIEN"');
assert.ok(
  sshPreflightValidationAt < sshPreflight.indexOf('mkdir -p "$OUT"'),
);
assert.ok(
  sshPreflightValidationAt < sshPreflight.indexOf("set +e"),
);

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-crossbox-bootstrap-boundary-"),
);
try {
  const fakeBin = path.join(tmp, "fake-bin");
  const home = path.join(tmp, "home");
  const commandLog = path.join(tmp, "commands.log");
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.mkdirSync(home, { recursive: true });

  for (const command of ["systemctl", "curl", "tailscale", "ss", "make"]) {
    fs.writeFileSync(
      path.join(fakeBin, command),
      `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "${command}:$*" >> "\${VOID_TEST_COMMAND_LOG:?}"
exit 97
`,
      { mode: 0o755 },
    );
  }

  fs.writeFileSync(
    path.join(fakeBin, "ssh"),
    `#!/usr/bin/env bash
set -euo pipefail
printf 'ssh:%s\\n' "$*" >> "\${VOID_TEST_COMMAND_LOG:?}"
case "\${VOID_TEST_SSH_MODE:-fail}" in
  head-mismatch)
    printf 'nimo-test\\n%s\\n' "0000000000000000000000000000000000000000"
    exit 0
    ;;
  local-host)
    printf '%s\\n%s\\n' "\${VOID_TEST_LOCAL_HOST:?}" "\${VOID_TEST_LOCAL_HEAD:?}"
    exit 0
    ;;
  *)
    exit 97
    ;;
esac
`,
    { mode: 0o755 },
  );

  const baseEnv = {
    ...process.env,
    HOME: home,
    VOID_REPO: ROOT,
    VOID_TEST_COMMAND_LOG: commandLog,
    PATH: fakeBin + path.delimiter + process.env.PATH,
  };

  function resetLog() {
    fs.rmSync(commandLog, { force: true });
  }

  function readLog() {
    return fs.existsSync(commandLog) ? fs.readFileSync(commandLog, "utf8") : "";
  }

  function run(script, env) {
    return childProcess.spawnSync("/usr/bin/bash", [script], {
      cwd: ROOT,
      env: { ...baseEnv, ...env },
      encoding: "utf8",
    });
  }

  function expectHoldNoCommands(script, env, pattern) {
    resetLog();
    const result = run(script, env);
    assert.equal(result.status, 2, `${script}: expected HOLD rc=2`);
    assert.match(
      (result.stdout || "") + (result.stderr || ""),
      pattern,
      `${script}: expected HOLD pattern`,
    );
    assert.equal(readLog(), "", `${script}: command executed before HOLD`);
  }

  const validMutation = {
    ALIEN: "zoso@Nimo",
    PRECISION_TS: "100.64.0.10",
    ALIEN_TS: "100.64.0.11",
    HTTP_PORT: "4100",
    CONFIRM_MUTUAL_TAILNET_PEER_ENV: "applyVoidMutualTailnetPeerEnvV1",
    OUT: path.join(tmp, "mutating-out"),
  };

  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, ALIEN: "-oProxyCommand=evil" },
    /destination-only SSH alias or user@host/u,
  );
  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, ALIEN: "zoso@Nimo bad" },
    /destination-only SSH alias or user@host/u,
  );
  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, HTTP_PORT: "70000" },
    /HTTP_PORT must be an integer/u,
  );
  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, ALIEN_TS: "100.64.0.999" },
    /ALIEN_TS must be an explicit valid IPv4/u,
  );
  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, PRECISION_TS: "100.64.0.11" },
    /must be distinct/u,
  );
  expectHoldNoCommands(
    MUTATING,
    { ...validMutation, CONFIRM_MUTUAL_TAILNET_PEER_ENV: "" },
    /confirmation token required/u,
  );

  const dropinDir = path.join(home, ".config", "systemd", "user", "void-node.service.d");
  resetLog();
  fs.rmSync(validMutation.OUT, { recursive: true, force: true });
  fs.rmSync(dropinDir, { recursive: true, force: true });
  const mismatch = run(MUTATING, {
    ...validMutation,
    VOID_TEST_SSH_MODE: "head-mismatch",
  });
  assert.equal(mismatch.status, 2);
  assert.match(
    (mismatch.stdout || "") + (mismatch.stderr || ""),
    /local\/remote repository HEAD mismatch/u,
  );
  assert.match(readLog(), /^ssh:/mu);
  assert.equal(readLog().includes("systemctl:"), false);
  assert.equal(fs.existsSync(validMutation.OUT), false);
  assert.equal(fs.existsSync(dropinDir), false);

  const localHead = childProcess.execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const localHost = os.hostname();
  resetLog();
  const sameHost = run(MUTATING, {
    ...validMutation,
    VOID_TEST_SSH_MODE: "local-host",
    VOID_TEST_LOCAL_HEAD: localHead,
    VOID_TEST_LOCAL_HOST: localHost,
  });
  assert.equal(sameHost.status, 2);
  assert.match(
    (sameHost.stdout || "") + (sameHost.stderr || ""),
    /remote resolved to local host/u,
  );
  assert.equal(readLog().includes("systemctl:"), false);
  assert.equal(fs.existsSync(validMutation.OUT), false);
  assert.equal(fs.existsSync(dropinDir), false);

  expectHoldNoCommands(
    "ops/mainnet0/tailnet-http-public-base-proof.sh",
    {
      ALIEN: "-oProxyCommand=evil",
      TS_IP: "100.64.0.10",
      HTTP_PORT: "4100",
      PUBLIC_LOCAL_NODE_BASE: "http://100.64.0.10:4100",
      OUT: path.join(tmp, "tailnet-out"),
    },
    /destination-only SSH alias or user@host/u,
  );
  expectHoldNoCommands(
    "ops/mainnet0/tailnet-http-public-base-proof.sh",
    {
      ALIEN: "Nimo",
      TS_IP: "100.64.0.10",
      HTTP_PORT: "4100",
      PUBLIC_LOCAL_NODE_BASE: "http://100.64.0.99:4100",
      OUT: path.join(tmp, "tailnet-out"),
    },
    /must exactly match the reviewed Tailnet HTTP base/u,
  );
  expectHoldNoCommands(
    "ops/post-bootstrap-crossbox-proof.sh",
    { ALIEN: "Nimo", PREC_TS: "100.64.0.999" },
    /PREC_TS must be a valid IPv4/u,
  );
  expectHoldNoCommands(
    "ops/tailscale-ssh-auth-preflight-proof.sh",
    { ALIEN: "Nimo bad", OUT: path.join(tmp, "ssh-out") },
    /destination-only SSH alias or user@host/u,
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log("VOID_CROSSBOX_BOOTSTRAP_MUTATION_BOUNDARY_V1_PROOF_GREEN");
console.log("confirmation_required_before_mutation=true");
console.log("destination_only_ssh_grammar=true");
console.log("tailnet_ipv4_and_port_validation=true");
console.log("local_remote_clean_full_head_parity_required=true");
console.log("distinct_remote_host_required=true");
console.log("malformed_inputs_fail_before_network=true");
console.log("source_mismatch_fails_before_output_or_systemd=true");
console.log("runtime_execution=false");
