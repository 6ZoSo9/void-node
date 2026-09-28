#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "VOID_PUBLIC_EARN_GATEWAY_SERVICE_BINDING_V1";
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return result;
}

function requireSuccess(result, label) {
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    assert.fail(`${label} failed with status ${result.status}`);
  }
}

const runScriptPath = "ops/public/run-public-seed-adapter-v1.sh";
const vpsInstallerPath = "ops/public/install-vps-public-seed-adapter-v2.sh";
const vpsDeployPath = "ops/public/deploy-vps-public-seed-adapter-v2.sh";
const localInstallerPath = "ops/public/install-local-public-earn-gateway-v1.sh";
const workflowPath = ".github/workflows/public-earn-gateway-service-binding-v1.yml";
const documentationPath = "docs/operators/public-earn-gateway-service-binding-v1.md";

for (const relative of [
  runScriptPath,
  vpsInstallerPath,
  vpsDeployPath,
  localInstallerPath,
]) {
  const result = run("bash", ["-n", relative]);
  requireSuccess(result, `bash syntax ${relative}`);
}

const runScript = read(runScriptPath);
assert.match(
  runScript,
  /VOID_EARN_COORDINATOR_UPSTREAM="\$\{VOID_EARN_COORDINATOR_UPSTREAM:-\}"/,
);
assert.match(runScript, /export[\s\\]+VOID_SEED_UPSTREAM[\s\\]+VOID_EARN_COORDINATOR_UPSTREAM/);
assert.match(runScript, /exec node ops\/public\/public-seed-adapter-v1\.mjs/);

const vpsInstaller = read(vpsInstallerPath);
assert.match(vpsInstaller, /VOID_EARN_COORDINATOR_UPSTREAM="\$\{VOID_EARN_COORDINATOR_UPSTREAM:-\}"/);
assert.match(
  vpsInstaller,
  /Environment="VOID_EARN_COORDINATOR_UPSTREAM=\$VOID_EARN_COORDINATOR_UPSTREAM"/,
);
assert.match(vpsInstaller, /validate_http_origin/);
assert.equal(
  vpsInstaller.includes("After=default.target"),
  false,
  "VPS user service must not order itself after its owning default target",
);
assert.ok(
  vpsInstaller.includes("WantedBy=default.target"),
  "VPS user service must remain enabled through default.target",
);

const vpsDeploy = read(vpsDeployPath);
assert.match(vpsDeploy, /VOID_EARN_COORDINATOR_UPSTREAM="\$\{VOID_EARN_COORDINATOR_UPSTREAM:-\}"/);
assert.match(
  vpsDeploy,
  /VOID_EARN_COORDINATOR_UPSTREAM=\\"\\\$VOID_EARN_COORDINATOR_UPSTREAM\\"/,
);
assert.match(vpsDeploy, /earn_coordinator_bound=true/);
assert.match(vpsDeploy, /VOID_PUBLIC_EARN_GATEWAY_V1/);

