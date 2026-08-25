#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_SEED_INSTALLER_LIFECYCLE_V1_PROOF";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const INSTALLER = path.join(ROOT, "ops", "public", "install_void_public_seed_named_tunnel_packet_v1.sh");
const GATEWAY_UNIT = "void-public-seed-gateway-v1.service";
const TUNNEL_UNIT = "void-public-seed-named-tunnel-v1.service";
const TMP_READY = "/tmp/void-public-seed-gateway-ready.json";
const TMP_ADMIN = "/tmp/void-public-seed-admin.json";
const TMP_MUTATION = "/tmp/void-public-seed-mutation.json";

function shell(lines) {
  return `${lines.join("\n")}\n`;
}

function writeExecutable(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, content, { encoding: "utf8", mode: 0o700 });
  fs.chmodSync(file, 0o700);
}

function runInstaller({ home, bin, packet, log, state, start, enable, expect = 0 }) {
  const result = childProcess.spawnSync("bash", [INSTALLER, packet], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      HOME: home,
      PATH: `${bin}:${process.env.PATH || ""}`,
      VOID_TEST_LOG: log,
      VOID_TEST_SYSTEMD_STATE: state,
      VOID_PUBLIC_SEED_START_SERVICES: String(start),
      VOID_PUBLIC_SEED_ENABLE_AUTOSTART: String(enable),
    },
  });
  if (result.status !== expect) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`installer returned ${result.status}; expected ${expect}`);
  }
  return { stdout: String(result.stdout || ""), stderr: String(result.stderr || "") };
}

function resetState(state, log) {
  fs.rmSync(state, { recursive: true, force: true });
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  fs.writeFileSync(log, "", { encoding: "utf8", mode: 0o600 });
}

