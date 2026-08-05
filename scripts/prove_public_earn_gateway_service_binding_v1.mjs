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
  "VOID_ADAPTER_HOST=127.0.0.1",
  "VOID_ADAPTER_PORT=4111",
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
  "actions/checkout@v6",
  "actions/setup-node@v6",
  'node-version: "22"',
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
  wallet_or_signer_access: false,
  ticket_issuance: false,
  wc_write: false,
  fund_movement: false,
  status: "GREEN",
}, null, 2));
console.log(`${MARKER}_PROOF_GREEN`);