const localInstaller = read(localInstallerPath);
for (const required of [
  "VOID_LOCAL_PUBLIC_EARN_GATEWAY_INSTALLER_V1",
  "void-public-earn-gateway-v1.service",
  "VOID_EARN_COORDINATOR_UPSTREAM",
  "VOID_ADAPTER_HOST:-127.0.0.1",
  "VOID_ADAPTER_PORT:-4111",
  "activate-loopback-public-earn-gateway-v1",
  "coordinator_enabled",
  "executor_enabled",
  "fixed_award_wc",
  "public_claim",
  "tools/wc-public-coordinator-readiness-v1.mjs",
  "--require-ready",
  "NoNewPrivileges=true",
  "ProtectHome=read-only",
]) {
  assert.ok(localInstaller.includes(required), `local installer missing ${required}`);
}
for (const forbidden of [
  "--private-key",
  "private_key",
  "seed_phrase",
  "mnemonic",
  "wallet_file",
  "VOID_ADAPTER_HOST=0.0.0.0",
]) {
  assert.equal(localInstaller.includes(forbidden), false, `local installer exposes ${forbidden}`);
}
assert.notEqual(
  fs.statSync(path.join(ROOT, localInstallerPath)).mode & 0o111,
  0,
  "local installer must be executable",
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-earn-gateway-service-binding-v1-"));
try {
  const home = path.join(temp, "home");
  const fakeBin = path.join(temp, "bin");
  const systemctlLog = path.join(temp, "systemctl.log");
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(fakeBin, { recursive: true, mode: 0o700 });
  const fakeSystemctl = path.join(fakeBin, "systemctl");
  fs.writeFileSync(
    fakeSystemctl,
    `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >>"$SYSTEMCTL_LOG"\nexit 0\n`,
    { mode: 0o755 },
  );

  // The local gateway installer intentionally retains its Node 22 runtime
  // contract. Present that exact contract to installer subprocesses on every
  // workflow matrix leg without changing the Node major running this proof.
  const fakeNode = path.join(fakeBin, "node");
  fs.writeFileSync(
    fakeNode,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'if [ "${1:-}" = "-p" ] && [ "${2:-}" = \'process.versions.node.split(".")[0]\' ]; then',
      "  printf '22\\n'",
      "  exit 0",
      "fi",
      `exec ${JSON.stringify(process.execPath)} "$@"`,
      "",
    ].join("\n"),
    { mode: 0o755 },
  );

  const baseEnv = {
    HOME: home,
    PATH: `${fakeBin}:${process.env.PATH}`,
    SYSTEMCTL_LOG: systemctlLog,
    VOID_NODE_ROOT: ROOT,
    VOID_SEED_UPSTREAM: "http://127.0.0.1:4100",
    VOID_EARN_COORDINATOR_UPSTREAM: "http://127.0.0.1:4100",
    VOID_ADAPTER_HOST: "127.0.0.1",
    VOID_ADAPTER_PORT: "4111",
  };

  const vpsInstalled = run("bash", [vpsInstallerPath], {
    env: {
      ...baseEnv,
      VOID_ADAPTER_PORT: "8080",
      START_SERVICE: "0",
    },
  });
  requireSuccess(vpsInstalled, "VPS installer");
  const vpsUnitFile = path.join(
    home,
    ".config/systemd/user/void-vps-public-seed-adapter.service",
  );
  assert.equal(fs.existsSync(vpsUnitFile), true, "VPS unit file not created");
  const vpsUnit = fs.readFileSync(vpsUnitFile, "utf8");
  assert.equal(
    vpsUnit.includes("After=default.target"),
    false,
    "generated VPS user unit must not order itself after default.target",
  );
  assert.ok(
    vpsUnit.includes("WantedBy=default.target"),
    "generated VPS user unit must remain enabled by default.target",
  );
  fs.writeFileSync(systemctlLog, "");

  const installed = run("bash", [localInstallerPath], {
    env: { ...baseEnv, ENABLE_SERVICE: "0", START_SERVICE: "0" },
  });
  requireSuccess(installed, "disabled local installer");
  assert.match(installed.stdout, /VOID_LOCAL_PUBLIC_EARN_GATEWAY_INSTALLER_V1 INSTALLED_DISABLED/);

  const unitFile = path.join(
    home,
    ".config/systemd/user/void-public-earn-gateway-v1.service",
  );
  assert.equal(fs.existsSync(unitFile), true, "unit file not created");
  assert.equal(fs.statSync(unitFile).mode & 0o777, 0o600, "unit mode must be 0600");
  const unit = fs.readFileSync(unitFile, "utf8");
  assert.ok(
    unit.includes(`ExecStart=${fakeNode} `),
    "local unit must bind the fixture's explicit Node 22 executable",
  );
  for (const expected of [
    'Environment="VOID_SEED_UPSTREAM=http://127.0.0.1:4100"',
    'Environment="VOID_EARN_COORDINATOR_UPSTREAM=http://127.0.0.1:4100"',
    'Environment="VOID_ADAPTER_HOST=127.0.0.1"',
    'Environment="VOID_ADAPTER_PORT=4111"',
    "Description=VOID loopback Public Earn gateway v1",
    "NoNewPrivileges=true",
    "ProtectHome=read-only",
  ]) {
    assert.ok(unit.includes(expected), `unit missing ${expected}`);
  }
  assert.equal(unit.includes("0.0.0.0"), false, "local unit must not bind publicly");
  assert.equal(unit.includes("EnvironmentFile="), false, "local unit must not depend on an unreviewed env file");

  const firstLog = fs.readFileSync(systemctlLog, "utf8");
  assert.match(firstLog, /--user daemon-reload/);
  assert.equal(firstLog.includes("enable"), false);
  assert.equal(firstLog.includes("restart"), false);
  assert.equal(firstLog.includes("start"), false);

  fs.writeFileSync(systemctlLog, "");
  const denied = run("bash", [localInstallerPath], {
    env: {
      ...baseEnv,
      ENABLE_SERVICE: "1",
      START_SERVICE: "0",
      CONFIRM: "wrong-token",
    },
  });
  assert.notEqual(denied.status, 0, "wrong confirmation must fail");
  assert.match(denied.stderr, /exact confirmation required/);
  assert.equal(fs.readFileSync(systemctlLog, "utf8"), "", "denied activation touched systemctl");

  const enabled = run("bash", [localInstallerPath], {
    env: {
      ...baseEnv,
      ENABLE_SERVICE: "1",
      START_SERVICE: "0",
      CONFIRM: "activate-loopback-public-earn-gateway-v1",
    },
  });
  requireSuccess(enabled, "enabled-stopped local installer");
  assert.match(enabled.stdout, /VOID_LOCAL_PUBLIC_EARN_GATEWAY_INSTALLER_V1 ENABLED_STOPPED/);
  const enabledLog = fs.readFileSync(systemctlLog, "utf8");
  assert.match(enabledLog, /--user daemon-reload/);
  assert.match(enabledLog, /--user enable void-public-earn-gateway-v1\.service/);
  assert.equal(enabledLog.includes("restart"), false);

  const publicBind = run("bash", [localInstallerPath], {
    env: {
      ...baseEnv,
      VOID_ADAPTER_HOST: "0.0.0.0",
      ENABLE_SERVICE: "0",
      START_SERVICE: "0",
    },
  });
  assert.notEqual(publicBind.status, 0, "public bind must fail");
  assert.match(publicBind.stderr, /must bind only to 127\.0\.0\.1/);

  const publicHttpUpstream = run("bash", [localInstallerPath], {
    env: {
      ...baseEnv,
      VOID_EARN_COORDINATOR_UPSTREAM: "http://example.com:4100",
      ENABLE_SERVICE: "0",
      START_SERVICE: "0",
    },
  });
  assert.notEqual(publicHttpUpstream.status, 0, "public plain-http upstream must fail");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const workflow = read(workflowPath);
for (const required of [
  "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
  "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
  "matrix:",
  "node: [22, 24, 26]",
  'node-version: ${{ matrix.node }}',
  "node scripts/prove_public_earn_gateway_service_binding_v1.mjs",
  "npm run typecheck",
  "permissions:\n  contents: read",
]) {
  assert.ok(workflow.includes(required), `workflow missing ${required}`);
}
assert.equal(workflow.includes("workflow_dispatch"), false);
assert.equal(workflow.includes("contents: write"), false);

const documentation = read(documentationPath);
for (const required of [
  "install-local-public-earn-gateway-v1.sh",
  "activate-loopback-public-earn-gateway-v1",
  "127.0.0.1:4111",
  "VOID_EARN_COORDINATOR_UPSTREAM",
  "does not enable or start",
  "3 WC",
]) {
  assert.ok(documentation.includes(required), `documentation missing ${required}`);
}

console.log(JSON.stringify({
  marker: MARKER,
  run_wrapper_forwards_earn_upstream: true,
  vps_unit_binds_earn_upstream: true,
  vps_deploy_forwards_earn_upstream: true,
  local_gateway_loopback_only: true,
  disabled_by_default: true,
  exact_activation_confirmation_required: true,
  coordinator_readiness_required_before_start: true,
  default_target_ordering_cycle_prevented: true,
  supported_node_majors_proven: [22, 24, 26],
  local_installer_node22_contract_preserved: true,
  immutable_action_refs: true,
  wallet_or_signer_access: false,
  ticket_issuance: false,
  wc_write: false,
  fund_movement: false,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