function marker(state, prefix, unit) {
  return path.join(state, `${prefix}-${unit}`);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-public-seed-installer-lifecycle-proof-"));
const home = path.join(temporary, "home");
const bin = path.join(temporary, "bin");
const packet = path.join(temporary, "packet");
const state = path.join(temporary, "systemd-state");
const log = path.join(temporary, "systemctl.log");

try {
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  fs.mkdirSync(packet, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(packet, GATEWAY_UNIT), "[Unit]\nDescription=fixture gateway\n", { mode: 0o600 });
  fs.writeFileSync(path.join(packet, TUNNEL_UNIT), "[Unit]\nDescription=fixture tunnel\n", { mode: 0o600 });

  writeExecutable(path.join(bin, "node"), shell([
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "printf 'node %s\\n' \"$*\" >> \"$VOID_TEST_LOG\"",
    "exit 0",
  ]));

  writeExecutable(path.join(bin, "install"), shell([
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "printf 'install %s\\n' \"$*\" >> \"$VOID_TEST_LOG\"",
    "exec /usr/bin/install \"$@\"",
  ]));

  writeExecutable(path.join(bin, "id"), shell([
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "if test \"${1:-}\" = \"-u\"; then echo 1000; exit 0; fi",
    "exec /usr/bin/id \"$@\"",
  ]));

  writeExecutable(path.join(bin, "sleep"), shell([
    "#!/usr/bin/env bash",
    "exit 0",
  ]));

  writeExecutable(path.join(bin, "systemctl"), shell([
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "STATE=\"$VOID_TEST_SYSTEMD_STATE\"",
    "LOG=\"$VOID_TEST_LOG\"",
    "mkdir -p \"$STATE\"",
    "printf 'systemctl %s\\n' \"$*\" >> \"$LOG\"",
    "if test \"${1:-}\" = \"--user\"; then shift; fi",
    "CMD=\"${1:-}\"",
    "if test -n \"$CMD\"; then shift; fi",
    "last_arg() { local last=\"\"; for value in \"$@\"; do last=\"$value\"; done; printf '%s' \"$last\"; }",
    "case \"$CMD\" in",
    "  daemon-reload) exit 0 ;;",
    "  disable)",
    "    for unit in \"$@\"; do case \"$unit\" in -*) ;; *) rm -f \"$STATE/enabled-$unit\" ;; esac; done",
    "    exit 0",
    "    ;;",
    "  enable)",
    "    for unit in \"$@\"; do case \"$unit\" in -*) ;; *) : > \"$STATE/enabled-$unit\" ;; esac; done",
    "    exit 0",
    "    ;;",
    "  restart)",
    "    unit=\"$(last_arg \"$@\")\"",
    "    : > \"$STATE/active-$unit\"",
    "    exit 0",
    "    ;;",
    "  is-active)",
    "    unit=\"$(last_arg \"$@\")\"",
    "    test -f \"$STATE/active-$unit\"",
    "    ;;",
    "  is-enabled)",
    "    unit=\"$(last_arg \"$@\")\"",
    "    test -f \"$STATE/enabled-$unit\"",
    "    ;;",
    "  status) exit 0 ;;",
    "  show)",
    "    unit=\"${1:-}\"",
    "    if test -f \"$STATE/enabled-$unit\"; then echo UnitFileState=enabled; else echo UnitFileState=disabled; fi",
    "    if test -f \"$STATE/active-$unit\"; then echo ActiveState=active; echo SubState=running; else echo ActiveState=inactive; echo SubState=dead; fi",
    "    exit 0",
    "    ;;",
    "  *) echo \"unexpected fixture systemctl command: $CMD $*\" >&2; exit 2 ;;",
    "esac",
  ]));

  writeExecutable(path.join(bin, "curl"), shell([
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "joined=\"$*\"",
    "out=\"\"",
    "url=\"\"",
    "while test \"$#\" -gt 0; do",
    "  case \"$1\" in",
    "    -o) out=\"${2:-}\"; shift 2 ;;",
    "    http://*|https://*) url=\"$1\"; shift ;;",
    "    *) shift ;;",
    "  esac",
    "done",
    "case \"$url\" in",
    "  */__void/ready.json)",
    "    if [[ \"$joined\" == *-fsSI* ]]; then",
    "      printf 'HTTP/1.1 200 OK\\r\\nx-void-public-seed-gateway: v1\\r\\n\\r\\n'",
    "    else",
    "      printf '{\"ready\":true,\"head\":123,\"gap\":0,\"txroot_live\":1}\\n'",
    "    fi",
    "    ;;",
    "  */admin)",
    "    printf '{\"error\":\"route_not_public\"}\\n' > \"$out\"",
    "    printf '404'",
    "    ;;",
    "  */follower/start)",
    "    printf '{\"error\":\"method_not_allowed\"}\\n' > \"$out\"",
    "    printf '405'",
    "    ;;",
    "  *) echo \"unexpected fixture curl URL: $url\" >&2; exit 2 ;;",
    "esac",
  ]));

  resetState(state, log);
  const rejected = runInstaller({ home, bin, packet, log, state, start: 0, enable: 1, expect: 1 });
  assert.match(rejected.stderr, /autostart cannot be enabled before a successful live activation/);
  assert.equal(fs.readFileSync(log, "utf8"), "");
  console.log("[PASS] autostart without live activation is rejected before host mutation");

  resetState(state, log);
  const staged = runInstaller({ home, bin, packet, log, state, start: 0, enable: 0 });
  const stagedLog = fs.readFileSync(log, "utf8");
  assert.match(staged.stdout, /inert_staging=true/);
  assert.match(staged.stdout, /autostart_enabled=false/);
  assert.match(stagedLog, /systemctl --user daemon-reload/);
  assert.match(stagedLog, /systemctl --user disable void-public-seed-gateway-v1\.service void-public-seed-named-tunnel-v1\.service/);
  assert.doesNotMatch(stagedLog, /systemctl --user restart /);
  assert.doesNotMatch(stagedLog, /systemctl --user enable void-public/);
  assert.equal(fs.existsSync(marker(state, "active", GATEWAY_UNIT)), false);
  assert.equal(fs.existsSync(marker(state, "active", TUNNEL_UNIT)), false);
  assert.equal(fs.existsSync(marker(state, "enabled", GATEWAY_UNIT)), false);
  assert.equal(fs.existsSync(marker(state, "enabled", TUNNEL_UNIT)), false);
  assert.equal(fs.statSync(path.join(home, ".config", "systemd", "user", GATEWAY_UNIT)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(home, ".config", "systemd", "user", TUNNEL_UNIT)).mode & 0o777, 0o600);
  console.log("[PASS] START=0 ENABLE=0 stages inactive disabled units");

  resetState(state, log);
  const canary = runInstaller({ home, bin, packet, log, state, start: 1, enable: 0 });
  const canaryLog = fs.readFileSync(log, "utf8");
  assert.match(canary.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_INSTALLER_V1 ACTIVATED/);
  assert.match(canary.stdout, /services_started=true/);
  assert.match(canary.stdout, /autostart_enabled=false/);
  assert.match(canaryLog, /systemctl --user restart void-public-seed-gateway-v1\.service/);
  assert.match(canaryLog, /systemctl --user restart void-public-seed-named-tunnel-v1\.service/);
  assert.doesNotMatch(canaryLog, /systemctl --user enable void-public/);
  assert.equal(fs.existsSync(marker(state, "active", GATEWAY_UNIT)), true);
  assert.equal(fs.existsSync(marker(state, "active", TUNNEL_UNIT)), true);
  assert.equal(fs.existsSync(marker(state, "enabled", GATEWAY_UNIT)), false);
  assert.equal(fs.existsSync(marker(state, "enabled", TUNNEL_UNIT)), false);
  console.log("[PASS] START=1 ENABLE=0 is a live disabled canary");

  resetState(state, log);
  const durable = runInstaller({ home, bin, packet, log, state, start: 1, enable: 1 });
  const durableLog = fs.readFileSync(log, "utf8");
  assert.match(durable.stdout, /VOID_PUBLIC_SEED_NAMED_TUNNEL_INSTALLER_V1 ACTIVATED/);
  assert.match(durable.stdout, /autostart_enabled=true/);
  const gatewayRestart = durableLog.indexOf(`systemctl --user restart ${GATEWAY_UNIT}`);
  const tunnelRestart = durableLog.indexOf(`systemctl --user restart ${TUNNEL_UNIT}`);
  const enableIndex = durableLog.indexOf(`systemctl --user enable ${GATEWAY_UNIT} ${TUNNEL_UNIT}`);
  assert.ok(gatewayRestart >= 0, durableLog);
  assert.ok(tunnelRestart > gatewayRestart, durableLog);
  assert.ok(enableIndex > tunnelRestart, durableLog);
  assert.equal(fs.existsSync(marker(state, "active", GATEWAY_UNIT)), true);
  assert.equal(fs.existsSync(marker(state, "active", TUNNEL_UNIT)), true);
  assert.equal(fs.existsSync(marker(state, "enabled", GATEWAY_UNIT)), true);
  assert.equal(fs.existsSync(marker(state, "enabled", TUNNEL_UNIT)), true);
  console.log("[PASS] durable enable occurs only after both live activation checks");

  console.log(`${MARKER}_GREEN`);
  console.log("start0_enable0_inert=true");
  console.log("start0_enable1_rejected=true");
  console.log("start1_enable0_live_disabled=true");
  console.log("start1_enable1_enable_after_activation=true");
  console.log("staging_future_autostart=false");
  console.log("credentials_read=false");
  console.log("dns_mutation=false");
  console.log("real_systemd_mutation=false");
} finally {
  for (const file of [TMP_READY, TMP_ADMIN, TMP_MUTATION]) {
    fs.rmSync(file, { force: true });
  }
  fs.rmSync(temporary, { recursive: true, force: true });
}
